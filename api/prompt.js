import { preflight, send, requireAuth, getBody, askAi } from './_lib.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    requireAuth(req);
    const answer = await askAi(getBody(req).prompt);
    return send(res, 200, { ok: true, answer });
  } catch (err) {
    return send(res, err.status || 500, { ok: false, error: err.message || String(err) });
  }
}
