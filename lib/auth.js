// Signed session cookie shared by proxy.js, the login action and the page.
// Uses Web Crypto so it runs anywhere Next runs. Token format: "<expiry epoch seconds>.<base64url HMAC-SHA256>".
export const SESSION_COOKIE = 'd20dash_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const enc = new TextEncoder();

function secret() {
  const s = process.env.DASHBOARD_SESSION_SECRET;
  // Refuse to sign or accept anything with a missing or trivially short secret.
  return s && s.length >= 32 ? s : null;
}

async function hmacKey(s) {
  return crypto.subtle.importKey('raw', enc.encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

export async function createSessionToken() {
  const s = secret();
  if (!s) throw new Error('DASHBOARD_SESSION_SECRET missing or shorter than 32 characters');
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(s), enc.encode(`v1:${exp}`));
  return `${exp}.${b64url(sig)}`;
}

export async function verifySessionToken(token) {
  const s = secret();
  if (!s || typeof token !== 'string') return false;
  const m = /^(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!m) return false;
  const exp = Number(m[1]);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  // crypto.subtle.verify compares the MAC in constant time.
  return crypto.subtle.verify('HMAC', await hmacKey(s), Buffer.from(m[2], 'base64url'), enc.encode(`v1:${exp}`));
}

// Constant-time password check: compare HMACs of equal length rather than the raw strings.
export async function passwordMatches(candidate) {
  const expected = process.env.DASHBOARD_PASSWORD;
  const s = secret();
  if (!expected || !s || typeof candidate !== 'string') return false;
  const key = await hmacKey(s);
  const [a, b] = await Promise.all([
    crypto.subtle.sign('HMAC', key, enc.encode(`pw:${candidate}`)),
    crypto.subtle.sign('HMAC', key, enc.encode(`pw:${expected}`)),
  ]);
  const { timingSafeEqual } = await import('node:crypto');
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
