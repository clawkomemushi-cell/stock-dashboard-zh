import { z } from "zod";
import { ISODateTime, Provenance, softEnum } from "./common";

/**
 * One checkpoint in /today timeline. Pre-market / mid-day / close,
 * but the schema also accepts arbitrary checkpoint kinds.
 */
export const DailyCheckpoint = z.object({
  id: z.string(),
  kind: softEnum(["pre", "open-track", "mid", "close", "evening", "after"] as const).optional(),
  title: z.string(),
  timestamp: ISODateTime.optional(),
  status: softEnum(["ok", "warn", "critical", "stale", "unknown"] as const).optional(),
  summary: z.string().nullable().optional(),
  confidence: softEnum(["low", "medium", "high"] as const).optional(),
  whatChanged: z.string().nullable().optional(),
  trigger: z.string().nullable().optional(),
  invalidation: z.string().nullable().optional(),
  linkedSymbols: z.array(z.string()).default([]).optional(),
  linkedNewsIds: z.array(z.string()).default([]).optional(),
  provenance: Provenance.optional(),
});
export type DailyCheckpoint = z.infer<typeof DailyCheckpoint>;
