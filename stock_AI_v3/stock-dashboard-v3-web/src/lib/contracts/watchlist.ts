import { z } from "zod";
import { ISODateTime, Provenance, softEnum } from "./common";

export const WatchlistItem = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string().nullable().optional(),
  kind: softEnum(["stock", "etf", "index", "future"] as const).optional(),
  market: z.string().optional(),
  tags: z.array(z.string()).default([]).optional(),
  addedAt: ISODateTime.optional(),
  latestStatus: z.string().nullable().optional(),
  latestStatusLevel: softEnum(["ok", "warn", "critical", "stale", "unknown"] as const).optional(),
  inIdeasToday: z.boolean().optional(),
  recentNewsCount: z.number().nullable().optional(),
  lastUpdated: ISODateTime.optional(),
  provenance: Provenance.optional(),
});
export type WatchlistItem = z.infer<typeof WatchlistItem>;

export const WatchlistScanResult = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  matchedTickers: z.array(z.string()).default([]).optional(),
  asOf: ISODateTime.optional(),
});
export type WatchlistScanResult = z.infer<typeof WatchlistScanResult>;
