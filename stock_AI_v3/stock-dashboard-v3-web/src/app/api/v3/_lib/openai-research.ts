/**
 * OpenAI Responses API integration for on-demand research.
 *
 * Enabled only when BOTH env vars are set:
 *   OPENAI_API_KEY           — the API key (never logged)
 *   V3_RESEARCH_AI_ENABLED   — must be exactly "true"
 *
 * Optional:
 *   V3_RESEARCH_OPENAI_MODEL      — default "gpt-5.5"
 *   V3_RESEARCH_REASONING_EFFORT  — default "xhigh"
 */

import type { ResearchAIResult } from "@/lib/contracts/research";
import { findSymbolUniverseEntry } from "@/lib/symbol-universe";

const OPENAI_API_ENDPOINT = "https://api.openai.com/v1/responses";

export function isOpenAIEnabled(): boolean {
  return !!(
    process.env.OPENAI_API_KEY &&
    process.env.V3_RESEARCH_AI_ENABLED === "true"
  );
}

const SYSTEM_PROMPT = `你是台股/美股研究分析師。用戶會提供一份股票代號清單，你需要提供簡短但有價值的研究摘要。
輸出必須為 JSON，格式如下：
{
  "summary": "整體市場情境與這批標的的共同主題（100-200字）",
  "perTicker": {
    "TICKER": ["重點觀察1", "重點觀察2", "重點觀察3"]
  },
  "risks": ["主要風險1", "主要風險2", "主要風險3"],
  "nextSteps": ["建議觀察指標1", "建議觀察指標2"],
  "disclaimer": "本分析僅供參考，不構成投資建議。投資有風險，請自行判斷。"
}
每個 perTicker 最多 4 點，聚焦在近期關鍵訊號與判斷依據。`;

function buildUserPrompt(tickers: string[], note?: string): string {
  const today = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
  const symbolLines = tickers.map((ticker) => {
    const entry = findSymbolUniverseEntry(ticker);
    if (!entry) {
      return `- ${ticker}: 公司名稱未知；不在目前台股上市/上櫃 universe 快照中。請勿臆測公司名稱、產業或把它當成其他代號；若資料不足，請明確建議先確認代號是否正確。`;
    }
    return `- ${ticker}: ${entry.name}；市場 ${entry.market}；類型 ${entry.kind}`;
  });
  return [
    "請研究以下標的（ticker 與公司名稱以此清單為準，不可自行改名或臆測）：",
    ...symbolLines,
    note ? `補充說明：${note}` : "",
    `今日日期：${today}`,
    "請只輸出符合指定 schema 的 JSON，不要輸出 markdown 或額外文字。",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: null;
  requestId: string | null;
}

export interface OpenAIResearchResult {
  jobId: string;
  result: ResearchAIResult;
  usage: ModelUsage;
}

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

function parseResearchJson(outputText: string): ResearchAIResult {
  const cleaned = stripJsonFences(outputText);
  try {
    return JSON.parse(cleaned) as ResearchAIResult;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as ResearchAIResult;
    }
    throw new Error(`AI 回應不是可解析的 JSON（前 300 字：${cleaned.slice(0, 300)}）`);
  }
}

export async function callOpenAIResearch(
  tickers: string[],
  note?: string
): Promise<OpenAIResearchResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 未設定");

  const model = process.env.V3_RESEARCH_OPENAI_MODEL ?? "gpt-5.5";
  const reasoningEffort = process.env.V3_RESEARCH_REASONING_EFFORT ?? "xhigh";
  const jobId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const userPrompt = buildUserPrompt(tickers, note);

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
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  };

  // Responses API may place reasoning items before the actual message output.
  // Do not read only output[0], or GPT-5 reasoning runs can look like an empty/non-JSON response.
  const outputText = extractOutputText(data);
  if (!outputText) throw new Error("AI 回應沒有 output_text");

  const result = parseResearchJson(outputText);

  const usage: ModelUsage = {
    model,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    totalTokens: data.usage?.total_tokens ?? 0,
    estimatedCostUsd: null,
    requestId: data.id ?? null,
  };

  return { jobId, result, usage };
}
