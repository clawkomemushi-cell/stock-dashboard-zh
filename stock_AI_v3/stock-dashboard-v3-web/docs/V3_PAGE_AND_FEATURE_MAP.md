# V3 Page and Feature Map

Status: Phase 1 draft, reviewed by Codex after Claude draft.
Date: 2026-05-09

## Principle
Phase 1 should preserve the existing page structure. Service migration happens through adapters, API contracts, DB design, and pipeline outputs — not a full UI rewrite.

## Current routes

| Route | Purpose | Main adapter | Phase 1 action |
|---|---|---|---|
| `/dashboard` | daily cockpit overview | `dashboard.getSummary()` | keep UI, feed better data |
| `/watchlist` | monitored symbols | `watchlist.*` | keep UI, later user-specific |
| `/ideas` | AI candidates | `ideas.*` | keep UI, improve generated content |
| `/news` | curated news/events | `news.*` | keep UI, API filters later |
| `/today` | intraday checkpoints | `timeline.getToday()` | keep UI, pipeline-generated checkpoints |
| `/symbols` | symbol explorer | `symbol.list/search()` | API search later |
| `/symbols/[ticker]` | symbol research | `symbol.get*()` | keep UI, API/DB later |
| `/reports/close/[date]` | close review | `reports.getCloseReview()` | keep UI |
| `/reports/weekly/[week]` | weekly review | `reports.getWeeklyReview()` | keep UI |
| `/system/health` | data/pipeline health | `system.getHealth()` | make real through pipeline |

## Existing adapter methods

Current pages already rely on these boundaries:

- Dashboard: `getSummary`
- Watchlist: `list`, `getScans`, `getAISummary`
- Ideas: `list`, `themes`
- News: `list(filters)`, `themes`
- Timeline: `getToday`
- Symbols: `list`, `search`, `getProfile`, `getOverview`, `getTechnical`, `getFundamentals`, `getAINote`, `getNews`, `getCheckpoints`
- Reports: `getCloseReview`, `getWeeklyReview`, `listRecentClose`, `listRecentWeekly`
- System: `getHealth`

## Phase 1A: static-file pipeline features

These features can remain static-file first:

- Dashboard daily summary.
- AI ideas list and theme radar.
- Watchlist AI summary and scans.
- Curated news list.
- Today checkpoints.
- Per-symbol research snapshots for a small tracked set.
- Close and weekly reports.
- System health snapshot.

Reason: all of these can be represented as generated JSON and validated before API/DB complexity.

## Phase 1B: features that should become API-backed later

These should be planned for API mode:

1. **News filtering**
   - Static JSON can handle simple client filtering, but server-side filtering will be cleaner as the dataset grows.

2. **Symbol search**
   - API/DB search is better than loading every symbol profile into the frontend.

3. **Many symbol detail pages**
   - Static-file mode is fine for a small watchlist, but not for all Taiwan stocks.

4. **User watchlists**
   - Requires auth and DB.

5. **Idea save/dismiss/follow**
   - Requires user state.

6. **Paper trading / trade journal**
   - Requires per-user persistence.

7. **System health history**
   - Current snapshot is enough first; history needs DB.

## Phase 1D service features

These are planned, not immediate Phase 1A implementation:

- Login/account shell.
- Personal watchlist CRUD.
- Saved/dismissed/followed AI ideas.
- Paper holdings and paper trades.
- User settings and notification preferences.
- Admin/operator view for pipeline runs.

## What not to change now

- Do not redesign the app shell.
- Do not add unrelated new pages.
- Do not replace TradingView widgets yet.
- Do not build broker integration.
- Do not remove mock/static-file modes.

## Feature ownership

| Feature | Claude production | Codex review/integration |
|---|---|---|
| UI components/pages | yes, if scoped | verify build and consistency |
| API adapter implementation | yes | verify contracts/fallbacks |
| DB schema drafts | yes | normalize and approve |
| Pipeline scripts | bounded pieces only | owns orchestration |
| OpenClaw cron/automation | no | yes |
| Deployment/secrets | no | only with approval |
