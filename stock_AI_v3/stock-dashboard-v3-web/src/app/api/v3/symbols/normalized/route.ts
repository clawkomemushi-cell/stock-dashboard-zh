/**
 * GET /api/v3/symbols/normalized
 *
 * Returns SymbolNormalizedSummary[] — combined symbol profile + watchlist flag +
 * latest insight body for each tracked ticker.
 *
 * DB mode: reads from symbol_insights + watchlist_items JOIN symbols.
 * Static mode: not available (returns empty array with a prototype notice).
 */

import { NextResponse } from "next/server";
import { SymbolNormalizedSummary } from "@/lib/contracts/symbol";
import { z } from "zod";
import { isDbMode, dbReadSymbolNormalizedSummaries } from "../../_lib/db-reader";

const ArraySchema = z.array(SymbolNormalizedSummary);

export async function GET() {
  if (!isDbMode()) {
    return NextResponse.json({
      status: "prototype",
      data: [],
      message: "DB 模式未啟用。請設定 V3_API_SOURCE=db 並提供 V3_SQLITE_DB_PATH。",
    });
  }

  const raw = dbReadSymbolNormalizedSummaries();
  if (raw === null) {
    return NextResponse.json(
      { status: "error", error: { code: "db_unavailable", message: "無法讀取 DB" } },
      { status: 503 }
    );
  }

  const parsed = ArraySchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[/api/v3/symbols/normalized] schema validation warning:", parsed.error.flatten());
    return NextResponse.json({ status: "ok", data: raw, count: (raw as unknown[]).length });
  }

  return NextResponse.json({
    status: "ok",
    data: parsed.data,
    count: parsed.data.length,
    lastUpdated: new Date().toISOString(),
  });
}
