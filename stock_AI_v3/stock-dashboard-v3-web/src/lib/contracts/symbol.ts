import { z } from "zod";
import {
  ISODateTime,
  ISODate,
  Provenance,
  ExternalResearchLink,
  softEnum,
} from "./common";

export const SymbolProfile = z.object({
  ticker: z.string(),
  name: z.string().optional(),
  kind: softEnum(["stock", "etf", "index", "future"] as const).optional(),
  market: z.string().optional(),
  sector: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  // ETF-specific (optional)
  issuer: z.string().nullable().optional(),
  expenseRatio: z.number().nullable().optional(),
  inceptionDate: ISODate.nullable().optional(),
  // Free-form tags (theme, watchlist label, etc.)
  tags: z.array(z.string()).default([]).optional(),
  oneLineSummary: z.string().nullable().optional(),
  externalLinks: z.array(ExternalResearchLink).default([]).optional(),
  provenance: Provenance.optional(),
});
export type SymbolProfile = z.infer<typeof SymbolProfile>;

export const SymbolOverview = z.object({
  ticker: z.string(),
  asOf: ISODateTime.optional(),
  last: z.number().nullable().optional(),
  changePct: z.number().nullable().optional(),
  rangeDay: z.tuple([z.number(), z.number()]).nullable().optional(),
  range52w: z.tuple([z.number(), z.number()]).nullable().optional(),
  volume: z.number().nullable().optional(),
  marketCap: z.number().nullable().optional(),
  status: softEnum(["ok", "warn", "critical", "stale", "unknown"] as const).optional(),
  oneLineThesis: z.string().nullable().optional(),
  provenance: Provenance.optional(),
});
export type SymbolOverview = z.infer<typeof SymbolOverview>;

export const SymbolTechnicalSnapshot = z.object({
  ticker: z.string(),
  asOf: ISODateTime.optional(),
  trend: softEnum(["up", "down", "sideways"] as const).optional(),
  rsi14: z.number().nullable().optional(),
  ma20: z.number().nullable().optional(),
  ma60: z.number().nullable().optional(),
  ma200: z.number().nullable().optional(),
  supportLevels: z.array(z.number()).default([]).optional(),
  resistanceLevels: z.array(z.number()).default([]).optional(),
  patterns: z.array(z.string()).default([]).optional(),
  notes: z.string().nullable().optional(),
  provenance: Provenance.optional(),
});
export type SymbolTechnicalSnapshot = z.infer<typeof SymbolTechnicalSnapshot>;

export const SymbolFundamentalSnapshot = z.object({
  ticker: z.string(),
  asOf: ISODateTime.optional(),
  pe: z.number().nullable().optional(),
  pb: z.number().nullable().optional(),
  dividendYield: z.number().nullable().optional(),
  epsTtm: z.number().nullable().optional(),
  revenueGrowthYoy: z.number().nullable().optional(),
  // TW-flavoured chips/financials placeholders
  revenueMonthly: z
    .array(
      z.object({
        month: z.string(),
        revenue: z.number().nullable().optional(),
        yoy: z.number().nullable().optional(),
      })
    )
    .default([])
    .optional(),
  notes: z.string().nullable().optional(),
  provenance: Provenance.optional(),
});
export type SymbolFundamentalSnapshot = z.infer<typeof SymbolFundamentalSnapshot>;

// A cross-page normalized view — combines profile + overview + latest ai_note.
// Frontend pages should use this type through adapters, not raw profile fields.
export const SymbolNormalizedSummary = z.object({
  ticker: z.string(),
  name: z.string().optional(),
  kind: z.string().optional(),
  oneLineSummary: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]).optional(),
  latestStatus: z.string().nullable().optional(),
  latestStatusLevel: z.string().nullable().optional(),
  bias: z.string().nullable().optional(),
  inWatchlist: z.boolean().optional(),
  latestInsightBody: z.string().nullable().optional(),
  latestInsightAt: z.string().nullable().optional(),
});
export type SymbolNormalizedSummary = z.infer<typeof SymbolNormalizedSummary>;

// Append-only insight/event/checkpoint written by pipeline or on-demand research.
// All pages read from the same table — no per-page private copies.
export const SymbolInsight = z.object({
  id: z.string(),
  ticker: z.string(),
  source: z.string(), // 'pipeline:close', 'pipeline:morning', 'research:on_demand', 'manual'
  kind: z.string(),   // 'checkpoint', 'note', 'ai_summary', 'news_event', 'opportunity_reason'
  body: z.string(),
  createdAt: ISODateTime.optional(),
  sessionId: z.string().nullable().optional(),
});
export type SymbolInsight = z.infer<typeof SymbolInsight>;

export const SymbolAINote = z.object({
  ticker: z.string(),
  asOf: ISODateTime.optional(),
  thesis: z.string().nullable().optional(),
  whySelected: z.string().nullable().optional(),
  trigger: z.string().nullable().optional(),
  invalidation: z.string().nullable().optional(),
  riskScenarios: z.array(z.string()).default([]).optional(),
  bias: softEnum(["long", "short", "neutral", "avoid"] as const).optional(),
  confidence: softEnum(["low", "medium", "high"] as const).optional(),
  evidence: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url().optional(),
        kind: z.string().optional(),
      })
    )
    .default([])
    .optional(),
  provenance: Provenance.optional(),
});
export type SymbolAINote = z.infer<typeof SymbolAINote>;
