// Runs fn and turns any failure into { ok: false, reason } so one broken source never breaks the page.
// The reason is a short, non-sensitive label shown next to "unavailable"; details go to the server log.
export async function safe(label, fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    console.warn(`[source unavailable] ${label}: ${err && err.message}`);
    return { ok: false, data: null, reason: reasonFor(err) };
  }
}

export class SourceError extends Error {
  constructor(reason, detail) {
    super(detail || reason);
    this.reason = reason;
  }
}

function reasonFor(err) {
  if (err instanceof SourceError) return err.reason;
  if (err && err.code === '42P01') return 'table not found';
  if (err && err.code === '42883') return 'function not found';
  return 'query failed';
}
