# V3 Contracts (Zod schemas)

All schemas live in `src/lib/contracts/` and are re-exported from `src/lib/contracts/index.ts`.

## Design rules
1. **No hard enums.** Every "enum-like" field is `z.string()` documented with a known-values constant. New AI-published values do not crash the UI.
2. **Optional + nullable everywhere.** Pages must tolerate partial pipelines.
3. **Provenance is universal.** Every payload may carry a `Provenance` block (`source`, `fetchedAt`, `generatedBy`, `pipelineRunId`, `note`).
4. **Compose, don't reinvent.** `DashboardSummary` reuses `MarketDriver`, `Candidate`, `NewsItem`, `WatchlistItem`, `DailyCheckpoint` instead of redefining those shapes.

## Schemas

| File | Schemas | Used on |
|---|---|---|
| `common.ts` | `Provenance`, `ExternalResearchLink`, `Wrapped<T>`, soft-enum constants (`SYMBOL_KINDS`, `STATUS_LEVELS`, `DIRECTION_BIASES`, `CONFIDENCE_LABELS`, `MARKETS`) | shared |
| `market.ts` | `MarketSession`, `IndexQuote`, `MarketDriver`, `LatestSnapshot` | dashboard, topbar |
| `symbol.ts` | `SymbolProfile`, `SymbolOverview`, `SymbolTechnicalSnapshot`, `SymbolFundamentalSnapshot`, `SymbolAINote` | symbols, symbol detail |
| `ideas.ts` | `Candidate`, `ThemeRadarItem` | ideas, dashboard, news |
| `watchlist.ts` | `WatchlistItem`, `WatchlistScanResult` | watchlist, dashboard |
| `news.ts` | `NewsItem` | news, dashboard, symbol detail |
| `timeline.ts` | `DailyCheckpoint` | today, symbol detail, dashboard |
| `reports.ts` | `CloseReview`, `WeeklyReview`, `TickerReviewResult` | reports |
| `system.ts` | `SystemHealthSnapshot`, `RunStatus` | system health, topbar |
| `dashboard.ts` | `DashboardSummary` | dashboard |

## Soft-enum reference

| Field | Known values |
|---|---|
| `SymbolProfile.kind`, `SymbolOverview` etc. | `stock`, `etf`, `index`, `future` |
| `Candidate.role` | `starter`, `watch`, `observe`, `avoid` |
| `*.bias`, `MarketDriver.bias`, `SymbolAINote.bias` | `long`, `short`, `neutral`, `avoid` |
| `*.confidence` | `low`, `medium`, `high` |
| Status fields (run, freshness, layer) | `ok`, `warn`, `critical`, `stale`, `unknown` (+ `running`, `failed`, `fresh`, `missing`, `error`) |
| `NewsItem.impactType` | `market`, `sector`, `symbol`, `etf`, `macro`, `policy` |
| `ThemeRadarItem.momentum` | `rising`, `stable`, `fading` |
| `CloseReview.directionVerdict` | `bull`, `bear`, `mixed`, `neutral` |
| `TickerReviewResult.outcome` | `worked`, `failed`, `mixed`, `unknown` |
| `DailyCheckpoint.kind` | `pre`, `mid`, `close`, `after` |

The UI should always be safe if a server publishes a value outside these lists.

## Validation strategy
Currently the adapters return already-typed objects (mock fixtures + JSON files). When real backends arrive, parse at the adapter boundary:

```ts
const raw = await fetch(...).then(r => r.json());
return DashboardSummary.parse(raw); // or .safeParse for graceful degradation
```

Pages should never `.parse()` themselves — that responsibility lives in the adapter.
