#!/usr/bin/env node
/**
 * Generate a true V3 pre-market / early-market AI plan using the site's
 * OPENAI_API_KEY, not the OpenClaw/Codex agent session.
 *
 * Writes: public/data/premarket-plan.json
 */

import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "public", "data");
const OUT = path.join(DATA, "premarket-plan.json");
const OPENAI_API_ENDPOINT = "https://api.openai.com/v1/responses";

function loadDotenvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  const raw = readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function readJson(rel, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA, rel), "utf8"));
  } catch {
    return fallback;
  }
}

function twNow() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}:${get("minute")}:${get("second")}`;
  return { date, iso: `${date}T${time}+08:00` };
}

function compact(value, maxChars = 6000) {
  const text = JSON.stringify(value, null, 2);
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}\n...TRUNCATED...`;
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
      if (typeof content.text === "string") return content.text;
    }
  }
  return "";
}

function normalizePlan(parsed, now) {
  const plan = parsed && typeof parsed === "object" ? parsed : {};
  return {
    date: String(plan.date || now.date),
    generatedAt: String(plan.generatedAt || now.iso),
    model: plan.model,
    reasoning: plan.reasoning,
    marketContext: String(plan.marketContext || ""),
    candidates: Array.isArray(plan.candidates) ? plan.candidates.slice(0, 5) : [],
    validation: String(plan.validation || ""),
    risks: String(plan.risks || ""),
    nextChecks: String(plan.nextChecks || ""),
    disclaimer: String(plan.disclaimer || "本內容僅供研究與觀察，不構成投資建議。"),
    provenance: {
      source: "openai-api",
      generatedBy: "generate-v3-premarket-plan.mjs",
      requestId: plan?.provenance?.requestId ?? null,
    },
  };
}

async function main() {
  loadDotenvLocal();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  if (process.env.V3_RESEARCH_AI_ENABLED !== "true") throw new Error("V3_RESEARCH_AI_ENABLED must be true");

  const model = process.env.V3_RESEARCH_OPENAI_MODEL || "gpt-5.5";
  const reasoningEffort = process.env.V3_RESEARCH_REASONING_EFFORT || "xhigh";
  const now = twNow();

  const context = {
    dashboard: await readJson("dashboard.json"),
    news: await readJson("news.json", []),
    ideas: await readJson("ideas.json", []),
    watchlist: await readJson("watchlist.json", []),
    watchlistAiSummary: await readJson("watchlist-ai-summary.json"),
    today: await readJson("today.json", []),
    systemHealth: await readJson("system-health.json"),
  };

  const instructions = `你是嚴謹的台股交易研究分析師。請用繁體中文產生 V3 盤前/早盤交易計畫。這不是新聞摘要，也不是漲跌幅 checkpoint。

硬性要求：
- 最多挑 5 個候選標的，不必寫滿；只挑今天真的值得觀察者。
- 每個候選必須包含 ticker, name, whyToday, observableConditions, entryOrWatchTrigger, invalidation, risks, fractionalShareView。
- 重點放在判斷依據、觀察邏輯、風險與情境；不要只給結論。
- 若資料過舊或不足，要明確標示資料缺口，不可編造。
- 盤中/早盤已有 checkpoint 時，要說明價格反應是否支持、打臉或只是噪音。
- 零股觀點要保守，避免鼓勵追高。
- 輸出必須是 JSON object，不要 markdown。`;

  const input = `今日台灣時間：${now.iso}\n\n請根據以下 V3 網站資料產生正式 premarket-plan.json：\n${compact(context, 30000)}\n\nJSON schema：\n{\n  "date": "YYYY-MM-DD",\n  "generatedAt": "ISO +08:00",\n  "model": "string",\n  "reasoning": "string",\n  "marketContext": "大盤/題材/資料新鮮度與限制",\n  "candidates": [\n    {\n      "ticker": "2330.TW",\n      "name": "台積電",\n      "whyToday": "為什麼今天注意",\n      "observableConditions": "觀察條件",\n      "entryOrWatchTrigger": "進場/加碼/只觀察觸發",\n      "invalidation": "不要碰/失效條件",\n      "risks": "主要風險",\n      "fractionalShareView": "零股操作觀點"\n    }\n  ],\n  "validation": "若已有 09:05/09:30 checkpoint，說明是否支持 thesis",\n  "risks": "整體風險",\n  "nextChecks": "09:05/09:30/10:30 後續檢查重點",\n  "disclaimer": "本內容僅供研究與觀察，不構成投資建議。"\n}`;

  const body = {
    model,
    input: [{ role: "user", content: input }],
    instructions,
    text: { format: { type: "json_object" } },
    reasoning: { effort: reasoningEffort },
  };

  const started = Date.now();
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

  const data = await response.json();
  const outputText = extractOutputText(data);
  if (!outputText) throw new Error("OpenAI API returned no output text");

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch (err) {
    throw new Error(`Failed to parse model JSON: ${err.message}; output=${outputText.slice(0, 1000)}`);
  }

  const plan = normalizePlan(
    {
      ...parsed,
      model,
      reasoning: reasoningEffort,
      provenance: { requestId: data.id ?? null },
    },
    now
  );

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(plan, null, 2) + "\n", "utf8");

  const usage = data.usage ?? {};
  console.log(JSON.stringify({
    ok: true,
    file: OUT,
    model,
    reasoningEffort,
    durationMs: Date.now() - started,
    requestId: data.id ?? null,
    usage,
    candidates: plan.candidates.map((c) => c.ticker || c.name).filter(Boolean),
  }, null, 2));
}

main().catch((err) => {
  console.error("[generate-v3-premarket-plan] Fatal:", err.message);
  process.exit(1);
});
