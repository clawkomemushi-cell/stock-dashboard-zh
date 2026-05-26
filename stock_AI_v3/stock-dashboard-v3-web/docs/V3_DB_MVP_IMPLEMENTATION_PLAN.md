# V3 DB MVP Implementation Plan

Status: Phase DB-2 完成 — DB runtime 可運作，smoke test 全過。
Date: 2026-05-10

## What we have now

- `db/schema.sqlite.sql` — SQLite-compatible schema for all V3 domain tables
- `db/README.md` — usage notes, table map, migration guidance
- No DB engine installed, no runtime code, no package deps changed

---

## Phased rollout plan

---

## DB MVP 本機測試流程

```bash
# 一鍵建立 sample DB（跑 pipeline → 匯出 SQL → 建立 SQLite）
npm run db:init-sample

# 啟動 DB 模式 dev server
V3_API_SOURCE=db V3_SQLITE_DB_PATH=tmp/v3-sample.db NEXT_PUBLIC_DATA_MODE=api npm run dev

# 另開 terminal，執行 smoke test（17 項全過）
npm run smoke:api-mode
```

### 支援 DB 模式的 endpoints

| Endpoint | DB 讀取來源 |
|---|---|
| GET /api/v3/symbols | symbols 資料表（profile_json）|
| GET /api/v3/symbols/search | 同上，再 in-memory 過濾 |
| GET /api/v3/symbols/:ticker/profile | symbols WHERE ticker=? |
| GET /api/v3/ideas | ideas 資料表（最新 trading_date，raw_json）|
| GET /api/v3/news | news_events 資料表（raw_json）|
| GET /api/v3/reports/recent-close | reports WHERE kind='close'（日期列表）|
| GET /api/v3/reports/recent-weekly | reports WHERE kind='weekly'（週標籤列表）|
| GET /api/v3/reports/close/:date | reports WHERE kind='close' AND trading_date=? |
| GET /api/v3/reports/weekly/:week | reports WHERE kind='weekly' AND week_label=? |
| GET /api/v3/system/health | system_health_snapshots（最新一筆 full_json）|
| GET /api/v3/watchlist | watchlist_items JOIN symbols |

### 仍使用靜態檔案 fallback 的 endpoints

- `GET /api/v3/dashboard/summary` — dashboard 是多資料表組合視圖，MVP 先保留靜態 JSON。
- `GET /api/v3/watchlist/scans`、`/watchlist/ai-summary` — 無對應 DB 資料表。
- `GET /api/v3/ideas/themes`、`/news/themes` — 無對應 DB 資料表。
- `GET /api/v3/symbols/:ticker/overview|technical|fundamentals|ai-note|news|checkpoints` — 詳細 symbol 頁面資料未匯入 DB（MVP 範圍外）。

---

### Phase DB-0 (done): Schema draft

**Goal:** write and review the SQL schema before touching any runtime code.

- [x] Draft `db/schema.sqlite.sql` (11 tables, indexes, SQLite-safe types)
- [x] Write `db/README.md` with usage and migration notes
- [x] Write this plan

No code changes. Lint/typecheck/build unaffected.

---

### Phase DB-1 (done): Seed from snapshot

**Goal:** populate the DB with data from the existing `public/data/**` static JSON files, so we can verify the schema before wiring any API.

Steps:
1. Write a one-shot seed script (e.g. `scripts/seed-db-from-snapshot.ts` or `.mjs`).
2. Script reads each `public/data/*.json` and `public/data/symbols/**/*.json`.
3. Maps frontend JSON shape → DB row (using the `raw_json` / `full_json` columns for the full object, plus extracted scalar fields).
4. Inserts into `dev.db` via `better-sqlite3` (or any SQLite driver approved at that time).
5. Manual inspection: verify row counts, spot-check extracted fields.

**Dependencies needed (require approval before install):**
- A SQLite Node.js driver: `better-sqlite3` (sync, good for scripts) or `@electric-sql/pglite` (wasm Postgres, skips provider decision).

**Does NOT change:** Next.js app, adapters, API routes, runtime behavior.

---

### Phase DB-2 (done): Read API from DB

**Goal:** switch the already-created Next.js API route handlers from static-file reads to DB-backed reads.

Current status:
- `src/app/api/v3/**` route handlers already exist and read static JSON through `V3_API_DATA_ROOT` / `public/data`.
- `src/lib/adapters/api/index.ts` already exists and `dataMode=api` works locally.
- `smoke:api-mode` already verifies representative API endpoints and pages.

Steps:
1. Add a DB read helper parallel to the existing static data reader.
2. Change route handlers to read DB rows and return the same response envelope.
3. Keep static-file/API smoke tests as fallback validation.
4. Run existing smoke tests against API mode.
5. Validate with Zod contracts end-to-end.

**完成。** 新增 `src/app/api/v3/_lib/db-reader.ts`（better-sqlite3 同步讀取）與 `readDataSource()` helper；11 個代表性 endpoints 已接 DB。`npm run smoke:api-mode` 17 項全過。

---

### Phase DB-3: User auth & watchlist persistence (deferred)

**Goal:** allow 米蟲 (and eventually other users) to save watchlist items, idea states, and paper trades.

Steps:
1. Choose and implement auth strategy (pending P005 decision).
2. Wire `users`, `watchlists`, `watchlist_items`, `idea_user_states`, `paper_holdings`, `paper_trades` to write APIs.
3. Add row-level security if on Supabase/Postgres.

**This phase is blocked on P002 (production DB provider) and P005 (auth priority).**

---

## Points that require 米蟲 decisions before proceeding

| ID | Question | Why it blocks |
|---|---|---|
| **P002** | Production DB provider: SQLite self-hosted, PostgreSQL, or Supabase? | Determines driver package, migration tooling, and hosting path |
| **P005** | Auth priority: add login now or defer? | Determines whether user-linked tables are useful in Phase DB-2 |
| **Driver approval** | Which SQLite/DB Node driver to install? (`better-sqlite3`, `pglite`, `drizzle`, etc.) | Any `npm install` needs approval per D001/approval-gate rules |
| **Deployment target** | Where does the API run? (local, VPS, Vercel, Cloudflare) | Affects whether SQLite file-based DB is viable in production |

---

## What will NOT change during DB MVP phases

- No changes to `public/data/**` static files (still the source of truth for Phase DB-1 seed)
- No changes to existing adapters (`static`, `mock`) — they remain as fallback and demo mode
- No changes to Next.js pages or UI components
- No credentials or `.env` secrets committed
- No paid data sources

---

## Relationship between DB phases and pipeline phases

```
Pipeline (static-file)          DB phases
─────────────────────────────   ──────────────────────────────
Phase 1A: generate JSON    →    Phase DB-1: seed DB from JSON
Phase 1B: API spec         →    Phase DB-2: API reads from DB
Phase 1C: schema draft     →    (this document)
Future: multi-user          →    Phase DB-3: auth + persistence
```

The DB is a persistence backend for data the pipeline already produces. It does not replace the pipeline.
