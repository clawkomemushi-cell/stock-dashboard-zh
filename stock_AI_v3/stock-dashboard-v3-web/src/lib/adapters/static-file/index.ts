/**
 * static-file adapter.
 *
 * Loads JSON from /public/data/* (or NEXT_PUBLIC_STATIC_DATA_BASE).
 * Designed for "publish snapshot daily" deployments — the AI / OpenClaw side
 * writes JSON files into a static dir and the UI reads them.
 *
 * If a file is missing/invalid, the adapter falls back to MOCK_BUNDLE so the
 * UI never goes blank. This is important for the stability requirement.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
  AdapterBundle,
  AdapterContext,
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
} from "../interfaces";
import { MOCK_BUNDLE } from "../mock";
import { getModeConfig } from "@/lib/modes/config";
import {
  DashboardSummary as DashboardSummarySchema,
  WatchlistItem as WatchlistItemSchema,
  WatchlistScanResult as WatchlistScanResultSchema,
  Candidate as CandidateSchema,
  ThemeRadarItem as ThemeRadarItemSchema,
  NewsItem as NewsItemSchema,
  DailyCheckpoint as DailyCheckpointSchema,
  SymbolProfile as SymbolProfileSchema,
  SymbolOverview as SymbolOverviewSchema,
  SymbolTechnicalSnapshot as SymbolTechnicalSnapshotSchema,
  SymbolFundamentalSnapshot as SymbolFundamentalSnapshotSchema,
  SymbolAINote as SymbolAINoteSchema,
  CloseReview as CloseReviewSchema,
  WeeklyReview as WeeklyReviewSchema,
  SystemHealthSnapshot as SystemHealthSnapshotSchema,
  HoldingItem as HoldingItemSchema,
  VolatileRadarItem as VolatileRadarItemSchema,
} from "@/lib/contracts";

const STATIC_BASE =
  process.env.NEXT_PUBLIC_STATIC_DATA_BASE?.replace(/^\/+|\/+$/g, "") || "data";
const PUBLIC_DATA_ROOT = path.join(process.cwd(), "public", STATIC_BASE);
const warned = new Set<string>();

const HoldingItemsSchema = z.array(HoldingItemSchema);
const OpportunityItemsSchema = z.array(CandidateSchema);
const VolatileRadarItemsSchema = z.array(VolatileRadarItemSchema);
const WatchlistItemsSchema = z.array(WatchlistItemSchema);
const WatchlistScansSchema = z.array(WatchlistScanResultSchema);
const WatchlistAISummarySchema = z.object({ text: z.string().nullable() });
const CandidatesSchema = z.array(CandidateSchema);
const ThemeRadarSchema = z.array(ThemeRadarItemSchema);
const NewsItemsSchema = z.array(NewsItemSchema);
const SymbolProfilesSchema = z.array(SymbolProfileSchema);
const DailyCheckpointsSchema = z.array(DailyCheckpointSchema);
const RecentCloseSchema = z.array(z.object({ date: z.string(), href: z.string() }));
const RecentWeeklySchema = z.array(z.object({ week: z.string(), href: z.string() }));

function warnStaticFile(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[static-file] ${message}`);
}

async function readJSONValidated<T>(
  relativePath: string,
  schema: z.ZodType<T>,
  ctx?: AdapterContext
): Promise<T | null> {
  const normalizedPath = relativePath.replace(/^\//, "");
  const absolutePath = path.join(PUBLIC_DATA_ROOT, normalizedPath);

  try {
    if (typeof window === "undefined") {
      const raw = await readFile(absolutePath, "utf8");
      const parsed = JSON.parse(raw);
      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        warnStaticFile(
          `invalid:${absolutePath}`,
          `schema validation failed for ${absolutePath}; falling back to mock`
        );
        return null;
      }
      return validated.data;
    }

    const res = await fetch(`/${STATIC_BASE}/${normalizedPath}`, {
      signal: ctx?.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      warnStaticFile(
        `missing:${normalizedPath}`,
        `missing /${STATIC_BASE}/${normalizedPath}; falling back to mock`
      );
      return null;
    }
    const parsed = await res.json();
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      warnStaticFile(
        `invalid:${normalizedPath}`,
        `schema validation failed for /${STATIC_BASE}/${normalizedPath}; falling back to mock`
      );
      return null;
    }
    return validated.data;
  } catch (error) {
    const reason =
      error instanceof Error && "code" in error && error.code === "ENOENT"
        ? `missing ${absolutePath}; falling back to mock`
        : `failed reading ${relativePath}; falling back to mock`;
    warnStaticFile(`error:${absolutePath}`, reason);
    return null;
  }
}

const dashboard: DashboardAdapter = {
  async getSummary(ctx) {
    const data = await readJSONValidated("/dashboard.json", DashboardSummarySchema, ctx);
    return data ?? MOCK_BUNDLE.dashboard.getSummary(ctx);
  },
};

const watchlist: WatchlistAdapter = {
  async list(ctx) {
    return (
      (await readJSONValidated("/watchlist.json", WatchlistItemsSchema, ctx)) ??
      MOCK_BUNDLE.watchlist.list(ctx)
    );
  },
  async getScans(ctx) {
    return (
      (await readJSONValidated("/watchlist-scans.json", WatchlistScansSchema, ctx)) ??
      MOCK_BUNDLE.watchlist.getScans(ctx)
    );
  },
  async getAISummary(ctx) {
    return (
      (await readJSONValidated(
        "/watchlist-ai-summary.json",
        WatchlistAISummarySchema,
        ctx
      )) ?? MOCK_BUNDLE.watchlist.getAISummary(ctx)
    );
  },
};

const ideas: IdeasAdapter = {
  async list(ctx) {
    return (
      (await readJSONValidated("/ideas.json", CandidatesSchema, ctx)) ??
      MOCK_BUNDLE.ideas.list(ctx)
    );
  },
  async themes(ctx) {
    return (
      (await readJSONValidated("/themes.json", ThemeRadarSchema, ctx)) ??
      MOCK_BUNDLE.ideas.themes(ctx)
    );
  },
};

const news: NewsAdapter = {
  async list(filters, ctx) {
    const all = await readJSONValidated("/news.json", NewsItemsSchema, ctx);
    if (!all) return MOCK_BUNDLE.news.list(filters, ctx);
    let items = all;
    if (filters?.symbol) {
      items = items.filter((n) => (n.relatedSymbols ?? []).includes(filters.symbol!));
    }
    if (filters?.impactType) {
      items = items.filter((n) => n.impactType === filters.impactType);
    }
    if (filters?.topic) {
      items = items.filter((n) => n.topic === filters.topic);
    }
    if (typeof filters?.minImportance === "number") {
      items = items.filter((n) => (n.importanceScore ?? 0) >= filters.minImportance!);
    }
    if (filters?.mode) {
      items = items.filter((n) => !n.mode || n.mode === filters.mode);
    }
    return items;
  },
  async themes(ctx) {
    return (
      (await readJSONValidated("/themes.json", ThemeRadarSchema, ctx)) ??
      MOCK_BUNDLE.news.themes(ctx)
    );
  },
};

const symbol: SymbolAdapter = {
  async search(query, ctx) {
    const list = await readJSONValidated("/symbols.json", SymbolProfilesSchema, ctx);
    const profiles = list ?? (await MOCK_BUNDLE.symbol.list(ctx));
    const q = (query || "").toLowerCase();
    return profiles.filter(
      (p) =>
        p.ticker.toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q)
    );
  },
  async list(ctx) {
    return (
      (await readJSONValidated("/symbols.json", SymbolProfilesSchema, ctx)) ??
      MOCK_BUNDLE.symbol.list(ctx)
    );
  },
  async getProfile(ticker, ctx) {
    return (
      (await readJSONValidated(`/symbols/${ticker}/profile.json`, SymbolProfileSchema, ctx)) ??
      MOCK_BUNDLE.symbol.getProfile(ticker, ctx)
    );
  },
  async getOverview(ticker, ctx) {
    return (
      (await readJSONValidated(`/symbols/${ticker}/overview.json`, SymbolOverviewSchema, ctx)) ??
      MOCK_BUNDLE.symbol.getOverview(ticker, ctx)
    );
  },
  async getTechnical(ticker, ctx) {
    return (
      (await readJSONValidated(
        `/symbols/${ticker}/technical.json`,
        SymbolTechnicalSnapshotSchema,
        ctx
      )) ?? MOCK_BUNDLE.symbol.getTechnical(ticker, ctx)
    );
  },
  async getFundamentals(ticker, ctx) {
    return (
      (await readJSONValidated(
        `/symbols/${ticker}/fundamentals.json`,
        SymbolFundamentalSnapshotSchema,
        ctx
      )) ?? MOCK_BUNDLE.symbol.getFundamentals(ticker, ctx)
    );
  },
  async getAINote(ticker, ctx) {
    return (
      (await readJSONValidated(`/symbols/${ticker}/ai-note.json`, SymbolAINoteSchema, ctx)) ??
      MOCK_BUNDLE.symbol.getAINote(ticker, ctx)
    );
  },
  async getNews(ticker, ctx) {
    return (
      (await readJSONValidated(`/symbols/${ticker}/news.json`, NewsItemsSchema, ctx)) ??
      MOCK_BUNDLE.symbol.getNews(ticker, ctx)
    );
  },
  async getCheckpoints(ticker, ctx) {
    return (
      (await readJSONValidated(
        `/symbols/${ticker}/checkpoints.json`,
        DailyCheckpointsSchema,
        ctx
      )) ?? MOCK_BUNDLE.symbol.getCheckpoints(ticker, ctx)
    );
  },
};

const reports: ReportsAdapter = {
  async getCloseReview(date, ctx) {
    return (
      (await readJSONValidated(`/reports/close/${date}.json`, CloseReviewSchema, ctx)) ??
      MOCK_BUNDLE.reports.getCloseReview(date, ctx)
    );
  },
  async getWeeklyReview(week, ctx) {
    return (
      (await readJSONValidated(`/reports/weekly/${week}.json`, WeeklyReviewSchema, ctx)) ??
      MOCK_BUNDLE.reports.getWeeklyReview(week, ctx)
    );
  },
  async listRecentClose(ctx) {
    return (
      (await readJSONValidated("/reports/recent-close.json", RecentCloseSchema, ctx)) ??
      MOCK_BUNDLE.reports.listRecentClose(ctx)
    );
  },
  async listRecentWeekly(ctx) {
    return (
      (await readJSONValidated("/reports/recent-weekly.json", RecentWeeklySchema, ctx)) ??
      MOCK_BUNDLE.reports.listRecentWeekly(ctx)
    );
  },
};

const system: SystemAdapter = {
  async getHealth(ctx) {
    const data = await readJSONValidated(
      "/system-health.json",
      SystemHealthSnapshotSchema,
      ctx
    );
    const cfg = getModeConfig();
    const base = data ?? (await MOCK_BUNDLE.system.getHealth(ctx));
    return {
      ...base,
      modes: {
        dataMode: cfg.dataMode,
        aiMode: cfg.aiMode,
        newsMode: cfg.newsMode,
        chartMode: cfg.chartMode,
      },
    };
  },
};

const timeline: TimelineAdapter = {
  async getToday(ctx) {
    return (
      (await readJSONValidated("/today.json", DailyCheckpointsSchema, ctx)) ??
      MOCK_BUNDLE.timeline.getToday(ctx)
    );
  },
};

const pools: PoolsAdapter = {
  async getHoldings(ctx) {
    return (
      (await readJSONValidated("/pools/holdings.json", HoldingItemsSchema, ctx)) ??
      MOCK_BUNDLE.pools.getHoldings(ctx)
    );
  },
  async getOpportunities(ctx) {
    return (
      (await readJSONValidated("/pools/opportunities.json", OpportunityItemsSchema, ctx)) ??
      MOCK_BUNDLE.pools.getOpportunities(ctx)
    );
  },
  async getVolatileRadar(ctx) {
    return (
      (await readJSONValidated("/pools/volatile-radar.json", VolatileRadarItemsSchema, ctx)) ??
      MOCK_BUNDLE.pools.getVolatileRadar(ctx)
    );
  },
};

// Chart provider adapter is purely UI-side; static-file mode reuses mock.
const chart: ChartProviderAdapter = MOCK_BUNDLE.chart;

export const STATIC_FILE_BUNDLE: AdapterBundle = {
  dashboard,
  watchlist,
  ideas,
  news,
  symbol,
  reports,
  system,
  timeline,
  pools,
  chart,
};
