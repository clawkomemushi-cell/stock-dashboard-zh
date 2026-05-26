import { z } from "zod";
import { ISODateTime, Provenance, softEnum } from "./common";

/**
 * 持倉監控池 — 已持有股票的每日監控項目。
 * 重點：續抱/減碼/賣出判斷、出貨警訊、thesis 是否失效。
 */
export const HoldingItem = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string().nullable().optional(),
  kind: softEnum(["stock", "etf", "index"] as const).optional(),
  holdingSince: ISODateTime.optional(),
  entryNote: z.string().nullable().optional(),
  continuationVerdict: softEnum(["hold", "reduce", "sell", "watch"] as const).optional(),
  shippingWarning: z.string().nullable().optional(),
  thesisValid: z.boolean().optional(),
  thesisSummary: z.string().nullable().optional(),
  sellTrigger: z.string().nullable().optional(),
  invalidation: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]).optional(),
  statusLevel: softEnum(["ok", "warn", "critical", "unknown"] as const).optional(),
  asOf: ISODateTime.optional(),
  provenance: Provenance.optional(),
});
export type HoldingItem = z.infer<typeof HoldingItem>;

/**
 * 高波動/妖股雷達 — 異常量價、題材發酵、短線強弱追蹤。
 * 每筆必須標明風險與失效條件。
 */
export const VolatileRadarItem = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string().nullable().optional(),
  radarReason: z.string(),
  abnormalVolume: z.boolean().optional(),
  theme: z.string().nullable().optional(),
  shortStrength: softEnum(["strong", "neutral", "weak"] as const).optional(),
  riskNote: z.string(),
  invalidation: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]).optional(),
  asOf: ISODateTime.optional(),
  provenance: Provenance.optional(),
});
export type VolatileRadarItem = z.infer<typeof VolatileRadarItem>;

/**
 * 自選股即時研究結果 (on-demand research mock)。
 * 由使用者手動觸發，更新單股頁面。
 */
export const CustomResearchResult = z.object({
  ticker: z.string(),
  name: z.string().nullable().optional(),
  requestedAt: ISODateTime,
  completedAt: ISODateTime.optional(),
  status: softEnum(["pending", "running", "done", "error"] as const),
  summary: z.string().nullable().optional(),
  keyPoints: z.array(z.string()).default([]).optional(),
  trigger: z.string().nullable().optional(),
  invalidation: z.string().nullable().optional(),
  risk: z.string().nullable().optional(),
  confidence: softEnum(["low", "medium", "high"] as const).optional(),
});
export type CustomResearchResult = z.infer<typeof CustomResearchResult>;
