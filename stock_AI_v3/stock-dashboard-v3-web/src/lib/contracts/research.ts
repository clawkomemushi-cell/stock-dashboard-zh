import { z } from "zod";
import { ISODateTime } from "./common";

export const ResearchAIResult = z.object({
  summary: z.string(),
  perTicker: z.record(z.string(), z.array(z.string())),
  risks: z.array(z.string()),
  nextSteps: z.array(z.string()),
  disclaimer: z.string(),
});
export type ResearchAIResult = z.infer<typeof ResearchAIResult>;

// Ticker validation: normalize user input first, then allow 1-20 chars of
// uppercase letters, digits, dots and hyphens. Bare Taiwan stock codes such as
// "2330" or active ETF codes like "00400A" are normalized to "*.TW" so all
// pages share one canonical key.
export const TickerSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = value.trim().toUpperCase();
    if (/^\d{4,6}$/.test(normalized)) return `${normalized}.TW`;
    return normalized;
  },
  z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9.\-]+$/, "ticker 格式不符（允許英數字、. 與 -）")
);

export const ResearchRequest = z.object({
  tickers: z.array(TickerSchema).min(1).max(10),
  note: z.string().max(200).optional(),
});
export type ResearchRequest = z.infer<typeof ResearchRequest>;

export const ResearchJobStatus = z.enum(["queued", "running", "done", "error", "mock"]);
export type ResearchJobStatus = z.infer<typeof ResearchJobStatus>;

export const ResearchResult = z.object({
  jobId: z.string(),
  status: ResearchJobStatus,
  tickers: z.array(z.string()).default([]),
  createdAt: ISODateTime.optional(),
  message: z.string().optional(),
  ai: ResearchAIResult.optional(),
  model: z.string().optional(),
});
export type ResearchResult = z.infer<typeof ResearchResult>;

export const WatchlistMembership = z.object({
  id: z.string(),
  ticker: z.string(),
  userId: z.string().default("default"),
  addedAt: ISODateTime.optional(),
  note: z.string().nullable().optional(),
  source: z.enum(["manual", "pipeline", "bulk_import"]).default("manual"),
});
export type WatchlistMembership = z.infer<typeof WatchlistMembership>;
