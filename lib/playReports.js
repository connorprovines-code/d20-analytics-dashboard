// Google Play install statistics, read from the developer account's reports bucket.
//
// Play writes one CSV per month and dimension to a private Cloud Storage bucket:
//   gs://<bucket>/stats/installs/installs_<package>_<YYYYMM>_overview.csv
// The files are UTF-16 (little-endian, with a byte order mark), one row per day, posted with a
// lag of a few days. The dashboard reads them with a service account that was invited in Play
// Console (Users and permissions) with the account permission "View app information and download
// bulk reports (read-only)". Its JSON key is GOOGLE_PLAY_SA_KEY.
//
// No Next.js imports here, so node --test can load this file.
import { createSign } from 'node:crypto';
import { SourceError } from './safe.js';

export const PLAY_BUCKET = 'pubsite_prod_8955575230808742503';
export const PLAY_PACKAGE = 'com.d20loottracker.app';
export const SERIES_DAYS = 30;

// CSV header (lowercased) -> field. Play has renamed columns before; older exports call active
// devices "Installs on active devices".
const COLUMNS = {
  date: 'date',
  'daily device installs': 'deviceInstalls',
  'daily device uninstalls': 'deviceUninstalls',
  'daily user installs': 'userInstalls',
  'daily user uninstalls': 'userUninstalls',
  'active device installs': 'activeDevices',
  'installs on active devices': 'activeDevices',
  'install events': 'installEvents',
  'uninstall events': 'uninstallEvents',
};
const FIELDS = ['deviceInstalls', 'deviceUninstalls', 'userInstalls', 'userUninstalls', 'activeDevices', 'installEvents', 'uninstallEvents'];

// Bytes -> text. Play's files are UTF-16LE with a BOM; tolerate UTF-16BE and UTF-8 too.
export function decodeReport(bytes) {
  const b = Buffer.from(bytes);
  if (b[0] === 0xff && b[1] === 0xfe) return b.subarray(2).toString('utf16le');
  if (b[0] === 0xfe && b[1] === 0xff) {
    const le = Buffer.from(b.subarray(2));
    le.swap16();
    return le.toString('utf16le');
  }
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return b.subarray(3).toString('utf8');
  // No BOM: a zero in the second byte means UTF-16LE text.
  if (b.length > 1 && b[1] === 0 && b[0] !== 0) return b.toString('utf16le');
  return b.toString('utf8');
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// One installs overview file -> [{ date, deviceInstalls, ... }]. A column the file lacks is null.
export function parseInstallsOverview(bytes) {
  const lines = decodeReport(bytes).split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  const header = splitCsvLine(lines[0]).map((h) => COLUMNS[h.toLowerCase()] || null);
  if (!header.includes('date') || !header.some((h) => h && h !== 'date')) {
    throw new SourceError('unexpected report format', `installs overview header: ${lines[0].slice(0, 200)}`);
  }
  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const row = Object.fromEntries(FIELDS.map((f) => [f, null]));
    header.forEach((field, i) => {
      if (!field) return;
      if (field === 'date') row.date = cells[i];
      else if (cells[i] !== undefined && cells[i] !== '') row[field] = Number(cells[i]);
    });
    if (/^\d{4}-\d{2}-\d{2}$/.test(row.date || '')) rows.push(row);
  }
  return rows;
}

const addDays = (date, n) => {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

// All months' rows -> what the dashboard shows: the latest reported day, totals and a daily series
// for the `days` days ending on that day, and user installs since the first report.
export function summariseInstalls(rows, days = SERIES_DAYS) {
  const byDate = new Map();
  for (const r of rows) byDate.set(r.date, r); // a later file wins for the same day
  const dates = [...byDate.keys()].sort();
  if (!dates.length) return null;
  const latestDate = dates[dates.length - 1];
  const start = addDays(latestDate, -(days - 1));
  const series = [];
  for (let d = start; d <= latestDate; d = addDays(d, 1)) {
    const r = byDate.get(d);
    series.push({
      date: d,
      deviceInstalls: r ? r.deviceInstalls ?? 0 : 0,
      userInstalls: r ? r.userInstalls ?? 0 : 0,
      userUninstalls: r ? r.userUninstalls ?? 0 : 0,
      deviceUninstalls: r ? r.deviceUninstalls ?? 0 : 0,
      activeDevices: r ? r.activeDevices : null,
    });
  }
  const all = dates.map((d) => byDate.get(d));
  return {
    firstDate: dates[0],
    latestDate,
    latest: byDate.get(latestDate),
    days,
    totals: {
      deviceInstalls: sum(series, 'deviceInstalls'),
      userInstalls: sum(series, 'userInstalls'),
      userUninstalls: sum(series, 'userUninstalls'),
      deviceUninstalls: sum(series, 'deviceUninstalls'),
    },
    allTimeUserInstalls: sum(all, 'userInstalls'),
    series,
  };
}

// ---------------------------------------------------------------
// Cloud Storage access with the service account key (OAuth 2 JWT bearer, no SDK)
// ---------------------------------------------------------------
const SCOPE = 'https://www.googleapis.com/auth/devstorage.read_only';
const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

// GOOGLE_PLAY_SA_KEY holds the key file's JSON (or the same JSON base64-encoded).
export function readServiceAccountKey(raw) {
  if (!raw || !String(raw).trim()) throw new SourceError('GOOGLE_PLAY_SA_KEY not set');
  let text = String(raw).trim();
  if (!text.startsWith('{')) text = Buffer.from(text, 'base64').toString('utf8');
  let key;
  try { key = JSON.parse(text); } catch { key = null; }
  if (!key || key.type !== 'service_account' || !key.client_email || !key.private_key) {
    throw new SourceError('GOOGLE_PLAY_SA_KEY is not a service account key');
  }
  return key;
}

async function accessToken(key, fetchImpl) {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = key.token_uri || 'https://oauth2.googleapis.com/token';
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT', kid: key.private_key_id })}.${b64url({
    iss: key.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key).toString('base64url');
  const res = await fetchImpl(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    cache: 'no-store',
  });
  if (!res.ok) throw new SourceError('Google sign-in failed', `token endpoint HTTP ${res.status}`);
  return (await res.json()).access_token;
}

// Play grants a newly invited account access to the bucket some time later (24 hours or more).
// Until then Cloud Storage answers 403, which the page shows as "not available yet".
function storageError(res, what) {
  if (res.status === 401 || res.status === 403) {
    return new SourceError('not available yet: Play access can take 24h+ after the invite', `storage ${res.status} on ${what}`);
  }
  if (res.status === 404) return new SourceError('reports bucket not found', `storage 404 on ${what}`);
  return new SourceError(`storage HTTP ${res.status}`);
}

export async function readPlayInstalls({ keyJson, bucket = PLAY_BUCKET, pkg = PLAY_PACKAGE, fetchImpl = fetch, days = SERIES_DAYS } = {}) {
  const key = readServiceAccountKey(keyJson);
  const token = await accessToken(key, fetchImpl);
  const auth = { Authorization: `Bearer ${token}` };
  const base = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o`;
  const prefix = `stats/installs/installs_${pkg}_`;

  const names = [];
  let pageToken = '';
  do {
    const url = `${base}?prefix=${encodeURIComponent(prefix)}&fields=${encodeURIComponent('items(name),nextPageToken')}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const res = await fetchImpl(url, { headers: auth, cache: 'no-store' });
    if (!res.ok) throw storageError(res, 'list');
    const json = await res.json();
    for (const item of json.items || []) if (/_\d{6}_overview\.csv$/.test(item.name)) names.push(item.name);
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  if (!names.length) throw new SourceError('no installs reports in the bucket yet');

  // One small file per month since the app's first report.
  names.sort();
  const rows = [];
  for (const name of names) {
    const res = await fetchImpl(`${base}/${encodeURIComponent(name)}?alt=media`, { headers: auth, cache: 'no-store' });
    if (!res.ok) throw storageError(res, 'download');
    rows.push(...parseInstallsOverview(new Uint8Array(await res.arrayBuffer())));
  }
  return summariseInstalls(rows, days);
}
