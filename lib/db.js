// Server-only Postgres access. Never import this from a client component.
import pg from 'pg';

const { Pool } = pg;
const DATE_OID = 1082;

// Keep Postgres `date` values as 'YYYY-MM-DD' strings. pg's default turns them into
// local-midnight Date objects, which shifts the day and breaks the daily charts.
const types = {
  getTypeParser: (oid, format) => (oid === DATE_OID ? (v) => v : pg.types.getTypeParser(oid, format)),
};

function makePool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const pool = new Pool({
    connectionString,
    // Supabase pooler presents a certificate chain Node does not trust by default.
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    query_timeout: 15_000,
    types,
  });
  pool.on('error', (err) => console.error('pg pool error:', err.message));
  return pool;
}

function getPool() {
  // Reuse one pool per server process (and across dev hot reloads).
  if (!globalThis.__d20DashPool) globalThis.__d20DashPool = makePool();
  return globalThis.__d20DashPool;
}

// PostgREST used to hand bigint/numeric back as JSON numbers; pg returns them as strings.
// Normalise numeric-looking strings so the charts keep receiving numbers.
const NUMERIC = /^-?\d+(\.\d+)?$/;
function normalise(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'string' && NUMERIC.test(v) ? Number(v) : v;
  }
  return out;
}

export async function query(text, params = []) {
  const res = await getPool().query(text, params);
  return res.rows.map(normalise);
}
