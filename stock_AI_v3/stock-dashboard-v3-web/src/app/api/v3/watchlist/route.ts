import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { WatchlistItem } from "@/lib/contracts";
import { readDataSource, successResponse, errorResponse } from "../_lib/data-reader";
import { dbReadWatchlist, isDbMode } from "../_lib/db-reader";
import { dbAddToWatchlist, dbRemoveFromWatchlist } from "../_lib/db-writer";
import { requireSession, isAuthConfigured } from "@/lib/auth/session";

export async function GET() {
  const data = await readDataSource("/watchlist.json", z.array(WatchlistItem), dbReadWatchlist);
  if (data === null) return errorResponse("watchlist data unavailable", "pipeline_unavailable");
  return successResponse(data);
}

const AddInput = z.object({
  ticker: z.string().min(1),
  name: z.string().optional(),
  kind: z.string().optional(),
  market: z.string().optional(),
  note: z.string().optional(),
});

async function requireDbWriteAuth() {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: { code: "setup_required", message: "請先設定登入驗證後再修改自選股" }, status: "error" },
      { status: 503 }
    );
  }
  const session = await requireSession();
  if (session) return null;
  return NextResponse.json(
    { error: { code: "unauthorized", message: "請先登入後再修改自選股" }, status: "error" },
    { status: 401 }
  );
}

export async function POST(request: NextRequest) {
  if (!isDbMode()) {
    return NextResponse.json(
      { error: { code: "db_mode_disabled", message: "DB 模式未啟用，無法新增自選股" }, status: "error" },
      { status: 503 }
    );
  }

  const authError = await requireDbWriteAuth();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "無效的 JSON" }, status: "error" },
      { status: 400 }
    );
  }

  const parsed = AddInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "缺少必要欄位 ticker" }, status: "error" },
      { status: 400 }
    );
  }

  const result = dbAddToWatchlist(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "conflict", message: result.error }, status: "error" },
      { status: 409 }
    );
  }

  return NextResponse.json({ data: { id: result.id }, status: "ok" }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!isDbMode()) {
    return NextResponse.json(
      { error: { code: "db_mode_disabled", message: "DB 模式未啟用，無法移除自選股" }, status: "error" },
      { status: 503 }
    );
  }

  const authError = await requireDbWriteAuth();
  if (authError) return authError;

  // 優先從 query param 取 ticker，次選 JSON body
  const { searchParams } = new URL(request.url);
  let ticker = searchParams.get("ticker");
  if (!ticker) {
    try {
      const body = (await request.json()) as { ticker?: string };
      ticker = body.ticker ?? null;
    } catch {
      // body 缺失或非 JSON，ticker 維持 null
    }
  }

  if (!ticker) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "缺少 ticker 參數" }, status: "error" },
      { status: 400 }
    );
  }

  const result = dbRemoveFromWatchlist(ticker);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "not_found", message: result.error }, status: "error" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: null, status: "ok" });
}
