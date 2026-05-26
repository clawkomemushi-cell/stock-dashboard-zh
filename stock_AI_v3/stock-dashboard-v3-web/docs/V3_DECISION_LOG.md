# V3 Decision Log

Status: Phase 1 draft.
Date: 2026-05-09

## Confirmed decisions

### D000 — Keep V3 phases maintainable and reviewable
Decision: Every later phase must be easy to update, easy to review, and stylistically consistent with previous phases.

Rules:

- small diffs over large rewrites
- one layer at a time
- same naming across docs/code/data
- generator output to `tmp/` first
- no hidden side effects
- Codex normalizes Claude output before accepting it

Rationale: V3 is becoming a long-running service project; inconsistent phase style or hard-to-change scripts would make future review and maintenance painful.

### D001 — Use Claude + Codex cooperation for major V3 work
Decision: Claude acts as main producer for bounded planning/code tasks; Codex/蝦米蟲 acts as controller, reviewer, integrator, and long-term automation owner.

Rationale: Claude is useful for large code/spec output; Codex is better positioned to guard architecture, run checks, and maintain OpenClaw automation.

### D002 — Do not make Claude Max the long-term automation engine
Decision: Claude may help produce V3, but scheduled analysis/pipeline work after launch stays with Codex/OpenClaw.

Rationale: Reduces Claude Max usage/policy risk and keeps automation under the existing OpenClaw workflow.

### D003 — Keep current frontend architecture
Decision: Preserve Next.js + adapter-driven frontend. Do not rewrite UI during Phase 1.

Rationale: Existing frontend already has pages, contracts, mock/static-file modes, and validation.

### D004 — Start with static-file pipeline first
Decision: Phase 1A should validate AI-generated `public/data/**` before backend/DB service complexity.

Rationale: Content quality is the biggest product risk. Static-file mode already works and is the lowest-risk validation path.

### D005 — Preserve mock and static-file modes
Decision: Even after API mode exists, keep mock/static-file modes for demo, fallback, and local validation.

Rationale: Useful for resilience and development.

## Recommended defaults unless 米蟲 overrides

### R001 — DB path
Default: SQLite for local/dev MVP, PostgreSQL or Supabase later.

Why: fastest local iteration with a reasonable migration path.

Needs approval before production DB/provider.

### R002 — Backend shape
Default: start with API spec aligned to adapters. Implementation can begin with Next.js route handlers unless requirements push toward a separate service.

Why: fewer moving parts early.

### R003 — Data sources
Default: free-first.

Use TWSE/TPEx/MOPS/ETF issuers/web search/TradingView links before paid APIs.

Paid providers require approval.

### R004 — Auth
Default: defer full auth until after static-file pipeline and API read mode are clear.

Possible interim option: internal/admin token for OpenClaw write endpoints later, but only after approval.

### R005 — Trade tracking
Default: paper trading / journal only. No real broker integration in Phase 1.

## Pending decisions for 米蟲

### P001 — Confirm Phase 1A first
Status: effectively approved in chat, but keep listed as project decision.

Question: Continue validating static-file pipeline before API/DB implementation?

Recommended answer: yes.

### P002 — Production DB/provider
Question: SQLite-first, PostgreSQL self-hosted, or Supabase?

Recommended answer: SQLite-first for local MVP; choose production provider later.

### P003 — Deployment target
Question: local only, VPS, Vercel, Cloudflare Pages, or hybrid?

Recommended answer: defer until API/backend path is clearer.

### P004 — Paid data source policy
Question: free-only for now, or allow evaluation of paid providers with explicit approval?

Recommended answer: free-first; paid only when a specific data gap is proven.

### P005 — Auth priority
Question: add login early, or defer until watchlist/idea persistence is ready?

Recommended answer: defer real auth until after API/DB MVP shape is confirmed.

### P006 — Old stock cron jobs
Question: when to re-enable stock automation?

Recommended answer: do not re-enable old V1/V2 jobs. Build new V3 pipeline jobs after manual validation.

## Approval gates

Ask 米蟲 before:

- paid API/data/model usage
- production DB/provider choice
- deployment/public release
- credential/auth changes
- destructive cleanup/deletion
- gateway restart unless already explicitly approved
- re-enabling stock cron jobs
- switching default model/provider

Codex may proceed without asking for:

- local docs
- non-destructive scaffolding
- bounded Claude draft tasks
- local typecheck/lint/build/check-static-data
- small fixes needed to keep local verification passing

## Next planned decisions

1. Whether to implement a manual static-file generator first.
2. Which trading date/sample dataset to use for the first generated V3 day.
3. Whether to keep Phase 1 pipeline scripts inside this Next.js app or a sibling `pipeline/` folder.
