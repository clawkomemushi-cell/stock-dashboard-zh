import { z } from "zod";
import { ISODateTime, Provenance, softEnum } from "./common";
import { MarketDriver, IndexQuote, MarketSession } from "./market";
import { Candidate } from "./ideas";
import { NewsItem } from "./news";
import { WatchlistItem } from "./watchlist";
import { DailyCheckpoint } from "./timeline";

/**
 * The /dashboard "overview" payload. Composed of slices owned by other adapters.
 * Every slice is optional/nullable so a partial pipeline still produces a usable page.
 */
export const DashboardSummary = z.object({
  asOf: ISODateTime.optional(),
  marketSession: MarketSession.nullable().optional(),
  indices: z.array(IndexQuote).default([]).optional(),
  driver: MarketDriver.nullable().optional(),
  topIdeas: z.array(Candidate).default([]).optional(),
  watchlistDeltas: z.array(WatchlistItem).default([]).optional(),
  topNews: z.array(NewsItem).default([]).optional(),
  todayCheckpoints: z.array(DailyCheckpoint).default([]).optional(),
  recentReports: z
    .array(
      z.object({
        id: z.string(),
        kind: softEnum(["close", "weekly"] as const).optional(),
        label: z.string(),
        href: z.string(),
        asOf: ISODateTime.optional(),
      })
    )
    .default([])
    .optional(),
  systemSummary: z
    .object({
      status: softEnum(["ok", "warn", "critical", "stale", "unknown"] as const).optional(),
      lastPublishedAt: ISODateTime.optional(),
      warningCount: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  provenance: Provenance.optional(),
});
export type DashboardSummary = z.infer<typeof DashboardSummary>;
