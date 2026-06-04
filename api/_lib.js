const DEFAULT_AGENTS = [
  { id: "trend", name: "Trend Agent", weight: 0.26, icon: "📈" },
  { id: "momentum", name: "Momentum Agent", weight: 0.22, icon: "⚡" },
  { id: "volatility", name: "Volatility Agent", weight: 0.18, icon: "🌊" },
  { id: "pattern", name: "Price Action Agent", weight: 0.18, icon: "🕯️" },
  { id: "risk", name: "Risk Guard Agent", weight: 0.16, icon: "🛡️" }
];

export function send(res, status, obj) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,authorization,x-app-token");
  return res.status(status).json(obj);
}

export function preflight(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type,authorization,x-app-token");
    res.status(204).end();
    return true;
  }
  return false;
}

export function requireAuth(req) {
  const expected = process.env.APP_TOKEN;
  if (!expected) return;
  const auth = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const token = req.headers["x-app-token"] || auth || req.query?.token;
  if (token !== expected) {
    const err = new Error("Unauthorized: set APP_TOKEN in Vercel env and UI/EA.");
    err.status = 401;
    throw err;
  }
}

export function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

export function getAgents() { return DEFAULT_AGENTS; }

export async function computeSignal(input) {
  const normalized = normalizeInput(input || {});
  const agents = evaluateAgents(normalized);
  const fallback = weightedVote(agents, normalized);
  const aiDecision = await aiConsensus(normalized, agents, fallback);
  const chosen = sanitizeDecision(aiDecision || fallback, fallback);
  const risk = riskPlan(normalized, chosen);
  return {
    ok: true,
    time: new Date().toISOString(),
    symbol: normalized.symbol,
    account: {
      mt5Login: normalized.mt5Login,
      mt5Server: normalized.mt5Server,
      accountType: normalized.accountType
    },
    action: chosen.action,
    direction: chosen.direction,
    confidence: chosen.confidence,
    summary: chosen.summary,
    risk,
    agents,
    warning: "Scaffold edukasi/teknis, bukan nasihat finansial. Test akun demo terlebih dahulu. Tidak ada jaminan profit."
  };
}

export async function fetchQuote(symbol = "XAUUSD") {
  const clean = String(symbol || "XAUUSD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "XAUUSD";
  const stooqSymbol = clean === "XAUUSD" ? "xauusd" : clean.toLowerCase();
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
  const r = await fetch(url, { headers: { "user-agent": "ValetaxVercelAIBot/1.0" } });
  if (!r.ok) throw Object.assign(new Error(`Quote provider HTTP ${r.status}`), { status: 502 });
  const text = await r.text();
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw Object.assign(new Error("Quote provider returned no data"), { status: 502 });
  const row = parseCsvLine(lines[1]);
  const [providerSymbol, date, time, open, high, low, close] = row;
  const price = num(close, NaN);
  if (!Number.isFinite(price)) throw Object.assign(new Error("Quote provider returned invalid price"), { status: 502 });
  return {
    symbol: clean,
    provider: "stooq",
    providerSymbol,
    price,
    open: num(open, 0),
    high: num(high, 0),
    low: num(low, 0),
    close: price,
    quoteTime: `${date} ${time} UTC`,
    fetchedAt: new Date().toISOString(),
    note: "Harga referensi; harga broker Valetax/MT5 dapat berbeda. EA memakai bid/ask dari MT5."
  };
}

export async function askAi(prompt) {
  const text = String(prompt || "").slice(0, 4000);
  if (!text) throw Object.assign(new Error("prompt required"), { status: 400 });
  const response = await runCloudflareAi([
    { role: "system", content: "You are a concise trading-risk assistant. Never guarantee profit. Always mention risk management." },
    { role: "user", content: text }
  ]);
  return response;
}

function evaluateAgents(input) {
  const emaFast = num(input.emaFast);
  const emaSlow = num(input.emaSlow);
  const rsi = num(input.rsi, 50);
  const atrPoints = num(input.atrPoints, 0);
  const price = num(input.price, 0);
  const spreadPoints = num(input.spreadPoints, 0);
  const candleDir = String(input.candleDir || "neutral").toLowerCase();
  const trendScore = emaFast && emaSlow ? clamp((emaFast - emaSlow) / Math.max(Math.abs(emaSlow), 0.00001) * 12000, -100, 100) : 0;
  const momentumScore = clamp((rsi - 50) * 2.2, -100, 100);
  const volRatio = price > 0 ? (atrPoints / Math.max(price, 0.00001)) * 10000 : atrPoints;
  const volPenalty = volRatio > 40 ? -25 : volRatio < 2 && volRatio > 0 ? -10 : 10;
  const patternScore = candleDir.startsWith("bull") ? 45 : candleDir.startsWith("bear") ? -45 : 0;
  const riskScore = spreadPoints > num(input.maxSpreadPoints, 35) ? 0 : 25;
  return [
    buildAgent("trend", trendScore, "EMA fast vs EMA slow"),
    buildAgent("momentum", momentumScore, `RSI ${round(rsi, 2)}`),
    buildAgent("volatility", volPenalty, `ATR/spread filter ${round(volRatio, 2)}`),
    buildAgent("pattern", patternScore, `Candle direction ${candleDir}`),
    buildAgent("risk", riskScore, `Spread ${spreadPoints} pts`)
  ];
}

function buildAgent(id, score, reason) {
  const meta = DEFAULT_AGENTS.find(a => a.id === id);
  const direction = score > 12 ? "bullish" : score < -12 ? "bearish" : "neutral";
  const confidence = Math.round(clamp(Math.abs(score), 0, 100));
  return { ...meta, score: Math.round(score), direction, confidence, reason };
}

function weightedVote(agents, input) {
  const weighted = agents.reduce((sum, a) => sum + a.score * a.weight, 0);
  const confidence = Math.round(clamp(Math.abs(weighted) * 1.6 + 35, 0, 100));
  const minConfidence = num(input.minConfidence, num(process.env.DEFAULT_MIN_CONFIDENCE, 65));
  let action = "hold";
  let direction = "neutral";
  if (confidence >= minConfidence && weighted > 12) { action = "buy"; direction = "bullish"; }
  if (confidence >= minConfidence && weighted < -12) { action = "sell"; direction = "bearish"; }
  return { action, direction, confidence, summary: `Weighted 5-agent vote: ${round(weighted, 2)}. Minimum confidence: ${minConfidence}.` };
}

async function aiConsensus(input, agents, fallback) {
  const hasCf = process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN;
  if (!hasCf) return fallback;
  const compact = { input, agents, fallback };
  const prompt = `Return ONLY valid JSON with keys action(buy/sell/hold), direction(bullish/bearish/neutral), confidence(0-100), summary. Prefer HOLD when uncertain. Data: ${JSON.stringify(compact).slice(0, 7000)}`;
  try {
    const text = await runCloudflareAi([
      { role: "system", content: "You are a conservative MT5 trading signal consensus engine. You do not guarantee profit." },
      { role: "user", content: prompt }
    ]);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    return JSON.parse(match[0]);
  } catch {
    return fallback;
  }
}

async function runCloudflareAi(messages) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const model = process.env.AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";
  if (!accountId || !apiToken) return "Cloudflare AI REST env not configured on Vercel. Fallback rules are active.";
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${encodeURIComponent(model)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "authorization": `Bearer ${apiToken}`, "content-type": "application/json" },
    body: JSON.stringify({ messages, max_tokens: 512, temperature: 0.2 })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.errors?.[0]?.message || `Cloudflare AI HTTP ${r.status}`);
  return j?.result?.response || j?.response || JSON.stringify(j);
}

function sanitizeDecision(value, fallback) {
  const action = ["buy", "sell", "hold"].includes(String(value.action).toLowerCase()) ? String(value.action).toLowerCase() : fallback.action;
  const direction = action === "buy" ? "bullish" : action === "sell" ? "bearish" : "neutral";
  return {
    action,
    direction,
    confidence: Math.round(clamp(num(value.confidence, fallback.confidence), 0, 100)),
    summary: String(value.summary || fallback.summary).slice(0, 240)
  };
}

function riskPlan(input, decision) {
  const riskPercent = clamp(num(input.riskPercent, num(process.env.DEFAULT_MAX_RISK_PERCENT, 1)), 0.1, 5);
  const atr = num(input.atrPoints, 0);
  const rr = clamp(num(input.rr, 1.5), 0.5, 5);
  const rawSl = num(input.slPoints, 0);
  const slBasis = rawSl > 0 ? rawSl : (atr ? atr * 1.5 : 250);
  const slPoints = Math.round(clamp(slBasis, 20, 10000));
  const rawTp = num(input.tpPoints, 0);
  const tpBasis = rawTp > 0 ? rawTp : slPoints * rr;
  const tpPoints = Math.round(clamp(tpBasis, 20, 50000));
  const maxSpreadPoints = Math.round(clamp(num(input.maxSpreadPoints, 35), 1, 1000));
  return { riskPercent, slPoints, tpPoints, rr, maxSpreadPoints, allowed: decision.action !== "hold" && decision.confidence >= num(input.minConfidence, 65) };
}

function normalizeInput(raw) {
  return {
    symbol: String(raw.symbol || raw.pair || "XAUUSD").toUpperCase().slice(0, 24),
    pairLink: String(raw.pairLink || raw.link || "").slice(0, 500),
    price: num(raw.price, 0),
    emaFast: num(raw.emaFast, 0),
    emaSlow: num(raw.emaSlow, 0),
    rsi: num(raw.rsi, 50),
    atrPoints: num(raw.atrPoints, 0),
    spreadPoints: num(raw.spreadPoints, 0),
    candleDir: String(raw.candleDir || "neutral").slice(0, 16),
    riskPercent: num(raw.riskPercent, 1),
    minConfidence: num(raw.minConfidence, 65),
    maxSpreadPoints: num(raw.maxSpreadPoints, 35),
    slPoints: num(raw.slPoints, 0),
    tpPoints: num(raw.tpPoints, 0),
    rr: num(raw.rr, 1.5),
    mt5Login: String(raw.mt5Login || raw.accountLogin || "").replace(/[^0-9]/g, "").slice(0, 32),
    mt5Server: String(raw.mt5Server || raw.accountServer || "").slice(0, 80),
    accountType: ["demo", "live"].includes(String(raw.accountType).toLowerCase()) ? String(raw.accountType).toLowerCase() : "demo"
  };
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === "," && !quoted) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function num(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function round(n, digits = 2) { return Math.round(n * 10 ** digits) / 10 ** digits; }
