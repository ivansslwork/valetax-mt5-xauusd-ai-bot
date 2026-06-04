import { preflight, send } from './_lib.js';

export default function handler(req, res) {
  if (preflight(req, res)) return;
  return send(res, 200, { ok: true, service: 'valetax-mt5-ai-bot-vercel', time: new Date().toISOString() });
}
