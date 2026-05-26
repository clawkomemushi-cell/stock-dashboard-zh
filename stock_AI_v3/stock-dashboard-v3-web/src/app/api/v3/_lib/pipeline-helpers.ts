/**
 * Pipeline helper utilities for writing to symbol_insights.
 *
 * Pipeline scripts (candiate pool updates, checkpoint scans, etc.) should use
 * these helpers to write into the shared symbol_insights table so all pages
 * (watchlist / pools / symbols / ideas) see the same insight stream.
 *
 * This file is server-only. It is NOT imported by client components.
 *
 * Usage example in a pipeline script:
 *
 *   import { pipelineAddInsight } from "@/app/api/v3/_lib/pipeline-helpers";
 *
 *   pipelineAddInsight({
 *     ticker: "2330.TW",
 *     source: "pipeline:close",
 *     kind: "checkpoint",
 *     body: "收盤觀察：量縮帶紙傘，短線注意...",
 *     pipelineRunId: runId,
 *   });
 */

import {
  dbEnsureSymbol,
  dbAddSymbolInsight,
  type EnsureSymbolInput,
  type AddInsightInput,
} from "./db-writer";

export interface PipelineInsightInput {
  ticker: string;
  source: string;
  kind: string;
  body: string;
  title?: string;
  confidence?: string;
  asOf?: string;
  payloadJson?: unknown;
  pipelineRunId?: string;
  /** Optionally pre-register the symbol to avoid FK constraint errors. */
  symbolName?: string;
  symbolKind?: string;
  symbolMarket?: string;
}

/**
 * Write one symbol insight from a pipeline run.
 * Idempotent in the sense that each call creates a new append-only row.
 * Ensures the symbol row exists before inserting.
 */
export function pipelineAddInsight(
  input: PipelineInsightInput
): { ok: true; id: string } | { ok: false; error: string } {
  // Ensure the symbol exists in the symbols table
  const ensureInput: EnsureSymbolInput = {
    ticker: input.ticker,
    name: input.symbolName,
    kind: input.symbolKind,
    market: input.symbolMarket,
  };
  const ensureResult = dbEnsureSymbol(ensureInput);
  if (!ensureResult.ok) {
    return ensureResult;
  }

  const insightInput: AddInsightInput = {
    ticker: input.ticker,
    source: input.source,
    kind: input.kind,
    body: input.body,
    title: input.title,
    confidence: input.confidence,
    asOf: input.asOf,
    payloadJson: input.payloadJson,
    pipelineRunId: input.pipelineRunId,
  };

  return dbAddSymbolInsight(insightInput);
}

/**
 * Bulk write insights for multiple tickers from a pipeline run.
 * Logs warnings for individual failures but continues with remaining tickers.
 */
export function pipelineBulkAddInsights(
  items: PipelineInsightInput[]
): { successCount: number; failureCount: number } {
  let successCount = 0;
  let failureCount = 0;

  for (const item of items) {
    const result = pipelineAddInsight(item);
    if (result.ok) {
      successCount++;
    } else {
      console.warn(`[pipeline-helpers] Failed to add insight for ${item.ticker}: ${result.error}`);
      failureCount++;
    }
  }

  return { successCount, failureCount };
}
