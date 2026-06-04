import { preflight, send, requireAuth, getBody, computeSignal } from './_lib.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    requireAuth(req);
    const result = await computeSignal(getBody(req));
    return send(res, 200, result);
  } catch (err) {
    return send(res, err.status || 500, { ok: false, error: err.message || String(err) });
  }
}
