/**
 * SQLite DB writer for V3 API (watchlist CRUD MVP).
 * 僅當 V3_API_SOURCE=db 且 V3_SQLITE_DB_PATH 有值時可用。
 * 使用 better-sqlite3（同步 driver，僅限 Node.js 環境）。
 * 與 db-reader 分離為獨立可寫連線（local dev MVP）。
 */
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { isDbMode } from "./db-reader";

let _db: BetterSqliteDatabase | null = null;
let _dbPath: string | null = null;

function openWritableDb(): BetterSqliteDatabase | null {
  if (!process.env.V3_SQLITE_DB_PATH) return null;
  const resolved = path.resolve(process.env.V3_SQLITE_DB_PATH);
  if (_db && _dbPath === resolved) return _db;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DatabaseCtor = require("better-sqlite3") as typeof import("better-sqlite3");
    _db = new DatabaseCtor(resolved, { readonly: false, fileMustExist: true });
    _dbPath = resolved;
    return _db;
  } catch (err) {
    console.error("[db-writer] 無法開啟 SQLite DB:", err);
    _db = null;
    _dbPath = null;
    return null;
  }
}

/** 取得或建立預設 watchlist，回傳其 id。 */
function ensureLocalUser(db: BetterSqliteDatabase, userId?: string | null): string | null {
  if (!userId) return null;
  const safeUserId = userId.trim() || "default";
  const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(safeUserId);
  if (!existing) {
    db.prepare(
      `INSERT INTO users (id, email, display_name, role)
       VALUES (?, ?, ?, 'user')`
    ).run(safeUserId, `${safeUserId}@local.invalid`, safeUserId);
  }
  return safeUserId;
}

function getOrCreateDefaultWatchlist(db: BetterSqliteDatabase): string {
  const row = db
    .prepare("SELECT id FROM watchlists WHERE is_default = 1 AND deleted_at IS NULL LIMIT 1")
    .get() as { id: string } | undefined;
  if (row) return row.id;

  const id = "default-watchlist";
  db.prepare(
    `INSERT INTO watchlists (id, name, kind, is_default)
     VALUES (?, 'default-watchlist', 'user', 1)
     ON CONFLICT(id) DO UPDATE SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP`
  ).run(id);
  return id;
}

export interface AddWatchlistInput {
  ticker: string;
  name?: string;
  kind?: string;
  market?: string;
  note?: string;
}

/** 新增 ticker 到預設 watchlist。若已軟刪除則復活；若已存在則回錯誤。 */
export function dbAddToWatchlist(
  input: AddWatchlistInput
): { ok: true; id: string } | { ok: false; error: string } {
  if (!isDbMode()) return { ok: false, error: "DB 模式未啟用" };
  const db = openWritableDb();
  if (!db) return { ok: false, error: "無法連接資料庫" };

  let ticker = input.ticker.trim();
  if (/^\d{4,6}$/.test(ticker)) ticker = `${ticker}.TW`;
  ticker = ticker.toUpperCase();

  // 確保 symbols 有此 ticker（placeholder，避免 FK 擋住）
  const symRow = db.prepare("SELECT ticker FROM symbols WHERE ticker = ?").get(ticker);
  if (!symRow) {
    db.prepare(
      `INSERT OR IGNORE INTO symbols (ticker, name, kind, market, is_active)
       VALUES (?, ?, ?, ?, 1)`
    ).run(
      ticker,
      input.name ?? ticker,
      input.kind ?? "stock",
      input.market ?? (ticker.endsWith(".TW") ? "TWSE" : "US")
    );
  }

  const watchlistId = getOrCreateDefaultWatchlist(db);

  const existing = db
    .prepare(
      "SELECT id, deleted_at FROM watchlist_items WHERE watchlist_id = ? AND ticker = ? LIMIT 1"
    )
    .get(watchlistId, ticker) as { id: string; deleted_at: string | null } | undefined;

  if (existing) {
    if (existing.deleted_at === null) {
      return { ok: false, error: `${ticker} 已在自選股中` };
    }
    // 軟刪除中 → 復活
    db.prepare(
      "UPDATE watchlist_items SET deleted_at = NULL, note = ?, added_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(input.note ?? null, existing.id);
    return { ok: true, id: existing.id };
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO watchlist_items (id, watchlist_id, ticker, note, source)
     VALUES (?, ?, ?, ?, 'user')`
  ).run(id, watchlistId, ticker, input.note ?? null);
  return { ok: true, id };
}

/** 軟刪除預設 watchlist 中的 ticker。 */
export function dbRemoveFromWatchlist(
  ticker: string
): { ok: true } | { ok: false; error: string } {
  if (!isDbMode()) return { ok: false, error: "DB 模式未啟用" };
  const db = openWritableDb();
  if (!db) return { ok: false, error: "無法連接資料庫" };

  let normalized = ticker.trim();
  if (/^\d{4,6}$/.test(normalized)) normalized = `${normalized}.TW`;
  normalized = normalized.toUpperCase();

  const wl = db
    .prepare("SELECT id FROM watchlists WHERE is_default = 1 AND deleted_at IS NULL LIMIT 1")
    .get() as { id: string } | undefined;
  if (!wl) return { ok: false, error: "找不到預設自選股清單" };

  const item = db
    .prepare(
      "SELECT id FROM watchlist_items WHERE watchlist_id = ? AND ticker = ? AND deleted_at IS NULL LIMIT 1"
    )
    .get(wl.id, normalized) as { id: string } | undefined;

  if (!item) return { ok: false, error: `${normalized} 不在自選股中` };

  db.prepare(
    "UPDATE watchlist_items SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(item.id);
  return { ok: true };
}

// ── Symbol profile upsert ──────────────────────────────────────────────────

export interface EnsureSymbolInput {
  ticker: string;
  name?: string;
  kind?: string;
  market?: string;
  sector?: string;
  profileJson?: unknown;
}

/** Upsert symbol into `symbols` table. Safe to call multiple times. */
export function dbEnsureSymbol(
  input: EnsureSymbolInput
): { ok: true } | { ok: false; error: string } {
  const db = openWritableDb();
  if (!db) return { ok: false, error: "無法連接資料庫" };

  let ticker = input.ticker.trim();
  if (/^\d{4,6}$/.test(ticker)) ticker = `${ticker}.TW`;
  ticker = ticker.toUpperCase();

  const profileJson = input.profileJson ? JSON.stringify(input.profileJson) : null;
  const market = input.market ?? (ticker.endsWith(".TW") ? "TWSE" : "US");

  db.prepare(
    `INSERT INTO symbols (ticker, name, kind, market, sector, profile_json, is_active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(ticker) DO UPDATE SET
       name        = COALESCE(excluded.name, name),
       kind        = COALESCE(excluded.kind, kind),
       market      = COALESCE(excluded.market, market),
       sector      = COALESCE(excluded.sector, sector),
       profile_json= COALESCE(excluded.profile_json, profile_json),
       is_active   = 1,
       updated_at  = CURRENT_TIMESTAMP`
  ).run(
    ticker,
    input.name ?? ticker,
    input.kind ?? "stock",
    market,
    input.sector ?? null,
    profileJson
  );

  return { ok: true };
}

// ── Symbol insights ────────────────────────────────────────────────────────

export interface AddInsightInput {
  ticker: string;
  source: string;
  kind: string;
  body: string;
  title?: string;
  payloadJson?: unknown;
  confidence?: string;
  asOf?: string;
  sessionId?: string;
  pipelineRunId?: string;
  userId?: string;
}

/** Append a new insight record for a ticker. Ensures the symbol row exists first. */
export function dbAddSymbolInsight(
  input: AddInsightInput
): { ok: true; id: string } | { ok: false; error: string } {
  const db = openWritableDb();
  if (!db) return { ok: false, error: "無法連接資料庫" };

  let ticker = input.ticker.trim();
  if (/^\d{4,6}$/.test(ticker)) ticker = `${ticker}.TW`;
  ticker = ticker.toUpperCase();

  // Ensure symbol row exists (FK)
  const symRow = db.prepare("SELECT ticker FROM symbols WHERE ticker = ?").get(ticker);
  if (!symRow) {
    db.prepare(
      `INSERT OR IGNORE INTO symbols (ticker, name, kind, is_active)
       VALUES (?, ?, 'stock', 1)`
    ).run(ticker, ticker);
  }

  const id = randomUUID();
  const userId = ensureLocalUser(db, input.userId);
  db.prepare(
    `INSERT INTO symbol_insights
       (id, ticker, source, kind, title, body, payload_json, confidence, as_of,
        session_id, pipeline_run_id, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    ticker,
    input.source,
    input.kind,
    input.title ?? null,
    input.body,
    input.payloadJson ? JSON.stringify(input.payloadJson) : null,
    input.confidence ?? null,
    input.asOf ?? null,
    input.sessionId ?? null,
    input.pipelineRunId ?? null,
    userId
  );

  return { ok: true, id };
}

// ── Research sessions ──────────────────────────────────────────────────────

export interface CreateResearchSessionInput {
  tickers: string[];
  note?: string;
  userId?: string;
  status?: string;
}

/** Create a new research session record. Returns the generated jobId. */
export function dbCreateResearchSession(
  input: CreateResearchSessionInput
): { ok: true; id: string } | { ok: false; error: string } {
  const db = openWritableDb();
  if (!db) return { ok: false, error: "無法連接資料庫" };

  const id = randomUUID();
  const status = input.status ?? "queued";
  const userId = ensureLocalUser(db, input.userId);

  db.prepare(
    `INSERT INTO research_sessions (id, user_id, tickers_json, note, status)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    JSON.stringify(input.tickers),
    input.note ?? null,
    status
  );

  return { ok: true, id };
}

export interface UpdateResearchSessionInput {
  status?: string;
  resultJson?: unknown;
  errorText?: string;
  finishedAt?: string;
}

/** Update the status / result of an existing research session. */
export function dbUpdateResearchSession(
  jobId: string,
  update: UpdateResearchSessionInput
): { ok: true } | { ok: false; error: string } {
  const db = openWritableDb();
  if (!db) return { ok: false, error: "無法連接資料庫" };

  const row = db.prepare("SELECT id FROM research_sessions WHERE id = ?").get(jobId);
  if (!row) return { ok: false, error: `找不到 research session: ${jobId}` };

  db.prepare(
    `UPDATE research_sessions SET
       status      = COALESCE(?, status),
       result_json = COALESCE(?, result_json),
       error_text  = COALESCE(?, error_text),
       finished_at = COALESCE(?, finished_at)
     WHERE id = ?`
  ).run(
    update.status ?? null,
    update.resultJson ? JSON.stringify(update.resultJson) : null,
    update.errorText ?? null,
    update.finishedAt ?? null,
    jobId
  );

  return { ok: true };
}

// ── Portfolio positions ────────────────────────────────────────────────────

export interface AddPortfolioPositionInput {
  ticker: string;
  quantity: number;
  avgCost: number;
  currency?: string;
  thesis?: string;
  stopLoss?: number;
  target?: number;
  note?: string;
  userId?: string;
}

/** Add a new portfolio position. Ensures symbol row exists. */
export function dbAddPortfolioPosition(
  input: AddPortfolioPositionInput
): { ok: true; id: string } | { ok: false; error: string } {
  const db = openWritableDb();
  if (!db) return { ok: false, error: "無法連接資料庫" };

  let ticker = input.ticker.trim();
  if (/^\d{4,6}$/.test(ticker)) ticker = `${ticker}.TW`;
  ticker = ticker.toUpperCase();

  // Ensure symbol row exists (FK)
  const symRow = db.prepare("SELECT ticker FROM symbols WHERE ticker = ?").get(ticker);
  if (!symRow) {
    db.prepare(
      `INSERT OR IGNORE INTO symbols (ticker, name, kind, is_active)
       VALUES (?, ?, 'stock', 1)`
    ).run(ticker, ticker);
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO portfolio_positions
       (id, user_id, ticker, quantity, avg_cost, currency, thesis, stop_loss, target, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.userId ?? "default",
    ticker,
    input.quantity,
    input.avgCost,
    input.currency ?? "TWD",
    input.thesis ?? null,
    input.stopLoss ?? null,
    input.target ?? null,
    input.note ?? null
  );

  return { ok: true, id };
}

export interface UpdatePortfolioPositionInput {
  status?: string;
  thesis?: string;
  stopLoss?: number | null;
  target?: number | null;
  note?: string;
  quantity?: number;
  avgCost?: number;
}

/** Update fields on an existing portfolio position. */
export function dbUpdatePortfolioPosition(
  id: string,
  update: UpdatePortfolioPositionInput
): { ok: true } | { ok: false; error: string } {
  const db = openWritableDb();
  if (!db) return { ok: false, error: "無法連接資料庫" };

  const row = db
    .prepare("SELECT id FROM portfolio_positions WHERE id = ? AND deleted_at IS NULL")
    .get(id);
  if (!row) return { ok: false, error: `找不到持倉: ${id}` };

  if (update.status === "closed" || update.status === "stopped") {
    db.prepare(
      `UPDATE portfolio_positions SET
         status    = ?,
         thesis    = COALESCE(?, thesis),
         stop_loss = CASE WHEN ? IS NOT NULL THEN ? ELSE stop_loss END,
         target    = CASE WHEN ? IS NOT NULL THEN ? ELSE target END,
         note      = COALESCE(?, note),
         quantity  = COALESCE(?, quantity),
         avg_cost  = COALESCE(?, avg_cost),
         deleted_at= CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      update.status,
      update.thesis ?? null,
      update.stopLoss,
      update.stopLoss ?? null,
      update.target,
      update.target ?? null,
      update.note ?? null,
      update.quantity ?? null,
      update.avgCost ?? null,
      id
    );
  } else {
    db.prepare(
      `UPDATE portfolio_positions SET
         status    = COALESCE(?, status),
         thesis    = COALESCE(?, thesis),
         stop_loss = CASE WHEN ? IS NOT NULL THEN ? ELSE stop_loss END,
         target    = CASE WHEN ? IS NOT NULL THEN ? ELSE target END,
         note      = COALESCE(?, note),
         quantity  = COALESCE(?, quantity),
         avg_cost  = COALESCE(?, avg_cost)
       WHERE id = ?`
    ).run(
      update.status ?? null,
      update.thesis ?? null,
      update.stopLoss,
      update.stopLoss ?? null,
      update.target,
      update.target ?? null,
      update.note ?? null,
      update.quantity ?? null,
      update.avgCost ?? null,
      id
    );
  }

  return { ok: true };
}

/** Soft-delete a portfolio position. */
export function dbDeletePortfolioPosition(
  id: string
): { ok: true } | { ok: false; error: string } {
  const db = openWritableDb();
  if (!db) return { ok: false, error: "無法連接資料庫" };

  const result = db
    .prepare(
      "UPDATE portfolio_positions SET deleted_at = CURRENT_TIMESTAMP, status = 'closed' WHERE id = ? AND deleted_at IS NULL"
    )
    .run(id);

  if (result.changes === 0) return { ok: false, error: `找不到持倉: ${id}` };
  return { ok: true };
}

/**
 * Helper for pipeline scripts: write a symbol_insight without requiring DB mode check.
 * Used by pipeline runners to record candidate/checkpoint insights.
 */
export function dbPipelineAddInsight(
  input: AddInsightInput
): { ok: true; id: string } | { ok: false; error: string } {
  const db = openWritableDb();
  if (!db) return { ok: false, error: "無法連接資料庫" };
  return dbAddSymbolInsight(input);
}
