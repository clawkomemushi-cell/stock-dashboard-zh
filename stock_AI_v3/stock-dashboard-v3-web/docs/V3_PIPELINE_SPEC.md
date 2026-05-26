# V3 Pipeline Spec

Status: Phase 1A/1C draft, reviewed by Codex after Claude draft.
Date: 2026-05-09

## Goal
Build a safe path from manual AI stock analysis to a V3 data pipeline.

The first milestone is not DB/API. The first milestone is reliable generated JSON that the current frontend can already read.

## Principles

1. **Static-file first** — generate `public/data/**` before DB/API automation.
2. **One phase at a time** — pre-market, midday, close, evening, weekly should be independent.
3. **Human-quality validation before cron** — manually inspect outputs before scheduling.
4. **Codex owns automation** — long-term OpenClaw jobs run under Codex/蝦米蟲, not Claude Max.
5. **Small candidate set** — individual stocks max 5 unless explicitly expanded.
6. **Explain reasoning, not just conclusions** — every idea needs thesis, evidence, risk, invalidation.
7. **No paid data source without approval**.

## Phase 1A output files

The pipeline should eventually generate or update:

- `public/data/dashboard.json`
- `public/data/watchlist.json`
- `public/data/watchlist-scans.json`
- `public/data/watchlist-ai-summary.json`
- `public/data/ideas.json`
- `public/data/themes.json`
- `public/data/news.json`
- `public/data/today.json`
- `public/data/system-health.json`
- `public/data/symbols.json`
- `public/data/symbols/{ticker}/profile.json`
- `public/data/symbols/{ticker}/overview.json`
- `public/data/symbols/{ticker}/technical.json`
- `public/data/symbols/{ticker}/fundamentals.json`
- `public/data/symbols/{ticker}/ai-note.json`
- `public/data/symbols/{ticker}/news.json`
- `public/data/symbols/{ticker}/checkpoints.json`
- `public/data/reports/close/{date}.json`
- `public/data/reports/weekly/{week}.json`
- `public/data/reports/recent-close.json`
- `public/data/reports/recent-weekly.json`

## Pipeline phases

### Pre-market phase
Purpose: before market open, create the day’s thesis and candidate set.

Outputs:

- dashboard market session summary
- ideas candidates
- themes
- today pre-market checkpoint
- watchlist scan summary
- system health update

Inputs:

- previous close/weekly reports
- recent news/events
- current watchlist
- relevant market context

### Midday phase
Purpose: check whether the morning thesis still holds.

Outputs:

- today midday checkpoint
- updated watchlist scan notes
- optional idea status changes
- system health update

Inputs:

- intraday market movement if available
- morning ideas/thesis
- breaking news/events

### Close phase
Purpose: review thesis quality and update learning loop.

Outputs:

- close report
- today close checkpoint
- idea follow-up notes
- system health update

Inputs:

- day movement
- morning/midday thesis
- candidate performance
- news during session

### Evening phase
Purpose: clean summary, prepare next-day context.

Outputs:

- dashboard evening summary if needed
- refined symbol notes
- updated watchlist AI summary
- system health update

### Weekly phase
Purpose: higher-level reflection and bias/consistency checks.

Outputs:

- weekly report
- recent weekly index
- summary for future models

## Data source policy

### Free-first sources
Use these before paid services:

- TWSE / TPEx public information
- MOPS public company disclosures
- ETF issuer pages
- TradingView links/widgets for chart context
- Brave/web search for news discovery when needed

### Paid/limited sources
Only evaluate with approval:

- Fugle
- FinMind paid tiers
- commercial quote/news APIs
- any paid LLM/API plan beyond current setup

## AI output requirements

Each candidate idea should include:

- ticker and name
- role: starter / watch / observe / avoid
- why selected
- trigger
- invalidation
- risk
- confidence
- related themes
- related news/event ids if available
- as-of timestamp
- provenance / pipeline run id

Reports should include:

- what the previous thesis expected
- what actually happened
- where reasoning was right/wrong
- what should change next time
- short `summary_for_models` when used as future context

## Manual validation before automation

Before enabling cron:

1. Run pipeline manually for one phase.
2. Validate JSON with `npm run check:static-data`.
3. Run frontend typecheck/lint/build if code changed.
4. Inspect UI pages using static-file mode.
5. Read actual AI ideas for usefulness.
6. Only then consider scheduling.

## System health expectations

`system-health.json` should show:

- latest successful run
- latest failed/warned run
- stale data list
- missing data list
- important warnings
- current mode: mock/static-file/api
- freshness per data domain

## Phase 1 implementation sequence

1. Define pipeline output contract.
2. Create manual generator script or documented command plan.
3. Generate sample day data for one trading date.
4. Run `npm run check:static-data`.
5. Inspect dashboard/ideas/news/today/system health.
6. Improve prompt/schema until useful.
7. Only then plan cron job re-enable/new V3 cron.

## What Claude may do

Claude may draft:

- prompt templates
- JSON generator scripts
- API adapter code
- schema mapping helpers
- documentation

Claude should not:

- run long-term scheduled jobs
- manage credentials
- choose paid data sources
- publish/deploy without approval
- re-enable old stock cron jobs

## What Codex owns

Codex/蝦米蟲 owns:

- orchestration
- final prompts
- validation
- cron integration
- system health tracking
- final report to 米蟲

## Open risks

- Free data sources may be inconsistent.
- AI output may be too verbose or not actionable.
- Static JSON may grow too large if all symbols are included.
- API/DB work may start too early before content quality is proven.

## Recommendation
Start with one manual pre-market style run that generates a small but complete static dataset for the existing frontend.

Do not automate until the output is useful enough for 米蟲 to read and judge.
