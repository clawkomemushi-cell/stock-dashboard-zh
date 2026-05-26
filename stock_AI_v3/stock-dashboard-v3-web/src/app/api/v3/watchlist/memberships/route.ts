/**
 * /api/v3/watchlist/memberships
 *
 * Long-term contract endpoint for watchlist membership CRUD.
 * In non-DB mode returns a prototype signal so the client can display
 * an appropriate message without falsely claiming the add succeeded.
 *
 * GET  — list current memberships (DB mode only; prototype otherwise)
 * POST — add a ticker (validates format; DB mode persists, static mode returns prototype)
 * DELETE ?ticker=XXX — remove (DB mode only)
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { TickerSchema } from "@/lib/contracts/research";
import { requireSession, isAuthConfigured } from "@/lib/auth/session";
import { isDbMode } from "../../_lib/db-reader";
import { dbAddToWatchlist, dbRemoveFromWatchlist } from "../../_lib/db-writer";
import { dbReadWatchlist } from "../../_lib/db-reader";

const AddBody = z.object({
  ticker: TickerSchema,
  note: z.string().max(200).optional(),
  // User-facing endpoint only accepts manual additions. Pipeline/bulk imports
  // must use an internal writer path, not this public browser API.
  source: z.enum(["manual", "symbols_search"]).optional(),
});

async function requireWriteSessionIfPersistent() {
  // Static prototype mode does not persist anything, so it can stay public for
  // UX demos. The moment DB persistence is enabled, writes must fail closed.
  if (!isDbMode()) return null;
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { status: "error", error: { code: "setup_required", message: "請先設定登入驗證後再修改自選股" } },
      { status: 503 }
    );
  }
  const session = await requireSession();
  if (session) return null;
  return NextResponse.json(
    { status: "error", error: { code: "unauthorized", message: "請先登入後再修改自選股" } },
    { status: 401 }
  );
}

function protoResponse(ticker: string) {
  return NextResponse.json(
    {
      status: "prototype",
      data: null,
      message: `${ticker} 已標記（prototype 模式：尚未啟用 DB，重新整理後不保留）`,
    },
    { status: 200 }
  );
}

export async function GET() {
  if (!isDbMode()) {
    return NextResponse.json(
      {
        status: "prototype",
        data: [],
        message: "DB 模式未啟用，自選股資料由靜態快照提供。請見 /api/v3/watchlist 取得目前快照。",
      },
      { status: 200 }
    );
  }

  const rows = dbReadWatchlist();
  return NextResponse.json({ status: "ok", data: rows ?? [] });
}

export async function POST(request: NextRequest) {
  const authError = await requireWriteSessionIfPersistent();
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

  const parsed = AddBody.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return NextResponse.json(
      { status: "error", error: { code: "validation_error", message: issues } },
      { status: 400 }
    );
  }

  const { ticker, note, source } = parsed.data;

  if (!isDbMode()) {
    return protoResponse(ticker);
  }

  const result = dbAddToWatchlist({ ticker, note, kind: undefined, market: undefined });
  if (!result.ok) {
    return NextResponse.json(
      { status: "error", error: { code: "conflict", message: result.error } },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      data: {
        id: result.id,
        ticker,
        addedAt: new Date().toISOString(),
        source: source ?? "manual",
        note: note ?? null,
      },
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const authError = await requireWriteSessionIfPersistent();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json(
      { status: "error", error: { code: "bad_request", message: "缺少 ticker 參數" } },
      { status: 400 }
    );
  }

  const tickerValidation = TickerSchema.safeParse(ticker.toUpperCase());
  if (!tickerValidation.success) {
    return NextResponse.json(
      { status: "error", error: { code: "bad_request", message: "ticker 格式不符" } },
      { status: 400 }
    );
  }

  if (!isDbMode()) {
    return NextResponse.json(
      { status: "prototype", data: null, message: "DB 模式未啟用，無法刪除" },
      { status: 200 }
    );
  }

  const result = dbRemoveFromWatchlist(tickerValidation.data);
  if (!result.ok) {
    return NextResponse.json(
      { status: "error", error: { code: "not_found", message: result.error } },
      { status: 404 }
    );
  }

  return NextResponse.json({ status: "ok", data: null });
}
