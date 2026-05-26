# V3 API Spec

Status: Phase 1B draft, reviewed by Codex after Claude draft.
Date: 2026-05-09

## Goal
Make `NEXT_PUBLIC_DATA_MODE=api` a real mode later without changing page code.

The API should mirror the existing adapter interfaces and Zod contracts. The frontend should continue to call adapters only.

## Base URL

```env
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v3
```

Production base URL is undecided.

## Response envelope

Use a small consistent envelope for API responses.

### Success object

```json
{
  "data": {},
  "status": "ok",
  "lastUpdated": "2026-05-09T12:00:00+08:00",
  "provenance": {
    "source": "openclaw-pipeline",
    "pipelineRunId": "run_20260509_pre",
    "generatedBy": "codex"
  }
}
```

### Success array

```json
{
  "data": [],
  "count": 0,
  "status": "ok",
  "lastUpdated": "2026-05-09T12:00:00+08:00"
}
```

### Error

```json
{
  "error": {
    "code": "not_found",
    "message": "Resource not found",
    "retryable": false
  },
  "status": "error"
}
```

Common error codes:

- `not_found`
- `validation_failed`
- `stale_data`
- `pipeline_unavailable`
- `internal_error`

## API adapter behavior

The future API adapter should:

1. Fetch from `NEXT_PUBLIC_API_BASE_URL`.
2. Pass `AbortSignal` from `AdapterContext`.
3. Validate `data` with the existing Zod contract.
4. Throw on network/server/schema failure.
5. Let existing page-level `tryAsync()` render panel-level error UI.
6. Avoid direct UI imports of API helpers.

Important: Phase 1 should not silently fallback to mock in production API mode. During development, a clearly logged fallback may be acceptable, but production must expose API/data failures through System Health and panel errors.

## Endpoint map

### Dashboard

| Method | Path | Adapter method | Contract |
|---|---|---|---|
| GET | `/dashboard/summary` | `dashboard.getSummary()` | `DashboardSummary` |

### Watchlist

| Method | Path | Adapter method | Contract |
|---|---|---|---|
| GET | `/watchlist` | `watchlist.list()` | `WatchlistItem[]` |
| GET | `/watchlist/scans` | `watchlist.getScans()` | `WatchlistScanResult[]` |
| GET | `/watchlist/ai-summary` | `watchlist.getAISummary()` | `{ text: string | null }` |

Future user-specific form:

- `GET /users/me/watchlists`
- `POST /users/me/watchlists/:id/items`
- `DELETE /users/me/watchlists/:id/items/:ticker`

Not Phase 1A.

### Ideas

| Method | Path | Adapter method | Contract |
|---|---|---|---|
| GET | `/ideas` | `ideas.list()` | `Candidate[]` |
| GET | `/ideas/themes` | `ideas.themes()` | `ThemeRadarItem[]` |

Future user actions:

- `POST /ideas/:id/save`
- `POST /ideas/:id/dismiss`
- `POST /ideas/:id/follow`

Not Phase 1A.

### News

| Method | Path | Adapter method | Contract |
|---|---|---|---|
| GET | `/news` | `news.list(filters)` | `NewsItem[]` |
| GET | `/news/themes` | `news.themes()` | `ThemeRadarItem[]` |

Query params:

- `timeRange`
- `topic`
- `impactType`
- `symbol`
- `minImportance`
- `mode`

### Timeline

| Method | Path | Adapter method | Contract |
|---|---|---|---|
| GET | `/today` | `timeline.getToday()` | `DailyCheckpoint[]` |

### Symbols

| Method | Path | Adapter method | Contract |
|---|---|---|---|
| GET | `/symbols` | `symbol.list()` | `SymbolProfile[]` |
| GET | `/symbols/search?q=` | `symbol.search(query)` | `SymbolProfile[]` |
| GET | `/symbols/:ticker/profile` | `symbol.getProfile()` | `SymbolProfile | null` |
| GET | `/symbols/:ticker/overview` | `symbol.getOverview()` | `SymbolOverview | null` |
| GET | `/symbols/:ticker/technical` | `symbol.getTechnical()` | `SymbolTechnicalSnapshot | null` |
| GET | `/symbols/:ticker/fundamentals` | `symbol.getFundamentals()` | `SymbolFundamentalSnapshot | null` |
| GET | `/symbols/:ticker/ai-note` | `symbol.getAINote()` | `SymbolAINote | null` |
| GET | `/symbols/:ticker/news` | `symbol.getNews()` | `NewsItem[]` |
| GET | `/symbols/:ticker/checkpoints` | `symbol.getCheckpoints()` | `DailyCheckpoint[]` |

### Reports

| Method | Path | Adapter method | Contract |
|---|---|---|---|
| GET | `/reports/close/:date` | `reports.getCloseReview(date)` | `CloseReview | null` |
| GET | `/reports/weekly/:week` | `reports.getWeeklyReview(week)` | `WeeklyReview | null` |
| GET | `/reports/recent-close` | `reports.listRecentClose()` | `{ date, href }[]` |
| GET | `/reports/recent-weekly` | `reports.listRecentWeekly()` | `{ week, href }[]` |

### System

| Method | Path | Adapter method | Contract |
|---|---|---|---|
| GET | `/system/health` | `system.getHealth()` | `SystemHealthSnapshot` |

## Phase 1 API non-goals

- No write APIs unless explicitly planned for user features.
- No broker/order APIs.
- No paid data source proxy.
- No auth requirement for read-only prototype endpoints.
- No GraphQL.

## Implementation note
When API mode is implemented, update:

- `src/lib/adapters/api/index.ts` (new)
- `src/lib/adapters/factory.ts`
- `.env.example`
- docs and README mode switch section

Codex must verify with typecheck/lint/build after implementation.
