import { preflight, send, requireAuth, computeSignal } from './_lib.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    requireAuth(req);
    const result = await computeSignal(req.query || {});
    return send(res, 200, {
      ok: true,
      symbol: result.symbol,
      mt5Login: result.account?.mt5Login || '',
      mt5Server: result.account?.mt5Server || '',
      action: result.action,
      direction: result.direction,
      confidence: result.confidence,
      lotRiskPercent: result.risk.riskPercent,
      slPoints: result.risk.slPoints,
      tpPoints: result.risk.tpPoints,
      maxSpreadPoints: result.risk.maxSpreadPoints,
      reason: result.summary,
      time: result.time
    });
  } catch (err) {
    return send(res, err.status || 500, { ok: false, error: err.message || String(err) });
  }
}
