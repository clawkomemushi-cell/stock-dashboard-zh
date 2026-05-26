# V3 Claude + Codex Workflow

Status: Phase 1 workflow draft started 2026-05-09.

## Why this exists
V3 work is moving from a static/frontend prototype toward a company-style service. For planning-heavy or code-heavy work, the default mode is now Claude + Codex cooperation:

- Claude: primary producer for scoped implementation drafts and large code generation.
- Codex / 蝦米蟲: planner, reviewer, integrator, architecture guardrail, test runner, and final owner-facing reporter.

## Do we need a custom OpenClaw skill?
Not for Phase 1.

The current OpenClaw runtime can already do the workflow through model-targeted subagents:

1. Codex main session creates the plan and guardrails.
2. Claude is spawned as a bounded subagent with a specific task and model override.
3. Claude returns a draft or implementation.
4. Codex reviews, edits, tests, and decides whether to accept, revise, or ask Claude for another pass.
5. Only Codex reports final status to 米蟲.

A custom skill may be worth creating later if this becomes a repeated formal pipeline, but creating one now would slow Phase 1 down. First prove the collaboration pattern manually, then crystallize it into a skill if it repeats.

## Maintainability rules

These are hard rules for all later phases:

1. **Small, reviewable changes** — one phase should change one layer only: docs, generator, adapter, API, DB, or UI. Avoid mixing unrelated layers.
2. **Stable style across phases** — new docs must follow the same headings: goal, scope, inputs, outputs, non-goals, validation, next steps.
3. **Keep contracts as the center** — frontend contracts/adapters are the shared language between static files, API, DB, and pipeline.
4. **No clever one-off scripts** — scripts need clear CLI args, safe default output paths, no hidden side effects, and documentation.
5. **No direct overwrite by default** — generated data goes to `tmp/` first. Copying into `public/data` requires explicit review.
6. **Review before expansion** — do not add new features/pages/data sources until the current phase passes validation.
7. **Consistent naming** — use the same names across docs/code: idea, watchlist, news event, checkpoint, report, system health, pipeline run.
8. **Codex normalizes Claude output** — Claude may draft quickly, but Codex must clean style, remove scope creep, and make it consistent before accepting.

## Default collaboration loop

### 1. Codex defines the brief
Codex writes a narrow brief containing:
- goal
- files Claude may inspect
- expected deliverable
- non-goals
- constraints
- what must not be changed

### 2. Claude produces
Claude may produce:
- product/spec drafts
- frontend implementation patches
- API client drafts
- component/page scaffolds
- backend scaffold proposals

Claude must not independently:
- change credentials
- publish/deploy
- delete existing work
- decide paid services
- run long-lived automation
- change OpenClaw cron/model/auth defaults

### 3. Codex reviews
Codex checks:
- architecture fit
- consistency with existing docs/contracts
- TypeScript correctness
- API/DB boundaries
- scope creep
- whether it violates 米蟲 preferences

For code, Codex runs the appropriate gates:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run check:static-data`

### 4. Codex integrates
Codex performs final edits or asks Claude for a targeted revision.

### 5. Codex reports
Only Codex / 蝦米蟲 gives the final owner-facing summary:
- what changed
- what passed
- what is blocked
- what needs 米蟲 decision

## When to use Claude + Codex mode
Use this mode for:
- V3 planning docs
- major frontend code generation
- backend/API/DB scaffolding
- complex refactors
- architectural decisions
- large UI buildouts

Do not use Claude for routine small edits, quick checks, heartbeat, or long-term scheduled analysis.

## Phase 1 specific approach
Phase 1 is planning/spec work. Claude will first produce an external draft proposal. Codex will then consolidate it into the final docs.

Expected Phase 1 docs:
- `V3_EXECUTION_PLAN.md`
- `V3_PRODUCT_SPEC.md`
- `V3_PAGE_AND_FEATURE_MAP.md`
- `V3_API_SPEC.md`
- `V3_DB_SCHEMA_DRAFT.md`
- `V3_PIPELINE_SPEC.md`
- optional: `V3_DECISION_LOG.md`

## Human approval gates
Ask 米蟲 before:
- choosing a paid service
- committing to a production DB/provider
- changing auth/secrets
- publishing externally
- deleting old V1/V2/V3 work
- enabling stock automation cron again
- switching default model/provider

## Current decision
Phase 1 starts with this manual orchestration pattern. Create a dedicated skill only after the pattern proves useful and stable.
