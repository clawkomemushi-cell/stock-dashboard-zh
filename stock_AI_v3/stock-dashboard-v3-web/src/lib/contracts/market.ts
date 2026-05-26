import { z } from "zod";
import {
  ISODateTime,
  ISODate,
  Provenance,
  STATUS_LEVELS,
  softEnum,
} from "./common";

/** Snapshot of "what is the market doing right now". */
export const MarketSession = z.object({
  market: z.string(), // TW | US | ...
  phase: softEnum(["pre", "open", "lunch", "close", "after"] as const).optional(),
  isOpen: z.boolean().optional(),
  asOf: ISODateTime.optional(),
  note: z.string().nullable().optional(),
});
export type MarketSession = z.infer<typeof MarketSession>;

export const IndexQuote = z.object({
  ticker: z.string(),
  name: z.string().optional(),
  last: z.number().nullable().optional(),
  changePct: z.number().nullable().optional(),
  asOf: ISODateTime.optional(),
});
export type IndexQuote = z.infer<typeof IndexQuote>;

/** Top-line "today's main driver" – single sentence for the dashboard hero card. */
export const MarketDriver = z.object({
  id: z.string().optional(),
  headline: z.string(),
  detail: z.string().nullable().optional(),
  bias: softEnum(["long", "short", "neutral", "avoid"] as const).optional(),
  themes: z.array(z.string()).default([]).optional(),
  relatedSymbols: z.array(z.string()).default([]).optional(),
  relatedNewsIds: z.array(z.string()).default([]).optional(),
  confidence: softEnum(["low", "medium", "high"] as const).optional(),
  asOf: ISODateTime.optional(),
  provenance: Provenance.optional(),
});
export type MarketDriver = z.infer<typeof MarketDriver>;

/** A single global "is the data pipeline healthy" status used in topbar etc. */
export const LatestSnapshot = z.object({
  status: softEnum(STATUS_LEVELS).optional(),
  lastPublishedAt: ISODateTime.optional(),
  asOfDate: ISODate.optional(),
  warnings: z.array(z.string()).default([]).optional(),
  provenance: Provenance.optional(),
});
export type LatestSnapshot = z.infer<typeof LatestSnapshot>;
