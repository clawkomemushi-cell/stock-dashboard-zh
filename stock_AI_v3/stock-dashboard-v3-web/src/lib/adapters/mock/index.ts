/**
 * Mock adapter bundle. The default adapter for dataMode=mock.
 * All methods are async to keep the same shape as future real adapters.
 */

import type {
  DashboardAdapter,
  WatchlistAdapter,
  IdeasAdapter,
  NewsAdapter,
  SymbolAdapter,
  ReportsAdapter,
  SystemAdapter,
  TimelineAdapter,
  PoolsAdapter,
  ChartProviderAdapter,
  AdapterBundle,
} from "../interfaces";

import {
  MOCK_DASHBOARD,
  MOCK_WATCHLIST,
  MOCK_SCANS,
  MOCK_CANDIDATES,
  MOCK_THEME_RADAR,
  MOCK_NEWS,
  MOCK_SYMBOL_PROFILES,
  MOCK_SYMBOL_OVERVIEWS,
  MOCK_SYMBOL_TECHNICAL,
  MOCK_SYMBOL_FUNDAMENTALS,
  MOCK_SYMBOL_AI_NOTES,
  MOCK_TODAY_CHECKPOINTS,
  MOCK_CLOSE_REVIEW,
  MOCK_WEEKLY_REVIEW,
  MOCK_RECENT_CLOSE_REPORTS,
  MOCK_RECENT_WEEKLY_REPORTS,
  MOCK_SYSTEM_HEALTH,
  MOCK_HOLDING_POOL,
  MOCK_OPPORTUNITY_POOL,
  MOCK_VOLATILE_RADAR,
} from "@/lib/mocks";
import { getModeConfig } from "@/lib/modes/config";

// helper to clone (avoid downstream mutation surprises)
const clone = <T>(v: T): T => (v == null ? v : JSON.parse(JSON.stringify(v)));

const mockDashboard: DashboardAdapter = {
  async getSummary() {
    return clone(MOCK_DASHBOARD);
  },
};

const mockWatchlist: WatchlistAdapter = {
  async list() {
    return clone(MOCK_WATCHLIST);
  },
  async getScans() {
    return clone(MOCK_SCANS);
  },
  async getAISummary() {
    return {
      text:
        "本日自選股以 AI 主軸為主,核心部位 (2330/0050) 結構穩定;鴻海短線過熱建議減碼或等待回檔;高股息維持衛星部位,等待催化;航運 (2603) 暫迴避。",
    };
  },
};

const mockIdeas: IdeasAdapter = {
  async list() {
    return clone(MOCK_CANDIDATES);
  },
  async themes() {
    return clone(MOCK_THEME_RADAR);
  },
};

const mockNews: NewsAdapter = {
  async list(filters) {
    let items = clone(MOCK_NEWS);
    if (filters?.symbol) {
      items = items.filter((n) =>
        (n.relatedSymbols ?? []).includes(filters.symbol!)
      );
    }
    if (filters?.impactType) {
      items = items.filter((n) => n.impactType === filters.impactType);
    }
    if (filters?.topic) {
      items = items.filter((n) => n.topic === filters.topic);
    }
    if (typeof filters?.minImportance === "number") {
      items = items.filter(
        (n) => (n.importanceScore ?? 0) >= filters.minImportance!
      );
    }
    if (filters?.mode) {
      items = items.filter((n) => !n.mode || n.mode === filters.mode);
    }
    return items;
  },
  async themes() {
    return clone(MOCK_THEME_RADAR);
  },
};

const mockSymbol: SymbolAdapter = {
  async search(query) {
    const q = (query || "").toLowerCase();
    return clone(
      MOCK_SYMBOL_PROFILES.filter(
        (p) =>
          p.ticker.toLowerCase().includes(q) ||
          (p.name ?? "").toLowerCase().includes(q)
      )
    );
  },
  async list() {
    return clone(MOCK_SYMBOL_PROFILES);
  },
  async getProfile(ticker) {
    return clone(
      MOCK_SYMBOL_PROFILES.find((p) => p.ticker === ticker) ?? null
    );
  },
  async getOverview(ticker) {
    return clone(MOCK_SYMBOL_OVERVIEWS[ticker] ?? null);
  },
  async getTechnical(ticker) {
    return clone(MOCK_SYMBOL_TECHNICAL[ticker] ?? null);
  },
  async getFundamentals(ticker) {
    return clone(MOCK_SYMBOL_FUNDAMENTALS[ticker] ?? null);
  },
  async getAINote(ticker) {
    return clone(MOCK_SYMBOL_AI_NOTES[ticker] ?? null);
  },
  async getNews(ticker) {
    return clone(
      MOCK_NEWS.filter((n) => (n.relatedSymbols ?? []).includes(ticker))
    );
  },
  async getCheckpoints(ticker) {
    return clone(
      MOCK_TODAY_CHECKPOINTS.filter((c) =>
        (c.linkedSymbols ?? []).includes(ticker)
      )
    );
  },
};

const mockReports: ReportsAdapter = {
  async getCloseReview(date) {
    if (date === MOCK_CLOSE_REVIEW.date) return clone(MOCK_CLOSE_REVIEW);
    // Return a generic shell so that older dates do not 404 in mock mode.
    return {
      ...clone(MOCK_CLOSE_REVIEW),
      date,
      directionVerdict: "neutral",
      thesisAccuracyScore: null,
      whatWorked: [],
      whatFailed: [],
      nextDayWatchpoints: [],
      tickerResults: [],
    };
  },
  async getWeeklyReview(week) {
    if (week === MOCK_WEEKLY_REVIEW.week) return clone(MOCK_WEEKLY_REVIEW);
    return {
      ...clone(MOCK_WEEKLY_REVIEW),
      week,
      summary: null,
      keyWins: [],
      keyMisses: [],
      biasObservations: [],
      nextWeekAdjustments: [],
      dailyReviews: [],
    };
  },
  async listRecentClose() {
    return clone(MOCK_RECENT_CLOSE_REPORTS);
  },
  async listRecentWeekly() {
    return clone(MOCK_RECENT_WEEKLY_REPORTS);
  },
};

const mockSystem: SystemAdapter = {
  async getHealth() {
    const cfg = getModeConfig();
    const warnings = [...(MOCK_SYSTEM_HEALTH.warnings ?? [])];
    const routes = [...(MOCK_SYSTEM_HEALTH.routes ?? [])];

    if (cfg.dataMode === "api") {
      warnings.unshift(
        "API mode 尚未實作，前端目前使用 mock adapter fallback。"
      );
    }

    if (cfg.dataMode === "static-file") {
      warnings.unshift(
        "static-file mode 會優先讀取 public/data JSON；缺檔或 schema 不符時會 fallback 到 mock。"
      );
    }

    return {
      ...clone(MOCK_SYSTEM_HEALTH),
      warnings,
      routes,
      modes: {
        dataMode: cfg.dataMode,
        aiMode: cfg.aiMode,
        newsMode: cfg.newsMode,
        chartMode: cfg.chartMode,
      },
    };
  },
};

const mockTimeline: TimelineAdapter = {
  async getToday() {
    return clone(MOCK_TODAY_CHECKPOINTS);
  },
};

const mockPools: PoolsAdapter = {
  async getHoldings() {
    return clone(MOCK_HOLDING_POOL);
  },
  async getOpportunities() {
    return clone(MOCK_OPPORTUNITY_POOL);
  },
  async getVolatileRadar() {
    return clone(MOCK_VOLATILE_RADAR);
  },
};

const mockChart: ChartProviderAdapter = {
  getProvider() {
    return getModeConfig().chartMode;
  },
  getSymbolOverviewProps(ticker) {
    return { symbol: ticker };
  },
  getAdvancedChartProps(ticker) {
    return { symbol: ticker };
  },
};

export const MOCK_BUNDLE: AdapterBundle = {
  dashboard: mockDashboard,
  watchlist: mockWatchlist,
  ideas: mockIdeas,
  news: mockNews,
  symbol: mockSymbol,
  reports: mockReports,
  system: mockSystem,
  timeline: mockTimeline,
  pools: mockPools,
  chart: mockChart,
};
