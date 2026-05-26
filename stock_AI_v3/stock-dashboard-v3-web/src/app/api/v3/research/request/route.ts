/**
 * /api/v3/research/request
 *
 * On-demand research request endpoint.
 *
 * Security layers (all active):
 *   [1] Session validation — requireSession()               ✅ ACTIVE
 *   [2] Input validation  — zod ResearchRequest             ✅ ACTIVE
 *   [3] Allowlist check   — AUTH_USERNAME / V3_RESEARCH_ALLOWED_USERS  ✅ ACTIVE
 *   [4] Rate limit        — 5 req/min/user (V3_RESEARCH_RATE_LIMIT_PER_MIN)  ✅ ACTIVE
 *   [5] Daily quota       — 20 req/day/user (V3_RESEARCH_DAILY_QUOTA)  ✅ ACTIVE
 *   [6] Usage ledger      — tmp/ai-usage/research-usage-YYYY-MM-DD.jsonl  ✅ ACTIVE
 *   [7] Model call        — OpenAI Responses API (when V3_RESEARCH_AI_ENABLED=true) ✅
 *
 * POST body: { tickers: string[], note?: string }
 * Returns:   { jobId, status: "done"|"mock", ... }
 *
 * API key is NEVER logged.
 */

import { NextRequest, NextResponse } from "next/server";
import { ResearchRequest } from "@/lib/contracts/research";
import { requireSession, isAuthConfigured } from "@/lib/auth/session";
import { isDbMode } from "../../_lib/db-reader";
import {
  dbCreateResearchSession,
  dbUpdateResearchSession,
  dbAddSymbolInsight,
} from "../../_lib/db-writer";
import {
  checkGuardrails,
  recordAccepted,
  recordRejected,
  recordModelUsage,
} from "../../_lib/ai-usage-ledger";
import { isOpenAIEnabled, callOpenAIResearch } from "../../_lib/openai-research";

function randomJobId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function runResearchJob(jobId: string, userId: string, tickers: string[], note?: string) {
  dbUpdateResearchSession(jobId, { status: "running" });
  try {
    const { result, usage } = await callOpenAIResearch(tickers, note);
    recordModelUsage(userId, tickers, { ...usage, jobId });

    const createdAt = new Date().toISOString();
    const responseData = {
      jobId,
      status: "done" as const,
      tickers,
      createdAt,
      ai: result,
      model: usage.model,
    };

    if (isDbMode()) {
      for (const ticker of tickers) {
        const perTickerPoints = result.perTicker?.[ticker] ?? result.perTicker?.[ticker.replace(/\.TW$/, "")] ?? [];
        const body = [
          result.summary,
          ...(perTickerPoints as string[]).map((p: string) => `• ${p}`),
          result.risks?.length ? `風險: ${result.risks.join("、")}` : null,
          result.nextSteps?.length ? `後續: ${result.nextSteps.join("、")}` : null,
        ].filter(Boolean).join("\n");
        dbAddSymbolInsight({
          ticker,
          source: "research:on_demand",
          kind: "ai_summary",
          title: `即時研究 (${usage.model})`,
          body: body || result.summary,
          payloadJson: result,
          confidence: undefined,
          sessionId: jobId,
          userId,
        });
      }
    }

    dbUpdateResearchSession(jobId, {
      status: "done",
      resultJson: responseData,
      finishedAt: new Date().toISOString(),
    });
    console.info(
      `[research/request] AI job ${jobId} done | user: ${userId} | tickers: ${tickers.join(", ")} | model: ${usage.model} | tokens: ${usage.totalTokens}`
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    dbUpdateResearchSession(jobId, {
      status: "error",
      errorText: errMsg,
      finishedAt: new Date().toISOString(),
    });
    console.error(`[research/request] AI job ${jobId} failed | user: ${userId} | error: ${errMsg}`);
  }
}

function startResearchJob(jobId: string, userId: string, tickers: string[], note?: string) {
  void runResearchJob(jobId, userId, tickers, note);
}

export async function POST(request: NextRequest) {
  // [1] Session validation
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { status: "error", error: { code: "setup_required", message: "請先設定登入驗證後再使用即時研究功能" } },
      { status: 503 }
    );
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json(
      { status: "error", error: { code: "unauthorized", message: "請先登入後再使用即時研究功能" } },
      { status: 401 }
    );
  }
  const userId = session.username ?? "default";

  // [2] Input validation
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "bad_request", message: "無效的 JSON 格式" } },
      { status: 400 }
    );
  }

  const parsed = ResearchRequest.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return NextResponse.json(
      { status: "error", error: { code: "validation_error", message: `輸入驗證失敗: ${issues}` } },
      { status: 422 }
    );
  }

  const { tickers, note } = parsed.data;

  // [3][4][5] Allowlist + rate limit + daily quota
  const guard = checkGuardrails(userId);
  if (!guard.allowed) {
    recordRejected(userId, tickers, guard.reason ?? "unknown");
    console.warn(`[research/request] REJECTED | user: ${userId} | reason: ${guard.reason}`);
    return NextResponse.json(
      { status: "error", error: { code: "quota_exceeded", message: guard.reason } },
      { status: guard.statusCode ?? 429 }
    );
  }

  // [6] Record accepted request in usage ledger
  recordAccepted(userId, tickers);

  const createdAt = new Date().toISOString();
  const tickerList = tickers.join(", ");

  // [7] Model call — active when V3_RESEARCH_AI_ENABLED=true + OPENAI_API_KEY is set.
  // Create a durable job first, then run the expensive model call in the background
  // so refresh/navigation does not lose state or encourage duplicate submissions.
  if (isOpenAIEnabled()) {
    if (!isDbMode()) {
      return NextResponse.json(
        { status: "error", error: { code: "db_required", message: "即時研究需要 DB job queue 才能安全執行" } },
        { status: 503 }
      );
    }

    const sessionResult = dbCreateResearchSession({ tickers, note, userId, status: "queued" });
    if (!sessionResult.ok) {
      return NextResponse.json(
        { status: "error", error: { code: "db_error", message: sessionResult.error } },
        { status: 500 }
      );
    }

    const jobId = sessionResult.id;
    console.info(`[research/request] queued AI job ${jobId} | user: ${userId} | tickers: ${tickerList}`);
    startResearchJob(jobId, userId, tickers, note);

    return NextResponse.json(
      {
        status: "ok",
        data: {
          jobId,
          status: "queued",
          tickers,
          createdAt,
          message: "研究已送出，背景執行中。可以刷新頁面後用 jobId 恢復進度。",
        },
      },
      { status: 202 }
    );
  }

  // AI disabled — fall through to DB stub / mock
  if (isDbMode()) {
    const sessionResult = dbCreateResearchSession({
      tickers,
      note,
      userId,
      status: "queued",
    });

    if (sessionResult.ok) {
      const jobId = sessionResult.id;
      for (const ticker of tickers) {
        dbAddSymbolInsight({
          ticker,
          source: "research:on_demand",
          kind: "research_request",
          body: `研究請求已建立（jobId: ${jobId}）${note ? `。備注：${note}` : ""}`,
          sessionId: jobId,
          userId,
        });
      }
      console.info(`[research/request] DB job ${jobId} | user: ${userId} | tickers: ${tickerList}`);
      return NextResponse.json(
        {
          status: "ok",
          data: {
            jobId,
            status: "queued",
            tickers,
            createdAt,
            message:
              "研究請求已通過防護層並寫入資料庫。" +
              "AI 模式未啟用 (V3_RESEARCH_AI_ENABLED=false)，不會產生真實分析結果。" +
              "（防護層：登入 ✅ 許可名單 ✅ Rate limit ✅ Daily quota ✅ Usage ledger ✅）",
          },
        },
        { status: 202 }
      );
    } else {
      console.warn(`[research/request] DB write failed: ${sessionResult.error}`);
    }
  }

  // Static mode fallback
  const jobId = randomJobId();
  console.info(`[research/request] mock job ${jobId} | user: ${userId} | tickers: ${tickerList}`);

  return NextResponse.json(
    {
      status: "ok",
      data: {
        jobId,
        status: "mock",
        tickers,
        createdAt,
        message:
          "研究請求已通過防護層（prototype 模式）。" +
          "AI 模式未啟用 (V3_RESEARCH_AI_ENABLED=false)，不會產生真實分析結果。" +
          "（防護層：登入 ✅ 許可名單 ✅ Rate limit ✅ Daily quota ✅ Usage ledger ✅）",
      },
    },
    { status: 202 }
  );
}

export async function GET() {
  return NextResponse.json(
    { status: "error", error: { code: "method_not_allowed", message: "請使用 POST 提交研究請求" } },
    { status: 405 }
  );
}
