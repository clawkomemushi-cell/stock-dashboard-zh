/**
 * POST /api/v3/symbols/[ticker]/ai-note/generate
 *
 * Generates or updates the formal AI research note for a single ticker.
 *
 * Security:
 *   [1] requireSession + isAuthConfigured
 *   [2] V3_RESEARCH_AI_ENABLED + OPENAI_API_KEY check
 *   [3] checkGuardrails (allowlist + rate limit + daily quota)
 *   [4] Usage ledger recordAccepted / recordModelUsage
 *
 * Context gathering (before prompt construction):
 *   - symbol-universe entry (kind / name / market / industryCode)
 *   - DB SymbolProfile (profile_json from symbols table, if DB mode)
 *   - DB recent symbol_insights (latest 5 non-ai_note, if DB mode)
 *   - Static overview.json   (price / range / market cap)
 *   - Static technical.json  (RSI / MA / trend / support+resistance)
 *   - Static fundamentals.json (P/E, P/B, dividend, revenue growth)
 *
 * Missing data is marked explicitly in the prompt — the model is forbidden
 * from fabricating numbers for absent fields.
 *
 * On success (DB mode): writes to symbol_insights with kind='ai_note'
 * which is then read back by GET /api/v3/symbols/[ticker]/ai-note.
 *
 * Schema validation: if the OpenAI response cannot be parsed into SymbolAINote,
 * a controlled low-confidence fallback is written instead of raw garbage.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession, isAuthConfigured } from "@/lib/auth/session";
import {
  isDbMode,
  dbReadSymbolProfile,
  dbReadSymbolInsights,
} from "../../../../_lib/db-reader";
import { dbAddSymbolInsight } from "../../../../_lib/db-writer";
import {
  checkGuardrails,
  recordAccepted,
  recordRejected,
  recordModelUsage,
} from "../../../../_lib/ai-usage-ledger";
import { isOpenAIEnabled } from "../../../../_lib/openai-research";
import { findSymbolUniverseEntry } from "@/lib/symbol-universe";
import type { SymbolUniverseEntry } from "@/lib/symbol-universe";
import {
  SymbolAINote,
  SymbolOverview,
  SymbolTechnicalSnapshot,
  SymbolFundamentalSnapshot,
} from "@/lib/contracts";
import { readDataFile } from "../../../../_lib/data-reader";
import type { z } from "zod";

const OPENAI_API_ENDPOINT = "https://api.openai.com/v1/responses";

type ResponseOutputItem = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};

function extractOutputText(data: { output_text?: string; output?: ResponseOutputItem[] }): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const chunks: string[] = [];
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.trim()) {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function parseJsonObject(outputText: string): unknown {
  const cleaned = stripJsonFences(outputText);
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    }
    throw new Error(`AI 回應不是可解析的 JSON（前 300 字：${cleaned.slice(0, 300)}）`);
  }
}

// ── System prompt: type classification + per-type checklist + confidence rules ──

const SYSTEM_PROMPT = `你是台股/美股個股研究分析師，專門產出正式的投資研判報告。

## 輸出格式
你必須輸出一個嚴格符合下列 JSON schema 的物件，不可輸出 markdown 或任何額外文字：
{
  "ticker": "股票代號（字串）",
  "asOf": "ISO 8601 UTC timestamp",
  "thesis": "主要投資論點（100-200字）",
  "whySelected": "為何關注此標的（必須包含判斷依據 + 觀察邏輯，50-120字）",
  "trigger": "進場條件或催化劑（必須是可觀察條件，不可空泛；30-80字）",
  "invalidation": "論點失效條件（必須是可觀察條件，不可空泛；30-80字）",
  "riskScenarios": ["風險情境1", "風險情境2", "風險情境3"],
  "bias": "long 或 short 或 neutral 或 avoid",
  "confidence": "low 或 medium 或 high",
  "evidence": [
    {"label": "來源或依據簡述", "kind": "technical|fundamental|news|macro|site_insight"}
  ],
  "provenance": {"source": "OpenAI", "generatedBy": "ai-note/generate"}
}

## 分析流程（必須依序完成）

### Step 1：判斷標的類型
根據 context 中的 kind、市場、產業代碼、名稱，歸入下列其中一類：
- ETF：追蹤指數/主題/債券的基金（kind=etf）
- 權值股：市值大型、具品牌或護城河的核心持股
- 金融股：銀行、壽險、證券等金融業
- 景氣循環股：鋼鐵、石化、DRAM、航運等強週期性產業
- 題材/成長股：AI/電動車/生技等高成長型、本益比偏高
- 高波動投機股：漲跌幅度大、籌碼散、無穩定基本面支撐
- 未知/資料不足：資訊不足以判斷

### Step 2：依類型套用對應檢查表

**ETF** → 追蹤標的、費用率、規模、成分集中度風險、過去與指數偏差
**權值股** → 毛利率趨勢、市佔地位、護城河深度、P/E 與 P/B 合理性、配息紀錄
**金融股** → 升降息對 NIM 的影響、資產品質（不良率）、股利政策、監理風險
**景氣循環股** → 產業景氣位置（上行/下行）、庫存週期、供需缺口、商品/匯率敏感度
**題材/成長股** → 催化劑可信度、成長率 vs 當前估值、競爭壓力、題材兌現時間表
**高波動投機股** → riskScenarios 必須優先列「急殺風險」與「籌碼集中/倒貨」；trigger/invalidation 必須是價格或成交量等具體數值條件
**未知/資料不足** → thesis 必須說明無法研判的原因，confidence 必須設 low

### Step 3：填寫研判欄位

- **whySelected**：必須同時包含「判斷依據」（你觀察到什麼特徵或資料）與「觀察邏輯」（這代表什麼訊號或意義）
- **trigger**：必須是具體可觀察條件，例如「突破 xxx 壓力且成交量大於五日均量 1.5 倍」。不可使用「若市場好轉」等空泛表述。
- **invalidation**：必須是具體可觀察條件，例如「跌破 xxx 支撐且連續兩日無量反彈」。不可空泛。
- **riskScenarios**：至少 3 條，每條需連結到提供的資料或標明「資料缺口」
- **evidence**：每條來源需指明 kind 類型（technical/fundamental/news/macro/site_insight）

### Step 4：設定 confidence

- **high**：所有關鍵資料完整（technical + fundamental + site_insights），且多個來源方向一致
- **medium**：有 2 類以上資料，但部分欄位缺失，或訊號方向不完全一致
- **low**：任一情況 → 僅靠模型訓練知識而無站內資料；技術面與基本面都缺失；標的類型為「未知/資料不足」；標記為【缺失】的關鍵欄位過多；資料矛盾無法收斂

## 禁止事項
- 禁止捏造新聞標題、財報數字、股價、技術指標具體數值（只能使用 context 中提供的數據）
- 禁止對資料標記為【缺失】的欄位編造具體數值
- 資料不足時，thesis 必須明說「資料缺失，無法產出可靠研判」並將 confidence 設 low`;

// ── Context types ────────────────────────────────────────────────────────────

interface TickerContext {
  universeEntry: SymbolUniverseEntry | null;
  dbProfile: Record<string, unknown> | null;
  recentInsights: Array<Record<string, unknown>> | null;
  overview: z.infer<typeof SymbolOverview> | null;
  technical: z.infer<typeof SymbolTechnicalSnapshot> | null;
  fundamentals: z.infer<typeof SymbolFundamentalSnapshot> | null;
}

// ── Context gathering ────────────────────────────────────────────────────────

async function gatherContext(ticker: string): Promise<TickerContext> {
  const universeEntry = findSymbolUniverseEntry(ticker);

  const dbProfile = isDbMode()
    ? (dbReadSymbolProfile(ticker) as Record<string, unknown> | null)
    : null;

  let recentInsights: Array<Record<string, unknown>> | null = null;
  if (isDbMode()) {
    const raw = dbReadSymbolInsights(ticker, 10);
    if (raw !== null) {
      recentInsights = raw
        .filter((r) => (r as Record<string, unknown>).kind !== "ai_note")
        .slice(0, 5) as Array<Record<string, unknown>>;
    }
  }

  const [overview, technical, fundamentals] = await Promise.all([
    readDataFile(`/symbols/${ticker}/overview.json`, SymbolOverview),
    readDataFile(`/symbols/${ticker}/technical.json`, SymbolTechnicalSnapshot),
    readDataFile(`/symbols/${ticker}/fundamentals.json`, SymbolFundamentalSnapshot),
  ]);

  return { universeEntry, dbProfile, recentInsights, overview, technical, fundamentals };
}

// ── Context → prompt block ───────────────────────────────────────────────────

function buildContextBlock(ctx: TickerContext): string {
  const lines: string[] = [];

  // Universe entry
  if (ctx.universeEntry) {
    const e = ctx.universeEntry;
    lines.push("## 標的基本資訊（symbol-universe）");
    lines.push(`- ticker: ${e.ticker}`);
    lines.push(`- 名稱: ${e.name}`);
    lines.push(`- 類型 (kind): ${e.kind}`);
    lines.push(`- 市場: ${e.market}`);
    if (e.industryCode) lines.push(`- 產業代碼: ${e.industryCode}`);
  } else {
    lines.push("## 標的基本資訊：【缺失】ticker 不在 symbol-universe 快照中");
  }

  // DB profile
  if (ctx.dbProfile) {
    const p = ctx.dbProfile;
    lines.push("\n## DB 公司資料（SymbolProfile）");
    if (p.name) lines.push(`- 名稱: ${p.name}`);
    if (p.kind) lines.push(`- 類型: ${p.kind}`);
    if (p.market) lines.push(`- 市場: ${p.market}`);
    if (p.sector) lines.push(`- 類股: ${p.sector}`);
    if (p.industry) lines.push(`- 產業: ${p.industry}`);
    if (p.oneLineSummary) lines.push(`- 站內摘要: ${p.oneLineSummary}`);
    if (Array.isArray(p.tags) && p.tags.length > 0)
      lines.push(`- 標籤: ${(p.tags as string[]).join(", ")}`);
  } else {
    lines.push("\n## DB 公司資料：【缺失】（非 DB 模式或 symbols 表無此筆）");
  }

  // Overview
  if (ctx.overview) {
    const o = ctx.overview;
    lines.push("\n## 股價快照（SymbolOverview）");
    if (o.last != null) lines.push(`- 最新價: ${o.last}`);
    if (o.changePct != null) lines.push(`- 漲跌幅: ${o.changePct.toFixed(2)}%`);
    if (o.rangeDay) lines.push(`- 當日區間: ${o.rangeDay[0]} - ${o.rangeDay[1]}`);
    if (o.range52w) lines.push(`- 52週區間: ${o.range52w[0]} - ${o.range52w[1]}`);
    if (o.volume != null) lines.push(`- 成交量: ${o.volume}`);
    if (o.marketCap != null) lines.push(`- 市值: ${o.marketCap}`);
    if (o.oneLineThesis) lines.push(`- 站內簡論: ${o.oneLineThesis}`);
    if (o.asOf) lines.push(`- 資料時間: ${o.asOf}`);
  } else {
    lines.push("\n## 股價快照：【缺失】無 overview.json（禁止捏造股價或市值）");
  }

  // Technical
  if (ctx.technical) {
    const t = ctx.technical;
    lines.push("\n## 技術指標（SymbolTechnicalSnapshot）");
    if (t.trend) lines.push(`- 趨勢: ${t.trend}`);
    if (t.rsi14 != null) lines.push(`- RSI14: ${t.rsi14.toFixed(1)}`);
    if (t.ma20 != null) lines.push(`- MA20: ${t.ma20}`);
    if (t.ma60 != null) lines.push(`- MA60: ${t.ma60}`);
    if (t.ma200 != null) lines.push(`- MA200: ${t.ma200}`);
    if (t.supportLevels && t.supportLevels.length > 0)
      lines.push(`- 支撐: ${t.supportLevels.join(", ")}`);
    if (t.resistanceLevels && t.resistanceLevels.length > 0)
      lines.push(`- 壓力: ${t.resistanceLevels.join(", ")}`);
    if (t.patterns && t.patterns.length > 0)
      lines.push(`- 型態: ${t.patterns.join(", ")}`);
    if (t.notes) lines.push(`- 備注: ${t.notes}`);
    if (t.asOf) lines.push(`- 資料時間: ${t.asOf}`);
  } else {
    lines.push("\n## 技術指標：【缺失】無 technical.json（禁止捏造 RSI / MA / 支撐壓力數值）");
  }

  // Fundamentals
  if (ctx.fundamentals) {
    const f = ctx.fundamentals;
    lines.push("\n## 基本面（SymbolFundamentalSnapshot）");
    if (f.pe != null) lines.push(`- P/E: ${f.pe.toFixed(1)}`);
    if (f.pb != null) lines.push(`- P/B: ${f.pb.toFixed(2)}`);
    if (f.dividendYield != null) lines.push(`- 股利率: ${f.dividendYield.toFixed(2)}%`);
    if (f.epsTtm != null) lines.push(`- EPS TTM: ${f.epsTtm}`);
    if (f.revenueGrowthYoy != null)
      lines.push(`- 年營收成長: ${f.revenueGrowthYoy.toFixed(1)}%`);
    if (f.revenueMonthly && f.revenueMonthly.length > 0) {
      const recent = f.revenueMonthly
        .slice(-3)
        .map(
          (m) =>
            `${m.month}(yoy:${m.yoy != null ? m.yoy.toFixed(1) + "%" : "N/A"})`
        )
        .join(", ");
      lines.push(`- 近三月營收 yoy: ${recent}`);
    }
    if (f.notes) lines.push(`- 備注: ${f.notes}`);
    if (f.asOf) lines.push(`- 資料時間: ${f.asOf}`);
  } else {
    lines.push("\n## 基本面：【缺失】無 fundamentals.json（禁止捏造 P/E / P/B / 財報數字）");
  }

  // Recent insights from DB
  if (ctx.recentInsights === null) {
    lines.push("\n## 近期站內研判：【缺失】（非 DB 模式）");
  } else if (ctx.recentInsights.length === 0) {
    lines.push("\n## 近期站內研判：【暫無資料】");
  } else {
    lines.push(`\n## 近期站內研判（最新 ${ctx.recentInsights.length} 筆）`);
    for (const insight of ctx.recentInsights) {
      const when = (insight.asOf ?? insight.createdAt ?? "") as string;
      const kind = (insight.kind ?? "note") as string;
      const body = String(insight.body ?? "").slice(0, 200);
      lines.push(`- [${kind}]${when ? ` (${when})` : ""} ${body}`);
    }
  }

  return lines.join("\n");
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildUserPrompt(ticker: string, ctx: TickerContext): string {
  const today = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
  const contextBlock = buildContextBlock(ctx);

  return [
    `請為以下個股產出正式 AI 研判（SymbolAINote）：`,
    `標的：${ticker}`,
    `今日日期：${today}`,
    ``,
    `以下是站內所有可用資料。標記為【缺失】的欄位表示系統無此資料，禁止對其捏造具體數值。`,
    ``,
    contextBlock,
    ``,
    `請依照系統提示中的分析流程（Step 1→4）完成研判，只輸出 JSON，不要輸出任何其他文字。`,
  ].join("\n");
}

// ── Schema-conformant fallback when AI output cannot be parsed ───────────────

function makeSchemaFallback(
  ticker: string,
  parseError: string
): z.infer<typeof SymbolAINote> {
  return {
    ticker,
    asOf: new Date().toISOString(),
    thesis:
      "AI 輸出格式不符規範，已降級為低信度結果。請重試以取得正式研判。（parse error: " +
      parseError.slice(0, 200) +
      "）",
    whySelected: null,
    trigger: null,
    invalidation: null,
    riskScenarios: ["AI 輸出格式錯誤，本次結果不可信"],
    bias: "neutral",
    confidence: "low",
    evidence: [],
    provenance: { source: "OpenAI", generatedBy: "ai-note/generate:schema-fallback" },
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params;
  const ticker = decodeURIComponent(rawTicker).toUpperCase();

  // [1] Auth check
  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        status: "error",
        error: { code: "setup_required", message: "請先設定登入驗證後再使用此功能" },
      },
      { status: 503 }
    );
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json(
      {
        status: "error",
        error: { code: "unauthorized", message: "請先登入後再使用此功能" },
      },
      { status: 401 }
    );
  }
  const userId = session.username ?? "default";

  // [2] AI availability check
  if (!isOpenAIEnabled()) {
    return NextResponse.json(
      {
        status: "error",
        error: {
          code: "ai_disabled",
          message: "AI 功能未啟用（V3_RESEARCH_AI_ENABLED 或 OPENAI_API_KEY 未設定）",
        },
      },
      { status: 503 }
    );
  }

  // [3] Guardrails
  const guard = checkGuardrails(userId);
  if (!guard.allowed) {
    recordRejected(userId, [ticker], guard.reason ?? "unknown");
    return NextResponse.json(
      {
        status: "error",
        error: { code: "quota_exceeded", message: guard.reason },
      },
      { status: guard.statusCode ?? 429 }
    );
  }
  recordAccepted(userId, [ticker]);

  // Gather in-site context data for prompt
  const ctx = await gatherContext(ticker);
  const model = process.env.V3_RESEARCH_OPENAI_MODEL ?? "gpt-5.5";
  const reasoningEffort = process.env.V3_RESEARCH_REASONING_EFFORT ?? "xhigh";
  const userPrompt = buildUserPrompt(ticker, ctx);
  const jobId = `ainote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Call OpenAI
  const apiKey = process.env.OPENAI_API_KEY!;
  let aiNoteRaw: unknown;
  let usage = {
    model,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    requestId: null as string | null,
  };

  try {
    const body = {
      model,
      input: [{ role: "user", content: userPrompt }],
      instructions: SYSTEM_PROMPT,
      text: { format: { type: "json_object" } },
      reasoning: { effort: reasoningEffort },
    };

    const response = await fetch(OPENAI_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "(no body)");
      throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as {
      id?: string;
      output_text?: string;
      output?: Array<{
        type: string;
        content?: Array<{ type: string; text?: string }>;
      }>;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
      };
    };

    const outputText = extractOutputText(data);
    if (!outputText) throw new Error("AI 回應沒有 output_text");

    aiNoteRaw = parseJsonObject(outputText);
    usage = {
      model,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
      requestId: data.id ?? null,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `[ai-note/generate] AI call failed | ticker: ${ticker} | error: ${errMsg}`
    );
    return NextResponse.json(
      { status: "error", error: { code: "ai_error", message: "AI 研判產生失敗" } },
      { status: 500 }
    );
  }

  recordModelUsage(userId, [ticker], { ...usage, jobId, estimatedCostUsd: null });

  // Validate against SymbolAINote schema.
  // If validation fails, use a controlled low-confidence fallback rather than
  // writing raw unvalidated data to the DB.
  const aiNoteWithTicker = {
    ...(aiNoteRaw as Record<string, unknown>),
    ticker,
  };
  const parsed = SymbolAINote.safeParse(aiNoteWithTicker);
  let aiNote: z.infer<typeof SymbolAINote>;
  if (parsed.success) {
    aiNote = parsed.data;
  } else {
    const errSummary = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    console.warn(
      `[ai-note/generate] schema validation failed | ticker: ${ticker} | ${errSummary}`
    );
    aiNote = makeSchemaFallback(ticker, errSummary);
  }

  const asOf = aiNote.asOf ?? new Date().toISOString();

  console.info(
    `[ai-note/generate] done | ticker: ${ticker} | user: ${userId} | model: ${model}` +
      ` | tokens: ${usage.totalTokens} | confidence: ${aiNote.confidence ?? "?"}`
  );

  // Persist to DB
  if (isDbMode()) {
    dbAddSymbolInsight({
      ticker,
      source: "research:ai_note",
      kind: "ai_note",
      title: `AI 研判 (${model})`,
      body: aiNote.thesis ?? "（無摘要）",
      payloadJson: aiNote,
      confidence: aiNote.confidence,
      asOf,
      sessionId: jobId,
      userId,
    });
  } else {
    return NextResponse.json(
      {
        status: "error",
        error: {
          code: "static_mode",
          message:
            "目前為靜態模式，無法寫入 AI 研判。請切換至 DB 模式（V3_API_SOURCE=db）。",
        },
      },
      { status: 501 }
    );
  }

  return NextResponse.json(
    { status: "ok", data: { jobId, ticker, asOf, aiNote } },
    { status: 200 }
  );
}
