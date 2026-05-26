#!/usr/bin/env node
/**
 * run-v3-intraday-checkpoint.mjs
 *
 * Intraday silent checkpoint + dedup MVP for V3 stock dashboard.
 * Fetches live quotes, checks candidates/watchlist/positions, generates
 * DailyCheckpoint entries, and deduplicates so the same event does not
 * repeat across phases.
 *
 * Usage:
 *   node scripts/run-v3-intraday-checkpoint.mjs            # dry-run (default)
 *   node scripts/run-v3-intraday-checkpoint.mjs --dry-run  # explicit dry-run
 *   node scripts/run-v3-intraday-checkpoint.mjs --write    # write to public/data + dedup state
 *
 * Options:
 *   --phase <pre|open-track|mid|close|evening>   Override phase (default: auto from TW time)
 *   --db <path>                                  Also write checkpoints to symbol_insights in this SQLite DB
 *   --dry-run                                    Print only, no file writes (DEFAULT)
 *   --write                                      Actually write today.json and dedup state
 *   --data-root <path>                           Override public/data root (for temp write validation)
 *   --state-path <path>                          Override dedup state file path (for temp write validation)
 *
 * Safety guarantees:
 *   - Default is dry-run; --write must be explicit
 *   - Never sends Discord or external notifications
 *   - Never enables cron or modifies cron configs
 *   - Dedup state in tmp/v3-intraday-dedup-state.json prevents repeat alerts per session
 *   - DB writes are append-only (no deletes/updates to existing rows)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const TMP = path.join(ROOT, "tmp");

// ─────────────────────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = true; // default
  let phaseOverride = null;
  let dbPath = null;
  let dataRoot = null;
  let statePath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--write") dryRun = false;
    else if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--phase" && args[i + 1]) phaseOverride = args[++i];
    else if (args[i] === "--db" && args[i + 1]) dbPath = path.resolve(ROOT, args[++i]);
    else if (args[i] === "--data-root" && args[i + 1]) dataRoot = path.resolve(ROOT, args[++i]);
    else if (args[i] === "--state-path" && args[i + 1]) statePath = path.resolve(ROOT, args[++i]);
  }

  return { dryRun, phaseOverride, dbPath, dataRoot, statePath };
}

// ─────────────────────────────────────────────────────────────
// TW time + phase detection
// ─────────────────────────────────────────────────────────────

function getTwNow() {
  const now = new Date();
  const twStr = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(now)
    .replace(" ", "T") + "+08:00";

  const date = twStr.slice(0, 10);
  const hour = parseInt(twStr.slice(11, 13), 10);
  const minute = parseInt(twStr.slice(14, 16), 10);
  const totalMin = hour * 60 + minute;

  return { now, twStr, date, hour, minute, totalMin };
}

function detectPhase(totalMin) {
  // Taiwan market: 09:00-13:30
  if (totalMin < 8 * 60) return "after"; // before 08:00 → after (overnight)
  if (totalMin < 9 * 60) return "pre"; // 08:00-08:59 → pre-market
  if (totalMin < 9 * 60 + 30) return "open-track"; // 09:00-09:29 → open check
  if (totalMin < 11 * 60 + 30) return "mid"; // 09:30-11:29 → mid morning
  if (totalMin < 13 * 60 + 35) return "mid"; // 11:30-13:34 → mid (noon+pre-close)
  if (totalMin < 18 * 60) return "close"; // 13:35-17:59 → post-close
  return "evening"; // 18:00+ → evening
}

// ─────────────────────────────────────────────────────────────
// JSON helpers
// ─────────────────────────────────────────────────────────────

async function readJson(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(filePath, data) {
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// ─────────────────────────────────────────────────────────────
// Yahoo Finance quote fetch
// ─────────────────────────────────────────────────────────────

async function fetchQuote(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=1d`;
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 OpenClaw stock dashboard",
      },
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const result = payload.chart?.result?.[0];
    if (!result) return null;
    const quote = result.indicators?.quote?.[0];
    const timestamps = result.timestamp ?? [];
    const points = [];
    timestamps.forEach((ts, i) => {
      const close = quote?.close?.[i];
      if (close == null) return;
      points.push({
        time: new Date(ts * 1000).toISOString().slice(0, 10),
        close,
        volume: quote?.volume?.[i] ?? null,
      });
    });
    if (points.length === 0) return null;
    const last = points.at(-1);
    const prev = points.at(-2);
    const changePct = prev ? ((last.close - prev.close) / prev.close) * 100 : null;
    return {
      ticker,
      asOf: result.meta?.regularMarketTime
        ? new Date(result.meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
      last: last.close,
      prev: prev?.close ?? null,
      changePct: changePct !== null ? Math.round(changePct * 100) / 100 : null,
      volume: last.volume,
    };
  } catch {
    return null;
  }
}

async function fetchAllQuotes(tickers) {
  const results = new Map();
  for (const ticker of tickers) {
    const q = await fetchQuote(ticker);
    if (q) results.set(ticker, q);
  }
  return results;
}

// ─────────────────────────────────────────────────────────────
// Dedup state
// ─────────────────────────────────────────────────────────────

async function loadDedupState(dedupStatePath) {
  const raw = await readJson(dedupStatePath);
  if (!raw || typeof raw !== "object") return { seen: {} };
  return raw;
}

function makeDedupKey(date, phase, ticker, eventType, direction) {
  return [date, phase, ticker ?? "MARKET", eventType, direction ?? ""].join("|");
}

// ─────────────────────────────────────────────────────────────
// Evidence staleness check
// ─────────────────────────────────────────────────────────────

function isStaleEvidence(asOfStr, tradingDaysThreshold = 2) {
  if (!asOfStr) return true;
  try {
    const asOf = new Date(asOfStr);
    const now = new Date();
    const diffMs = now - asOf;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > tradingDaysThreshold;
  } catch {
    return true;
  }
}

// ─────────────────────────────────────────────────────────────
// Alert candidate building
// ─────────────────────────────────────────────────────────────

function buildCandidateAlerts(ideas, quotes) {
  const alerts = [];

  for (const idea of ideas) {
    if (!["starter", "watch"].includes(idea.role ?? "")) continue;
    const ticker = idea.ticker;
    const q = quotes.get(ticker);

    // Evidence staleness
    const evidenceAsOf = idea.evidence?.dataAsOf ?? idea.asOf;
    if (isStaleEvidence(evidenceAsOf, 2)) {
      alerts.push({
        ticker,
        eventType: "stale-evidence",
        direction: null,
        priority: "medium",
        message: `${idea.name ?? ticker} 的 evidence 已超過 2 個交易日（asOf: ${evidenceAsOf ?? "unknown"}），建議更新。`,
        shouldNotify: false,
      });
    }

    if (!q) continue;

    // Significant intraday price move vs asOf price
    const absChangePct = Math.abs(q.changePct ?? 0);
    if (absChangePct >= 3) {
      const direction = (q.changePct ?? 0) >= 0 ? "up" : "down";
      const priority = absChangePct >= 5 ? "high" : "medium";
      alerts.push({
        ticker,
        eventType: "price-move",
        direction,
        priority,
        message: `${idea.name ?? ticker} 今日 ${direction === "up" ? "+" : ""}${q.changePct}%（現價 ${q.last}），超過 3% 門檻。`,
        shouldNotify: priority === "high",
        currentPrice: q.last,
        changePct: q.changePct,
      });
    }

    // Near or at stop-loss
    if (idea.stopLoss != null && q.last != null) {
      const stopDelta = ((q.last - idea.stopLoss) / idea.stopLoss) * 100;
      if (stopDelta <= 3 && stopDelta >= 0) {
        alerts.push({
          ticker,
          eventType: "near-stop",
          direction: "down",
          priority: "high",
          message: `${idea.name ?? ticker} 距停損（${idea.stopLoss}）僅剩 ${stopDelta.toFixed(1)}%（現價 ${q.last}）。`,
          shouldNotify: true,
          currentPrice: q.last,
          stopLoss: idea.stopLoss,
        });
      } else if (stopDelta < 0) {
        alerts.push({
          ticker,
          eventType: "hit-stop",
          direction: "down",
          priority: "high",
          message: `${idea.name ?? ticker} 已跌破停損 ${idea.stopLoss}（現價 ${q.last}），停損已觸發！`,
          shouldNotify: true,
          currentPrice: q.last,
          stopLoss: idea.stopLoss,
        });
      }
    }

    // Near or at target
    if (idea.target != null && q.last != null) {
      const targetDelta = ((idea.target - q.last) / idea.target) * 100;
      if (targetDelta <= 3 && targetDelta >= 0) {
        alerts.push({
          ticker,
          eventType: "near-target",
          direction: "up",
          priority: "medium",
          message: `${idea.name ?? ticker} 距目標（${idea.target}）剩 ${targetDelta.toFixed(1)}%（現價 ${q.last}）。`,
          shouldNotify: false,
          currentPrice: q.last,
          target: idea.target,
        });
      } else if (targetDelta < 0) {
        alerts.push({
          ticker,
          eventType: "hit-target",
          direction: "up",
          priority: "high",
          message: `${idea.name ?? ticker} 已達目標價 ${idea.target}（現價 ${q.last}）！`,
          shouldNotify: true,
          currentPrice: q.last,
          target: idea.target,
        });
      }
    }
  }

  return alerts;
}

function buildWatchlistAlerts(watchlist, quotes) {
  const alerts = [];

  for (const item of watchlist) {
    const ticker = item.ticker;
    const q = quotes.get(ticker);
    if (!q) continue;

    const absChangePct = Math.abs(q.changePct ?? 0);
    if (absChangePct >= 3) {
      const direction = (q.changePct ?? 0) >= 0 ? "up" : "down";
      alerts.push({
        ticker,
        eventType: "watchlist-move",
        direction,
        priority: absChangePct >= 5 ? "high" : "medium",
        message: `自選股 ${item.name ?? ticker} 今日 ${direction === "up" ? "+" : ""}${q.changePct}%（現價 ${q.last}）。`,
        shouldNotify: absChangePct >= 5,
        currentPrice: q.last,
        changePct: q.changePct,
      });
    }
  }

  return alerts;
}

// Read active positions from DB (called before quote fetch so tickers can be included).
function readActivePositions(dbPath) {
  if (!dbPath || !existsSync(dbPath)) return [];
  try {
    const DatabaseCtor = require("better-sqlite3");
    const db = new DatabaseCtor(dbPath, { readonly: true, fileMustExist: true });
    const positions = db
      .prepare(
        `SELECT p.ticker, p.avg_cost, p.stop_loss, p.target, p.quantity, p.status, s.name
         FROM portfolio_positions p
         LEFT JOIN symbols s ON s.ticker = p.ticker
         WHERE p.deleted_at IS NULL AND LOWER(p.status) IN ('active','open')`
      )
      .all();
    db.close();
    return positions;
  } catch (err) {
    console.warn("[intraday] 無法讀取持倉資料（DB 不存在或 schema 不符）:", err.message);
    return [];
  }
}

function buildPositionAlerts(positions, quotes) {
  const alerts = [];

  for (const pos of positions) {
    const ticker = pos.ticker;
    const q = quotes.get(ticker);
    if (!q || !q.last) continue;

    // Near or at stop-loss
    if (pos.stop_loss != null) {
      const stopDelta = ((q.last - pos.stop_loss) / pos.stop_loss) * 100;
      if (stopDelta <= 3 && stopDelta >= 0) {
        alerts.push({
          ticker,
          eventType: "near-stop",
          direction: "down",
          priority: "high",
          message: `持倉 ${pos.name ?? ticker} 距停損（${pos.stop_loss}）剩 ${stopDelta.toFixed(1)}%（現價 ${q.last}）。`,
          shouldNotify: true,
          currentPrice: q.last,
          stopLoss: pos.stop_loss,
          source: "portfolio",
        });
      } else if (stopDelta < 0) {
        alerts.push({
          ticker,
          eventType: "hit-stop",
          direction: "down",
          priority: "high",
          message: `持倉 ${pos.name ?? ticker} 已跌破停損 ${pos.stop_loss}（現價 ${q.last}）！`,
          shouldNotify: true,
          currentPrice: q.last,
          stopLoss: pos.stop_loss,
          source: "portfolio",
        });
      }
    }

    // Near or at target
    if (pos.target != null) {
      const targetDelta = ((pos.target - q.last) / pos.target) * 100;
      if (targetDelta <= 3 && targetDelta >= 0) {
        alerts.push({
          ticker,
          eventType: "near-target",
          direction: "up",
          priority: "medium",
          message: `持倉 ${pos.name ?? ticker} 距目標（${pos.target}）剩 ${targetDelta.toFixed(1)}%（現價 ${q.last}）。`,
          shouldNotify: false,
          currentPrice: q.last,
          target: pos.target,
          source: "portfolio",
        });
      } else if (targetDelta < 0) {
        alerts.push({
          ticker,
          eventType: "hit-target",
          direction: "up",
          priority: "high",
          message: `持倉 ${pos.name ?? ticker} 已達目標價 ${pos.target}（現價 ${q.last}）！`,
          shouldNotify: true,
          currentPrice: q.last,
          target: pos.target,
          source: "portfolio",
        });
      }
    }
  }

  return alerts;
}

// ─────────────────────────────────────────────────────────────
// Main checkpoint builder
// ─────────────────────────────────────────────────────────────

function buildCheckpoint({ phase, date, twStr, alertCandidates }) {
  // Stable ID per date+phase: repeated writes replace the same checkpoint
  const id = `cp-intraday-${date}-${phase}`;
  const highPriority = alertCandidates.filter((a) => a.priority === "high");
  const medPriority = alertCandidates.filter((a) => a.priority === "medium");
  const shouldNotifyAny = alertCandidates.some((a) => a.shouldNotify);

  let status = "ok";
  if (highPriority.length > 0) status = "warn";
  if (highPriority.some((a) => ["hit-stop", "hit-target"].includes(a.eventType))) status = "critical";

  const linkedSymbols = [...new Set(alertCandidates.map((a) => a.ticker).filter(Boolean))];

  let summary;
  if (alertCandidates.length === 0) {
    summary = `${phase} checkpoint：無重要事件，市場運行正常。`;
  } else {
    const parts = [];
    if (highPriority.length > 0)
      parts.push(`${highPriority.length} 項高優先事件`);
    if (medPriority.length > 0)
      parts.push(`${medPriority.length} 項中優先事件`);
    summary = `${phase} checkpoint：${parts.join("，")}。${shouldNotifyAny ? "建議確認。" : "靜默更新。"}`;
  }

  const alertList = alertCandidates
    .map((a) => `[${a.priority}][${a.eventType}] ${a.message}`)
    .join("\n");

  const checkpoint = {
    id,
    kind: phase,
    title: `盤中靜默 Checkpoint（${phase}）`,
    timestamp: twStr,
    status,
    summary,
    confidence: highPriority.length > 0 ? "high" : "medium",
    whatChanged: alertCandidates.length > 0 ? alertList : null,
    trigger: shouldNotifyAny
      ? alertCandidates
          .filter((a) => a.shouldNotify)
          .map((a) => a.message)
          .join(" | ")
      : null,
    invalidation: null,
    linkedSymbols,
    linkedNewsIds: [],
    provenance: {
      source: "intraday-checkpoint",
      generatedBy: "run-v3-intraday-checkpoint.mjs",
      note: JSON.stringify({
        shouldNotify: shouldNotifyAny,
        alertCandidates: alertCandidates.map((a) => ({
          ticker: a.ticker,
          eventType: a.eventType,
          direction: a.direction,
          priority: a.priority,
          shouldNotify: a.shouldNotify,
        })),
      }),
    },
  };

  return checkpoint;
}

// ─────────────────────────────────────────────────────────────
// DB insight writer
// ─────────────────────────────────────────────────────────────

function deterministicInsightId(date, phase, ticker, eventType, direction) {
  const raw = `ins|${date}|${phase}|${ticker ?? "MARKET"}|${eventType ?? "checkpoint"}|${direction ?? ""}`;
  return "ins-" + createHash("sha1").update(raw).digest("hex").slice(0, 20);
}

function writeInsightsToDb(dbPath, checkpoint, alertCandidates, date) {
  if (!dbPath || !existsSync(dbPath)) return;

  try {
    const DatabaseCtor = require("better-sqlite3");
    const db = new DatabaseCtor(dbPath, { readonly: false, fileMustExist: true });

    const stmt = db.prepare(
      `INSERT OR IGNORE INTO symbol_insights
         (id, ticker, source, kind, title, body, payload_json, confidence, as_of)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const phase = checkpoint.kind;

    // Write a per-ticker insight for each alert candidate
    for (const alert of alertCandidates) {
      if (!alert.ticker) continue;
      const insightId = deterministicInsightId(date, phase, alert.ticker, alert.eventType, alert.direction);
      stmt.run(
        insightId,
        alert.ticker,
        "intraday-checkpoint",
        "checkpoint",
        `[${alert.eventType}] ${alert.ticker}`,
        alert.message,
        JSON.stringify({
          checkpointId: checkpoint.id,
          phase,
          priority: alert.priority,
          shouldNotify: alert.shouldNotify,
          eventType: alert.eventType,
          direction: alert.direction,
        }),
        alert.priority === "high" ? "high" : "medium",
        date
      );
    }

    db.close();
    console.log(`[intraday] DB insights written to ${dbPath}`);
  } catch (err) {
    console.warn("[intraday] DB write skipped:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  const { dryRun, phaseOverride, dbPath, dataRoot, statePath } = parseArgs();
  const { twStr, date, totalMin } = getTwNow();
  const phase = phaseOverride ?? detectPhase(totalMin);

  // Resolve data root and dedup state path (can be overridden for temp validation)
  const DATA = dataRoot ?? path.join(ROOT, "public", "data");
  const DEDUP_STATE_PATH = statePath ?? path.join(TMP, "v3-intraday-dedup-state.json");

  console.log(`\n[intraday] ${dryRun ? "DRY-RUN" : "WRITE"} mode | date: ${date} | phase: ${phase} | time: ${twStr}`);
  if (dataRoot) console.log(`[intraday] data-root: ${DATA}`);
  if (statePath) console.log(`[intraday] state-path: ${DEDUP_STATE_PATH}`);
  if (dryRun) console.log("[intraday] Pass --write to actually update files.\n");

  // Load data files
  const [existingToday, ideas, watchlist] = await Promise.all([
    readJson(path.join(DATA, "today.json")).then((d) => Array.isArray(d) ? d : []),
    readJson(path.join(DATA, "ideas.json")).then((d) => Array.isArray(d) ? d : []),
    readJson(path.join(DATA, "watchlist.json")).then((d) => Array.isArray(d) ? d : []),
  ]);

  // Read active portfolio positions early so their tickers are included in quote fetch
  const activePositions = readActivePositions(dbPath);
  const positionTickers = activePositions.map((p) => p.ticker).filter(Boolean);

  // Collect tickers to fetch
  const candidateTickers = ideas
    .filter((i) => ["starter", "watch"].includes(i.role ?? ""))
    .map((i) => i.ticker)
    .filter(Boolean);
  const watchlistTickers = watchlist.map((w) => w.ticker).filter(Boolean);
  const allTickers = [...new Set([...candidateTickers, ...watchlistTickers, ...positionTickers])];

  console.log(`[intraday] Fetching quotes for ${allTickers.length} tickers: ${allTickers.join(", ")}`);
  const quotes = await fetchAllQuotes(allTickers);
  console.log(`[intraday] Got quotes for: ${[...quotes.keys()].join(", ") || "(none)"}`);

  // Build alert candidates
  const candidateAlerts = buildCandidateAlerts(ideas, quotes);
  const watchlistAlerts = buildWatchlistAlerts(watchlist, quotes);
  const positionAlerts = buildPositionAlerts(activePositions, quotes);

  const allAlerts = [...candidateAlerts, ...watchlistAlerts, ...positionAlerts];

  // Load dedup state
  const dedupState = await loadDedupState(DEDUP_STATE_PATH);
  if (!dedupState.seen) dedupState.seen = {};

  // Filter out already-seen alerts
  const newAlerts = allAlerts.filter((alert) => {
    const key = makeDedupKey(date, phase, alert.ticker, alert.eventType, alert.direction);
    return !dedupState.seen[key];
  });

  const dedupedCount = allAlerts.length - newAlerts.length;

  console.log(`\n[intraday] Alert candidates: ${allAlerts.length} total, ${newAlerts.length} new, ${dedupedCount} deduped`);
  if (newAlerts.length > 0) {
    for (const a of newAlerts) {
      const notify = a.shouldNotify ? "🔔 NOTIFY" : "silent";
      console.log(`  [${a.priority}][${notify}][${a.eventType}] ${a.ticker ?? "MARKET"}: ${a.message}`);
    }
  } else {
    console.log("  (no new material changes)");
  }

  // Build checkpoint
  const checkpoint = buildCheckpoint({
    phase,
    date,
    twStr,
    alertCandidates: newAlerts,
  });

  console.log(`\n[intraday] Checkpoint to write:`);
  console.log(`  id: ${checkpoint.id}`);
  console.log(`  status: ${checkpoint.status}`);
  console.log(`  summary: ${checkpoint.summary}`);

  // Dedup keys that would be marked
  const newKeys = newAlerts.map((a) =>
    makeDedupKey(date, phase, a.ticker, a.eventType, a.direction)
  );
  if (newKeys.length > 0) {
    console.log(`\n[intraday] New dedup keys to record:\n  ${newKeys.join("\n  ")}`);
  }

  if (dryRun) {
    console.log("\n[intraday] DRY-RUN complete. No files modified.");
    console.log("[intraday] Run with --write to apply changes.");
    return;
  }

  // ── WRITE MODE ────────────────────────────────────────────

  // Ensure parent dir of dedup state exists
  const dedupDir = path.dirname(DEDUP_STATE_PATH);
  if (!existsSync(dedupDir)) {
    await mkdir(dedupDir, { recursive: true });
  }

  // Ensure data dir exists when using a custom data-root
  if (dataRoot && !existsSync(DATA)) {
    await mkdir(DATA, { recursive: true });
  }

  // Replace checkpoint for same date+phase (stable ID guarantees at most one entry per date+phase).
  // Exception: if all alerts were already deduped (newAlerts empty, dedupedCount > 0) and an
  // existing checkpoint for this id is already recorded, preserve it — dedup should not wash away
  // a previously recorded critical/warn status.
  const existingCheckpoint = existingToday.find((c) => c.id === checkpoint.id);
  if (newAlerts.length === 0 && dedupedCount > 0 && existingCheckpoint) {
    console.log(`\n[intraday] All alerts already recorded; preserving existing checkpoint (${existingCheckpoint.status}).`);
  } else {
    const filtered = existingToday.filter((c) => c.id !== checkpoint.id);
    const updatedToday = [...filtered, checkpoint];
    await writeJson(path.join(DATA, "today.json"), updatedToday);
    console.log(`\n[intraday] Written today.json (${updatedToday.length} checkpoints)`);
  }

  // Update dedup state
  const now = new Date().toISOString();
  for (const key of newKeys) {
    dedupState.seen[key] = { seenAt: now, phase, checkpointId: checkpoint.id };
  }
  dedupState.lastWriteAt = now;
  dedupState.lastDate = date;
  await writeJson(DEDUP_STATE_PATH, dedupState);
  console.log(`[intraday] Dedup state updated: ${newKeys.length} new keys`);

  // Optional DB write
  if (dbPath) {
    writeInsightsToDb(dbPath, checkpoint, newAlerts, date);
  }

  console.log("\n[intraday] WRITE complete.");
}

main().catch((err) => {
  console.error("[intraday] Fatal error:", err);
  process.exit(1);
});
