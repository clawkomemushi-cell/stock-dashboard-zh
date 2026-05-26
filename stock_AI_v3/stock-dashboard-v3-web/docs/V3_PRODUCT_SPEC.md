# V3 Product Spec

Status: Phase 1 draft, reviewed by Codex after Claude draft.
Date: 2026-05-09

## Product positioning
V3 is a Taiwan stock research and decision cockpit.

It should feel like a small company service, not a static report page:

- AI/OpenClaw writes structured research data.
- Humans read, compare, save, and review decisions in the UI.
- The frontend only talks to adapters, not random data sources.
- Data can start as static JSON, then move to API + DB without rewriting pages.

## Target user
Primary user: 米蟲, using the site as a personal Taiwan stock research cockpit.

Future-compatible users:

- A logged-in individual with their own watchlist.
- A user tracking paper trades against AI ideas.
- An admin/operator reviewing pipeline health and stale data.

## Core product domains

1. **Dashboard** — daily snapshot and top priorities.
2. **Watchlist** — symbols the user or AI is monitoring.
3. **Ideas** — AI-generated candidates with reason, trigger, invalidation, and risk.
4. **News** — curated market events, mapped to symbols/themes.
5. **Today** — pre-market / midday / close / evening checkpoints.
6. **Symbols** — per-symbol research pages.
7. **Reports** — close review and weekly review.
8. **System Health** — visibility into pipeline freshness, missing data, and warnings.

## Phase 1 MVP
Phase 1 is not the whole SaaS/product. It is the bridge from current frontend prototype to service architecture.

### Phase 1A — static-file pipeline first
Goal: make machine/AI-generated JSON feed the existing frontend.

Deliverables:

- Define which `public/data/**` files the pipeline must generate.
- Define freshness and metadata expectations.
- Keep the current UI mostly unchanged.
- Validate generated JSON with `npm run check:static-data`.
- Manually inspect analysis quality before scheduling.

### Phase 1B — API mode spec
Goal: make `NEXT_PUBLIC_DATA_MODE=api` a real path later.

Deliverables:

- REST endpoint map aligned with current adapter interfaces.
- API response/error shape.
- API adapter behavior and fallback rules.
- No UI redesign required.

### Phase 1C — DB-backed MVP draft
Goal: design the persistence layer without forcing immediate deployment.

Deliverables:

- DB schema draft.
- Static JSON to DB seed/import plan.
- Migration path from SQLite dev to PostgreSQL/Supabase later.

### Phase 1D — service features plan
Goal: specify but not fully implement user/service features.

Deliverables:

- Auth strategy draft.
- User watchlist behavior.
- Saved/dismissed/followed AI idea behavior.
- Paper trading / trade journal scope.

## Non-goals for Phase 1

- No real broker integration.
- No live order routing.
- No paid data provider without explicit approval.
- No production user auth until 米蟲 approves provider/strategy.
- No long-term Claude Max automation.
- No major UI redesign unless it directly supports API/service migration.
- No re-enabling old stock cron jobs until the new V3 pipeline is ready and approved.

## Success criteria

Phase 1 is successful when:

- The product scope is clear enough for Claude to implement bounded tasks.
- Existing frontend contracts remain the main source of truth.
- Static-file pipeline requirements are defined.
- API/DB/pipeline docs are consistent with each other.
- Open decisions are explicitly listed instead of hidden in implementation.
- Codex can review future Claude code against written gates.

## Product rule
Content quality comes before service complexity.

The most important risk is whether AI stock ideas and analysis are useful. Therefore, validate generated analysis through static-file output first, then build API/DB/user features around proven data contracts.
