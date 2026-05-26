# V3 DB Schema Draft

Status: Phase 1C draft, reviewed by Codex after Claude draft. No database has been created yet.
Date: 2026-05-09

## Design principles

1. **Static-file first** — DB is planned after JSON pipeline quality is validated.
2. **SQLite first, Postgres later** — recommended default unless 米蟲 chooses otherwise.
3. **JSON snapshots are allowed** — keep full frontend-compatible objects in `raw_json` / `full_json` to avoid early over-normalization.
4. **Soft enums** — use text fields matching frontend soft-enum behavior.
5. **Auditability** — AI-generated records should carry `pipeline_run_id`, `generated_by`, and timestamps.
6. **No hard delete for important user data** — use `deleted_at` where appropriate.

## Recommended DB path

- Development / personal MVP: SQLite.
- Production / multi-user: PostgreSQL or Supabase later.
- Supabase is useful because it bundles auth + database + row-level security, but it is an external service and needs 米蟲 approval.

## Tables

### users

Future user accounts. Phase 1 can defer real auth.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### symbols

Basic stock/ETF identity and profile cache.

```sql
CREATE TABLE symbols (
  ticker TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT,
  market TEXT,
  sector TEXT,
  description TEXT,
  profile_json JSON,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### watchlists / watchlist_items

Personal or system watchlists.

```sql
CREATE TABLE watchlists (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL DEFAULT '主清單',
  kind TEXT NOT NULL DEFAULT 'user', -- user | system | ai
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE watchlist_items (
  id TEXT PRIMARY KEY,
  watchlist_id TEXT NOT NULL REFERENCES watchlists(id),
  ticker TEXT NOT NULL REFERENCES symbols(ticker),
  note TEXT,
  source TEXT, -- user | ai | import
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP,
  UNIQUE(watchlist_id, ticker)
);
```

### ideas

AI-generated candidates corresponding to frontend `Candidate`.

```sql
CREATE TABLE ideas (
  id TEXT PRIMARY KEY,
  ticker TEXT NOT NULL,
  name TEXT,
  kind TEXT,
  role TEXT,
  summary TEXT,
  why_selected TEXT,
  trigger TEXT,
  invalidation TEXT,
  risk TEXT,
  confidence TEXT,
  trading_date DATE NOT NULL,
  themes_json JSON,
  related_news_ids_json JSON,
  generated_by TEXT,
  pipeline_run_id TEXT REFERENCES pipeline_runs(id),
  raw_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### idea_user_states

User actions on AI ideas.

```sql
CREATE TABLE idea_user_states (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  idea_id TEXT NOT NULL REFERENCES ideas(id),
  action TEXT NOT NULL, -- saved | dismissed | followed
  note TEXT,
  acted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, idea_id)
);
```

### news_events

Curated news/events corresponding to frontend `NewsItem`.

```sql
CREATE TABLE news_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT,
  url TEXT,
  impact_type TEXT,
  published_at TIMESTAMP,
  trading_date DATE,
  related_tickers_json JSON,
  themes_json JSON,
  generated_by TEXT,
  pipeline_run_id TEXT REFERENCES pipeline_runs(id),
  raw_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### reports

Close and weekly reports.

```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL, -- close | weekly
  trading_date DATE,
  week_label TEXT,
  summary TEXT,
  direction_verdict TEXT,
  full_json JSON NOT NULL,
  generated_by TEXT,
  pipeline_run_id TEXT REFERENCES pipeline_runs(id),
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### paper_holdings / paper_trades

Paper tracking only. No broker integration.

```sql
CREATE TABLE paper_holdings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  ticker TEXT NOT NULL REFERENCES symbols(ticker),
  shares NUMERIC NOT NULL,
  avg_cost NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TWD',
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  note TEXT,
  deleted_at TIMESTAMP
);

CREATE TABLE paper_trades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  holding_id TEXT REFERENCES paper_holdings(id),
  ticker TEXT NOT NULL REFERENCES symbols(ticker),
  side TEXT NOT NULL, -- buy | sell
  shares NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  fee NUMERIC,
  traded_at TIMESTAMP NOT NULL,
  idea_id TEXT REFERENCES ideas(id),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### system_health_snapshots

Historical pipeline health snapshots corresponding to frontend `SystemHealthSnapshot`.

```sql
CREATE TABLE system_health_snapshots (
  id TEXT PRIMARY KEY,
  pipeline_run_id TEXT REFERENCES pipeline_runs(id),
  as_of TIMESTAMP,
  trading_date DATE,
  warnings_json JSON,
  stale_data_json JSON,
  missing_data_json JSON,
  full_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### pipeline_runs

Each OpenClaw pipeline run.

```sql
CREATE TABLE pipeline_runs (
  id TEXT PRIMARY KEY,
  phase TEXT NOT NULL, -- pre | mid | close | evening | weekly | manual
  trading_date DATE,
  status TEXT NOT NULL DEFAULT 'running', -- running | ok | warn | failed
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP,
  duration_ms INTEGER,
  steps_json JSON,
  error_text TEXT,
  triggered_by TEXT -- manual | cron | operator
);
```

## Relationship summary

```text
users
  ├─ watchlists ─ watchlist_items ─ symbols
  ├─ idea_user_states ─ ideas ─ pipeline_runs
  └─ paper_holdings ─ paper_trades ─ ideas

pipeline_runs
  ├─ ideas
  ├─ news_events
  ├─ reports
  └─ system_health_snapshots
```

## Migration strategy

1. Keep frontend reading `public/data/**` in Phase 1A.
2. Add scripts that can import current static JSON into DB later.
3. API reads from static JSON first or DB depending on implementation phase.
4. Once DB-backed API is stable, keep static-file mode as demo/fallback.

## Open decisions

- SQLite first vs PostgreSQL/Supabase immediately.
- When to add real auth.
- Whether system watchlists and user watchlists share tables from day one.
- How much report history to import from old V1/V2 outputs.
