import { z } from "zod";
import { ISODateTime, Provenance, softEnum } from "./common";

export const NewsItem = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string().nullable().optional(),
  publishedAt: ISODateTime.optional(),
  oneLineSummary: z.string().nullable().optional(),
  whyItMatters: z.string().nullable().optional(),
  impactType: softEnum(["market", "sector", "symbol", "etf", "macro", "policy"] as const).optional(),
  impactScope: z.array(z.string()).default([]).optional(),
  relatedSymbols: z.array(z.string()).default([]).optional(),
  relatedThemes: z.array(z.string()).default([]).optional(),
  importanceScore: z.number().nullable().optional(), // 0..1
  noiseScore: z.number().nullable().optional(),      // 0..1
  topic: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  // For curated vs stream UI
  mode: softEnum(["curated", "stream"] as const).optional(),
  // Whether the editorial layer treats this as duplicate / low-signal
  isLowSignal: z.boolean().optional(),
  provenance: Provenance.optional(),
});
export type NewsItem = z.infer<typeof NewsItem>;
