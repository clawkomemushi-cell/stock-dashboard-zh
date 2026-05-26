# V3 Page Map

All routes live under the `(app)` route group, sharing the global AppLayout (Sidebar + Topbar + MobileDrawer).

| Route | Purpose | Adapter calls | Notable panels |
|---|---|---|---|
| `/dashboard` | Today overview cockpit. | `dashboard.getSummary()` | Market state · Driver · Top Ideas · Watchlist deltas · News · Today timeline · Recent reports · System summary |
| `/watchlist` | Self-managed workbench. | `watchlist.list()`, `watchlist.getScans()`, `watchlist.getAISummary()` | Manual add · market/kind/tag filters · scan results · AI summary · custom scan placeholder |
| `/ideas` | AI-driven candidate pool (V3 differentiator). | `ideas.list()`, `ideas.themes()` | Candidate cards · role/kind/conf/news/theme filters · theme radar sidebar |
| `/news` | "Usable" news, not raw RSS. | `news.list()`, `news.themes()` | Top market-moving · symbol-linked · policy/macro · low-signal collapsible · time/impact/importance filters · curated/stream toggle |
| `/today` | Pre/Mid/Close timeline. | `timeline.getToday()` | Vertical timeline w/ status, trigger, invalidation per checkpoint |
| `/symbols` | Symbol explorer. | `symbol.list()` | Search · kind · theme filter · per-symbol summary card |
| `/symbols/[ticker]` | Per-symbol research page. | `symbol.getProfile/Overview/Technical/Fundamentals/AINote/News/Checkpoints` | SymbolHeader · TradingView shells · AI Notes + Evidence · Today's checkpoints · Technical · Fundamentals · News · External links |
| `/reports/close` | Latest close review (landing — redirects to most recent). | `reports.listRecentClose()` | EmptyState fallback if no reports available |
| `/reports/close/[date]` | Daily close review. | `reports.getCloseReview()` | Direction verdict · accuracy · what worked / failed / next-day · ticker results · analysis layer status |
| `/reports/weekly` | Latest weekly review (landing — redirects to most recent). | `reports.listRecentWeekly()` | EmptyState fallback if no reports available |
| `/reports/weekly/[week]` | Weekly review. | `reports.getWeeklyReview()` | Summary · wins/misses · bias observations · adjustments · daily review cards |
| `/system/health` | Data pipeline health. | `system.getHealth()` | Current run · last publish · active modes · warnings · freshness · routes/adapters table |

## Routing notes
- Path alias `@/*` → `src/*`
- All pages are Server Components by default. Client islands are isolated under suffixes like `WatchlistFilters.tsx`, `IdeasFiltered.tsx`, `NewsFiltered.tsx`, `SymbolsExplorer.tsx`.
- Each page uses `export const dynamic = "force-dynamic"` to ensure fresh adapter reads. (Trade-off: not statically generated. Easy to flip per-page later.)
- `/` redirects to `/dashboard`.
- Global `error.tsx` (full-page) and per-section `error.tsx` (within the group) both exist. Page-level errors should be exceptional — most failures are absorbed at the panel level via `tryAsync()`.

## Sidebar mapping
Order in `nav-config.ts`: Dashboard · Watchlist · Ideas · News · Today · Symbols · Reports (with subitems Close Review / Weekly Review) · System.
