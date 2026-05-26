/**
 * /api/v3/symbols/[ticker]/insights
 *
 * GET  — read latest insights for a ticker (DB mode only; returns [] otherwise)
 * POST — append a new insight (requires DB mode + login when auth is configured)
 *
 * POST body: { source, kind, body, title?, confidence?, asOf?, payloadJson? }
 * No model is called. Insights are plain text/metadata records.
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { TickerSchema } from "@/lib/contracts/research";
import { SymbolInsight } from "@/lib/contracts/symbol";
import { requireSession, isAuthConfigured } from "@/lib/auth/session";
import { isDbMode, dbReadSymbolInsights } from "../../../_lib/db-reader";
import { dbAddSymbolInsight } from "../../../_lib/db-writer";

const InsightBodySchema = z.object({
  source: z.string().min(1).max(60),
  kind: z.string().min(1).max(60),
  body: z.string().min(1).max(5000),
  title: z.string().max(200).optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  asOf: z.string().optional(),
  payloadJson: z.record(z.unknown()).optional(),
});

const InsightArraySchema = z.array(SymbolInsight);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params;

  const tickerResult = TickerSchema.safeParse(rawTicker);
  if (!tickerResult.success) {
    return NextResponse.json(
      { status: "error", error: { code: "bad_request", message: "無效的 ticker 格式" } },
      { status: 400 }
    );
  }

  if (!isDbMode()) {
    return NextResponse.json({
      status: "prototype",
      data: [],
      message: "DB 模式未啟用。insights 功能需要 V3_API_SOURCE=db。",
    });
  }

  const raw = dbReadSymbolInsights(tickerResult.data, 50);
  if (raw === null) {
    return NextResponse.json(
      { status: "error", error: { code: "db_unavailable", message: "無法讀取 DB" } },
      { status: 503 }
    );
  }

  const parsed = InsightArraySchema.safeParse(raw);
  const data = parsed.success ? parsed.data : raw;

  return NextResponse.json({
    status: "ok",
    data,
    count: (data as unknown[]).length,
    lastUpdated: new Date().toISOString(),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params;

  const tickerResult = TickerSchema.safeParse(rawTicker);
  if (!tickerResult.success) {
    return NextResponse.json(
      { status: "error", error: { code: "bad_request", message: "無效的 ticker 格式" } },
      { status: 400 }
    );
  }

  if (!isDbMode()) {
    return NextResponse.json(
      { status: "error", error: { code: "db_required", message: "insight 寫入需要 DB 模式" } },
      { status: 503 }
    );
  }

  // DB writes must never be public. If auth is not configured, fail closed.
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { status: "error", error: { code: "setup_required", message: "請先設定登入驗證後再開放 insight 寫入" } },
      { status: 503 }
    );
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json(
      { status: "error", error: { code: "unauthorized", message: "請先登入後再新增 insight" } },
      { status: 401 }
    );
  }
  const userId = session.username ?? "default";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "bad_request", message: "無效的 JSON 格式" } },
      { status: 400 }
    );
  }

  const parsed = InsightBodySchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json(
      { status: "error", error: { code: "validation_error", message: issues } },
      { status: 422 }
    );
  }

  const result = dbAddSymbolInsight({
    ticker: tickerResult.data,
    source: parsed.data.source,
    kind: parsed.data.kind,
    body: parsed.data.body,
    title: parsed.data.title,
    confidence: parsed.data.confidence,
    asOf: parsed.data.asOf,
    payloadJson: parsed.data.payloadJson,
    userId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { status: "error", error: { code: "write_failed", message: result.error } },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { status: "ok", data: { id: result.id, ticker: tickerResult.data } },
    { status: 201 }
  );
}
