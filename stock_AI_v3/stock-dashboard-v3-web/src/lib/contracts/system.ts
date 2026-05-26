import { z } from "zod";
import { ISODateTime, Provenance, softEnum } from "./common";

export const RunStatus = z.object({
  id: z.string(),
  name: z.string(),
  status: softEnum(["running", "ok", "warn", "failed", "stale", "unknown"] as const).optional(),
  startedAt: ISODateTime.optional(),
  finishedAt: ISODateTime.optional(),
  durationMs: z.number().nullable().optional(),
  message: z.string().nullable().optional(),
});
export type RunStatus = z.infer<typeof RunStatus>;

export const SystemHealthSnapshot = z.object({
  asOf: ISODateTime.optional(),
  currentRun: RunStatus.nullable().optional(),
  lastSuccessfulPublishAt: ISODateTime.optional(),
  dataFreshness: z
    .array(
      z.object({
        feed: z.string(),
        lastUpdated: ISODateTime.optional(),
        status: softEnum(["fresh", "stale", "missing", "unknown"] as const).optional(),
      })
    )
    .default([])
    .optional(),
  warnings: z.array(z.string()).default([]).optional(),
  staleData: z.array(z.string()).default([]).optional(),
  missingData: z.array(z.string()).default([]).optional(),
  routes: z
    .array(
      z.object({
        path: z.string(),
        adapter: z.string(),
        mode: z.string(),
        status: softEnum(["ok", "stub", "missing", "error"] as const).optional(),
        note: z.string().nullable().optional(),
      })
    )
    .default([])
    .optional(),
  modes: z
    .object({
      dataMode: z.string().optional(),
      aiMode: z.string().optional(),
      newsMode: z.string().optional(),
      chartMode: z.string().optional(),
    })
    .optional(),
  provenance: Provenance.optional(),
});
export type SystemHealthSnapshot = z.infer<typeof SystemHealthSnapshot>;
