#!/usr/bin/env node
/**
 * ensure-schema.mjs
 *
 * 對指定 SQLite DB 套用 db/schema.sqlite.sql（冪等，使用 CREATE TABLE IF NOT EXISTS）。
 * 若 DB 檔案不存在會自動建立。
 *
 * 使用方式：
 *   node scripts/ensure-schema.mjs
 *   V3_SQLITE_DB_PATH=tmp/my.db node scripts/ensure-schema.mjs
 */

import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const SCHEMA_FILE = path.resolve("db/schema.sqlite.sql");
const DB_PATH = process.env.V3_SQLITE_DB_PATH
  ? path.resolve(process.env.V3_SQLITE_DB_PATH)
  : path.resolve("tmp/v3-sample.db");

if (!existsSync(SCHEMA_FILE)) {
  console.error(`[ensure-schema] schema 不存在：${SCHEMA_FILE}`);
  process.exit(1);
}

let Database;
try {
  Database = require("better-sqlite3");
} catch (err) {
  console.error("[ensure-schema] 無法載入 better-sqlite3：", err.message);
  process.exit(1);
}

await mkdir(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
try {
  const schema = await readFile(SCHEMA_FILE, "utf8");
  db.exec(schema);
  const relPath = path.relative(process.cwd(), DB_PATH);
  console.log(`[ensure-schema] schema 套用完成 → ${relPath}`);
} finally {
  db.close();
}
