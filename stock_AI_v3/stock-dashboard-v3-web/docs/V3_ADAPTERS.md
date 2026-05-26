# V3 Adapters

The adapter layer is the **only** boundary between UI and data.
Pages call `getAdapters()` → bundle of typed adapters; no direct `fetch`, no direct `import` of mock data, ever.

## Files
```
src/lib/adapters/
├── interfaces.ts        # AdapterBundle + per-domain interfaces
├── factory.ts           # getAdapters() — picks bundle by dataMode
├── mock/index.ts        # MOCK_BUNDLE — default in-memory bundle
└── static-file/index.ts # STATIC_FILE_BUNDLE — reads /public/data/*.json
```

## Interfaces

Each adapter has a tightly scoped surface, summarised here:

| Interface | Methods |
|---|---|
| `DashboardAdapter` | `getSummary()` |
| `WatchlistAdapter` | `list()`, `getScans()`, `getAISummary()` |
| `IdeasAdapter` | `list()`, `themes()` |
| `NewsAdapter` | `list(filters?)`, `themes()` |
| `SymbolAdapter` | `search()`, `list()`, `getProfile()`, `getOverview()`, `getTechnical()`, `getFundamentals()`, `getAINote()`, `getNews()`, `getCheckpoints()` |
| `ReportsAdapter` | `getCloseReview()`, `getWeeklyReview()`, `listRecentClose()`, `listRecentWeekly()` |
| `SystemAdapter` | `getHealth()` |
| `TimelineAdapter` | `getToday()` |
| `ChartProviderAdapter` | `getProvider()`, `getSymbolOverviewProps()`, `getAdvancedChartProps()` |

Every method accepts an optional `AdapterContext { signal?: AbortSignal }`.

## Factory

```ts
export function getAdapters(): AdapterBundle {
  const { dataMode } = getModeConfig();
  switch (dataMode) {
    case "static-file": return STATIC_FILE_BUNDLE;
    case "api":         return MOCK_BUNDLE; // reserved – not implemented
    default:            return MOCK_BUNDLE;
  }
}
```

## Static-file adapter

- Reads JSON from `NEXT_PUBLIC_STATIC_DATA_BASE` (default `/data`).
- File layout convention:
  ```
  /data/dashboard.json
  /data/watchlist.json
  /data/watchlist-scans.json
  /data/watchlist-ai-summary.json
  /data/ideas.json
  /data/themes.json
  /data/news.json
  /data/today.json
  /data/symbols.json
  /data/symbols/<TICKER>/profile.json
  /data/symbols/<TICKER>/overview.json
  /data/symbols/<TICKER>/technical.json
  /data/symbols/<TICKER>/fundamentals.json
  /data/symbols/<TICKER>/ai-note.json
  /data/symbols/<TICKER>/news.json
  /data/symbols/<TICKER>/checkpoints.json
  /data/reports/close/<DATE>.json
  /data/reports/weekly/<WEEK>.json
  /data/reports/recent-close.json
  /data/reports/recent-weekly.json
  /data/system-health.json
  ```
- **Failure mode:** if a file is missing or invalid, the adapter falls back to `MOCK_BUNDLE` for that call. The UI never sees a 404 turn into a crash.

## Where to plug a real backend
When the `api` adapter is implemented, do it in a new file `src/lib/adapters/api/index.ts` and switch on it inside `factory.ts`. **No page change required.**

Recommended split for the future API adapter:
- One thin HTTP client (signals, base URL, auth headers if any)
- Per-domain functions calling the same endpoints used by the static-file dump
- Validate at the boundary with the Zod schemas (`Schema.safeParse`) — log and degrade gracefully on mismatches

## Known callers
The following pages call adapters today:

| Page | Calls |
|---|---|
| `/dashboard` | `dashboard.getSummary` |
| `/watchlist` | `watchlist.list`, `watchlist.getScans`, `watchlist.getAISummary` |
| `/ideas` | `ideas.list`, `ideas.themes` |
| `/news` | `news.list`, `news.themes` |
| `/today` | `timeline.getToday` |
| `/symbols` | `symbol.list` |
| `/symbols/[ticker]` | `symbol.getProfile/getOverview/getTechnical/getFundamentals/getAINote/getNews/getCheckpoints` |
| `/reports/close/[date]` | `reports.getCloseReview` |
| `/reports/weekly/[week]` | `reports.getWeeklyReview` |
| `/system/health` | `system.getHealth` |
| Topbar (sys status) | `system.getHealth` |

## Adapter resilience contract
- Every page wraps adapter calls with `tryAsync()`.
- Adapters MUST throw on hard failure (so `tryAsync` catches and maps to `ErrorState`), or return `null` for "not found" cases (page renders `EmptyState`).
- Adapters MUST NOT silently substitute fake data for production code paths (the static-file adapter's mock-fallback is a deliberate dev aid; in production it should surface a warning via `system.getHealth()`).
