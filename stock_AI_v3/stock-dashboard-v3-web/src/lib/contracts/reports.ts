import { z } from "zod";
import { ISODateTime, ISODate, ISOWeek, Provenance, softEnum } from "./common";

export const TickerReviewResult = z.object({
  ticker: z.string(),
  thesis: z.string().nullable().optional(),
  outcome: softEnum(["worked", "failed", "mixed", "unknown"] as const).optional(),
  comment: z.string().nullable().optional(),
});
export type TickerReviewResult = z.infer<typeof TickerReviewResult>;

export const CloseReview = z.object({
  date: ISODate,
  directionVerdict: softEnum(["bull", "bear", "mixed", "neutral"] as const).optional(),
  thesisAccuracyScore: z.number().nullable().optional(), // 0..1
  whatWorked: z.array(z.string()).default([]).optional(),
  whatFailed: z.array(z.string()).default([]).optional(),
  nextDayWatchpoints: z.array(z.string()).default([]).optional(),
  tickerResults: z.array(TickerReviewResult).default([]).optional(),
  analysisLayerStatus: z
    .array(
      z.object({
        layer: z.string(),
        status: softEnum(["ok", "warn", "critical", "stale", "unknown"] as const).optional(),
        note: z.string().nullable().optional(),
      })
    )
    .default([])
    .optional(),
  asOf: ISODateTime.optional(),
  provenance: Provenance.optional(),
});
export type CloseReview = z.infer<typeof CloseReview>;

export const WeeklyReview = z.object({
  week: ISOWeek,
  summary: z.string().nullable().optional(),
  keyWins: z.array(z.string()).default([]).optional(),
  keyMisses: z.array(z.string()).default([]).optional(),
  biasObservations: z.array(z.string()).default([]).optional(),
  nextWeekAdjustments: z.array(z.string()).default([]).optional(),
  dailyReviews: z
    .array(
      z.object({
        date: ISODate,
        oneLine: z.string().nullable().optional(),
        verdict: softEnum(["bull", "bear", "mixed", "neutral"] as const).optional(),
        accuracy: z.number().nullable().optional(),
      })
    )
    .default([])
    .optional(),
  asOf: ISODateTime.optional(),
  provenance: Provenance.optional(),
});
export type WeeklyReview = z.infer<typeof WeeklyReview>;
