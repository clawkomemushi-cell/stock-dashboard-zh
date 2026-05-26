# V3 Service Architecture TODO

Status: planning note created 2026-05-09.

## Goal
Turn V3 from a frontend/static-data prototype into a company-style service: frontend + backend + database + API-managed features + scheduled AI/data pipelines.

## Current baseline
- Frontend prototype exists under `stock_AI_v3/stock-dashboard-v3-web`.
- Pages already cover Dashboard / Watchlist / Ideas / News / Today / Symbols / Reports / System Health.
- Data access is adapter-driven with `mock`, `static-file`, and reserved `api` mode.
- Static sample data and contract checks exist.
- No real backend, DB, auth, user accounts, broker/order integration, or production AI pipeline yet.

## Frontend work
1. Keep current Next.js frontend and adapter boundary.
2. Upgrade `api` mode from placeholder to real API client.
3. Add login/session UI when backend auth is ready.
4. Add per-user flows:
   - personal watchlist
   - selected stocks / followed themes
   - AI suggestion save / dismiss / follow-up
   - trade tracking / paper portfolio views
5. Add service-like UX:
   - account menu
   - settings
   - notification preferences
   - user-specific data freshness/status
6. Preserve static-file mode as fallback/demo mode.

## Backend/API work
1. Define API resource contract aligned with existing frontend contracts.
2. Build backend service for:
   - users/auth/sessions
   - watchlists
   - stock symbols and metadata
   - curated news/events
   - AI ideas/recommendations
   - reports and daily checkpoints
   - paper trades / holdings / orders tracking
   - system health / job status
3. Add database schema and migrations.
4. Add scheduled jobs:
   - daily market/news ingestion
   - AI candidate generation
   - pre-market / midday / close / evening analysis phases
   - stale-data and health checks
5. Add admin/internal APIs for OpenClaw to write generated outputs safely.
6. Add logging, error tracking, and rate-limit/cost controls.

## Recommended phases
### Phase 1 — Service spec
- Finalize product scope, page map, API map, DB schema, and job map.
- Decide stack: likely Next.js frontend + separate API service + PostgreSQL/Supabase/SQLite-to-Postgres path.

### Phase 2 — Backend MVP
- Auth, user table, watchlist CRUD, ideas read API, static-to-DB import.
- Frontend `api` mode connects to backend.

### Phase 3 — AI/data pipeline
- OpenClaw jobs write AI ideas/news/reports into backend via internal API.
- System Health shows real job/data status.

### Phase 4 — Personal tracking
- User trade journal / paper holdings / orders.
- AI suggestions can be saved, tracked, invalidated, and reviewed.

### Phase 5 — Production hardening
- Deploy, backups, secrets, monitoring, access control, quotas, and cost guardrails.

## Claude / Codex division of labor
- Claude Code is intended to be the main V3 production implementer for this round, especially frontend and well-scoped code generation after specs are ready.
- Codex / 蝦米蟲 acts as reviewer, integrator, architecture guardrail, and final decision layer.
- After launch, scheduled automation, stock analysis, OpenClaw AI recommendation/prediction pipelines, health checks, and data-flow maintenance stay with Codex / 蝦米蟲.
- 蝦米蟲 owns product planning, backend/data architecture, DB/API contracts, OpenClaw jobs, publish flow, and final review.
- Do not hand Claude an open-ended full-stack task before architecture/spec is clear.
- Do not paste Claude/Anthropic passwords, tokens, one-time codes, or recovery codes into Discord. If remote login is needed, prefer an official Claude device/browser login flow completed by 米蟲 directly on phone.
