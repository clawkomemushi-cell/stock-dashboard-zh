import { NextRequest, NextResponse } from "next/server";
import { requireSession, isAuthConfigured } from "@/lib/auth/session";
import { dbReadResearchSession } from "../../../_lib/db-reader";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { status: "error", error: { code: "setup_required", message: "請先設定登入驗證" } },
      { status: 503 }
    );
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json(
      { status: "error", error: { code: "unauthorized", message: "請先登入" } },
      { status: 401 }
    );
  }

  const { jobId } = await context.params;
  const row = dbReadResearchSession(jobId, session.username ?? "default");
  if (!row) {
    return NextResponse.json(
      { status: "error", error: { code: "not_found", message: "找不到研究任務" } },
      { status: 404 }
    );
  }

  if (row.status === "done" && row.resultJson) {
    return NextResponse.json({ status: "ok", data: row.resultJson }, { status: 200 });
  }

  return NextResponse.json(
    {
      status: "ok",
      data: {
        jobId: row.id,
        status: row.status,
        tickers: row.tickers,
        createdAt: row.createdAt,
        message:
          row.status === "error"
            ? row.errorText ?? "研究任務失敗"
            : row.status === "running"
              ? "研究執行中"
              : "研究排隊中",
      },
    },
    { status: 200 }
  );
}
