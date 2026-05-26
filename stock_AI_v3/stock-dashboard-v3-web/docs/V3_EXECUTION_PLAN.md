# V3 Execution Plan — Claude + Codex Phase 1

Status: Draft for 米蟲 review, created 2026-05-09.

## Purpose
Turn V3 from a frontend/static-data prototype into a company-style stock research service while keeping the work controlled, reviewable, and reversible.

## Collaboration model

### Claude = producer
Claude is used for bounded, high-output work:
- planning/spec drafts
- frontend implementation
- API client drafts
- backend scaffold drafts
- prompt templates
- one-off migration/seed scripts

### Codex / 蝦米蟲 = controller + reviewer
Codex owns:
- task briefs and constraints
- architecture decisions
- code review and integration
- test/build/lint gates
- final reporting to 米蟲
- long-term OpenClaw automation and analysis pipeline

### Why no custom skill yet
A custom OpenClaw skill is not required for Phase 1. OpenClaw can already run this pattern by spawning Claude as a model-targeted subagent, then having Codex review and integrate the result.

Create a dedicated skill later only if this workflow becomes repeated enough to deserve formalization.

## Current baseline
- Frontend exists in `stock_AI_v3/stock-dashboard-v3-web`.
- Existing app is Next.js with adapter-driven data access.
- Current modes: `mock`, `static-file`, reserved `api`.
- Existing pages include Dashboard / Watchlist / Ideas / News / Today / Symbols / Reports / System Health.
- Static sample JSON and `npm run check:static-data` exist.
- Missing: real backend, DB, auth, user-specific watchlists, trade tracking, production API mode, production AI pipeline.

## Phase 1 objective
Define the service architecture and choose the lowest-risk build path.

Phase 1 should not try to finish the whole service. It should produce enough specs and small verified steps so Phase 2 implementation is safe.

## Recommended path

### Phase 1A — Real data via static-file pipeline first
Goal: keep the frontend stable and make machine-generated data feed it.

Deliverables:
- Draft AI/data pipeline spec.
- Define JSON output contracts matching existing `public/data/**`.
- Create/plan scripts that can generate `public/data` from real or semi-real data sources.
- Manually validate generated outputs before scheduling.

Why first:
- lowest risk
- does not require backend/DB immediately
- validates AI content quality before service complexity grows
- preserves existing frontend architecture

### Phase 1B — API mode
Goal: make `NEXT_PUBLIC_DATA_MODE=api` real.

Deliverables:
- API adapter spec
- route map
- unified error contract
- initial route handlers or separate backend proposal
- frontend API client behavior

### Phase 1C — DB-backed service MVP
Goal: persist watchlists, ideas, news, reports, symbol research, and system health.

Deliverables:
- DB schema draft
- migration strategy
- seed/import strategy from current static JSON
- minimal backend read APIs

### Phase 1D — User/service features
Goal: add company-style service functionality.

Deliverables:
- auth strategy
- user watchlist model
- saved/dismissed AI idea tracking
- trade journal / paper portfolio draft
- account/settings UX plan

## Phase 1 document set
Create or refine these docs:

1. `V3_PRODUCT_SPEC.md`
   - product definition, target user, non-goals, MVP scope
2. `V3_PAGE_AND_FEATURE_MAP.md`
   - current pages, future service features, ownership of each page
3. `V3_API_SPEC.md`
   - endpoint map, request/response shapes, error format
4. `V3_DB_SCHEMA_DRAFT.md`
   - users, symbols, watchlists, ideas, news/events, reports, trades, system health
5. `V3_PIPELINE_SPEC.md`
   - data sources, OpenClaw jobs, AI recommendation/prediction flow, output contracts
6. `V3_DECISION_LOG.md`
   - decisions made, pending decisions, rationale
7. `V3_CLAUDE_CODEX_WORKFLOW.md`
   - collaboration rules and gates; already created

## Human approval gates
Ask 米蟲 before:
- choosing paid data/API services
- committing to production DB/provider
- changing credentials/auth defaults
- deploying publicly
- deleting old work
- enabling/re-enabling stock automation cron
- changing default model/provider
- starting long-running/high-cost jobs

Codex may decide without asking:
- documentation organization
- local draft files
- non-destructive code scaffolds
- local validation commands
- asking Claude for bounded draft/revision tasks
- small fixes required to pass lint/typecheck/build

## Quality gates
For code changes in `stock-dashboard-v3-web`, run as applicable:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run check:static-data`

For planning docs:
- check consistency with existing docs
- ensure no hidden paid-service assumptions
- keep MVP narrow
- explicitly list open decisions

## Key decisions needed from 米蟲
1. Start with Phase 1A static-file pipeline first, or jump directly to API/backend?
2. DB preference: SQLite first, PostgreSQL/Supabase later, or production DB immediately?
3. Backend shape: Next.js route handlers first, or separate API service?
4. Data source policy: free-first only, or allow paid sources if clearly approved?
5. Initial login/auth priority: defer, simple admin/internal token, or real user accounts early?
6. Trade tracking scope: paper tracking only first, or plan for broker integration later?

## Recommendation
Start with Phase 1A + planning docs.

Reason:
- existing frontend already works with static JSON
- AI output quality is the core product risk
- backend/DB can be designed while the content pipeline is validated
- avoids building a complex service around unproven analysis output

## Next immediate steps after approval
1. Codex drafts `V3_PRODUCT_SPEC.md` and `V3_DECISION_LOG.md`.
2. Claude drafts `V3_PAGE_AND_FEATURE_MAP.md` and `V3_API_SPEC.md` from existing contracts.
3. Codex reviews and normalizes terminology.
4. Claude drafts `V3_DB_SCHEMA_DRAFT.md` and `V3_PIPELINE_SPEC.md`.
5. Codex reviews, checks against current frontend data contracts, and reports the full Phase 1 package to 米蟲.
