/**
 * /api/v3/portfolio/positions/[id]
 *
 * PATCH  — update position (thesis / stop / target / status / quantity / avgCost)
 * DELETE — soft-delete position (marks status=closed)
 *
 * Requires DB mode. Requires login when auth is configured.
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireSession, isAuthConfigured } from "@/lib/auth/session";
import { isDbMode } from "../../../_lib/db-reader";
import { dbUpdatePortfolioPosition, dbDeletePortfolioPosition } from "../../../_lib/db-writer";

const PatchSchema = z.object({
  status: z.enum(["active", "closed", "stopped"]).optional(),
  thesis: z.string().max(1000).optional(),
  stopLoss: z.number().positive().nullable().optional(),
  target: z.number().positive().nullable().optional(),
  note: z.string().max(500).optional(),
  quantity: z.number().positive().optional(),
  avgCost: z.number().positive().optional(),
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

function dbRequiredResponse() {
  return NextResponse.json(
    { status: "error", error: { code: "db_required", message: "持倉操作需要 DB 模式" } },
    { status: 503 }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isDbMode()) return dbRequiredResponse();

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

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json(
      { status: "error", error: { code: "validation_error", message: issues } },
      { status: 422 }
    );
  }

  const result = dbUpdatePortfolioPosition(id, {
    status: parsed.data.status,
    thesis: parsed.data.thesis,
    stopLoss: parsed.data.stopLoss,
    target: parsed.data.target,
    note: parsed.data.note,
    quantity: parsed.data.quantity,
    avgCost: parsed.data.avgCost,
  });

  if (!result.ok) {
    return NextResponse.json(
      { status: "error", error: { code: "not_found", message: result.error } },
      { status: 404 }
    );
  }

  return NextResponse.json({ status: "ok", data: { id } });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isDbMode()) return dbRequiredResponse();

  const authError = await requireWriteAuth();
  if (authError) return authError;

  const result = dbDeletePortfolioPosition(id);
  if (!result.ok) {
    return NextResponse.json(
      { status: "error", error: { code: "not_found", message: result.error } },
      { status: 404 }
    );
  }

  return NextResponse.json({ status: "ok", data: null });
}
