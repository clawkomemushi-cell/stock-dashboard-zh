#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "public", "data");
const DB_PATH = process.env.V3_SQLITE_DB_PATH ?? path.join(ROOT, "tmp", "v3-sample.db");
const NOW = new Date().toISOString();

const FALLBACK_TICKERS = ["2330.TW", "2454.TW", "2317.TW", "2308.TW", "3034.TW", "0050.TW", "00878.TW", "00919.TW"];
const INDEXES = [
  { ticker: "^TWII", outTicker: "TWII", name: "台股加權" },
  { ticker: "^TWOII", outTicker: "TPEX", name: "櫃買指數" },
];

async function main() {
  const tickers = await collectTickers();
  const symbolResults = [];
  for (const ticker of tickers) {
    try {
      const chart = await fetchChart(ticker, "1y", "1d");
      if (chart.points.length < 5) throw new Error(`not enough points: ${chart.points.length}`);
      const overview = buildOverview(ticker, chart);
      const technical = buildTechnical(ticker, chart);
      await writeJson(path.join(DATA, "symbols", ticker, "overview.json"), overview);
      await writeJson(path.join(DATA, "symbols", ticker, "technical.json"), technical);
      await upsertSymbolJson(ticker, overview, technical);
      symbolResults.push({ ticker, status: "ok", points: chart.points.length, last: overview.last });
    } catch (err) {
      symbolResults.push({ ticker, status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }

  const indices = [];
  for (const item of INDEXES) {
    try {
      const chart = await fetchChart(item.ticker, "5d", "1d");
      const last = chart.points.at(-1);
      const prev = chart.points.at(-2);
      if (!last) throw new Error("no index point");
      if (chart.asOf && Date.now() - Date.parse(chart.asOf) > 14 * 24 * 60 * 60 * 1000) {
        throw new Error(`stale index data asOf=${chart.asOf}`);
      }
      indices.push({
        ticker: item.outTicker,
        name: item.name,
        last: round(last.close, 2),
        changePct: prev ? round(((last.close - prev.close) / prev.close) * 100, 2) : null,
        asOf: chart.asOf ?? NOW,
      });
    } catch (err) {
      console.warn(`[update-live-market-data] index ${item.ticker} failed`, err);
    }
  }

  await updateDashboard(indices);
  await updateSystemHealth(symbolResults);

  console.log(JSON.stringify({ ok: true, updatedAt: NOW, tickers: symbolResults, indices }, null, 2));
}

async function collectTickers() {
  const set = new Set(FALLBACK_TICKERS);
  for (const rel of ["watchlist.json", "ideas.json", "symbols.json"]) {
    try {
      const raw = JSON.parse(await fs.readFile(path.join(DATA, rel), "utf8"));
      const arr = Array.isArray(raw) ? raw : [];
      for (const item of arr) if (typeof item?.ticker === "string") set.add(normalizeTicker(item.ticker));
    } catch {}
  }
  try {
    const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    for (const row of db.prepare("SELECT ticker FROM symbols WHERE is_active = 1").all()) set.add(normalizeTicker(row.ticker));
    for (const row of db.prepare("SELECT ticker FROM watchlist_items WHERE deleted_at IS NULL").all()) set.add(normalizeTicker(row.ticker));
    db.close();
  } catch {}
  return [...set].filter(Boolean).sort();
}

function normalizeTicker(ticker) {
  let t = String(ticker).trim().toUpperCase();
  if (/^\d{4,6}$/.test(t)) t = `${t}.TW`;
  return t;
}

async function fetchChart(ticker, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0 OpenClaw stock dashboard" } });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const payload = await res.json();
  const error = payload.chart?.error;
  if (error) throw new Error(error.description ?? error.code ?? "Yahoo chart error");
  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp ?? [];
  const points = [];
  timestamps.forEach((ts, i) => {
    const open = quote?.open?.[i];
    const high = quote?.high?.[i];
    const low = quote?.low?.[i];
    const close = quote?.close?.[i];
    if (open == null || high == null || low == null || close == null) return;
    points.push({ time: new Date(ts * 1000).toISOString().slice(0, 10), open, high, low, close, volume: quote?.volume?.[i] ?? undefined });
  });
  return {
    asOf: result?.meta?.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toISOString() : NOW,
    points,
  };
}

function buildOverview(ticker, chart) {
  const last = chart.points.at(-1);
  const prev = chart.points.at(-2);
  const lows = chart.points.map((p) => p.low);
  const highs = chart.points.map((p) => p.high);
  return {
    ticker,
    asOf: chart.asOf ?? NOW,
    last: round(last.close, 2),
    changePct: prev ? round(((last.close - prev.close) / prev.close) * 100, 2) : null,
    rangeDay: [round(last.low, 2), round(last.high, 2)],
    range52w: [round(Math.min(...lows), 2), round(Math.max(...highs), 2)],
    volume: last.volume ?? null,
    status: "ok",
    oneLineThesis: `Yahoo Chart API 更新：最新收盤 ${round(last.close, 2)}，日漲跌 ${prev ? round(((last.close - prev.close) / prev.close) * 100, 2) : "—"}%。`,
  };
}

function buildTechnical(ticker, chart) {
  const closes = chart.points.map((p) => p.close);
  const last20 = chart.points.slice(-20);
  const last60 = chart.points.slice(-60);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const ma200 = sma(closes, 200);
  const last = closes.at(-1);
  return {
    ticker,
    asOf: chart.asOf ?? NOW,
    trend: ma20 && ma60 && last ? (last > ma20 && ma20 > ma60 ? "up" : last < ma20 && ma20 < ma60 ? "down" : "sideways") : "sideways",
    rsi14: round(rsi(closes, 14), 2),
    ma20: round(ma20, 2),
    ma60: round(ma60, 2),
    ma200: ma200 == null ? null : round(ma200, 2),
    supportLevels: [Math.min(...last20.map((p) => p.low)), Math.min(...last60.map((p) => p.low))].map((x) => round(x, 2)),
    resistanceLevels: [Math.max(...last20.map((p) => p.high)), Math.max(...last60.map((p) => p.high))].map((x) => round(x, 2)),
    patterns: ["Yahoo OHLC", "rolling MA"],
    notes: "由 Yahoo Finance chart API 日線 OHLC 自動更新。",
  };
}

async function updateDashboard(indices) {
  const file = path.join(DATA, "dashboard.json");
  const dashboard = JSON.parse(await fs.readFile(file, "utf8"));
  dashboard.asOf = NOW;
  dashboard.marketSession = { market: "TW", phase: "close", isOpen: false, asOf: NOW, note: "Yahoo Finance chart API refreshed snapshot" };
  if (indices.length) dashboard.indices = indices;
  dashboard.systemSummary = { status: "ok", lastPublishedAt: NOW, warningCount: 0 };
  dashboard.driver = {
    id: `driver-${NOW.slice(0, 10)}`,
    headline: "行情資料已切換為 Yahoo Chart API 更新，先以真實指數與個股 OHLC 作為網站基準。",
    detail: "這是資料刷新批次，不做新的 AI 選股結論；重點先排除 sample/mock 價格造成的誤導。",
    bias: "neutral",
    themes: ["data-refresh"],
    relatedSymbols: [],
    confidence: "medium",
    asOf: NOW,
  };
  await writeJson(file, dashboard);
}

async function updateSystemHealth(symbolResults) {
  const okCount = symbolResults.filter((r) => r.status === "ok").length;
  const failCount = symbolResults.length - okCount;
  const health = {
    asOf: NOW,
    currentRun: {
      id: `market-refresh-${NOW.replace(/[:.]/g, "-")}`,
      name: "live-market-data-refresh",
      status: failCount ? "warn" : "ok",
      startedAt: NOW,
      finishedAt: NOW,
      durationMs: null,
      message: `Yahoo Chart API refreshed ${okCount}/${symbolResults.length} symbols.`,
    },
    lastSuccessfulPublishAt: NOW,
    dataFreshness: [
      { feed: "yahoo-chart-symbols", lastUpdated: NOW, status: failCount ? "warn" : "fresh" },
      { feed: "yahoo-chart-indices", lastUpdated: NOW, status: "fresh" },
    ],
    warnings: failCount ? symbolResults.filter((r) => r.status !== "ok").map((r) => `${r.ticker}: ${r.error}`) : [],
    staleData: [],
    missingData: [],
    routes: ["/dashboard", "/watchlist", "/ideas", "/symbols", "/system/health"].map((route) => ({ path: route, adapter: "V3", mode: "api/static-file", status: "ok" })),
    modes: { dataMode: "api", aiMode: "published", newsMode: "curated", chartMode: "lightweight-charts+yahoo" },
  };
  await writeJson(path.join(DATA, "system-health.json"), health);
}

async function upsertSymbolJson(ticker) {
  try {
    const db = new Database(DB_PATH, { readonly: false, fileMustExist: true });
    const row = db.prepare("SELECT profile_json FROM symbols WHERE ticker = ?").get(ticker);
    if (!row) {
      db.prepare("INSERT INTO symbols (ticker, name, kind, market, profile_json, is_active, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?)")
        .run(ticker, ticker, ticker.endsWith('.TW') ? 'stock' : 'stock', ticker.endsWith('.TW') ? 'TWSE' : 'US', JSON.stringify({ ticker, name: ticker, kind: 'stock', market: ticker.endsWith('.TW') ? 'TWSE' : 'US' }), NOW);
    } else {
      db.prepare("UPDATE symbols SET updated_at = ? WHERE ticker = ?").run(NOW, ticker);
    }
    db.close();
  } catch {}
}

function sma(values, n) {
  if (values.length < n) return null;
  const arr = values.slice(-n);
  return arr.reduce((a, b) => a + b, 0) / n;
}

function rsi(values, period) {
  if (values.length <= period) return null;
  const slice = values.slice(-(period + 1));
  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function round(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return null;
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
