/**
 * SQLite DB reader for V3 API.
 * 僅當 V3_API_SOURCE=db 且 V3_SQLITE_DB_PATH 有值時啟用。
 * 使用 better-sqlite3（同步 driver，僅限 Node.js 環境）。
 */
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";

let _db: BetterSqliteDatabase | null = null;
let _dbPath: string | null = null;

export function isDbMode(): boolean {
  return process.env.V3_API_SOURCE === "db" && !!process.env.V3_SQLITE_DB_PATH;
}

function openDb(): BetterSqliteDatabase | null {
  if (!process.env.V3_SQLITE_DB_PATH) return null;
  const resolved = path.resolve(process.env.V3_SQLITE_DB_PATH);
  if (_db && _dbPath === resolved) return _db;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DatabaseCtor = require("better-sqlite3") as typeof import("better-sqlite3");
    _db = new DatabaseCtor(resolved, { readonly: true, fileMustExist: true });
    _dbPath = resolved;
    return _db;
  } catch (err) {
    console.error("[db-reader] 無法開啟 SQLite DB:", err);
    _db = null;
    _dbPath = null;
    return null;
  }
}

function parseJson<T>(raw: unknown): T | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export interface ResearchSessionRow {
  id: string;
  userId: string | null;
  tickers: string[];
  note: string | null;
  status: string;
  createdAt: string;
  finishedAt: string | null;
  resultJson: unknown | null;
  errorText: string | null;
}

/** 讀取單一 research job 狀態。 */
export function dbReadResearchSession(jobId: string, userId?: string | null): ResearchSessionRow | null {
  const db = openDb();
  if (!db) return null;
  const row = db
    .prepare(
      `SELECT id, user_id, tickers_json, note, status, created_at, finished_at, result_json, error_text
       FROM research_sessions
       WHERE id = ? ${userId ? "AND user_id = ?" : ""}`
    )
    .get(...(userId ? [jobId, userId] : [jobId])) as
    | {
        id: string;
        user_id: string | null;
        tickers_json: string;
        note: string | null;
        status: string;
        created_at: string;
        finished_at: string | null;
        result_json: string | null;
        error_text: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    tickers: parseJson<string[]>(row.tickers_json) ?? [],
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    resultJson: parseJson<unknown>(row.result_json),
    errorText: row.error_text,
  };
}

// ── 各 endpoint 查詢函式（回傳原始 JSON，未經 Zod 驗證）─────────────────────

/** 取得所有 active symbols 的 SymbolProfile（raw JSON array）。 */
export function dbReadSymbols(): unknown[] | null {
  const db = openDb();
  if (!db) return null;
  const rows = db
    .prepare("SELECT profile_json FROM symbols WHERE is_active = 1 ORDER BY ticker")
    .all() as { profile_json: string }[];
  return rows.flatMap((r) => {
    const parsed = parseJson<unknown>(r.profile_json);
    return parsed !== null ? [parsed] : [];
  });
}

/** 取得單一 ticker 的 SymbolProfile（raw JSON）。 */
export function dbReadSymbolProfile(ticker: string): unknown {
  const db = openDb();
  if (!db) return null;
  const row = db
    .prepare("SELECT profile_json FROM symbols WHERE ticker = ? AND is_active = 1")
    .get(ticker) as { profile_json: string } | undefined;
  return row ? parseJson<unknown>(row.profile_json) : null;
}

/** 取得最新 trading_date 的所有 ideas（raw JSON array）。 */
export function dbReadIdeas(): unknown[] | null {
  const db = openDb();
  if (!db) return null;
  const latest = db
    .prepare("SELECT MAX(trading_date) as max_date FROM ideas WHERE deleted_at IS NULL")
    .get() as { max_date: string | null } | undefined;
  if (!latest?.max_date) return [];
  const rows = db
    .prepare(
      "SELECT raw_json FROM ideas WHERE deleted_at IS NULL AND trading_date = ? ORDER BY created_at ASC"
    )
    .all(latest.max_date) as { raw_json: string }[];
  return rows.flatMap((r) => {
    const parsed = parseJson<unknown>(r.raw_json);
    return parsed !== null ? [parsed] : [];
  });
}

/** 取得所有 news_events（raw JSON array，最新在前）。 */
export function dbReadNews(): unknown[] | null {
  const db = openDb();
  if (!db) return null;
  const rows = db
    .prepare("SELECT raw_json FROM news_events ORDER BY created_at DESC")
    .all() as { raw_json: string }[];
  return rows.flatMap((r) => {
    const parsed = parseJson<unknown>(r.raw_json);
    return parsed !== null ? [parsed] : [];
  });
}

/** 取得最近 10 筆 close reports 的日期列表（{date, href}[]）。 */
export function dbReadRecentClose(): unknown[] | null {
  const db = openDb();
  if (!db) return null;
  const rows = db
    .prepare(
      "SELECT trading_date FROM reports WHERE kind = 'close' AND trading_date IS NOT NULL ORDER BY trading_date DESC LIMIT 10"
    )
    .all() as { trading_date: string }[];
  return rows.map((r) => ({
    date: r.trading_date,
    href: `/reports/close/${r.trading_date}`,
  }));
}

/** 取得最近 10 筆 weekly reports 的週標籤列表（{week, href}[]）。 */
export function dbReadRecentWeekly(): unknown[] | null {
  const db = openDb();
  if (!db) return null;
  const rows = db
    .prepare(
      "SELECT week_label FROM reports WHERE kind = 'weekly' AND week_label IS NOT NULL ORDER BY week_label DESC LIMIT 10"
    )
    .all() as { week_label: string }[];
  return rows.map((r) => ({
    week: r.week_label,
    href: `/reports/weekly/${r.week_label}`,
  }));
}

/** 取得指定日期的 CloseReview（raw JSON）。 */
export function dbReadCloseReport(date: string): unknown {
  const db = openDb();
  if (!db) return null;
  const row = db
    .prepare("SELECT full_json FROM reports WHERE kind = 'close' AND trading_date = ?")
    .get(date) as { full_json: string } | undefined;
  return row ? parseJson<unknown>(row.full_json) : null;
}

/** 取得指定週標籤的 WeeklyReview（raw JSON）。 */
export function dbReadWeeklyReport(week: string): unknown {
  const db = openDb();
  if (!db) return null;
  const row = db
    .prepare("SELECT full_json FROM reports WHERE kind = 'weekly' AND week_label = ?")
    .get(week) as { full_json: string } | undefined;
  return row ? parseJson<unknown>(row.full_json) : null;
}

/** 取得最新的 SystemHealthSnapshot（raw JSON）。 */
export function dbReadSystemHealth(): unknown {
  const db = openDb();
  if (!db) return null;
  const row = db
    .prepare("SELECT full_json FROM system_health_snapshots ORDER BY created_at DESC LIMIT 1")
    .get() as { full_json: string } | undefined;
  return row ? parseJson<unknown>(row.full_json) : null;
}

/** 取得 ticker 的最新 symbol_insights（最多 limit 筆，最新在前）。 */
export function dbReadSymbolInsights(ticker: string, limit = 20): unknown[] | null {
  const db = openDb();
  if (!db) return null;

  let normalized = ticker.trim();
  if (/^\d{4,6}$/.test(normalized)) normalized = `${normalized}.TW`;
  normalized = normalized.toUpperCase();

  const rows = db
    .prepare(
      `SELECT id, ticker, source, kind, title, body, payload_json, confidence,
              created_at, as_of, session_id
       FROM symbol_insights
       WHERE ticker = ? AND deleted_at IS NULL
       ORDER BY created_at DESC, rowid DESC
       LIMIT ?`
    )
    .all(normalized, limit) as {
    id: string;
    ticker: string;
    source: string;
    kind: string;
    title: string | null;
    body: string;
    payload_json: string | null;
    confidence: string | null;
    created_at: string;
    as_of: string | null;
    session_id: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    source: r.source,
    kind: r.kind,
    title: r.title ?? undefined,
    body: r.body,
    payloadJson: r.payload_json ? parseJson(r.payload_json) : undefined,
    confidence: r.confidence ?? undefined,
    createdAt: r.created_at,
    asOf: r.as_of ?? undefined,
    sessionId: r.session_id ?? undefined,
  }));
}

/** 取得 ticker 最新的正式 AI 研判（payload_json of kind='ai_note'），DB mode only。 */
export function dbReadSymbolAINote(ticker: string): unknown | null {
  const db = openDb();
  if (!db) return null;

  let normalized = ticker.trim();
  if (/^\d{4,6}$/.test(normalized)) normalized = `${normalized}.TW`;
  normalized = normalized.toUpperCase();

  const row = db
    .prepare(
      `SELECT payload_json FROM symbol_insights
       WHERE ticker = ? AND kind = 'ai_note' AND deleted_at IS NULL
       ORDER BY created_at DESC, rowid DESC
       LIMIT 1`
    )
    .get(normalized) as { payload_json: string | null } | undefined;

  if (!row?.payload_json) return null;
  return parseJson<unknown>(row.payload_json);
}

/** 取得所有 active symbols 的 SymbolNormalizedSummary（含 watchlist flag + latestInsight）。 */
export function dbReadSymbolNormalizedSummaries(): unknown[] | null {
  const db = openDb();
  if (!db) return null;

  const rows = db
    .prepare(
      `SELECT s.ticker, s.name, s.kind, s.sector, s.profile_json,
              wl.id as watchlist_item_id,
              (SELECT body FROM symbol_insights si
               WHERE si.ticker = s.ticker AND si.deleted_at IS NULL
               ORDER BY si.created_at DESC, si.rowid DESC LIMIT 1) as latest_insight_body,
              (SELECT created_at FROM symbol_insights si
               WHERE si.ticker = s.ticker AND si.deleted_at IS NULL
               ORDER BY si.created_at DESC, si.rowid DESC LIMIT 1) as latest_insight_at
       FROM symbols s
       LEFT JOIN watchlist_items wl ON wl.ticker = s.ticker AND wl.deleted_at IS NULL
       WHERE s.is_active = 1
       ORDER BY s.ticker`
    )
    .all() as {
    ticker: string;
    name: string | null;
    kind: string | null;
    sector: string | null;
    profile_json: string | null;
    watchlist_item_id: string | null;
    latest_insight_body: string | null;
    latest_insight_at: string | null;
  }[];

  return rows.map((r) => {
    const profile = r.profile_json ? parseJson<Record<string, unknown>>(r.profile_json) : null;
    return {
      ticker: r.ticker,
      name: r.name ?? profile?.name ?? undefined,
      kind: r.kind ?? profile?.kind ?? undefined,
      oneLineSummary: (profile?.oneLineSummary as string) ?? undefined,
      tags: (profile?.tags as string[]) ?? [],
      inWatchlist: r.watchlist_item_id !== null,
      latestInsightBody: r.latest_insight_body ?? undefined,
      latestInsightAt: r.latest_insight_at ?? undefined,
    };
  });
}

/** 取得單一 ticker 的 SymbolNormalizedSummary。 */
export function dbReadSymbolNormalizedSummary(ticker: string): unknown | null {
  const db = openDb();
  if (!db) return null;

  let normalized = ticker.trim();
  if (/^\d{4,6}$/.test(normalized)) normalized = `${normalized}.TW`;
  normalized = normalized.toUpperCase();

  const row = db
    .prepare(
      `SELECT s.ticker, s.name, s.kind, s.sector, s.profile_json,
              wl.id as watchlist_item_id,
              (SELECT body FROM symbol_insights si
               WHERE si.ticker = s.ticker AND si.deleted_at IS NULL
               ORDER BY si.created_at DESC, si.rowid DESC LIMIT 1) as latest_insight_body,
              (SELECT created_at FROM symbol_insights si
               WHERE si.ticker = s.ticker AND si.deleted_at IS NULL
               ORDER BY si.created_at DESC, si.rowid DESC LIMIT 1) as latest_insight_at
       FROM symbols s
       LEFT JOIN watchlist_items wl ON wl.ticker = s.ticker AND wl.deleted_at IS NULL
       WHERE s.ticker = ? AND s.is_active = 1`
    )
    .get(normalized) as {
    ticker: string;
    name: string | null;
    kind: string | null;
    sector: string | null;
    profile_json: string | null;
    watchlist_item_id: string | null;
    latest_insight_body: string | null;
    latest_insight_at: string | null;
  } | undefined;

  if (!row) return null;

  const profile = row.profile_json ? parseJson<Record<string, unknown>>(row.profile_json) : null;
  return {
    ticker: row.ticker,
    name: row.name ?? profile?.name ?? undefined,
    kind: row.kind ?? profile?.kind ?? undefined,
    oneLineSummary: (profile?.oneLineSummary as string) ?? undefined,
    tags: (profile?.tags as string[]) ?? [],
    inWatchlist: row.watchlist_item_id !== null,
    latestInsightBody: row.latest_insight_body ?? undefined,
    latestInsightAt: row.latest_insight_at ?? undefined,
  };
}

/** 取得 active portfolio positions（含 symbol name）。 */
export function dbReadPortfolioPositions(userId = "default"): unknown[] | null {
  const db = openDb();
  if (!db) return null;

  const rows = db
    .prepare(
      `SELECT p.id, p.ticker, p.quantity, p.avg_cost, p.currency,
              p.thesis, p.stop_loss, p.target, p.opened_at, p.status, p.note,
              s.name
       FROM portfolio_positions p
       LEFT JOIN symbols s ON s.ticker = p.ticker
       WHERE p.user_id = ? AND p.deleted_at IS NULL
       ORDER BY p.opened_at DESC`
    )
    .all(userId) as {
    id: string;
    ticker: string;
    quantity: number;
    avg_cost: number;
    currency: string;
    thesis: string | null;
    stop_loss: number | null;
    target: number | null;
    opened_at: string;
    status: string;
    note: string | null;
    name: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    name: r.name ?? undefined,
    quantity: r.quantity,
    avgCost: r.avg_cost,
    currency: r.currency,
    thesis: r.thesis ?? undefined,
    stopLoss: r.stop_loss ?? undefined,
    target: r.target ?? undefined,
    openedAt: r.opened_at,
    status: r.status,
    note: r.note ?? undefined,
  }));
}

/** 取得預設 watchlist 的所有 items（WatchlistItem-compatible array，含最新 insight）。 */
export function dbReadWatchlist(): unknown[] | null {
  const db = openDb();
  if (!db) return null;
  const rows = db
    .prepare(
      `SELECT wi.id, wi.ticker, wi.note, wi.added_at, wi.sort_order,
              s.name, s.kind, s.market,
              (SELECT body FROM symbol_insights si
               WHERE si.ticker = wi.ticker AND si.deleted_at IS NULL
               ORDER BY si.created_at DESC, si.rowid DESC LIMIT 1) as latest_insight,
              (SELECT created_at FROM symbol_insights si
               WHERE si.ticker = wi.ticker AND si.deleted_at IS NULL
               ORDER BY si.created_at DESC, si.rowid DESC LIMIT 1) as latest_insight_at
       FROM watchlist_items wi
       LEFT JOIN symbols s ON s.ticker = wi.ticker
       WHERE wi.deleted_at IS NULL
       ORDER BY wi.sort_order ASC, wi.added_at ASC`
    )
    .all() as {
    id: string;
    ticker: string;
    note: string | null;
    added_at: string;
    sort_order: number;
    name: string | null;
    kind: string | null;
    market: string | null;
    latest_insight: string | null;
    latest_insight_at: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    name: r.name ?? undefined,
    kind: r.kind ?? undefined,
    market: r.market ?? undefined,
    addedAt: r.added_at,
    latestStatus: r.latest_insight ?? r.note ?? undefined,
    latestInsightAt: r.latest_insight_at ?? undefined,
  }));
}
