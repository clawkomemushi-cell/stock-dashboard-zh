# db/ — Local/Dev Schema Draft

> **This is a local development schema draft.**
> It is NOT a production database selection. No DB engine has been installed or configured.
> Production DB provider (SQLite self-hosted / PostgreSQL / Supabase) requires 米蟲 approval.

## What's here

| File | Purpose |
|---|---|
| `schema.sqlite.sql` | SQLite-compatible CREATE TABLE statements for all V3 domain tables |

## How to import locally (if you have sqlite3)

```sh
# from the project root
sqlite3 dev.db < db/schema.sqlite.sql

# verify tables
sqlite3 dev.db ".tables"
```

`dev.db` is gitignored (or should be — add it to `.gitignore` if not already).

## Table → V3 domain map

| Table | V3 domain |
|---|---|
| `pipeline_runs` | Pipeline orchestration & audit trail |
| `users` | Auth / multi-user (deferred) |
| `symbols` | Stock/ETF identity + profile cache |
| `watchlists` / `watchlist_items` | Personal & system watchlists |
| `ideas` | AI-generated candidates (`Candidate` contract) |
| `idea_user_states` | User actions on ideas (save / dismiss / follow) |
| `news_events` | Curated news/events (`NewsItem` contract) |
| `reports` | Close & weekly reports (`CloseReview` / `WeeklyReview`) |
| `paper_holdings` / `paper_trades` | Paper-trading journal (no broker integration) |
| `system_health_snapshots` | Historical health snapshots (`SystemHealthSnapshot`) |

## JSON columns

All JSON is stored as `TEXT`. SQLite's built-in `json()` / `json_extract()` functions work with these columns:

```sql
-- example: find ideas for a specific theme
SELECT id, ticker FROM ideas
WHERE json_extract(themes_json, '$[0]') = '半導體';
```

## Migration path to Postgres / Supabase

When 米蟲 approves a production DB provider:

1. **SQLite → Postgres**: most SQL is compatible; replace `TEXT` JSON columns with `JSONB`, replace `INTEGER` booleans with `BOOLEAN`, review `CURRENT_TIMESTAMP` → `NOW()`.
2. **Supabase**: Supabase runs Postgres + adds auth + RLS. The `users` table may be replaced by `auth.users` managed by Supabase Auth. Row-level security policies can be layered on top of this schema.
3. A migration tool (Flyway, golang-migrate, Prisma Migrate, or plain SQL scripts) should manage versioned migrations once a provider is chosen.

## What this schema does NOT do

- No runtime DB connections in V3 code (yet)
- No package dependencies added
- No ORM or query builder configured
- No credentials / connection strings
