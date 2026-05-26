#!/usr/bin/env node
/**
 * init-sample-db.mjs
 *
 * 以現有 schema + seed SQL 建立 tmp/v3-sample.db（本機測試用，不 commit）。
 *
 * 使用方式：
 *   npm run db:init-sample
 *   # 或分步：
 *   npm run pipeline:manual:sample
 *   npm run db:export-seed:sample
 *   node scripts/init-sample-db.mjs
 *
 * 建立後可啟動 DB 模式：
 *   V3_API_SOURCE=db V3_SQLITE_DB_PATH=tmp/v3-sample.db npm run dev
 *   # 另一個 terminal：
 *   npm run smoke:api-mode
 */

import { readFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const SCHEMA_FILE = path.resolve("db/schema.sqlite.sql");
const SEED_FILE = path.resolve("tmp/v3-seed-sample.sql");
const DB_FILE = path.resolve("tmp/v3-sample.db");

const TABLES = [
  "pipeline_runs",
  "symbols",
  "watchlists",
  "watchlist_items",
  "ideas",
  "news_events",
  "reports",
  "system_health_snapshots",
  "symbol_insights",
  "research_sessions",
  "portfolio_positions",
];

async function main() {
  // ── 前置檢查 ────────────────────────────────────────────────
  if (!existsSync(SCHEMA_FILE)) {
    console.error(`[init-sample-db] schema 不存在: ${SCHEMA_FILE}`);
    process.exit(1);
  }
  if (!existsSync(SEED_FILE)) {
    console.error(`[init-sample-db] seed 檔案不存在: ${SEED_FILE}`);
    console.error(`  請先執行: npm run pipeline:manual:sample && npm run db:export-seed:sample`);
    process.exit(1);
  }

  // ── 確認 better-sqlite3 可用 ─────────────────────────────────
  let Database;
  try {
    Database = require("better-sqlite3");
  } catch (err) {
    console.error("[init-sample-db] 無法載入 better-sqlite3:", err);
    process.exit(1);
  }

  // ── 準備輸出目錄 ─────────────────────────────────────────────
  await mkdir(path.dirname(DB_FILE), { recursive: true });

  if (existsSync(DB_FILE)) {
    await unlink(DB_FILE);
    console.log(`[init-sample-db] 移除既有 DB: ${path.relative(process.cwd(), DB_FILE)}`);
  }

  // ── 建立 DB ──────────────────────────────────────────────────
  const db = new Database(DB_FILE);

  try {
    const schema = await readFile(SCHEMA_FILE, "utf8");
    const seed = await readFile(SEED_FILE, "utf8");

    console.log("[init-sample-db] 套用 schema...");
    db.exec(schema);

    console.log("[init-sample-db] 匯入 seed 資料...");
    db.exec(seed);

    // ── 列印資料表筆數 ─────────────────────────────────────────
    console.log("\n[init-sample-db] 資料筆數：");
    for (const table of TABLES) {
      const row = db.prepare(`SELECT COUNT(*) as n FROM ${table}`).get();
      console.log(`  ${table.padEnd(30)} ${row.n}`);
    }

    const relOut = path.relative(process.cwd(), DB_FILE);
    console.log(`\n[init-sample-db] 完成：${relOut}`);
    console.log(`\n後續步驟 — 在 DB 模式下執行 smoke test：`);
    console.log(`  V3_API_SOURCE=db V3_SQLITE_DB_PATH=tmp/v3-sample.db npm run dev`);
    console.log(`  # 另開 terminal：`);
    console.log(`  npm run smoke:api-mode`);
  } finally {
    db.close();
  }
}

await main();
