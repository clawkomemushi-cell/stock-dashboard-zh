import { z } from "zod";
import { ISODateTime, Provenance, softEnum } from "./common";

/** One piece of supporting evidence for a candidate. */
export const EvidenceItem = z.object({
  label: z.string(),
  source: z.string().optional(),
  asOf: ISODateTime.optional(),
  value: z.string().nullable().optional(),
  interpretation: z.string().optional(),
  url: z.string().optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItem>;

/**
 * Evidence groups for a candidate.
 * Known groups: technical | chip | fundamental | news | macro.
 * Completeness status: complete | partial | weak | stale.
 */
export const CandidateEvidenceSummary = z.object({
  dataAsOf: ISODateTime.optional(),
  status: softEnum(["complete", "partial", "weak", "stale"] as const).optional(),
  technical: z.array(EvidenceItem).default([]).optional(),
  chip: z.array(EvidenceItem).default([]).optional(),
  fundamental: z.array(EvidenceItem).default([]).optional(),
  news: z.array(EvidenceItem).default([]).optional(),
  macro: z.array(EvidenceItem).default([]).optional(),
  missingFields: z.array(z.string()).default([]).optional(),
  freshnessWarnings: z.array(z.string()).default([]).optional(),
});
export type CandidateEvidenceSummary = z.infer<typeof CandidateEvidenceSummary>;

/**
 * AI-driven candidate. Ideas page is the V3 differentiator
 * vs. plain watchlist tools.
 */
export const Candidate = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string().nullable().optional(),
  kind: softEnum(["stock", "etf", "index", "future"] as const).optional(),
  role: softEnum(["starter", "watch", "observe", "avoid"] as const).optional(),
  summary: z.string().nullable().optional(),
  whySelected: z.string().nullable().optional(),
  trigger: z.string().nullable().optional(),
  invalidation: z.string().nullable().optional(),
  risk: z.string().nullable().optional(),
  themes: z.array(z.string()).default([]).optional(),
  relatedNewsIds: z.array(z.string()).default([]).optional(),
  confidence: softEnum(["low", "medium", "high"] as const).optional(),
  hasNews: z.boolean().optional(),
  asOf: ISODateTime.optional(),
  provenance: Provenance.optional(),
  /** Evidence completeness summary — optional, backward compatible. */
  evidence: CandidateEvidenceSummary.optional(),
});
export type Candidate = z.infer<typeof Candidate>;

export const ThemeRadarItem = z.object({
  id: z.string(),
  theme: z.string(),
  description: z.string().nullable().optional(),
  momentum: softEnum(["rising", "stable", "fading"] as const).optional(),
  relatedSymbols: z.array(z.string()).default([]).optional(),
  relatedNewsIds: z.array(z.string()).default([]).optional(),
  asOf: ISODateTime.optional(),
});
export type ThemeRadarItem = z.infer<typeof ThemeRadarItem>;
