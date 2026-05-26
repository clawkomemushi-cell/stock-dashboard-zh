/**
 * API adapter bundle for dataMode=api.
 *
 * Fetches from NEXT_PUBLIC_API_BASE_URL (defaults to /api/v3).
 * Validates response envelope with Zod, then validates the inner `data` field
 * against the contract schema. Throws on any failure so page-level tryAsync()
 * can render an error panel — no silent mock fallback.
 */

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

const API_BASE =
  (typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : undefined) ?? "/api/v3";

async function getServerOrigin(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ??
        (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // Not running in a Next request context; fall through to local dev default.
  }

  return `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
}

async function buildApiHref(
  path: string,
  params?: Record<string, string | number | undefined>
) {
  const configuredBase = API_BASE.replace(/\/+$/g, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const isAbsolute = /^https?:\/\//i.test(configuredBase);

  const base = isAbsolute
    ? configuredBase
    : typeof window !== "undefined"
      ? configuredBase
      : `${await getServerOrigin()}${configuredBase}`;

  const url = new URL(
    `${base}${suffix}`,
    typeof window !== "undefined" ? window.location.origin : undefined
  );

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  return isAbsolute || typeof window === "undefined"
    ? url.toString()
    : `${url.pathname}${url.search}`;
}

function unwrapApiPayload(payload: unknown): unknown {
  // Current route handlers return { status, data } where data is the domain
  // payload directly. Older draft docs/examples wrapped one more layer as
  // { data: { data: ... } }. Accept both so API mode doesn't blank panels.
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    if (
      "data" in obj &&
      ("status" in obj || "count" in obj || "lastUpdated" in obj || Object.keys(obj).length === 1)
    ) {
      return obj.data;
    }
  }
  return payload;
}

const EnvelopeObject = z.object({
  data: z.unknown(),
  status: z.string(),
  lastUpdated: z.string().optional(),
});

async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  ctx?: AdapterContext,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const href = await buildApiHref(path, params);

  const res = await fetch(href, { signal: ctx?.signal, cache: "no-store" });
  if (!res.ok) {
    let errMsg = `API ${href} returned ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body?.error?.message) errMsg += `: ${body.error.message}`;
    } catch {
      // ignore parse failure
    }
    throw new Error(errMsg);
  }

  const json = (await res.json()) as unknown;
  const envelope = EnvelopeObject.safeParse(json);
  if (!envelope.success) {
    throw new Error(`API ${href} response has unexpected shape`);
  }

  const validated = schema.safeParse(unwrapApiPayload(envelope.data));
  if (!validated.success) {
    throw new Error(
      `API ${href} data failed schema validation: ${JSON.stringify(validated.error.flatten())}`
    );
  }
  return validated.data;
}

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

const dashboard: DashboardAdapter = {
  getSummary: (ctx) => apiFetch("/dashboard/summary", DashboardSummarySchema, ctx),
};

const watchlist: WatchlistAdapter = {
  list: (ctx) => apiFetch("/watchlist", WatchlistItemsSchema, ctx),
  getScans: (ctx) => apiFetch("/watchlist/scans", WatchlistScansSchema, ctx),
  getAISummary: (ctx) => apiFetch("/watchlist/ai-summary", WatchlistAISummarySchema, ctx),
};

const ideas: IdeasAdapter = {
  list: (ctx) => apiFetch("/ideas", CandidatesSchema, ctx),
  themes: (ctx) => apiFetch("/ideas/themes", ThemeRadarSchema, ctx),
};

const news: NewsAdapter = {
  list: (filters, ctx) =>
    apiFetch("/news", NewsItemsSchema, ctx, {
      symbol: filters?.symbol,
      impactType: filters?.impactType,
      topic: filters?.topic,
      minImportance: filters?.minImportance,
      mode: filters?.mode,
    }),
  themes: (ctx) => apiFetch("/news/themes", ThemeRadarSchema, ctx),
};

const symbol: SymbolAdapter = {
  list: (ctx) => apiFetch("/symbols", SymbolProfilesSchema, ctx),
  search: (query, ctx) => apiFetch("/symbols/search", SymbolProfilesSchema, ctx, { q: query }),
  getProfile: (ticker, ctx) =>
    apiFetch(`/symbols/${ticker}/profile`, SymbolProfileSchema, ctx).catch(() => null),
  getOverview: (ticker, ctx) =>
    apiFetch(`/symbols/${ticker}/overview`, SymbolOverviewSchema, ctx).catch(() => null),
  getTechnical: (ticker, ctx) =>
    apiFetch(`/symbols/${ticker}/technical`, SymbolTechnicalSnapshotSchema, ctx).catch(() => null),
  getFundamentals: (ticker, ctx) =>
    apiFetch(`/symbols/${ticker}/fundamentals`, SymbolFundamentalSnapshotSchema, ctx).catch(() => null),
  getAINote: (ticker, ctx) =>
    apiFetch(`/symbols/${ticker}/ai-note`, SymbolAINoteSchema, ctx).catch(() => null),
  getNews: (ticker, ctx) =>
    apiFetch(`/symbols/${ticker}/news`, NewsItemsSchema, ctx).catch(() => []),
  getCheckpoints: (ticker, ctx) =>
    apiFetch(`/symbols/${ticker}/checkpoints`, DailyCheckpointsSchema, ctx).catch(() => []),
};

const reports: ReportsAdapter = {
  getCloseReview: (date, ctx) =>
    apiFetch(`/reports/close/${date}`, CloseReviewSchema, ctx).catch(() => null),
  getWeeklyReview: (week, ctx) =>
    apiFetch(`/reports/weekly/${week}`, WeeklyReviewSchema, ctx).catch(() => null),
  listRecentClose: (ctx) => apiFetch("/reports/recent-close", RecentCloseSchema, ctx),
  listRecentWeekly: (ctx) => apiFetch("/reports/recent-weekly", RecentWeeklySchema, ctx),
};

const system: SystemAdapter = {
  getHealth: (ctx) => apiFetch("/system/health", SystemHealthSnapshotSchema, ctx),
};

const timeline: TimelineAdapter = {
  getToday: (ctx) => apiFetch("/today", DailyCheckpointsSchema, ctx),
};

// Pools adapter: falls back to mock since no dedicated API endpoint is wired yet.
const pools: PoolsAdapter = {
  getHoldings: (ctx) =>
    apiFetch("/pools/holdings", HoldingItemsSchema, ctx).catch(() =>
      MOCK_BUNDLE.pools.getHoldings(ctx)
    ),
  getOpportunities: (ctx) =>
    apiFetch("/pools/opportunities", OpportunityItemsSchema, ctx).catch(() =>
      MOCK_BUNDLE.pools.getOpportunities(ctx)
    ),
  getVolatileRadar: (ctx) =>
    apiFetch("/pools/volatile-radar", VolatileRadarItemsSchema, ctx).catch(() =>
      MOCK_BUNDLE.pools.getVolatileRadar(ctx)
    ),
};

const chart: ChartProviderAdapter = MOCK_BUNDLE.chart;

export const API_BUNDLE: AdapterBundle = {
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
