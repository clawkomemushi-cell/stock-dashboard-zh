-- V3 DB MVP Schema (SQLite-compatible)
-- Status: local/dev draft — not production DB selection
-- Date: 2026-05-09
--
-- Rules:
--   - TEXT/INTEGER/NUMERIC/REAL only (no JSONB, TEXT[], now())
--   - JSON stored as TEXT (SQLite json() functions work fine)
--   - CURRENT_TIMESTAMP is SQLite-native UTC
--   - Soft enums via TEXT CHECK or doc convention
--   - pipeline_runs defined first (referenced by other tables)

-- ─────────────────────────────────────────
-- pipeline_runs
-- Tracks every OpenClaw pipeline execution.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id            TEXT PRIMARY KEY,
  phase         TEXT NOT NULL,               -- pre | mid | close | evening | weekly | manual
  trading_date  TEXT,                        -- ISO date YYYY-MM-DD
  status        TEXT NOT NULL DEFAULT 'running', -- running | ok | warn | failed
  started_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  finished_at   TEXT,
  duration_ms   INTEGER,
  steps_json    TEXT,                        -- JSON array of step records
  error_text    TEXT,
  triggered_by  TEXT                         -- manual | cron | operator
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_trading_date ON pipeline_runs(trading_date);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_phase        ON pipeline_runs(phase);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status       ON pipeline_runs(status);

-- ─────────────────────────────────────────
-- users
-- Future user accounts; auth deferred.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  role          TEXT NOT NULL DEFAULT 'user', -- user | admin
  created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  last_login_at TEXT,
  deleted_at    TEXT
);

-- ─────────────────────────────────────────
-- symbols
-- Stock/ETF identity + profile cache.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS symbols (
  ticker        TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  kind          TEXT,                        -- stock | etf | index
  market        TEXT,                        -- TWSE | TPEx
  sector        TEXT,
  description   TEXT,
  profile_json  TEXT,                        -- JSON: full SymbolProfile
  is_active     INTEGER NOT NULL DEFAULT 1, -- 0 = false, 1 = true
  updated_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_symbols_kind   ON symbols(kind);
CREATE INDEX IF NOT EXISTS idx_symbols_market ON symbols(market);

-- ─────────────────────────────────────────
-- watchlists
-- Personal or system watchlists.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlists (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id),
  name          TEXT NOT NULL DEFAULT '主清單',
  kind          TEXT NOT NULL DEFAULT 'user', -- user | system | ai
  is_default    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  deleted_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);

-- ─────────────────────────────────────────
-- watchlist_items
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlist_items (
  id            TEXT PRIMARY KEY,
  watchlist_id  TEXT NOT NULL REFERENCES watchlists(id),
  ticker        TEXT NOT NULL REFERENCES symbols(ticker),
  note          TEXT,
  source        TEXT,                        -- user | ai | import
  added_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  deleted_at    TEXT,
  UNIQUE(watchlist_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_ticker       ON watchlist_items(ticker);

-- ─────────────────────────────────────────
-- ideas
-- AI-generated candidates (frontend: Candidate).
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id                   TEXT PRIMARY KEY,
  ticker               TEXT NOT NULL,
  name                 TEXT,
  kind                 TEXT,                -- stock | etf
  role                 TEXT,                -- starter | watch | observe | avoid
  summary              TEXT,
  why_selected         TEXT,
  trigger              TEXT,
  invalidation         TEXT,
  risk                 TEXT,
  confidence           TEXT,                -- high | medium | low
  trading_date         TEXT NOT NULL,       -- ISO date
  themes_json          TEXT,                -- JSON array of theme strings
  related_news_ids_json TEXT,               -- JSON array of news_events.id
  generated_by         TEXT,
  pipeline_run_id      TEXT REFERENCES pipeline_runs(id),
  raw_json             TEXT NOT NULL,       -- full Candidate JSON
  created_at           TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  deleted_at           TEXT
);

CREATE INDEX IF NOT EXISTS idx_ideas_trading_date    ON ideas(trading_date);
CREATE INDEX IF NOT EXISTS idx_ideas_ticker          ON ideas(ticker);
CREATE INDEX IF NOT EXISTS idx_ideas_pipeline_run_id ON ideas(pipeline_run_id);

-- ─────────────────────────────────────────
-- idea_user_states
-- User actions on AI ideas (saved/dismissed/followed).
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idea_user_states (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id),
  idea_id  TEXT NOT NULL REFERENCES ideas(id),
  action   TEXT NOT NULL,                  -- saved | dismissed | followed
  note     TEXT,
  acted_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(user_id, idea_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_user_states_user_id ON idea_user_states(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_user_states_idea_id ON idea_user_states(idea_id);

-- ─────────────────────────────────────────
-- news_events
-- Curated news/events (frontend: NewsItem).
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_events (
  id                   TEXT PRIMARY KEY,
  title                TEXT NOT NULL,
  summary              TEXT,
  source               TEXT,
  url                  TEXT,
  impact_type          TEXT,               -- positive | negative | neutral | mixed
  published_at         TEXT,
  trading_date         TEXT,               -- ISO date
  related_tickers_json TEXT,               -- JSON array of ticker strings
  themes_json          TEXT,               -- JSON array of theme strings
  generated_by         TEXT,
  pipeline_run_id      TEXT REFERENCES pipeline_runs(id),
  raw_json             TEXT NOT NULL,      -- full NewsItem JSON
  created_at           TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_news_events_trading_date    ON news_events(trading_date);
CREATE INDEX IF NOT EXISTS idx_news_events_pipeline_run_id ON news_events(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_news_events_impact_type     ON news_events(impact_type);

-- ─────────────────────────────────────────
-- reports
-- Close and weekly reports.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id                TEXT PRIMARY KEY,
  kind              TEXT NOT NULL,         -- close | weekly
  trading_date      TEXT,                  -- ISO date (for close reports)
  week_label        TEXT,                  -- e.g. "2026-W19" (for weekly reports)
  summary           TEXT,
  direction_verdict TEXT,
  full_json         TEXT NOT NULL,         -- full CloseReview / WeeklyReview JSON
  generated_by      TEXT,
  pipeline_run_id   TEXT REFERENCES pipeline_runs(id),
  published_at      TEXT,
  created_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_reports_kind         ON reports(kind);
CREATE INDEX IF NOT EXISTS idx_reports_trading_date ON reports(trading_date);
CREATE INDEX IF NOT EXISTS idx_reports_week_label   ON reports(week_label);

-- ─────────────────────────────────────────
-- paper_holdings
-- Paper-trading position tracking.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paper_holdings (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  ticker     TEXT NOT NULL REFERENCES symbols(ticker),
  shares     NUMERIC NOT NULL,
  avg_cost   NUMERIC NOT NULL,
  currency   TEXT NOT NULL DEFAULT 'TWD',
  opened_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  closed_at  TEXT,
  note       TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_paper_holdings_user_id ON paper_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_holdings_ticker  ON paper_holdings(ticker);

-- ─────────────────────────────────────────
-- paper_trades
-- Individual paper-trade records.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paper_trades (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  holding_id  TEXT REFERENCES paper_holdings(id),
  ticker      TEXT NOT NULL REFERENCES symbols(ticker),
  side        TEXT NOT NULL,              -- buy | sell
  shares      NUMERIC NOT NULL,
  price       NUMERIC NOT NULL,
  fee         NUMERIC,
  traded_at   TEXT NOT NULL,
  idea_id     TEXT REFERENCES ideas(id),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_paper_trades_user_id   ON paper_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_trades_ticker    ON paper_trades(ticker);
CREATE INDEX IF NOT EXISTS idx_paper_trades_traded_at ON paper_trades(traded_at);

-- ─────────────────────────────────────────
-- system_health_snapshots
-- Historical pipeline health (frontend: SystemHealthSnapshot).
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_health_snapshots (
  id              TEXT PRIMARY KEY,
  pipeline_run_id TEXT REFERENCES pipeline_runs(id),
  as_of           TEXT,
  trading_date    TEXT,                   -- ISO date
  warnings_json   TEXT,                  -- JSON array
  stale_data_json TEXT,                  -- JSON array
  missing_data_json TEXT,                -- JSON array
  full_json       TEXT NOT NULL,         -- full SystemHealthSnapshot JSON
  created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_system_health_trading_date    ON system_health_snapshots(trading_date);
CREATE INDEX IF NOT EXISTS idx_system_health_pipeline_run_id ON system_health_snapshots(pipeline_run_id);

-- ─────────────────────────────────────────
-- symbol_insights
-- Append-only event/insight/checkpoint stream shared across all pages.
-- Every pipeline run, on-demand research, and manual note writes here.
-- Pages read from this one table — no per-page private data copies.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS symbol_insights (
  id              TEXT PRIMARY KEY,
  ticker          TEXT NOT NULL REFERENCES symbols(ticker),
  source          TEXT NOT NULL,   -- 'pipeline:close' | 'pipeline:morning' | 'research:on_demand' | 'manual'
  kind            TEXT NOT NULL,   -- 'checkpoint' | 'note' | 'ai_summary' | 'news_event' | 'opportunity_reason' | 'research_request'
  title           TEXT,
  body            TEXT NOT NULL,
  payload_json    TEXT,            -- optional JSON metadata
  confidence      TEXT,            -- 'high' | 'medium' | 'low'
  created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  as_of           TEXT,            -- ISO date/datetime the insight refers to
  session_id      TEXT,            -- links to research_sessions.id
  pipeline_run_id TEXT REFERENCES pipeline_runs(id),
  user_id         TEXT REFERENCES users(id),
  deleted_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_symbol_insights_ticker     ON symbol_insights(ticker);
CREATE INDEX IF NOT EXISTS idx_symbol_insights_source     ON symbol_insights(source);
CREATE INDEX IF NOT EXISTS idx_symbol_insights_kind       ON symbol_insights(kind);
CREATE INDEX IF NOT EXISTS idx_symbol_insights_created_at ON symbol_insights(created_at);
CREATE INDEX IF NOT EXISTS idx_symbol_insights_session_id ON symbol_insights(session_id);

-- ─────────────────────────────────────────
-- research_sessions
-- Audit trail for on-demand research requests (user-triggered).
-- Each row represents one research job, linked from symbol_insights via session_id.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id),
  tickers_json TEXT NOT NULL,   -- JSON array of ticker strings
  note         TEXT,
  status       TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'running' | 'done' | 'error' | 'mock'
  created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  finished_at  TEXT,
  result_json  TEXT,            -- optional JSON result when done
  error_text   TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_sessions_user_id    ON research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_status     ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_research_sessions_created_at ON research_sessions(created_at);

-- ─────────────────────────────────────────
-- portfolio_positions
-- Actual tracked holdings with monitoring fields (thesis / stop / target).
-- Distinct from paper_holdings: focused on active position monitoring.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_positions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL DEFAULT 'default',
  ticker     TEXT NOT NULL REFERENCES symbols(ticker),
  quantity   NUMERIC NOT NULL,
  avg_cost   NUMERIC NOT NULL,
  currency   TEXT NOT NULL DEFAULT 'TWD',
  thesis     TEXT,             -- reason for holding / investment thesis
  stop_loss  NUMERIC,          -- stop loss price level
  target     NUMERIC,          -- target price level
  opened_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  status     TEXT NOT NULL DEFAULT 'active', -- 'active' | 'closed' | 'stopped'
  note       TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_portfolio_positions_user_id ON portfolio_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_ticker  ON portfolio_positions(ticker);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_status  ON portfolio_positions(status);
