import { preflight, send, getAgents } from './_lib.js';

export default function handler(req, res) {
  if (preflight(req, res)) return;
  return send(res, 200, { ok: true, agents: getAgents(), aiModel: process.env.AI_MODEL || 'fallback-vote' });
}
