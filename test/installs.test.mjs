// node --test (see package.json). No network: fetch is replaced by a stub in every test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import {
  decodeReport, parseInstallsOverview, summariseInstalls, readServiceAccountKey, readPlayInstalls,
} from '../lib/playReports.js';
import { readDiscordApp, DISCORD_APP_ID } from '../lib/discordApp.js';
import { safe } from '../lib/safe.js';

// The header Play writes today (2026), and the encoding: UTF-16LE with a byte order mark.
const HEADER = 'Date,Package name,Daily Device Installs,Daily Device Uninstalls,Daily Device Upgrades,Total User Installs,' +
  'Daily User Installs,Daily User Uninstalls,Active Device Installs,Install events,Update events,Uninstall events';
const utf16 = (text) => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
const csv = (rows, header = HEADER) => [header, ...rows].join('\n') + '\n';
const SEPT = csv([
  '2026-09-23,com.d20loottracker.app,5,0,0,0,7,0,5,5,0,0',
  '2026-09-29,com.d20loottracker.app,0,0,0,0,0,1,12,0,5,1',
]);
const OCT = csv([
  '2026-10-01,com.d20loottracker.app,0,0,0,0,0,1,10,1,0,1',
  '2026-10-02,com.d20loottracker.app,1,0,0,0,1,0,11,1,0,0',
]);

test('reads the UTF-16LE overview file Play writes, by header name', () => {
  const rows = parseInstallsOverview(utf16(SEPT));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    date: '2026-09-23', deviceInstalls: 5, deviceUninstalls: 0, userInstalls: 7, userUninstalls: 0,
    activeDevices: 5, installEvents: 5, uninstallEvents: 0,
  });
  assert.equal(rows[1].userUninstalls, 1);
  assert.equal(rows[1].activeDevices, 12);
});

test('column order does not matter, and older or missing columns degrade to null', () => {
  const older = 'Date,Package Name,Current Device Installs,Daily Device Installs,Daily Device Uninstalls,' +
    'Daily Device Upgrades,Current User Installs,Total User Installs,Daily User Installs,Daily User Uninstalls,Installs on active devices';
  const [row] = parseInstallsOverview(utf16(csv(['2025-01-02,com.x,9,2,1,0,8,8,3,1,7'], older)));
  assert.equal(row.deviceInstalls, 2);
  assert.equal(row.userInstalls, 3);
  assert.equal(row.activeDevices, 7);
  assert.equal(row.installEvents, null);
});

test('also reads UTF-8, UTF-16BE and BOM-less UTF-16LE with CRLF line ends', () => {
  const text = SEPT.replace(/\n/g, '\r\n');
  const be = Buffer.from(text, 'utf16le');
  be.swap16();
  for (const bytes of [
    Buffer.from(text, 'utf8'),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]),
    Buffer.concat([Buffer.from([0xfe, 0xff]), be]),
    Buffer.from(text, 'utf16le'),
  ]) {
    assert.equal(decodeReport(bytes).split('\r\n')[0], HEADER);
    assert.equal(parseInstallsOverview(bytes).length, 2);
  }
});

test('a file with an unexpected header fails soft with a short reason', async () => {
  const r = await safe('play', async () => parseInstallsOverview(utf16('Something,Else\n1,2\n')));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'unexpected report format');
});

test('summary: 30 days ending on the latest reported day, gaps filled, totals and all-time', () => {
  const rows = [...parseInstallsOverview(utf16(SEPT)), ...parseInstallsOverview(utf16(OCT))];
  const s = summariseInstalls(rows, 30);
  assert.equal(s.latestDate, '2026-10-02');
  assert.equal(s.firstDate, '2026-09-23');
  assert.equal(s.series.length, 30);
  assert.equal(s.series[0].date, '2026-09-03');
  assert.equal(s.series.at(-1).date, '2026-10-02');
  assert.equal(s.latest.activeDevices, 11);
  assert.deepEqual(s.totals, { deviceInstalls: 6, userInstalls: 8, userUninstalls: 2, deviceUninstalls: 0 });
  assert.equal(s.allTimeUserInstalls, 8);
  // A day without a row: zero installs, no active-device value (a gap, not a fake zero).
  const gap = s.series.find((d) => d.date === '2026-09-24');
  assert.equal(gap.userInstalls, 0);
  assert.equal(gap.activeDevices, null);
});

test('summary: days outside the window still count toward all-time installs', () => {
  const rows = parseInstallsOverview(utf16(csv([
    '2026-08-01,p,4,0,0,0,4,0,4,4,0,0',
    '2026-10-02,p,1,0,0,0,2,0,5,1,0,0',
  ])));
  const s = summariseInstalls(rows, 30);
  assert.equal(s.totals.userInstalls, 2);
  assert.equal(s.allTimeUserInstalls, 6);
  assert.equal(summariseInstalls([], 30), null);
});

test('the key env var: missing, malformed, raw JSON and base64 JSON', () => {
  assert.throws(() => readServiceAccountKey(undefined), (e) => e.reason === 'GOOGLE_PLAY_SA_KEY not set');
  assert.throws(() => readServiceAccountKey('not json'), (e) => e.reason === 'GOOGLE_PLAY_SA_KEY is not a service account key');
  assert.throws(() => readServiceAccountKey('{"type":"authorized_user"}'), (e) => e.reason === 'GOOGLE_PLAY_SA_KEY is not a service account key');
  const json = JSON.stringify({ type: 'service_account', client_email: 'a@b.iam.gserviceaccount.com', private_key: 'k' });
  assert.equal(readServiceAccountKey(json).client_email, 'a@b.iam.gserviceaccount.com');
  assert.equal(readServiceAccountKey(Buffer.from(json).toString('base64')).client_email, 'a@b.iam.gserviceaccount.com');
});

// A throwaway key so the JWT can be signed; the token endpoint is stubbed.
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KEY = JSON.stringify({
  type: 'service_account',
  client_email: 'reader@test.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  private_key_id: 'test',
  token_uri: 'https://oauth2.googleapis.com/token',
});
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function storageStub({ listStatus = 200, items = [], files = {} } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push(url);
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      const assertion = new URLSearchParams(init.body).get('assertion');
      assert.equal(assertion.split('.').length, 3);
      return json(200, { access_token: 'tok', expires_in: 3600 });
    }
    assert.equal(init.headers.Authorization, 'Bearer tok');
    if (url.includes('/o?prefix=')) return listStatus === 200 ? json(200, { items }) : json(listStatus, { error: { code: listStatus } });
    const name = decodeURIComponent(url.split('/o/')[1].split('?')[0]);
    return new Response(files[name], { status: 200 });
  };
  return { fetchImpl, calls };
}

test('before Play grants access (403), the reader fails soft with "not available yet"', async () => {
  const { fetchImpl } = storageStub({ listStatus: 403 });
  const r = await safe('play', () => readPlayInstalls({ keyJson: KEY, fetchImpl }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /^not available yet/);
});

test('no key set: fails soft without calling Google', async () => {
  let called = false;
  const r = await safe('play', () => readPlayInstalls({ keyJson: '', fetchImpl: async () => { called = true; } }));
  assert.equal(r.reason, 'GOOGLE_PLAY_SA_KEY not set');
  assert.equal(called, false);
});

test('a rejected key (token endpoint error) fails soft', async () => {
  const r = await safe('play', () => readPlayInstalls({ keyJson: KEY, fetchImpl: async () => json(400, { error: 'invalid_grant' }) }));
  assert.equal(r.reason, 'Google sign-in failed');
});

test('reads every monthly overview file and ignores the other dimensions', async () => {
  const p = 'stats/installs/installs_com.d20loottracker.app_';
  const { fetchImpl, calls } = storageStub({
    items: [{ name: `${p}202610_overview.csv` }, { name: `${p}202610_country.csv` }, { name: `${p}202609_overview.csv` }],
    files: { [`${p}202609_overview.csv`]: utf16(SEPT), [`${p}202610_overview.csv`]: utf16(OCT) },
  });
  const s = await readPlayInstalls({ keyJson: KEY, fetchImpl });
  assert.equal(s.latestDate, '2026-10-02');
  assert.equal(s.allTimeUserInstalls, 8);
  assert.equal(calls.filter((u) => u.includes('country')).length, 0);
});

test('an empty bucket fails soft', async () => {
  const { fetchImpl } = storageStub({ items: [] });
  const r = await safe('play', () => readPlayInstalls({ keyJson: KEY, fetchImpl }));
  assert.equal(r.reason, 'no installs reports in the bucket yet');
});

test('Discord: server count from /applications/@me', async () => {
  const fetchImpl = async (url, init) => {
    assert.equal(url, 'https://discord.com/api/v10/applications/@me');
    assert.equal(init.headers.Authorization, 'Bot t');
    return json(200, { id: DISCORD_APP_ID, approximate_guild_count: 3 });
  };
  assert.deepEqual(await readDiscordApp({ token: 't', fetchImpl }), { servers: 3 });
});

test('Discord: missing token, rejected token and another app\'s token fail soft', async () => {
  assert.equal((await safe('d', () => readDiscordApp({ token: '' }))).reason, 'DISCORD_BOT_TOKEN not set');
  assert.equal((await safe('d', () => readDiscordApp({ token: 't', fetchImpl: async () => json(401, {}) }))).reason, 'bot token rejected');
  const other = async () => json(200, { id: '1', approximate_guild_count: 1 });
  assert.equal((await safe('d', () => readDiscordApp({ token: 't', fetchImpl: other }))).reason, 'token is for a different Discord app');
});

test('Foundry: a missing foundry_package_hits table reads as "table not found" (shown as tracking not started)', async () => {
  const r = await safe('foundry_package_hits', async () => {
    throw Object.assign(new Error('relation "public.foundry_package_hits" does not exist'), { code: '42P01' });
  });
  assert.equal(r.reason, 'table not found');
});
