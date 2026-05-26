/**
 * write-v3-pipeline-to-db.mjs
 *
 * Reads a manual-pipeline snapshot directory and upserts data directly into
 * an existing SQLite DB using better-sqlite3. Idempotent — safe to run
 * multiple times on the same snapshot.
 *
 * Usage:
 *   node scripts/write-v3-pipeline-to-db.mjs [options]
 *
 * Options:
 *   --data-root <dir>   Snapshot dir to read  (default: tmp/manual-pipeline-snapshot)
 *   --db <path>         Target SQLite DB path  (default: tmp/v3-live.db)
 *   --test-db <path>    Write to a test DB copy instead (keeps live DB untouched)
 *   --dry-run           Print what would be written, touch nothing
 *
 * Tables written (upsert):
 *   pipeline_runs, symbols, watchlists, watchlist_items,
 *   ideas, news_events, reports, system_health_snapshots
 *
 * Tables intentionally skipped:
 *   users, symbol_insights, research_sessions, portfolio_positions
 *   (require auth/user context — use API endpoints or db-writer helpers)
 *
 * Safety rules:
 *   - DB file must already exist (fileMustExist: true). Will NOT create a new DB.
 *   - Will NOT drop, truncate, or DELETE from any table.
 *   - Will NOT touch public/data/.
 *   - All writes are wrapped in a single transaction; error → full rollback.
 */

import { readFile, readdir, copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// ─────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let dataRoot = null;
  let dbPath = null;
  let testDbPath = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data-root" && args[i + 1]) {
      dataRoot = path.resolve(process.cwd(), args[++i]);
    } else if (args[i] === "--db" && args[i + 1]) {
      dbPath = path.resolve(process.cwd(), args[++i]);
    } else if (args[i] === "--test-db" && args[i + 1]) {
      testDbPath = path.resolve(process.cwd(), args[++i]);
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  if (!dataRoot) {
    dataRoot = path.resolve(process.cwd(), "tmp", "manual-pipeline-snapshot");
  }

  if (!dbPath) {
    dbPath = path.resolve(process.cwd(), "tmp", "v3-live.db");
  }

  return { dataRoot, dbPath, testDbPath, dryRun };
}

// ─────────────────────────────────────────────────────────────
// JSON helpers
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
// Dry-run counter
// ─────────────────────────────────────────────────────────────

const dryRunStats = { tables: {}, total: 0 };

function dryRunRecord(table) {
  dryRunStats.tables[table] = (dryRunStats.tables[table] ?? 0) + 1;
  dryRunStats.total += 1;
}

// ─────────────────────────────────────────────────────────────
// Writers — each returns number of rows upserted
// ─────────────────────────────────────────────────────────────

function writePipelineRun(db, health, runId, dryRun) {
  const run = health?.currentRun;
  if (!run?.id && !runId) return 0;

  const id = runId;
  const row = {
    id,
    phase: "manual",
    trading_date: (health?.asOf ?? "").slice(0, 10) || null,
    status: run?.status ?? "ok",
    started_at: run?.startedAt ?? health?.asOf ?? new Date().toISOString(),
    finished_at: run?.finishedAt ?? null,
    duration_ms: run?.durationMs ?? null,
    steps_json: null,
    error_text: null,
    triggered_by: "pipeline:write-db",
  };

  if (dryRun) {
    dryRunRecord("pipeline_runs");
    console.log(`  [dry-run] pipeline_runs upsert: ${id}`);
    return 1;
  }

  db.prepare(`
    INSERT OR REPLACE INTO pipeline_runs
      (id, phase, trading_date, status, started_at, finished_at, duration_ms, steps_json, error_text, triggered_by)
    VALUES
      (@id, @phase, @trading_date, @status, @started_at, @finished_at, @duration_ms, @steps_json, @error_text, @triggered_by)
  `).run(row);
  return 1;
}

function writeSymbols(db, symbolIndex, profileMap, dryRun) {
  if (!Array.isArray(symbolIndex) || symbolIndex.length === 0) return 0;
  let count = 0;

  for (const sym of symbolIndex) {
    const ticker = sym.ticker?.toUpperCase();
    if (!ticker) continue;
    const profile = profileMap[ticker] ?? sym;

    if (dryRun) {
      dryRunRecord("symbols");
      count++;
      continue;
    }

    db.prepare(`
      INSERT INTO symbols (ticker, name, kind, market, sector, description, profile_json, is_active, updated_at)
      VALUES (@ticker, @name, @kind, @market, @sector, @description, @profile_json, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(ticker) DO UPDATE SET
        name         = COALESCE(excluded.name, name),
        kind         = COALESCE(excluded.kind, kind),
        market       = COALESCE(excluded.market, market),
        sector       = COALESCE(excluded.sector, sector),
        description  = COALESCE(excluded.description, description),
        profile_json = excluded.profile_json,
        is_active    = 1,
        updated_at   = CURRENT_TIMESTAMP
    `).run({
      ticker,
      name: sym.name ?? profile.name ?? ticker,
      kind: sym.kind ?? profile.kind ?? "stock",
      market: sym.market ?? profile.market ?? (ticker.endsWith(".TW") ? "TWSE" : "US"),
      sector: sym.sector ?? profile.sector ?? null,
      description: sym.oneLineSummary ?? profile.oneLineSummary ?? null,
      profile_json: JSON.stringify(profile),
    });
    count++;
  }

  if (dryRun) console.log(`  [dry-run] symbols: would upsert ${count} rows`);
  return count;
}

function writeWatchlist(db, watchlistItems, dryRun) {
  if (!Array.isArray(watchlistItems) || watchlistItems.length === 0) return 0;

  const wlId = "wl-system-default";
  const now = new Date().toISOString();
  let count = 0;

  if (dryRun) {
    dryRunRecord("watchlists");
    for (let i = 0; i < watchlistItems.length; i++) {
      dryRunRecord("watchlist_items");
      count++;
    }
    console.log(`  [dry-run] watchlists: 1 default watchlist, ${count} items would upsert`);
    return count;
  }

  db.prepare(`
    INSERT INTO watchlists (id, user_id, name, kind, is_default, created_at, updated_at, deleted_at)
    VALUES (@id, NULL, @name, @kind, 1, @created_at, @updated_at, NULL)
    ON CONFLICT(id) DO UPDATE SET
      name       = excluded.name,
      updated_at = CURRENT_TIMESTAMP,
      deleted_at = NULL
  `).run({
    id: wlId,
    name: "主清單",
    kind: "system",
    created_at: watchlistItems[0]?.addedAt ?? now,
    updated_at: watchlistItems[0]?.lastUpdated ?? now,
  });

  for (const item of watchlistItems) {
    const ticker = item.ticker?.toUpperCase();
    if (!ticker) continue;

    // Ensure symbol exists (FK)
    const symRow = db.prepare("SELECT ticker FROM symbols WHERE ticker = ?").get(ticker);
    if (!symRow) {
      db.prepare(`
        INSERT OR IGNORE INTO symbols (ticker, name, kind, market, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(
        ticker,
        item.name ?? ticker,
        item.kind ?? "stock",
        item.market ? (item.market === "TW" ? "TWSE" : item.market) : (ticker.endsWith(".TW") ? "TWSE" : "US")
      );
    }

    // Resolve id with three-tier priority:
    // 1. Preserve the id of an existing (watchlist_id, ticker) row.
    // 2. Use incoming item.id if it is not already claimed by a different row.
    // 3. Otherwise generate a stable safe id: wi-${ticker}, and if that is also
    //    taken (by a different entry), append a deterministic watchlist suffix.
    const existingItem = db
      .prepare("SELECT id FROM watchlist_items WHERE watchlist_id = ? AND ticker = ?")
      .get(wlId, ticker);

    let itemId;
    if (existingItem) {
      itemId = existingItem.id;
    } else {
      const candidateId = item.id ?? null;
      const candidateInUse = candidateId
        ? db.prepare("SELECT id FROM watchlist_items WHERE id = ?").get(candidateId)
        : null;

      if (!candidateInUse) {
        itemId = candidateId ?? `wi-${ticker}`;
      } else {
        // Incoming id is owned by a different row — generate a stable safe id.
        let safeId = `wi-${ticker}`;
        const safeInUse = db
          .prepare("SELECT id FROM watchlist_items WHERE id = ?")
          .get(safeId);
        if (safeInUse) {
          // Deterministic suffix derived from watchlist id to stay stable across runs.
          const wlSuffix = wlId.replace(/[^a-z0-9]/gi, "");
          safeId = `wi-${ticker}-${wlSuffix}`;
        }
        itemId = safeId;
      }
    }

    db.prepare(`
      INSERT INTO watchlist_items
        (id, watchlist_id, ticker, note, source, added_at, sort_order, deleted_at)
      VALUES
        (@id, @watchlist_id, @ticker, @note, @source, @added_at, @sort_order, NULL)
      ON CONFLICT(watchlist_id, ticker) DO UPDATE SET
        note       = excluded.note,
        source     = excluded.source,
        added_at   = excluded.added_at,
        sort_order = excluded.sort_order,
        deleted_at = NULL
    `).run({
      id: itemId,
      watchlist_id: wlId,
      ticker,
      note: item.latestStatus ?? null,
      source: "ai",
      added_at: item.addedAt ?? item.lastUpdated ?? now,
      sort_order: 0,
    });
    count++;
  }

  return count;
}

function writeIdeas(db, ideas, pipelineRunId, dryRun) {
  if (!Array.isArray(ideas) || ideas.length === 0) return 0;
  let count = 0;

  for (const idea of ideas) {
    if (!idea.id || !idea.ticker) continue;

    if (dryRun) {
      dryRunRecord("ideas");
      count++;
      continue;
    }

    const ticker = idea.ticker.toUpperCase();

    // Ensure symbol exists (FK)
    const symRow = db.prepare("SELECT ticker FROM symbols WHERE ticker = ?").get(ticker);
    if (!symRow) {
      db.prepare(`
        INSERT OR IGNORE INTO symbols (ticker, name, kind, is_active)
        VALUES (?, ?, 'stock', 1)
      `).run(ticker, idea.name ?? ticker);
    }

    db.prepare(`
      INSERT OR REPLACE INTO ideas
        (id, ticker, name, kind, role, summary, why_selected, trigger, invalidation, risk,
         confidence, trading_date, themes_json, related_news_ids_json, generated_by,
         pipeline_run_id, raw_json, created_at, deleted_at)
      VALUES
        (@id, @ticker, @name, @kind, @role, @summary, @why_selected, @trigger, @invalidation, @risk,
         @confidence, @trading_date, @themes_json, @related_news_ids_json, @generated_by,
         @pipeline_run_id, @raw_json, @created_at, NULL)
    `).run({
      id: idea.id,
      ticker,
      name: idea.name ?? null,
      kind: idea.kind ?? "stock",
      role: idea.role ?? null,
      summary: idea.summary ?? null,
      why_selected: idea.whySelected ?? null,
      trigger: idea.trigger ?? null,
      invalidation: idea.invalidation ?? null,
      risk: idea.risk ?? null,
      confidence: idea.confidence ?? null,
      trading_date: (idea.asOf ?? "").slice(0, 10) || null,
      themes_json: JSON.stringify(idea.themes ?? []),
      related_news_ids_json: JSON.stringify(idea.relatedNewsIds ?? []),
      generated_by: "pipeline:write-db",
      pipeline_run_id: pipelineRunId ?? null,
      raw_json: JSON.stringify(idea),
      created_at: idea.asOf ?? new Date().toISOString(),
    });
    count++;
  }

  if (dryRun) console.log(`  [dry-run] ideas: would upsert ${count} rows`);
  return count;
}

function writeNewsEvents(db, newsItems, pipelineRunId, dryRun) {
  if (!Array.isArray(newsItems) || newsItems.length === 0) return 0;
  let count = 0;

  for (const n of newsItems) {
    if (!n.id || !n.title) continue;

    if (dryRun) {
      dryRunRecord("news_events");
      count++;
      continue;
    }

    db.prepare(`
      INSERT OR REPLACE INTO news_events
        (id, title, summary, source, url, impact_type, published_at, trading_date,
         related_tickers_json, themes_json, generated_by, pipeline_run_id, raw_json, created_at)
      VALUES
        (@id, @title, @summary, @source, @url, @impact_type, @published_at, @trading_date,
         @related_tickers_json, @themes_json, @generated_by, @pipeline_run_id, @raw_json, @created_at)
    `).run({
      id: n.id,
      title: n.title,
      summary: n.oneLineSummary ?? null,
      source: n.source ?? null,
      url: n.url ?? null,
      impact_type: n.impactType ?? null,
      published_at: n.publishedAt ?? null,
      trading_date: (n.publishedAt ?? "").slice(0, 10) || null,
      related_tickers_json: JSON.stringify(n.relatedSymbols ?? []),
      themes_json: JSON.stringify(n.relatedThemes ?? []),
      generated_by: "pipeline:write-db",
      pipeline_run_id: pipelineRunId ?? null,
      raw_json: JSON.stringify(n),
      created_at: n.publishedAt ?? new Date().toISOString(),
    });
    count++;
  }

  if (dryRun) console.log(`  [dry-run] news_events: would upsert ${count} rows`);
  return count;
}

function writeReports(db, reportsData, pipelineRunId, dryRun) {
  let count = 0;

  for (const [date, report] of Object.entries(reportsData.close ?? {})) {
    const id = `report-close-${date}`;
    if (dryRun) { dryRunRecord("reports"); count++; continue; }

    db.prepare(`
      INSERT OR REPLACE INTO reports
        (id, kind, trading_date, week_label, summary, direction_verdict, full_json,
         generated_by, pipeline_run_id, published_at, created_at)
      VALUES
        (@id, 'close', @trading_date, NULL, @summary, @direction_verdict, @full_json,
         @generated_by, @pipeline_run_id, @published_at, @created_at)
    `).run({
      id,
      trading_date: date,
      summary: report.summaryForModels ?? null,
      direction_verdict: report.directionVerdict ?? null,
      full_json: JSON.stringify(report),
      generated_by: "pipeline:write-db",
      pipeline_run_id: pipelineRunId ?? null,
      published_at: report.asOf ?? null,
      created_at: report.asOf ?? new Date().toISOString(),
    });
    count++;
  }

  for (const [week, report] of Object.entries(reportsData.weekly ?? {})) {
    const id = `report-weekly-${week}`;
    if (dryRun) { dryRunRecord("reports"); count++; continue; }

    db.prepare(`
      INSERT OR REPLACE INTO reports
        (id, kind, trading_date, week_label, summary, direction_verdict, full_json,
         generated_by, pipeline_run_id, published_at, created_at)
      VALUES
        (@id, 'weekly', NULL, @week_label, @summary, NULL, @full_json,
         @generated_by, @pipeline_run_id, @published_at, @created_at)
    `).run({
      id,
      week_label: week,
      summary: report.summaryForModels ?? report.summary ?? null,
      full_json: JSON.stringify(report),
      generated_by: "pipeline:write-db",
      pipeline_run_id: pipelineRunId ?? null,
      published_at: report.asOf ?? null,
      created_at: report.asOf ?? new Date().toISOString(),
    });
    count++;
  }

  if (dryRun) console.log(`  [dry-run] reports: would upsert ${count} rows`);
  return count;
}

function writeSystemHealth(db, health, pipelineRunId, dryRun) {
  if (!health) return 0;

  const tradingDate = (health.asOf ?? "").slice(0, 10) || null;
  const id = `shs-${pipelineRunId ?? tradingDate ?? "unknown"}`;

  if (dryRun) {
    dryRunRecord("system_health_snapshots");
    console.log(`  [dry-run] system_health_snapshots: would upsert ${id}`);
    return 1;
  }

  db.prepare(`
    INSERT OR REPLACE INTO system_health_snapshots
      (id, pipeline_run_id, as_of, trading_date, warnings_json, stale_data_json,
       missing_data_json, full_json, created_at)
    VALUES
      (@id, @pipeline_run_id, @as_of, @trading_date, @warnings_json, @stale_data_json,
       @missing_data_json, @full_json, @created_at)
  `).run({
    id,
    pipeline_run_id: pipelineRunId ?? null,
    as_of: health.asOf ?? null,
    trading_date: tradingDate,
    warnings_json: JSON.stringify(health.warnings ?? []),
    stale_data_json: JSON.stringify(health.staleData ?? []),
    missing_data_json: JSON.stringify(health.missingData ?? []),
    full_json: JSON.stringify(health),
    created_at: health.asOf ?? new Date().toISOString(),
  });
  return 1;
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  const { dataRoot, dbPath, testDbPath, dryRun } = parseArgs();

  // Safety: refuse public/data
  const publicDataPath = path.resolve(process.cwd(), "public", "data");
  const effectiveDb = testDbPath ?? dbPath;
  if (effectiveDb.startsWith(publicDataPath)) {
    console.error("[write-v3-pipeline-to-db] ERROR: DB path must not be inside public/data. Aborting.");
    process.exit(1);
  }

  console.log("\n" + "═".repeat(60));
  console.log("[write-v3-pipeline-to-db] Pipeline DB Writer");
  console.log(`[write-v3-pipeline-to-db] data-root : ${path.relative(process.cwd(), dataRoot)}`);

  if (dryRun) {
    console.log("[write-v3-pipeline-to-db] mode      : DRY-RUN (no DB writes)");
  } else if (testDbPath) {
    console.log(`[write-v3-pipeline-to-db] target DB : ${path.relative(process.cwd(), testDbPath)} (test copy)`);
  } else {
    console.log(`[write-v3-pipeline-to-db] target DB : ${path.relative(process.cwd(), dbPath)}`);
  }
  console.log("═".repeat(60));

  // Validate snapshot dir
  if (!existsSync(dataRoot)) {
    console.error(`[write-v3-pipeline-to-db] ERROR: data-root not found: ${dataRoot}`);
    console.error("  Run 'npm run pipeline:manual' first.");
    process.exit(1);
  }

  // Set up test DB if requested
  if (!dryRun && testDbPath) {
    if (!existsSync(dbPath)) {
      console.error(`[write-v3-pipeline-to-db] ERROR: source DB for test copy not found: ${dbPath}`);
      process.exit(1);
    }
    await mkdir(path.dirname(testDbPath), { recursive: true });
    await copyFile(dbPath, testDbPath);
    console.log(`[write-v3-pipeline-to-db] copied ${path.relative(process.cwd(), dbPath)} → ${path.relative(process.cwd(), testDbPath)}`);
  }

  // Validate DB exists (unless dry-run)
  if (!dryRun && !existsSync(effectiveDb)) {
    console.error(`[write-v3-pipeline-to-db] ERROR: DB file not found: ${effectiveDb}`);
    console.error("  Run 'node scripts/ensure-schema.mjs' to create it first.");
    process.exit(1);
  }

  // Load snapshot files
  console.log("\n[write-v3-pipeline-to-db] Loading snapshot...");

  const health = await readJsonMaybe(path.join(dataRoot, "system-health.json"));
  const ideas = (await readJsonMaybe(path.join(dataRoot, "ideas.json"))) ?? [];
  const newsItems = (await readJsonMaybe(path.join(dataRoot, "news.json"))) ?? [];
  const watchlistItems = (await readJsonMaybe(path.join(dataRoot, "watchlist.json"))) ?? [];
  const symbolIndex = (await readJsonMaybe(path.join(dataRoot, "symbols.json"))) ?? [];

  const profileMap = {};
  const symbolsDir = path.join(dataRoot, "symbols");
  if (existsSync(symbolsDir)) {
    const tickerDirs = await readdir(symbolsDir);
    for (const ticker of tickerDirs) {
      const profilePath = path.join(symbolsDir, ticker, "profile.json");
      const profile = await readJsonMaybe(profilePath);
      if (profile) profileMap[ticker.toUpperCase()] = profile;
    }
  }

  const reportsData = { close: {}, weekly: {} };
  const reportsDir = path.join(dataRoot, "reports");
  if (existsSync(reportsDir)) {
    const closeDir = path.join(reportsDir, "close");
    if (existsSync(closeDir)) {
      for (const f of (await readdir(closeDir)).filter((f) => f.endsWith(".json"))) {
        reportsData.close[f.replace(".json", "")] = await readJson(path.join(closeDir, f));
      }
    }
    const weeklyDir = path.join(reportsDir, "weekly");
    if (existsSync(weeklyDir)) {
      for (const f of (await readdir(weeklyDir)).filter((f) => f.endsWith(".json"))) {
        reportsData.weekly[f.replace(".json", "")] = await readJson(path.join(weeklyDir, f));
      }
    }
  }

  // Generate a stable pipeline run ID based on snapshot health ID or timestamp
  const pipelineRunId = health?.currentRun?.id
    ? `pipeline-write-${health.currentRun.id}`
    : `pipeline-write-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;

  console.log(`[write-v3-pipeline-to-db] run ID    : ${pipelineRunId}`);
  console.log(`[write-v3-pipeline-to-db] symbols   : ${symbolIndex.length}`);
  console.log(`[write-v3-pipeline-to-db] watchlist : ${watchlistItems.length} items`);
  console.log(`[write-v3-pipeline-to-db] ideas     : ${ideas.length}`);
  console.log(`[write-v3-pipeline-to-db] news      : ${newsItems.length}`);
  console.log(`[write-v3-pipeline-to-db] profiles  : ${Object.keys(profileMap).length}`);

  if (dryRun) {
    console.log("\n[write-v3-pipeline-to-db] --- DRY-RUN output ---");
    writePipelineRun(null, health, pipelineRunId, true);
    writeSymbols(null, symbolIndex, profileMap, true);
    writeWatchlist(null, watchlistItems, true);
    writeIdeas(null, ideas, pipelineRunId, true);
    writeNewsEvents(null, newsItems, pipelineRunId, true);
    writeReports(null, reportsData, pipelineRunId, true);
    writeSystemHealth(null, health, pipelineRunId, true);

    console.log("\n[write-v3-pipeline-to-db] DRY-RUN summary:");
    for (const [table, count] of Object.entries(dryRunStats.tables)) {
      console.log(`  ${table.padEnd(32)} ${count} rows`);
    }
    console.log(`  ${"TOTAL".padEnd(32)} ${dryRunStats.total} rows`);
    console.log("\n[write-v3-pipeline-to-db] ✓ Dry-run complete. No DB was modified.");
    return;
  }

  // Open DB and write in a transaction
  let Database;
  try {
    Database = require("better-sqlite3");
  } catch (err) {
    console.error("[write-v3-pipeline-to-db] ERROR: cannot load better-sqlite3:", err.message);
    process.exit(1);
  }

  const db = new Database(effectiveDb, { readonly: false, fileMustExist: true });

  const stats = {};

  try {
    const writeAll = db.transaction(() => {
      stats.pipeline_runs = writePipelineRun(db, health, pipelineRunId, false);
      stats.symbols = writeSymbols(db, symbolIndex, profileMap, false);
      stats.watchlist = writeWatchlist(db, watchlistItems, false);
      stats.ideas = writeIdeas(db, ideas, pipelineRunId, false);
      stats.news_events = writeNewsEvents(db, newsItems, pipelineRunId, false);
      stats.reports = writeReports(db, reportsData, pipelineRunId, false);
      stats.system_health = writeSystemHealth(db, health, pipelineRunId, false);
    });

    writeAll();
  } finally {
    db.close();
  }

  // Summary
  console.log("\n[write-v3-pipeline-to-db] ✓ Write complete.");
  console.log("  Rows upserted:");
  for (const [table, count] of Object.entries(stats)) {
    console.log(`    ${table.padEnd(30)} ${count}`);
  }
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(`    ${"TOTAL".padEnd(30)} ${total}`);

  const relDb = path.relative(process.cwd(), effectiveDb);
  console.log(`\n  DB: ${relDb}`);
  console.log("\n  Verify with:");
  console.log(`    node -e "const D=require('better-sqlite3'); const db=new D('${relDb}'); ['symbols','ideas','news_events','reports'].forEach(t=>console.log(t, db.prepare('SELECT COUNT(*) as n FROM '+t).get().n)); db.close()"`);
  console.log("═".repeat(60) + "\n");
}

await main();
