// sentry.io error monitoring, server-side only. Cached for 5 minutes.
// Endpoints (docs.sentry.io/api):
//   GET /api/0/organizations/{org}/issues/     (scope event:read)  unresolved issues
//   GET /api/0/organizations/{org}/stats_v2/   (scope org:read)    accepted error events
import { unstable_cache } from 'next/cache';
import { safe, SourceError } from './safe';

const BASE = 'https://sentry.io/api/0';

function config() {
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) throw new SourceError('SENTRY_AUTH_TOKEN not set');
  return {
    token,
    org: process.env.SENTRY_ORG || 'd20-loot-tracker',
    project: process.env.SENTRY_PROJECT || '-1',
  };
}

async function sentryGet(path, token) {
  const res = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) {
    throw new SourceError('token lacks access', `sentry ${res.status} on ${path.split('?')[0]}`);
  }
  if (!res.ok) throw new SourceError(`sentry HTTP ${res.status}`);
  return res;
}

function nextCursor(link) {
  // Link: <...>; rel="next"; results="true"; cursor="..."
  const m = /<[^>]*>;\s*rel="next";\s*results="true";\s*cursor="([^"]+)"/.exec(link || '');
  return m ? m[1] : null;
}

async function countUnresolved() {
  const { token, org, project } = config();
  const base = `/organizations/${encodeURIComponent(org)}/issues/?query=${encodeURIComponent('is:unresolved')}` +
    `&project=${encodeURIComponent(project)}&statsPeriod=90d&limit=100`;
  let res = await sentryGet(base, token);
  const hits = res.headers.get('x-hits');
  if (hits !== null && hits !== '') return { count: Number(hits), capped: false };
  // No X-Hits header: count by paging (at most 10 pages).
  let count = (await res.json()).length;
  for (let page = 1; page < 10; page++) {
    const cursor = nextCursor(res.headers.get('link'));
    if (!cursor) return { count, capped: false };
    res = await sentryGet(`${base}&cursor=${encodeURIComponent(cursor)}`, token);
    count += (await res.json()).length;
  }
  return { count, capped: true };
}

async function acceptedErrors(statsPeriod, interval) {
  const { token, org, project } = config();
  const path = `/organizations/${encodeURIComponent(org)}/stats_v2/?field=${encodeURIComponent('sum(quantity)')}` +
    `&groupBy=outcome&category=error&outcome=accepted&statsPeriod=${statsPeriod}&interval=${interval}` +
    `&project=${encodeURIComponent(project)}`;
  const json = await (await sentryGet(path, token)).json();
  return (json.groups || []).reduce((s, g) => s + (Number(g.totals?.['sum(quantity)']) || 0), 0);
}

const cachedUnresolved = unstable_cache(countUnresolved, ['sentry-unresolved-v1'], { revalidate: 300 });
const cachedErrors = unstable_cache(acceptedErrors, ['sentry-errors-v1'], { revalidate: 300 });

export async function getSentryMetrics() {
  const [unresolved, events24h, events7d] = await Promise.all([
    safe('sentry issues', () => cachedUnresolved()),
    safe('sentry stats 24h', () => cachedErrors('24h', '1h')),
    safe('sentry stats 7d', () => cachedErrors('7d', '1d')),
  ]);
  return {
    unresolved: unresolved.data,
    unresolvedReason: unresolved.reason,
    events24h: events24h.data,
    events7d: events7d.data,
    eventsReason: events24h.reason || events7d.reason,
  };
}
