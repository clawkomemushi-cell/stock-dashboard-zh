/**
 * export-snapshot-to-sql.mjs
 *
 * Reads a manual-pipeline snapshot directory and emits a SQLite-compatible
 * INSERT OR REPLACE SQL seed file.  No DB driver required — pure text output.
 *
 * Usage:
 *   node scripts/export-snapshot-to-sql.mjs [--data-root <dir>] [--out <file>]
 *
 * Defaults:
 *   --data-root  tmp/manual-pipeline-snapshot
 *   --out        tmp/v3-seed.sql
 *
 * Tables written:
 *   pipeline_runs, symbols, watchlists, watchlist_items,
 *   ideas, news_events, reports, system_health_snapshots
 *
 * Tables intentionally skipped (require auth/user context):
 *   users, idea_user_states, paper_holdings, paper_trades
 */

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let dataRoot = null;
  let outFile = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data-root" && args[i + 1]) {
      dataRoot = args[++i];
    } else if (args[i] === "--out" && args[i + 1]) {
      outFile = args[++i];
    }
  }

  if (!dataRoot) {
    dataRoot = path.resolve(process.cwd(), "tmp", "manual-pipeline-snapshot");
  } else {
    dataRoot = path.resolve(process.cwd(), dataRoot);
  }

  if (!outFile) {
    outFile = path.resolve(process.cwd(), "tmp", "v3-seed.sql");
  } else {
    outFile = path.resolve(process.cwd(), outFile);
  }

  return { dataRoot, outFile };
}

// ─────────────────────────────────────────────────────────────
// Quoting helpers — NO driver dependency
// ─────────────────────────────────────────────────────────────

/** Escape a value for a SQLite TEXT literal. */
function q(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  // Stringify non-strings (arrays, objects) as JSON TEXT
  const s = typeof value === "string" ? value : JSON.stringify(value);
  // Escape single quotes by doubling them
  return `'${s.replace(/'/g, "''")}'`;
}

/** Serialize a JS value to a JSON TEXT column (NULL-safe). */
function qJson(value) {
  if (value === null || value === undefined) return "NULL";
  return q(JSON.stringify(value));
}

/** Build an INSERT OR REPLACE statement. */
function insertOrReplace(table, row) {
  const cols = Object.keys(row).join(", ");
  const vals = Object.values(row).map((v) => {
    // Values that were already run through q/qJson arrive as strings starting with "'"
    // Raw values are mapped here; we trust callers pass pre-quoted strings or raw numbers.
    return v;
  }).join(", ");
  return `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${vals});`;
}

// ─────────────────────────────────────────────────────────────
// JSON readers
// ─────────────────────────────────────────────────────────────

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readJsonMaybe(filePath) {
  if (!existsSync(filePath)) return null;
  return readJson(filePath);
}

// ─────────────────────────────────────────────────────────────
// Table builders — return arrays of SQL strings
// ─────────────────────────────────────────────────────────────

function buildPipelineRunRows(health) {
  const run = health?.currentRun;
  if (!run?.id) return [];
  return [
    insertOrReplace("pipeline_runs", {
      id: q(run.id),
      phase: q("manual"),
      trading_date: q(null),
      status: q(run.status ?? "ok"),
      started_at: q(run.startedAt ?? health.asOf),
      finished_at: q(run.finishedAt ?? null),
      duration_ms: q(run.durationMs ?? null),
      steps_json: q(null),
      error_text: q(null),
      triggered_by: q("manual"),
    }),
  ];
}

function buildSymbolRows(symbolIndex, profileMap) {
  if (!Array.isArray(symbolIndex)) return [];
  return symbolIndex.map((sym) => {
    const ticker = sym.ticker;
    const profile = profileMap[ticker] ?? sym;
    return insertOrReplace("symbols", {
      ticker: q(ticker),
      name: q(sym.name ?? profile.name),
      kind: q(sym.kind ?? profile.kind ?? "stock"),
      market: q(sym.market ?? profile.market ?? null),
      sector: q(sym.sector ?? profile.sector ?? null),
      description: q(sym.oneLineSummary ?? null),
      profile_json: qJson(profile),
      is_active: "1",
      updated_at: q(new Date().toISOString().slice(0, 19)),
    });
  });
}

function buildWatchlistRows(watchlistItems) {
  if (!Array.isArray(watchlistItems) || watchlistItems.length === 0) return [];

  const wlId = "wl-system-default";
  const rows = [
    insertOrReplace("watchlists", {
      id: q(wlId),
      user_id: "NULL",
      name: q("主清單"),
      kind: q("system"),
      is_default: "1",
      created_at: q(watchlistItems[0]?.addedAt ?? new Date().toISOString()),
      updated_at: q(watchlistItems[0]?.lastUpdated ?? new Date().toISOString()),
      deleted_at: "NULL",
    }),
  ];

  for (const item of watchlistItems) {
    rows.push(
      insertOrReplace("watchlist_items", {
        id: q(item.id ?? `wi-${item.ticker}`),
        watchlist_id: q(wlId),
        ticker: q(item.ticker),
        note: q(item.latestStatus ?? null),
        source: q("ai"),
        added_at: q(item.addedAt ?? item.lastUpdated ?? new Date().toISOString()),
        sort_order: q(0),
        deleted_at: "NULL",
      })
    );
  }

  return rows;
}

function buildIdeaRows(ideas, pipelineRunId) {
  if (!Array.isArray(ideas)) return [];
  return ideas.map((idea) =>
    insertOrReplace("ideas", {
      id: q(idea.id),
      ticker: q(idea.ticker),
      name: q(idea.name ?? null),
      kind: q(idea.kind ?? "stock"),
      role: q(idea.role ?? null),
      summary: q(idea.summary ?? null),
      why_selected: q(idea.whySelected ?? null),
      trigger: q(idea.trigger ?? null),
      invalidation: q(idea.invalidation ?? null),
      risk: q(idea.risk ?? null),
      confidence: q(idea.confidence ?? null),
      trading_date: q((idea.asOf ?? "").slice(0, 10) || null),
      themes_json: qJson(idea.themes ?? []),
      related_news_ids_json: qJson(idea.relatedNewsIds ?? []),
      generated_by: q("generate-v3-snapshot"),
      pipeline_run_id: q(pipelineRunId ?? null),
      raw_json: qJson(idea),
      created_at: q(idea.asOf ?? new Date().toISOString()),
      deleted_at: "NULL",
    })
  );
}

function buildNewsEventRows(newsItems, pipelineRunId) {
  if (!Array.isArray(newsItems)) return [];
  return newsItems.map((n) =>
    insertOrReplace("news_events", {
      id: q(n.id),
      title: q(n.title),
      summary: q(n.oneLineSummary ?? null),
      source: q(n.source ?? null),
      url: q(n.url ?? null),
      impact_type: q(n.impactType ?? null),
      published_at: q(n.publishedAt ?? null),
      trading_date: q((n.publishedAt ?? "").slice(0, 10) || null),
      related_tickers_json: qJson(n.relatedSymbols ?? []),
      themes_json: qJson(n.relatedThemes ?? []),
      generated_by: q("generate-v3-snapshot"),
      pipeline_run_id: q(pipelineRunId ?? null),
      raw_json: qJson(n),
      created_at: q(n.publishedAt ?? new Date().toISOString()),
    })
  );
}

function buildReportRows(reportsData, pipelineRunId) {
  const rows = [];

  // Close reports
  for (const [date, closeReport] of Object.entries(reportsData.close ?? {})) {
    const id = `report-close-${date}`;
    rows.push(
      insertOrReplace("reports", {
        id: q(id),
        kind: q("close"),
        trading_date: q(date),
        week_label: "NULL",
        summary: q(closeReport.summaryForModels ?? null),
        direction_verdict: q(closeReport.directionVerdict ?? null),
        full_json: qJson(closeReport),
        generated_by: q("generate-v3-snapshot"),
        pipeline_run_id: q(pipelineRunId ?? null),
        published_at: q(closeReport.asOf ?? null),
        created_at: q(closeReport.asOf ?? new Date().toISOString()),
      })
    );
  }

  // Weekly reports
  for (const [week, weeklyReport] of Object.entries(reportsData.weekly ?? {})) {
    const id = `report-weekly-${week}`;
    rows.push(
      insertOrReplace("reports", {
        id: q(id),
        kind: q("weekly"),
        trading_date: "NULL",
        week_label: q(week),
        summary: q(weeklyReport.summaryForModels ?? weeklyReport.summary ?? null),
        direction_verdict: "NULL",
        full_json: qJson(weeklyReport),
        generated_by: q("generate-v3-snapshot"),
        pipeline_run_id: q(pipelineRunId ?? null),
        published_at: q(weeklyReport.asOf ?? null),
        created_at: q(weeklyReport.asOf ?? new Date().toISOString()),
      })
    );
  }

  return rows;
}

function buildSystemHealthRow(health, pipelineRunId) {
  if (!health) return [];
  const tradingDate = (health.asOf ?? "").slice(0, 10) || null;
  const id = `shs-${pipelineRunId ?? tradingDate ?? "unknown"}`;
  return [
    insertOrReplace("system_health_snapshots", {
      id: q(id),
      pipeline_run_id: q(pipelineRunId ?? null),
      as_of: q(health.asOf ?? null),
      trading_date: q(tradingDate),
      warnings_json: qJson(health.warnings ?? []),
      stale_data_json: qJson(health.staleData ?? []),
      missing_data_json: qJson(health.missingData ?? []),
      full_json: qJson(health),
      created_at: q(health.asOf ?? new Date().toISOString()),
    }),
  ];
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  const { dataRoot, outFile } = parseArgs();

  if (!existsSync(dataRoot)) {
    console.error(`[export-snapshot-to-sql] data-root not found: ${dataRoot}`);
    console.error(`  Run "npm run pipeline:manual:sample" first to generate a snapshot.`);
    process.exit(1);
  }

  console.log(`[export-snapshot-to-sql] data-root : ${path.relative(process.cwd(), dataRoot)}`);
  console.log(`[export-snapshot-to-sql] out       : ${path.relative(process.cwd(), outFile)}`);

  // ── Load snapshot JSON files ──────────────────────────────

  const health = await readJsonMaybe(path.join(dataRoot, "system-health.json"));
  const ideas = (await readJsonMaybe(path.join(dataRoot, "ideas.json"))) ?? [];
  const newsItems = (await readJsonMaybe(path.join(dataRoot, "news.json"))) ?? [];
  const watchlistItems = (await readJsonMaybe(path.join(dataRoot, "watchlist.json"))) ?? [];
  const symbolIndex = (await readJsonMaybe(path.join(dataRoot, "symbols.json"))) ?? [];

  // Load individual symbol profiles
  const profileMap = {};
  const symbolsDir = path.join(dataRoot, "symbols");
  if (existsSync(symbolsDir)) {
    const tickerDirs = await readdir(symbolsDir);
    for (const ticker of tickerDirs) {
      const profilePath = path.join(symbolsDir, ticker, "profile.json");
      const profile = await readJsonMaybe(profilePath);
      if (profile) profileMap[ticker] = profile;
    }
  }

  // Load report files
  const reportsData = { close: {}, weekly: {} };
  const reportsDir = path.join(dataRoot, "reports");
  if (existsSync(reportsDir)) {
    const closeDir = path.join(reportsDir, "close");
    if (existsSync(closeDir)) {
      const closeFiles = await readdir(closeDir);
      for (const f of closeFiles.filter((f) => f.endsWith(".json"))) {
        const date = f.replace(".json", "");
        reportsData.close[date] = await readJson(path.join(closeDir, f));
      }
    }
    const weeklyDir = path.join(reportsDir, "weekly");
    if (existsSync(weeklyDir)) {
      const weeklyFiles = await readdir(weeklyDir);
      for (const f of weeklyFiles.filter((f) => f.endsWith(".json"))) {
        const week = f.replace(".json", "");
        reportsData.weekly[week] = await readJson(path.join(weeklyDir, f));
      }
    }
  }

  const pipelineRunId = health?.currentRun?.id ?? null;

  // ── Build SQL ─────────────────────────────────────────────

  const sections = [];

  sections.push("-- V3 seed file — generated by scripts/export-snapshot-to-sql.mjs");
  sections.push(`-- Source: ${path.relative(process.cwd(), dataRoot)}`);
  sections.push(`-- Generated: ${new Date().toISOString()}`);
  sections.push("-- Import: sqlite3 dev.db < db/schema.sqlite.sql && sqlite3 dev.db < <this-file>");
  sections.push("");
  sections.push("PRAGMA foreign_keys = OFF;");
  sections.push("BEGIN TRANSACTION;");
  sections.push("");

  const pipelineRows = buildPipelineRunRows(health);
  if (pipelineRows.length > 0) {
    sections.push("-- pipeline_runs");
    sections.push(...pipelineRows);
    sections.push("");
  }

  const symbolRows = buildSymbolRows(symbolIndex, profileMap);
  if (symbolRows.length > 0) {
    sections.push("-- symbols");
    sections.push(...symbolRows);
    sections.push("");
  }

  const watchlistRows = buildWatchlistRows(watchlistItems);
  if (watchlistRows.length > 0) {
    sections.push("-- watchlists + watchlist_items");
    sections.push(...watchlistRows);
    sections.push("");
  }

  const ideaRows = buildIdeaRows(ideas, pipelineRunId);
  if (ideaRows.length > 0) {
    sections.push("-- ideas");
    sections.push(...ideaRows);
    sections.push("");
  }

  const newsRows = buildNewsEventRows(newsItems, pipelineRunId);
  if (newsRows.length > 0) {
    sections.push("-- news_events");
    sections.push(...newsRows);
    sections.push("");
  }

  const reportRows = buildReportRows(reportsData, pipelineRunId);
  if (reportRows.length > 0) {
    sections.push("-- reports");
    sections.push(...reportRows);
    sections.push("");
  }

  const healthRows = buildSystemHealthRow(health, pipelineRunId);
  if (healthRows.length > 0) {
    sections.push("-- system_health_snapshots");
    sections.push(...healthRows);
    sections.push("");
  }

  sections.push("COMMIT;");
  sections.push("PRAGMA foreign_keys = ON;");
  sections.push("");

  const sql = sections.join("\n");

  // ── Write output ──────────────────────────────────────────

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, sql, "utf8");

  const relOut = path.relative(process.cwd(), outFile);
  const lineCount = sql.split("\n").length;
  console.log(`[export-snapshot-to-sql] wrote ${relOut} (${lineCount} lines)`);
  console.log(`\nNext steps:`);
  console.log(`  # Import schema + seed (if sqlite3 is available):`);
  console.log(`  sqlite3 dev.db < db/schema.sqlite.sql`);
  console.log(`  sqlite3 dev.db < ${relOut}`);
  console.log(`  sqlite3 dev.db ".tables" && sqlite3 dev.db "SELECT COUNT(*) FROM ideas;"`);
}

await main();
