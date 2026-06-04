import { preflight, send, requireAuth, fetchQuote } from './_lib.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    requireAuth(req);
    const quote = await fetchQuote(req.query?.symbol || 'XAUUSD');
    return send(res, 200, { ok: true, ...quote });
  } catch (err) {
    return send(res, err.status || 500, { ok: false, error: err.message || String(err) });
  }
}
