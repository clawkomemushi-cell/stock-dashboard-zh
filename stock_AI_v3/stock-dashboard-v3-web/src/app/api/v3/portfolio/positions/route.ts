/**
 * /api/v3/portfolio/positions
 *
 * GET  — list active portfolio positions (DB mode only)
 * POST — add a new portfolio position (DB mode + login required when auth configured)
 *
 * POST body: { ticker, quantity, avgCost, currency?, thesis?, stopLoss?, target?, note? }
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { TickerSchema } from "@/lib/contracts/research";
import { requireSession, isAuthConfigured } from "@/lib/auth/session";
import { isDbMode, dbReadPortfolioPositions } from "../../_lib/db-reader";
import { dbAddPortfolioPosition } from "../../_lib/db-writer";

const AddPositionSchema = z.object({
  ticker: TickerSchema,
  quantity: z.number().positive(),
  avgCost: z.number().positive(),
  currency: z.enum(["TWD", "USD", "HKD"]).optional(),
  thesis: z.string().max(1000).optional(),
  stopLoss: z.number().positive().optional(),
  target: z.number().positive().optional(),
  note: z.string().max(500).optional(),
});

async function requireWriteAuth() {
  // DB writes must fail closed when auth is not configured.
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { status: "error", error: { code: "setup_required", message: "請先設定登入驗證後再操作持倉" } },
      { status: 503 }
    );
  }
  const session = await requireSession();
  if (session) return null;
  return NextResponse.json(
    { status: "error", error: { code: "unauthorized", message: "請先登入後再操作持倉" } },
    { status: 401 }
  );
}

export async function GET() {
  if (!isDbMode()) {
    return NextResponse.json({
      status: "prototype",
      data: [],
      message: "portfolio positions 需要 DB 模式 (V3_API_SOURCE=db)。",
    });
  }

  const rows = dbReadPortfolioPositions();
  if (rows === null) {
    return NextResponse.json(
      { status: "error", error: { code: "db_unavailable", message: "無法讀取 DB" } },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    data: rows,
    count: rows.length,
    lastUpdated: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  if (!isDbMode()) {
    return NextResponse.json(
      { status: "error", error: { code: "db_required", message: "持倉寫入需要 DB 模式" } },
      { status: 503 }
    );
  }

  const authError = await requireWriteAuth();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "bad_request", message: "無效的 JSON 格式" } },
      { status: 400 }
    );
  }

  const parsed = AddPositionSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json(
      { status: "error", error: { code: "validation_error", message: issues } },
      { status: 422 }
    );
  }

  const result = dbAddPortfolioPosition({
    ticker: parsed.data.ticker,
    quantity: parsed.data.quantity,
    avgCost: parsed.data.avgCost,
    currency: parsed.data.currency,
    thesis: parsed.data.thesis,
    stopLoss: parsed.data.stopLoss,
    target: parsed.data.target,
    note: parsed.data.note,
  });

  if (!result.ok) {
    return NextResponse.json(
      { status: "error", error: { code: "write_failed", message: result.error } },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      data: {
        id: result.id,
        ticker: parsed.data.ticker,
        quantity: parsed.data.quantity,
        avgCost: parsed.data.avgCost,
        currency: parsed.data.currency ?? "TWD",
        openedAt: new Date().toISOString(),
        status: "active",
      },
    },
    { status: 201 }
  );
}
