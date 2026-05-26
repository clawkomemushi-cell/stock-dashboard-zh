import { z } from "zod";

/**
 * Common primitives shared across all contracts.
 *
 * Stability rule:
 *  - All enum-like fields use z.string() with a known-values constant, NOT z.enum()
 *  - This means an unknown enum from an upstream payload (e.g. AI publishes new
 *    "role" value) MUST NOT crash the page; it just renders as the raw string.
 */

export const ISODateTime = z
  .string()
  .describe("ISO 8601 timestamp string. Example: 2026-04-26T08:30:00+08:00");

export const ISODate = z
  .string()
  .describe("YYYY-MM-DD date string. Example: 2026-04-26");

export const ISOWeek = z
  .string()
  .describe("ISO week string. Example: 2026-W17");

export const TickerSymbol = z
  .string()
  .min(1)
  .describe("Ticker like 2330.TW, 0050.TW, AAPL");

/** Symbol kind. Known: stock | etf | index | future. Unknown values allowed. */
export const SYMBOL_KINDS = ["stock", "etf", "index", "future"] as const;
export type SymbolKind = (typeof SYMBOL_KINDS)[number] | string;

/** Market scope. Known: TW | US | JP | HK. Unknown values allowed. */
export const MARKETS = ["TW", "US", "JP", "HK"] as const;
export type Market = (typeof MARKETS)[number] | string;

/** Status semantic. Known: ok | warn | critical | stale | unknown. Unknown allowed. */
export const STATUS_LEVELS = ["ok", "warn", "critical", "stale", "unknown"] as const;
export type StatusLevel = (typeof STATUS_LEVELS)[number] | string;

/** Direction bias. Known: long | short | neutral | avoid. Unknown allowed. */
export const DIRECTION_BIASES = ["long", "short", "neutral", "avoid"] as const;
export type DirectionBias = (typeof DIRECTION_BIASES)[number] | string;

/** Confidence label. Known: low | medium | high. Unknown allowed. */
export const CONFIDENCE_LABELS = ["low", "medium", "high"] as const;
export type ConfidenceLabel = (typeof CONFIDENCE_LABELS)[number] | string;

/**
 * Provenance: where did this datum come from? Always optional but ALWAYS supported.
 * Renders as a small "source" chip in the UI.
 */
export const Provenance = z.object({
  source: z.string().optional(),
  fetchedAt: ISODateTime.optional(),
  generatedBy: z.string().optional(),
  pipelineRunId: z.string().optional(),
  note: z.string().optional(),
});
export type Provenance = z.infer<typeof Provenance>;

/** Generic external research link, used everywhere. */
export const ExternalResearchLink = z.object({
  id: z.string().optional(),
  label: z.string(),
  url: z.string().url(),
  kind: z.string().optional(), // tradingview | twse | tpex | mops | issuer | other
  note: z.string().optional(),
});
export type ExternalResearchLink = z.infer<typeof ExternalResearchLink>;

/** Soft enum helper: accept any string but document known values. */
export const softEnum = <T extends readonly string[]>(known: T) => {
  void known;
  return z.string();
};

/** Wrap a payload so any container can attach provenance + freshness. */
export const Wrapped = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({
    data: inner,
    provenance: Provenance.optional(),
    lastUpdated: ISODateTime.optional(),
    status: softEnum(STATUS_LEVELS).optional(),
  });
