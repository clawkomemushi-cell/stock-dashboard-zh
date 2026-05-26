# V3 Component Map

## UI primitives — `src/components/ui`
Minimal shadcn/ui-style components (no codegen used; the small surface needed is hand-written for clarity).

| Component | Used by |
|---|---|
| `Card`, `CardHeader`, `CardContent`, `CardFooter` | Most cards |
| `Button` | FilterBar reset, error retry, manual add |
| `Badge` | Status, tag, counter pills |
| `Input` | GlobalSearch, SymbolsExplorer, WatchlistFilters |
| `Separator` | (reserved) |

## Layout — `src/components/layout`
| Component | Purpose |
|---|---|
| `AppLayout` | Global frame |
| `Sidebar` | Persistent left nav |
| `Topbar` | Search + mode badges + system status + theme |
| `MobileDrawer` | Mobile hamburger-triggered slide-in drawer (replaced MobileNav bottom tab bar) |
| `GlobalSearch` | Ticker normalisation + route to `/symbols/[ticker]` |
| `ThemeToggle` | Light/dark via next-themes |
| `nav-config.ts` | Single source of truth for nav items + reports children |

## Shared — `src/components/shared`
| Component | Used by | Behaviour |
|---|---|---|
| `StatusBadge` | Everywhere statuses appear | Soft-enum → variant; unknown → muted |
| `DataFreshnessBadge` | Every data-bearing card | Renders relative time + stale variant if older than threshold |
| `ModeBadge` | Topbar / SystemHealth | Shows active mode value with monospace label |
| `EmptyState` | Every panel that may be empty | Standard empty UX |
| `ErrorState` | Every adapter failure path | Per-panel, never full-page |
| `LoadingSkeleton`, `CardSkeleton` | `loading.tsx` files | Paged skeletons |
| `PanelSection` | Most page sections | Title + slot composition |
| `FilterBar` | Ideas / News / Watchlist / Symbols | Generic segmented controls |

## Domain cards — `src/components/cards`
| Component | Page(s) | Schema |
|---|---|---|
| `CandidateCard` | Dashboard, Ideas | `Candidate` |
| `NewsCard` | Dashboard, News, Symbol | `NewsItem` |
| `ThemeRadarCard` | Ideas, News | `ThemeRadarItem` |
| `WatchlistItemCard` | Dashboard, Watchlist | `WatchlistItem` |
| `ExternalLinksCard` | Symbol detail | `ExternalResearchLink[]` (synthesises defaults if empty) |
| `EvidenceCard` | Symbol detail | `SymbolAINote.evidence` + `Provenance` |
| `TimelineCheckpointCard` | Today, Symbol | `DailyCheckpoint` |
| `CloseReviewSummaryCard` | (reserved – Dashboard recent reports preview) | `CloseReview` |
| `WeeklySummaryCard` | (reserved – Dashboard recent weekly preview) | `WeeklyReview` |
| `SystemWarningCard` | System Health | warnings + stale + missing arrays |

## Symbol — `src/components/symbol`
| Component | Purpose |
|---|---|
| `SymbolHeader` | Title bar combining `SymbolProfile` + `SymbolOverview` |

## Charts — `src/components/chart`
| Component | Behaviour |
|---|---|
| `TradingViewSymbolOverviewShell` | Loads embed script when `chartMode=tradingview`; otherwise renders empty placeholder |
| `TradingViewAdvancedChartShell` | Same pattern; full-size chart |

Both shells degrade gracefully — script load failures keep the page alive.
