/**
 * Adapter interfaces. Pages talk ONLY to these — never to fetch / DB / SDK.
 *
 * This file is the single boundary between UI and data. It is intentionally
 * abstract so the same UI code can run against:
 *   - mock        (hardcoded fixtures, dev-friendly)
 *   - static-file (read JSON from /public/data, suitable for static hosting)
 *   - api         (reserved – future backend)
 *
 * Each method MUST be cancel-friendly via AbortSignal and MUST return either
 * valid data or throw. Callers wrap calls with tryAsync() and render error UI
 * instead of crashing the page.
 */

import type {
  DashboardSummary,
  WatchlistItem,
  WatchlistScanResult,
  Candidate,
  ThemeRadarItem,
  NewsItem,
  DailyCheckpoint,
  SymbolProfile,
  SymbolOverview,
  SymbolTechnicalSnapshot,
  SymbolFundamentalSnapshot,
  SymbolAINote,
  CloseReview,
  WeeklyReview,
  SystemHealthSnapshot,
  HoldingItem,
  VolatileRadarItem,
} from "@/lib/contracts";

export interface AdapterContext {
  signal?: AbortSignal;
}

export interface DashboardAdapter {
  getSummary(ctx?: AdapterContext): Promise<DashboardSummary>;
}

export interface WatchlistAdapter {
  list(ctx?: AdapterContext): Promise<WatchlistItem[]>;
  getScans(ctx?: AdapterContext): Promise<WatchlistScanResult[]>;
  getAISummary(ctx?: AdapterContext): Promise<{ text: string | null }>;
}

export interface IdeasAdapter {
  list(ctx?: AdapterContext): Promise<Candidate[]>;
  themes(ctx?: AdapterContext): Promise<ThemeRadarItem[]>;
}

export interface NewsAdapter {
  list(
    filters?: {
      timeRange?: string;
      topic?: string;
      impactType?: string;
      symbol?: string;
      minImportance?: number;
      mode?: string;
    },
    ctx?: AdapterContext
  ): Promise<NewsItem[]>;
  themes(ctx?: AdapterContext): Promise<ThemeRadarItem[]>;
}

export interface SymbolAdapter {
  search(query: string, ctx?: AdapterContext): Promise<SymbolProfile[]>;
  list(ctx?: AdapterContext): Promise<SymbolProfile[]>;
  getProfile(ticker: string, ctx?: AdapterContext): Promise<SymbolProfile | null>;
  getOverview(ticker: string, ctx?: AdapterContext): Promise<SymbolOverview | null>;
  getTechnical(
    ticker: string,
    ctx?: AdapterContext
  ): Promise<SymbolTechnicalSnapshot | null>;
  getFundamentals(
    ticker: string,
    ctx?: AdapterContext
  ): Promise<SymbolFundamentalSnapshot | null>;
  getAINote(ticker: string, ctx?: AdapterContext): Promise<SymbolAINote | null>;
  getNews(ticker: string, ctx?: AdapterContext): Promise<NewsItem[]>;
  getCheckpoints(
    ticker: string,
    ctx?: AdapterContext
  ): Promise<DailyCheckpoint[]>;
}

export interface ReportsAdapter {
  getCloseReview(date: string, ctx?: AdapterContext): Promise<CloseReview | null>;
  getWeeklyReview(week: string, ctx?: AdapterContext): Promise<WeeklyReview | null>;
  listRecentClose(ctx?: AdapterContext): Promise<{ date: string; href: string }[]>;
  listRecentWeekly(ctx?: AdapterContext): Promise<{ week: string; href: string }[]>;
}

export interface SystemAdapter {
  getHealth(ctx?: AdapterContext): Promise<SystemHealthSnapshot>;
}

export interface TimelineAdapter {
  getToday(ctx?: AdapterContext): Promise<DailyCheckpoint[]>;
}

export interface PoolsAdapter {
  getHoldings(ctx?: AdapterContext): Promise<HoldingItem[]>;
  getOpportunities(ctx?: AdapterContext): Promise<Candidate[]>;
  getVolatileRadar(ctx?: AdapterContext): Promise<VolatileRadarItem[]>;
}

/**
 * ChartProviderAdapter is a thin shell description, not real chart data.
 * The actual rendering is in TradingViewWidgetShell-style components.
 * This adapter just tells the UI which provider/widget kind to mount.
 */
export interface ChartProviderAdapter {
  getProvider(): "tradingview" | "native" | "provider-x" | string;
  getSymbolOverviewProps(
    ticker: string
  ): Record<string, unknown> | null;
  getAdvancedChartProps(
    ticker: string
  ): Record<string, unknown> | null;
}

/** A bag of all adapters resolved for the current request/mode. */
export interface AdapterBundle {
  dashboard: DashboardAdapter;
  watchlist: WatchlistAdapter;
  ideas: IdeasAdapter;
  news: NewsAdapter;
  symbol: SymbolAdapter;
  reports: ReportsAdapter;
  system: SystemAdapter;
  timeline: TimelineAdapter;
  pools: PoolsAdapter;
  chart: ChartProviderAdapter;
}
