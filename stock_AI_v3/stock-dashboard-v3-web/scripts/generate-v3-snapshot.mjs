/**
 * Phase 2A/2B: Manual static-file snapshot generator (v2)
 *
 * Usage:
 *   node scripts/generate-v3-snapshot.mjs [--date YYYY-MM-DD] [--out ./tmp/generated-v3-snapshot] [--input ./fixtures/snapshot-input.sample.json]
 *
 * - Generates a complete draft snapshot aligned with public/data/** format.
 * - Does NOT touch public/data/. Safe to run at any time.
 * - Output is always self-contained within --out directory.
 * - To validate: DATA_ROOT=<outDir> node scripts/check-static-data.mjs
 *
 * Phase 2B: --input accepts a JSON file that overrides candidates, news,
 * marketSummary, and per-ticker notes. Without --input, the original seed
 * data is used unchanged.
 *
 * Design philosophy:
 * - No external API calls. All content is hand-crafted semi-real data.
 * - Schema shape matches existing public/data samples exactly.
 * - Content quality is the focus — not automation (cron is a later step).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// --- CLI args ---
function parseArgs() {
  const args = process.argv.slice(2);
  let date = null;
  let outDir = null;
  let inputFile = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--date" && args[i + 1]) {
      date = args[++i];
    } else if (args[i] === "--out" && args[i + 1]) {
      outDir = args[++i];
    } else if (args[i] === "--input" && args[i + 1]) {
      inputFile = args[++i];
    }
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`[generate-v3-snapshot] Invalid --date format: ${date}. Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  if (!outDir) {
    outDir = path.resolve(process.cwd(), "tmp", "generated-v3-snapshot");
  } else {
    outDir = path.resolve(process.cwd(), outDir);
  }

  return { date, outDir, inputFile };
}

// --- ISO timestamp helper ---
function ts(date, time = "T09:00:00+08:00") {
  return `${date}${time}`;
}

// --- Derive ISO week string from date ---
function toISOWeek(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// --- Previous trading date (naive: subtract 1 day, skip Sat/Sun) ---
function prevTradingDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  const dow = d.getUTCDay();
  if (dow === 0) d.setUTCDate(d.getUTCDate() - 2); // Sun → Fri
  if (dow === 6) d.setUTCDate(d.getUTCDate() - 1); // Sat → Fri
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Phase 2B: Input loading and validation
// ============================================================

const VALID_ROLES = new Set(["starter", "watch", "observe", "avoid"]);
const VALID_CONFIDENCE = new Set(["high", "medium", "low"]);
const VALID_BIAS = new Set(["long", "short", "neutral"]);
const VALID_TOPICS = new Set(["earnings", "supply-chain", "macro", "product", "flow", "news", "other"]);

function validateInput(input) {
  const errors = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    errors.push("input root must be a JSON object");
    return errors;
  }

  if (input.date !== undefined) {
    if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      errors.push(`date must be YYYY-MM-DD (got: ${input.date})`);
    }
  }

  if (input.marketSummary !== undefined) {
    const ms = input.marketSummary;
    if (typeof ms !== "object" || Array.isArray(ms) || ms === null) {
      errors.push("marketSummary must be an object");
    } else {
      if (typeof ms.headline !== "string" || ms.headline.trim().length === 0) {
        errors.push("marketSummary.headline is required and must be a non-empty string");
      }
      if (ms.bias !== undefined && !VALID_BIAS.has(ms.bias)) {
        errors.push(`marketSummary.bias must be one of: long, short, neutral (got: ${ms.bias})`);
      }
      if (ms.confidence !== undefined && !VALID_CONFIDENCE.has(ms.confidence)) {
        errors.push(`marketSummary.confidence must be one of: high, medium, low (got: ${ms.confidence})`);
      }
    }
  }

  if (input.candidates !== undefined) {
    if (!Array.isArray(input.candidates)) {
      errors.push("candidates must be an array");
    } else {
      if (input.candidates.length > 5) {
        errors.push(`candidates must not exceed 5 items (got: ${input.candidates.length})`);
      }
      input.candidates.forEach((c, i) => {
        const p = `candidates[${i}]`;
        if (typeof c.ticker !== "string" || c.ticker.trim().length === 0) {
          errors.push(`${p}.ticker is required and must be a non-empty string`);
        }
        if (typeof c.name !== "string" || c.name.trim().length === 0) {
          errors.push(`${p}.name is required and must be a non-empty string`);
        }
        if (!VALID_ROLES.has(c.role)) {
          errors.push(`${p}.role must be one of: starter, watch, observe, avoid (got: ${c.role})`);
        }
        if (typeof c.summary !== "string" || c.summary.trim().length === 0) {
          errors.push(`${p}.summary is required and must be a non-empty string`);
        }
        if (typeof c.whySelected !== "string" || c.whySelected.trim().length === 0) {
          errors.push(`${p}.whySelected is required and must be a non-empty string`);
        }
        if (typeof c.trigger !== "string" || c.trigger.trim().length === 0) {
          errors.push(`${p}.trigger is required and must be a non-empty string`);
        }
        if (typeof c.invalidation !== "string" || c.invalidation.trim().length === 0) {
          errors.push(`${p}.invalidation is required and must be a non-empty string`);
        }
        if (typeof c.risk !== "string" || c.risk.trim().length === 0) {
          errors.push(`${p}.risk is required and must be a non-empty string`);
        }
        if (c.confidence !== undefined && !VALID_CONFIDENCE.has(c.confidence)) {
          errors.push(`${p}.confidence must be one of: high, medium, low (got: ${c.confidence})`);
        }
      });
    }
  }

  if (input.news !== undefined) {
    if (!Array.isArray(input.news)) {
      errors.push("news must be an array");
    } else {
      input.news.forEach((n, i) => {
        const p = `news[${i}]`;
        if (typeof n.id !== "string" || n.id.trim().length === 0) {
          errors.push(`${p}.id is required and must be a non-empty string`);
        }
        if (typeof n.title !== "string" || n.title.trim().length === 0) {
          errors.push(`${p}.title is required and must be a non-empty string`);
        }
        if (typeof n.source !== "string" || n.source.trim().length === 0) {
          errors.push(`${p}.source is required and must be a non-empty string`);
        }
        if (typeof n.oneLineSummary !== "string" || n.oneLineSummary.trim().length === 0) {
          errors.push(`${p}.oneLineSummary is required and must be a non-empty string`);
        }
        if (typeof n.whyItMatters !== "string" || n.whyItMatters.trim().length === 0) {
          errors.push(`${p}.whyItMatters is required and must be a non-empty string`);
        }
        if (n.importanceScore !== undefined) {
          if (typeof n.importanceScore !== "number" || n.importanceScore < 0 || n.importanceScore > 1) {
            errors.push(`${p}.importanceScore must be a number between 0 and 1`);
          }
        }
        if (n.noiseScore !== undefined) {
          if (typeof n.noiseScore !== "number" || n.noiseScore < 0 || n.noiseScore > 1) {
            errors.push(`${p}.noiseScore must be a number between 0 and 1`);
          }
        }
        if (n.topic !== undefined && !VALID_TOPICS.has(n.topic)) {
          errors.push(`${p}.topic must be one of: ${[...VALID_TOPICS].join(", ")} (got: ${n.topic})`);
        }
      });
    }
  }

  if (input.notes !== undefined) {
    if (typeof input.notes !== "object" || Array.isArray(input.notes) || input.notes === null) {
      errors.push("notes must be an object keyed by ticker");
    } else {
      for (const [ticker, note] of Object.entries(input.notes)) {
        const p = `notes.${ticker}`;
        if (typeof note !== "object" || Array.isArray(note) || note === null) {
          errors.push(`${p} must be an object`);
          continue;
        }
        if (note.bias !== undefined && !VALID_BIAS.has(note.bias)) {
          errors.push(`${p}.bias must be one of: long, short, neutral (got: ${note.bias})`);
        }
        if (note.confidence !== undefined && !VALID_CONFIDENCE.has(note.confidence)) {
          errors.push(`${p}.confidence must be one of: high, medium, low (got: ${note.confidence})`);
        }
      }
    }
  }

  if (input.reports !== undefined) {
    if (typeof input.reports !== "object" || Array.isArray(input.reports) || input.reports === null) {
      errors.push("reports must be an object");
    } else {
      if (input.reports.closeSummary !== undefined && (typeof input.reports.closeSummary !== "string" || input.reports.closeSummary.trim().length === 0)) {
        errors.push("reports.closeSummary must be a non-empty string if present");
      }
      if (input.reports.weeklySummary !== undefined && (typeof input.reports.weeklySummary !== "string" || input.reports.weeklySummary.trim().length === 0)) {
        errors.push("reports.weeklySummary must be a non-empty string if present");
      }
    }
  }

  return errors;
}

async function loadAndValidateInput(inputFile) {
  if (!inputFile) return null;

  const absPath = path.resolve(process.cwd(), inputFile);
  let raw;
  try {
    raw = await readFile(absPath, "utf8");
  } catch (err) {
    console.error(`[generate-v3-snapshot] Cannot read input file: ${absPath}`);
    console.error(`  ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch (err) {
    console.error(`[generate-v3-snapshot] Input file is not valid JSON: ${absPath}`);
    console.error(`  ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const errors = validateInput(input);
  if (errors.length > 0) {
    console.error(`[generate-v3-snapshot] Input validation failed (${errors.length} error(s)):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`[generate-v3-snapshot] input loaded from ${path.relative(process.cwd(), absPath)}`);
  return input;
}

// ============================================================
// Content builders — semi-real Taiwan stock data for 2026-05
// ============================================================

// Top 5 watchlist candidates for Phase 2A seed
const WATCHLIST_POOL = [
  {
    id: "w-001",
    ticker: "2330.TW",
    name: "台積電",
    kind: "stock",
    market: "TW",
    sector: "半導體",
    industry: "晶圓代工",
    tags: ["核心", "AI", "半導體"],
    addedAt: "2025-12-01T00:00:00+08:00",
    latestStatus: "AI 需求結構性多頭，N3/N2 滿載，持續作為主線觀察核心。",
    latestStatusLevel: "ok",
  },
  {
    id: "w-002",
    ticker: "2454.TW",
    name: "聯發科",
    kind: "stock",
    market: "TW",
    sector: "半導體",
    industry: "IC 設計",
    tags: ["AI", "半導體", "手機"],
    addedAt: "2026-01-15T00:00:00+08:00",
    latestStatus: "手機+AI邊緣推論受惠，關注 Q2 庫存去化進度。",
    latestStatusLevel: "watch",
  },
  {
    id: "w-003",
    ticker: "2317.TW",
    name: "鴻海",
    kind: "stock",
    market: "TW",
    sector: "電子製造",
    industry: "EMS / AI Server",
    tags: ["AI Server", "電子製造"],
    addedAt: "2026-02-01T00:00:00+08:00",
    latestStatus: "AI 伺服器組裝受惠，但估值彈性有限，留意法說後指引。",
    latestStatusLevel: "watch",
  },
  {
    id: "w-004",
    ticker: "00919.TW",
    name: "群益台灣精選高息",
    kind: "etf",
    market: "TW",
    sector: "ETF",
    industry: "高息型 ETF",
    tags: ["高息", "ETF", "防禦"],
    addedAt: "2026-03-01T00:00:00+08:00",
    latestStatus: "市場震盪時穩定配息功能，作為組合防禦衛星。",
    latestStatusLevel: "ok",
  },
  {
    id: "w-005",
    ticker: "3034.TW",
    name: "聯詠",
    kind: "stock",
    market: "TW",
    sector: "半導體",
    industry: "IC 設計（驅動 IC）",
    tags: ["半導體", "面板", "驅動IC"],
    addedAt: "2026-04-01T00:00:00+08:00",
    latestStatus: "驅動 IC 景氣底部，等待回補訂單確認信號。",
    latestStatusLevel: "observe",
  },
];

function buildWatchlist(date, input) {
  const ideasTickers = new Set(
    input?.candidates
      ? input.candidates.map((c) => c.ticker)
      : ["2330.TW", "2454.TW"]
  );
  return WATCHLIST_POOL.map((w) => ({
    ...w,
    inIdeasToday: ideasTickers.has(w.ticker),
    recentNewsCount: w.ticker === "2330.TW" ? 3 : w.ticker === "2454.TW" ? 2 : 1,
    lastUpdated: ts(date, "T09:00:00+08:00"),
  }));
}

function buildWatchlistScans(date) {
  return [
    {
      id: "scan-001",
      label: "MA20 站上",
      description: "個股站回 MA20 且近三日量均溫.",
      matchedTickers: ["2330.TW", "2454.TW"],
      asOf: ts(date, "T09:00:00+08:00"),
    },
    {
      id: "scan-002",
      label: "法人買超連續 3 日",
      description: "三大法人連續買超超過三個交易日。",
      matchedTickers: ["2330.TW"],
      asOf: ts(date, "T09:00:00+08:00"),
    },
    {
      id: "scan-003",
      label: "ETF 高息觀察",
      description: "高息 ETF 填息動能與淨申購趨勢。",
      matchedTickers: ["00919.TW"],
      asOf: ts(date, "T09:00:00+08:00"),
    },
  ];
}

function buildWatchlistAiSummary(date) {
  return {
    text: `截至 ${date}，自選股 5 檔。主軸仍圍繞 AI/半導體（2330、2454），AI Server 衛星倉（2317），防禦型 ETF（00919），以及等待景氣反轉訊號的驅動 IC（3034）。當前市場若廣度回升，半導體鏈可適度加碼；若指數強但廣度弱，維持當前配置，不擴倉。`,
    asOf: ts(date, "T09:00:00+08:00"),
  };
}

// Seed ideas (used when no input.candidates)
const SEED_IDEAS = [
  {
    id: "c-001",
    ticker: "2330.TW",
    name: "台積電",
    kind: "stock",
    role: "starter",
    summary: "AI 訓練/推論需求穩健，N3 滿載延伸至 2026 全年，法說指引上修後仍有延續動能。",
    whySelected: "台股核心權值 + AI 主線代表，最適合作為大盤強弱的同步驗證標的。外資籌碼近期偏向淨買，短線壓力在 1100 附近。",
    trigger: "回測 MA20（約 1050）不破且外資當日轉買，或突破前高 1110 量帶量。",
    invalidation: "跌破 MA60（約 985）且連續兩日量縮，或外資連續三日賣超超過 1 萬張。",
    risk: "美對中半導體出口限制擴大、AI capex 縮減傳言、地緣風險急升溫、高檔技術性修正。",
    themes: ["AI", "半導體"],
    relatedNewsIds: ["n-001", "n-002"],
    confidence: "high",
    hasNews: true,
  },
  {
    id: "c-002",
    ticker: "2454.TW",
    name: "聯發科",
    kind: "stock",
    role: "watch",
    summary: "AI 邊緣推論晶片需求浮現，旗艦手機進入新週期，但庫存去化仍需時間確認。",
    whySelected: "手機 + AI 邊緣計算雙線受惠，若庫存去化確認，Q3 進入補庫週期機率上升。估值相對 TSMC 折價，但彈性空間較大。",
    trigger: "月線上揚且 Q2 法說確認庫存回到健康水位，或 800 附近有量縮整理訊號。",
    invalidation: "跌破 750（MA200 以下）或法說下修 Q2 guidance。",
    risk: "高端手機需求不如預期、競爭對手 Qualcomm 搶單、庫存去化較慢。",
    themes: ["AI", "半導體", "手機"],
    relatedNewsIds: ["n-003"],
    confidence: "medium",
    hasNews: true,
  },
];

function buildIdeas(date, input) {
  if (input?.candidates && input.candidates.length > 0) {
    const allNewsIds = (input.news ?? []).map((n) => n.id);
    return input.candidates.map((c, i) => {
      const poolEntry = WATCHLIST_POOL.find((w) => w.ticker === c.ticker);
      const relatedNewsIds = c.relatedNewsIds ?? allNewsIds.filter((id) => {
        const n = (input.news ?? []).find((item) => item.id === id);
        return n?.relatedSymbols?.includes(c.ticker) ?? false;
      });
      return {
        id: c.id ?? `c-${String(i + 1).padStart(3, "0")}`,
        ticker: c.ticker,
        name: c.name,
        kind: c.kind ?? poolEntry?.kind ?? "stock",
        role: c.role,
        summary: c.summary,
        whySelected: c.whySelected,
        trigger: c.trigger,
        invalidation: c.invalidation,
        risk: c.risk,
        themes: c.themes ?? [],
        relatedNewsIds,
        confidence: c.confidence ?? "medium",
        hasNews: relatedNewsIds.length > 0,
        asOf: ts(date, "T09:00:00+08:00"),
        ...(c.evidence !== undefined ? { evidence: c.evidence } : {}),
      };
    });
  }
  return SEED_IDEAS.map((idea) => ({ ...idea, asOf: ts(date, "T09:00:00+08:00") }));
}

// Seed news (used when no input.news)
const SEED_NEWS_ITEMS = [
  {
    id: "n-001",
    title: "台積電 5 月營收持續年增，N3/N2 量產進度優於預期",
    source: "工商時報",
    oneLineSummary: "TSMC 5 月月營收年增率維持雙位數，N3 良率持續改善，N2 量產準備進入倒數。",
    whyItMatters: "月營收年增代表 AI 需求持續落地，並非只有股價情緒，可作為 AI 主線真實性驗證依據。",
    impactType: "symbol",
    impactScope: ["semiconductor"],
    relatedSymbols: ["2330.TW"],
    relatedThemes: ["AI", "半導體"],
    importanceScore: 0.91,
    noiseScore: 0.06,
    topic: "earnings",
    url: "https://mops.twse.com.tw",
    mode: "curated",
    isLowSignal: false,
  },
  {
    id: "n-002",
    title: "輝達 Blackwell GB200 出貨量上修，台灣 AI Server 供應鏈受惠",
    source: "電子時報",
    oneLineSummary: "NVIDIA 上修 GB200 出貨量，鴻海、廣達等組裝大廠訂單能見度延伸至 2026Q4。",
    whyItMatters: "供應鏈訂單能見度明確延伸代表 AI Server 週期比想像中長，支持 2317 等標的的基本面敘事。",
    impactType: "sector",
    impactScope: ["ai-server", "ems"],
    relatedSymbols: ["2317.TW"],
    relatedThemes: ["AI Server", "AI"],
    importanceScore: 0.84,
    noiseScore: 0.10,
    topic: "supply-chain",
    url: "https://www.digitimes.com.tw",
    mode: "curated",
    isLowSignal: false,
  },
  {
    id: "n-003",
    title: "聯發科 Dimensity 9400 旗艦訂單穩健，AI on-device 推論晶片出貨加溫",
    source: "Digitimes",
    oneLineSummary: "D9400 手機訂單能見度至 Q3，AI 推論功能成為旗艦手機差異化關鍵。",
    whyItMatters: "手機 + AI 邊緣推論雙線並進，支持 2454 的 watch 評級；若後續訂單確認進一步延伸，可上調至 starter。",
    impactType: "symbol",
    impactScope: ["semiconductor", "mobile"],
    relatedSymbols: ["2454.TW"],
    relatedThemes: ["AI", "半導體", "手機"],
    importanceScore: 0.78,
    noiseScore: 0.15,
    topic: "product",
    url: "https://www.digitimes.com.tw",
    mode: "curated",
    isLowSignal: false,
  },
  {
    id: "n-004",
    title: "台股本週法人動向：外資連續買超半導體，融資餘額回升",
    source: "台灣證交所",
    oneLineSummary: "外資本週累計買超台股逾 200 億，集中在半導體族群，融資餘額小幅回升表示散戶信心恢復。",
    whyItMatters: "法人動向是判斷市場廣度的重要指標；外資若集中買權值，需持續觀察中小型股是否同步，避免只有指數漂亮。",
    impactType: "market",
    impactScope: ["market-breadth"],
    relatedSymbols: ["2330.TW", "2454.TW"],
    relatedThemes: ["半導體"],
    importanceScore: 0.72,
    noiseScore: 0.20,
    topic: "flow",
    url: "https://www.twse.com.tw",
    mode: "curated",
    isLowSignal: false,
  },
  {
    id: "n-005",
    title: "美聯準會官員暗示年內仍有降息空間，美元指數小幅回落",
    source: "Reuters",
    oneLineSummary: "Fed 官員鴿派發言，美元指數微跌，對台股外資流入有短線利多效果。",
    whyItMatters: "降息預期若強化，外資傾向增加新興市場配置；對台股籌碼結構屬於邊際利多，但非主線驅動。",
    impactType: "macro",
    impactScope: ["macro", "rates"],
    relatedSymbols: [],
    relatedThemes: [],
    importanceScore: 0.65,
    noiseScore: 0.30,
    topic: "macro",
    url: "https://www.reuters.com",
    mode: "curated",
    isLowSignal: false,
  },
];

function buildNews(date, input) {
  if (input?.news && input.news.length > 0) {
    return input.news.map((n) => ({
      id: n.id,
      title: n.title,
      source: n.source,
      publishedAt: n.publishedAt ?? ts(date, "T08:00:00+08:00"),
      oneLineSummary: n.oneLineSummary,
      whyItMatters: n.whyItMatters,
      impactType: n.impactType ?? "market",
      impactScope: n.impactScope ?? [],
      relatedSymbols: n.relatedSymbols ?? [],
      relatedThemes: n.relatedThemes ?? [],
      importanceScore: n.importanceScore ?? 0.70,
      noiseScore: n.noiseScore ?? 0.20,
      topic: n.topic ?? "other",
      url: n.url ?? "",
      mode: "curated",
      isLowSignal: n.isLowSignal ?? false,
    }));
  }
  return SEED_NEWS_ITEMS.map((n) => ({
    ...n,
    publishedAt: ts(date, n.id === "n-001" ? "T08:30:00+08:00" : n.id === "n-002" ? "T08:00:00+08:00" : n.id === "n-003" ? "T07:00:00+08:00" : n.id === "n-004" ? "T07:30:00+08:00" : "T06:00:00+08:00"),
  }));
}

function buildThemes(date) {
  return [
    {
      id: "th-001",
      theme: "AI",
      description: "AI 訓練/推論需求帶動的 GPU、HBM、先進製程、AI Server 整體供應鏈主題。",
      momentum: "rising",
      relatedSymbols: ["2330.TW", "2454.TW", "2317.TW"],
      relatedNewsIds: ["n-001", "n-002"],
      asOf: ts(date, "T09:00:00+08:00"),
    },
    {
      id: "th-002",
      theme: "半導體",
      description: "先進製程、IC 設計、設備材料相關主題，包含 TSMC / MediaTek / Novatek 等。",
      momentum: "rising",
      relatedSymbols: ["2330.TW", "2454.TW", "3034.TW"],
      relatedNewsIds: ["n-001", "n-003"],
      asOf: ts(date, "T09:00:00+08:00"),
    },
    {
      id: "th-003",
      theme: "AI Server",
      description: "AI 伺服器組裝、機櫃散熱、電源供應相關主題。",
      momentum: "stable",
      relatedSymbols: ["2317.TW"],
      relatedNewsIds: ["n-002"],
      asOf: ts(date, "T09:00:00+08:00"),
    },
    {
      id: "th-004",
      theme: "高息防禦",
      description: "高殖利率 ETF 與配息型標的，震盪市場下的資金避風港。",
      momentum: "stable",
      relatedSymbols: ["00919.TW"],
      relatedNewsIds: [],
      asOf: ts(date, "T09:00:00+08:00"),
    },
  ];
}

function buildToday(date) {
  return [
    {
      id: "cp-pre",
      kind: "pre",
      title: "盤前 Checkpoint",
      timestamp: ts(date, "T08:30:00+08:00"),
      status: "ok",
      summary: "美股週五收漲，費城半導體指數 +1.2%；ADR 方面台積電 ADR 上漲 0.8%，整體盤前情緒偏多。法人動向上外資延續買超態勢，盤前情境屬於穩健偏多。",
      confidence: "high",
      whatChanged: "美股半導體收強，提升盤前開高機率；外資動向尚待開盤確認。",
      trigger: "台積電開高不破 MA20（1050），且中型半導體族群同步跟漲。",
      invalidation: "若只有指數開高但中小型未跟，或外資當日轉賣超，降低信心評級。",
      linkedSymbols: ["2330.TW", "2454.TW"],
      linkedNewsIds: ["n-001", "n-004"],
    },
  ];
}

function buildDashboard(date, input, ideas, newsItems) {
  const week = toISOWeek(date);
  const prevDate = prevTradingDate(date);
  const ms = input?.marketSummary;

  const topIdeasTickers = ideas.map((c) => c.ticker);
  const topNewsIds = newsItems.slice(0, 3).map((n) => n.id);

  return {
    asOf: ts(date, "T09:00:00+08:00"),
    marketSession: {
      market: "TW",
      phase: "pre",
      isOpen: false,
      asOf: ts(date, "T09:00:00+08:00"),
      note: input ? "Phase 2B generated snapshot — driven by input file" : "Phase 2A generated snapshot — pre-market placeholder",
    },
    indices: [
      {
        ticker: "TWII",
        name: "台股加權",
        last: 22150.0,
        changePct: 0.0,
        asOf: ts(date, "T09:00:00+08:00"),
      },
      {
        ticker: "TPEX",
        name: "櫃買指數",
        last: 258.5,
        changePct: 0.0,
        asOf: ts(date, "T09:00:00+08:00"),
      },
    ],
    driver: {
      id: `driver-${date}`,
      headline: ms?.headline ?? "AI 需求線索持續落地，半導體供應鏈訂單能見度延長至 2026 下半年。",
      detail: ms?.detail ?? "TSMC N3 月營收年增雙位數確認、鴻海 GB200 組裝訂單上修、聯發科 AI 邊緣推論晶片需求浮現，三條線索共同支撐半導體主線。外資法人動向需持續觀察是否真的帶動廣度，或只停留在指數權值股層面。",
      bias: ms?.bias ?? "long",
      themes: ms?.themes ?? ["AI", "半導體", "AI Server"],
      relatedSymbols: topIdeasTickers.slice(0, 3),
      relatedNewsIds: topNewsIds,
      confidence: ms?.confidence ?? "medium",
      asOf: ts(date, "T09:00:00+08:00"),
    },
    topIdeas: ideas.slice(0, 2),
    watchlistDeltas: WATCHLIST_POOL.slice(0, 3).map((w) => ({
      id: w.id,
      ticker: w.ticker,
      name: w.name,
      kind: w.kind,
      market: w.market,
      tags: w.tags,
      addedAt: w.addedAt,
      latestStatus: w.latestStatus,
      latestStatusLevel: w.latestStatusLevel,
      inIdeasToday: topIdeasTickers.includes(w.ticker),
      recentNewsCount: w.ticker === "2330.TW" ? 3 : w.ticker === "2454.TW" ? 2 : 1,
      lastUpdated: ts(date, "T09:00:00+08:00"),
    })),
    topNews: newsItems.slice(0, 3),
    todayCheckpoints: buildToday(date),
    recentReports: [
      {
        id: `close-${prevDate}`,
        kind: "close",
        label: `Close Review ${prevDate}`,
        href: `/reports/close/${prevDate}`,
        asOf: ts(prevDate, "T14:00:00+08:00"),
      },
      {
        id: `weekly-${week}`,
        kind: "weekly",
        label: `Weekly ${week}`,
        href: `/reports/weekly/${week}`,
        asOf: ts(date, "T09:00:00+08:00"),
      },
    ],
    systemSummary: {
      status: "ok",
      lastPublishedAt: ts(date, "T09:00:00+08:00"),
      warningCount: 0,
    },
  };
}

function buildSystemHealth(date, outDir, input) {
  const inputLabel = input ? " (input-driven)" : "-phase2a";
  return {
    asOf: ts(date, "T09:00:00+08:00"),
    currentRun: {
      id: `run-${date}${inputLabel}`,
      name: input ? "generate-v3-snapshot-phase2b" : "generate-v3-snapshot-phase2a",
      status: "ok",
      startedAt: ts(date, "T09:00:00+08:00"),
      finishedAt: ts(date, "T09:01:00+08:00"),
      durationMs: 60000,
      message: input
        ? `Phase 2B input-driven snapshot generated into ${outDir}`
        : `Phase 2A manual snapshot generated into ${outDir}`,
    },
    lastSuccessfulPublishAt: ts(date, "T09:01:00+08:00"),
    dataFreshness: [
      { feed: "static-dashboard", lastUpdated: ts(date, "T09:00:00+08:00"), status: "fresh" },
      { feed: "static-watchlist", lastUpdated: ts(date, "T09:00:00+08:00"), status: "fresh" },
      { feed: "static-ideas", lastUpdated: ts(date, "T09:00:00+08:00"), status: "fresh" },
      { feed: "static-news", lastUpdated: ts(date, "T09:00:00+08:00"), status: "fresh" },
      { feed: "static-themes", lastUpdated: ts(date, "T09:00:00+08:00"), status: "fresh" },
      { feed: "static-today", lastUpdated: ts(date, "T09:00:00+08:00"), status: "fresh" },
      { feed: "static-symbols", lastUpdated: ts(date, "T09:00:00+08:00"), status: "fresh" },
      { feed: "static-reports", lastUpdated: ts(date, "T09:00:00+08:00"), status: "fresh" },
    ],
    warnings: input
      ? [
          "Phase 2B input-driven snapshot — candidates and news from input file.",
          "Symbol data is semi-real placeholder, not live market data.",
        ]
      : [
          "Phase 2A draft snapshot — manually generated, not scheduled.",
          "Symbol data is semi-real placeholder, not live market data.",
        ],
    staleData: [],
    missingData: [],
    routes: [
      { path: "/dashboard", adapter: "DashboardAdapter", mode: "static-file", status: "ok" },
      { path: "/watchlist", adapter: "WatchlistAdapter", mode: "static-file", status: "ok" },
      { path: "/ideas", adapter: "IdeasAdapter", mode: "static-file", status: "ok" },
      { path: "/news", adapter: "NewsAdapter", mode: "static-file", status: "ok" },
      { path: "/today", adapter: "TimelineAdapter", mode: "static-file", status: "ok" },
      { path: "/symbols", adapter: "SymbolAdapter", mode: "static-file", status: "ok" },
      { path: "/reports/close/[date]", adapter: "ReportsAdapter", mode: "static-file", status: "ok" },
      { path: "/reports/weekly/[week]", adapter: "ReportsAdapter", mode: "static-file", status: "ok" },
      { path: "/system/health", adapter: "SystemAdapter", mode: "static-file", status: "ok" },
      { path: "(api adapter not implemented)", adapter: "*", mode: "api", status: "stub", note: "Reserved for backend integration." },
    ],
    modes: {
      dataMode: "static-file",
      aiMode: "published",
      newsMode: "curated",
      chartMode: "tradingview",
    },
  };
}

function buildSymbolIndex(input) {
  const poolEntries = WATCHLIST_POOL.map((w) => ({
    ticker: w.ticker,
    name: w.name,
    kind: w.kind,
    market: w.market,
    sector: w.sector,
    industry: w.industry,
    tags: w.tags,
    oneLineSummary: getOneLineSummary(w.ticker),
    externalLinks: buildExternalLinks(w.ticker, w.kind),
  }));

  if (!input?.candidates) return poolEntries;

  const poolTickers = new Set(WATCHLIST_POOL.map((w) => w.ticker));
  const unknownEntries = input.candidates
    .filter((c) => !poolTickers.has(c.ticker))
    .map((c) => ({
      ticker: c.ticker,
      name: c.name,
      kind: c.kind ?? "stock",
      market: "TW",
      sector: "placeholder",
      industry: "placeholder",
      tags: c.themes ?? [],
      oneLineSummary: c.summary,
      externalLinks: buildExternalLinks(c.ticker, c.kind ?? "stock"),
      _dataNote: "Unknown ticker — not in seed pool. Listed from input candidates only.",
    }));

  return [...poolEntries, ...unknownEntries];
}

function getOneLineSummary(ticker) {
  const map = {
    "2330.TW": "全球最大晶圓代工廠，AI 浪潮核心受惠者，N3/N2 量產進度領先同業。",
    "2454.TW": "全球第二大 IC 設計廠，手機+AI邊緣推論雙線布局，等待補庫週期確認。",
    "2317.TW": "全球最大電子代工廠，AI 伺服器組裝訂單能見度延伸至 2026H2。",
    "00919.TW": "高息型 ETF，聚焦配息穩定的台股精選成分股，作為組合防禦衛星倉位。",
    "3034.TW": "驅動 IC 設計大廠，景氣底部等待面板回補訂單，估值相對便宜。",
  };
  return map[ticker] || "";
}

function buildExternalLinks(ticker, kind) {
  const links = [];
  if (kind !== "etf") {
    const id = ticker.replace(".TW", "");
    links.push({
      label: "TradingView",
      url: `https://www.tradingview.com/symbols/TPE-${id}/`,
      kind: "tradingview",
    });
    links.push({
      label: "MOPS 公開資訊",
      url: `https://mops.twse.com.tw/mops/web/t05st01?TYPEK=sii&co_id=${id}`,
      kind: "mops",
    });
  } else {
    links.push({
      label: "TradingView",
      url: `https://www.tradingview.com/symbols/TWSE-${ticker.replace(".TW", "")}/`,
      kind: "tradingview",
    });
  }
  return links;
}

// Symbol-level files
const SYMBOL_DATA = {
  "2330.TW": {
    last: 1095, changePct: 0.8, rangeDay: [1082, 1102], range52w: [720, 1110],
    volume: 28500000, marketCap: 28380000000000,
    pe: 23.1, pb: 6.6, dividendYield: 1.4, epsTtm: 47.4, revenueGrowthYoy: 20.1,
    trend: "up", rsi14: 61.5, ma20: 1055, ma60: 990, ma200: 885,
    support: [1055, 1020, 985], resistance: [1110, 1140],
    patterns: ["上升通道", "MA20 守住", "週線多頭排列"],
    technicalNotes: "短線 RSI 接近超買區，但中期趨勢完整，建議回測 MA20 後觀察。",
    thesis: "AI 訓練/推論需求 + N3/N2 滿載，仍為長線多頭主軸。5 月月營收年增雙位數確認需求落地，非僅情緒炒作。",
    whySelected: "月營收年增持續、法人持續淨買、N2 量產倒數確認供給端新週期啟動。",
    trigger: "回測 MA20（1055）不破 + 外資當日轉買；或突破 1110 量帶量確認。",
    invalidation: "跌破 MA60（990）且連兩日量縮，或外資連三日賣超超過 1 萬張。",
    riskScenarios: ["美對中半導體出口限制進一步擴大", "AI capex 縮減高於預期", "地緣風險急升溫", "高檔技術性修正加深"],
    bias: "long", confidence: "high",
    evidence: [{ label: "TSMC 月營收公告", url: "https://www.tsmc.com/chinese/investorRelations/monthly_revenue", kind: "revenue" }],
    revenueMonthly: [
      { month: "2026-04", revenue: 298000000000, yoy: 20.1 },
      { month: "2026-03", revenue: 285000000000, yoy: 16.4 },
      { month: "2026-02", revenue: 250000000000, yoy: 14.2 },
    ],
  },
  "2454.TW": {
    last: 812, changePct: 0.5, rangeDay: [805, 820], range52w: [680, 940],
    volume: 12300000, marketCap: 4290000000000,
    pe: 18.4, pb: 3.8, dividendYield: 2.1, epsTtm: 44.1, revenueGrowthYoy: 8.3,
    trend: "sideways", rsi14: 54.2, ma20: 806, ma60: 788, ma200: 756,
    support: [800, 780, 755], resistance: [840, 870],
    patterns: ["橫盤整理", "MA20/MA60 均線收斂"],
    technicalNotes: "均線收斂整理，等待方向確認；量縮整理後若放量突破 840，可視為趨勢確認。",
    thesis: "D9400 手機訂單穩健 + AI 邊緣推論晶片需求浮現，但庫存去化進度是關鍵變數。",
    whySelected: "估值相對 TSMC 折價，若 Q2 法說確認庫存正常化，補漲空間比 TSMC 更明顯。",
    trigger: "法說確認庫存健康 + 800 附近量縮整理後放量突破 840。",
    invalidation: "跌破 755（MA200）或 Q2 法說下修全年 guidance。",
    riskScenarios: ["庫存去化速度低於預期", "高端手機需求疲軟", "Qualcomm 搶單", "中國市場份額流失"],
    bias: "neutral", confidence: "medium",
    evidence: [{ label: "聯發科 Q1 法說摘要", url: "https://www.mediatek.com/investor-relations", kind: "report" }],
    revenueMonthly: [
      { month: "2026-04", revenue: 48500000000, yoy: 8.3 },
      { month: "2026-03", revenue: 45200000000, yoy: 6.1 },
      { month: "2026-02", revenue: 40100000000, yoy: 4.5 },
    ],
  },
  "2317.TW": {
    last: 185, changePct: 0.3, rangeDay: [183, 187], range52w: [152, 212],
    volume: 45600000, marketCap: 2580000000000,
    pe: 12.3, pb: 1.5, dividendYield: 3.2, epsTtm: 15.0, revenueGrowthYoy: 12.5,
    trend: "up", rsi14: 57.8, ma20: 182, ma60: 174, ma200: 168,
    support: [180, 172, 165], resistance: [192, 200],
    patterns: ["MA20 站上", "季線偏多"],
    technicalNotes: "短期趨勢偏多但估值彈性有限，適合觀察而非積極追高。",
    thesis: "AI Server 組裝訂單能見度延伸，GB200 機櫃需求帶動，但評級偏向 watch/觀察。",
    whySelected: "AI Server 訂單能見度具體，但估值已反映部分利多，需等回測確認。",
    trigger: "回測 MA20（182）守住 + 外資買超明確轉積極。",
    invalidation: "跌破 MA60（174）或 AI Server 訂單消息轉負。",
    riskScenarios: ["AI Server 交期延遲", "地緣政治影響供應鏈", "毛利率不如預期"],
    bias: "neutral", confidence: "medium",
    evidence: [{ label: "DIGITIMES AI Server 報告", url: "https://www.digitimes.com.tw", kind: "report" }],
    revenueMonthly: [
      { month: "2026-04", revenue: 578000000000, yoy: 12.5 },
      { month: "2026-03", revenue: 542000000000, yoy: 10.2 },
    ],
  },
  "00919.TW": {
    last: 22.5, changePct: 0.0, rangeDay: [22.3, 22.6], range52w: [19.8, 24.1],
    volume: 3200000, marketCap: 85000000000,
    pe: null, pb: null, dividendYield: 5.8, epsTtm: null, revenueGrowthYoy: null,
    trend: "sideways", rsi14: 52.0, ma20: 22.4, ma60: 22.1, ma200: 21.5,
    support: [22.0, 21.5], resistance: [23.0, 23.5],
    patterns: ["橫盤震盪", "配息週期穩定"],
    technicalNotes: "ETF 殖利率 5.8% 支撐，適合做為組合防禦倉位，不宜追高。",
    thesis: "高息 ETF 作為組合防禦衛星，在市場震盪時提供穩定配息收益，降低整體波動。",
    whySelected: "市場廣度不明確時，用 ETF 平衡組合，避免過度集中在成長股。",
    trigger: "市場整體修正 > 5% 時，相對強度優於大盤即持有。",
    invalidation: "配息政策改變或淨申購轉為淨贖回。",
    riskScenarios: ["利率上升壓縮高息ETF吸引力", "成分股配息削減"],
    bias: "neutral", confidence: "medium",
    evidence: [],
    revenueMonthly: [],
  },
  "3034.TW": {
    last: 348, changePct: -0.3, rangeDay: [345, 352], range52w: [298, 495],
    volume: 2800000, marketCap: 425000000000,
    pe: 15.2, pb: 2.4, dividendYield: 3.5, epsTtm: 22.9, revenueGrowthYoy: -5.2,
    trend: "down", rsi14: 44.8, ma20: 355, ma60: 372, ma200: 410,
    support: [338, 320, 300], resistance: [360, 375],
    patterns: ["下降趨勢", "RSI 接近超賣區"],
    technicalNotes: "仍在下降趨勢中，需等待底部確認訊號（量縮後放量＋RSI 背離），否則只是觀察。",
    thesis: "驅動 IC 景氣底部，等待面板客戶補庫訂單確認，估值已到合理低點但趨勢尚未翻轉。",
    whySelected: "景氣循環型標的，底部佈局機會若訊號確認，補漲幅度可觀。",
    trigger: "月線 RSI 接近超賣區（<35）且出現量縮後放量，或面板廠明確補庫消息。",
    invalidation: "跌破 320 且無基本面改善跡象。",
    riskScenarios: ["面板價格持續疲軟", "客戶庫存消化更慢", "中國競爭加劇"],
    bias: "neutral", confidence: "low",
    evidence: [],
    revenueMonthly: [
      { month: "2026-04", revenue: 6800000000, yoy: -5.2 },
      { month: "2026-03", revenue: 7200000000, yoy: -2.1 },
    ],
  },
};

function buildSymbolFiles(ticker, date, newsItems, input) {
  const d = SYMBOL_DATA[ticker];
  const pool = WATCHLIST_POOL.find((w) => w.ticker === ticker);
  if (!d || !pool) return null;

  const profile = {
    ticker,
    name: pool.name,
    kind: pool.kind,
    market: pool.market,
    sector: pool.sector,
    industry: pool.industry,
    tags: pool.tags,
    oneLineSummary: getOneLineSummary(ticker),
    externalLinks: buildExternalLinks(ticker, pool.kind),
  };

  const overview = {
    ticker,
    asOf: ts(date, "T09:00:00+08:00"),
    last: d.last,
    changePct: d.changePct,
    rangeDay: d.rangeDay,
    range52w: d.range52w,
    volume: d.volume,
    marketCap: d.marketCap,
    status: d.trend === "up" ? "ok" : d.trend === "down" ? "warn" : "ok",
    oneLineThesis: d.thesis.slice(0, 60) + "…",
  };

  const technical = {
    ticker,
    asOf: ts(date, "T09:00:00+08:00"),
    trend: d.trend,
    rsi14: d.rsi14,
    ma20: d.ma20,
    ma60: d.ma60,
    ma200: d.ma200,
    supportLevels: d.support,
    resistanceLevels: d.resistance,
    patterns: d.patterns,
    notes: d.technicalNotes,
  };

  const fundamentals = {
    ticker,
    asOf: ts(date, "T09:00:00+08:00"),
    ...(d.pe !== null ? { pe: d.pe } : {}),
    ...(d.pb !== null ? { pb: d.pb } : {}),
    dividendYield: d.dividendYield,
    ...(d.epsTtm !== null ? { epsTtm: d.epsTtm } : {}),
    ...(d.revenueGrowthYoy !== null ? { revenueGrowthYoy: d.revenueGrowthYoy } : {}),
    revenueMonthly: d.revenueMonthly,
  };

  // Apply per-ticker notes override from input if present
  const inputNote = input?.notes?.[ticker];
  const aiNote = {
    ticker,
    asOf: ts(date, "T09:00:00+08:00"),
    thesis: inputNote?.thesis ?? d.thesis,
    whySelected: inputNote?.whySelected ?? d.whySelected,
    trigger: inputNote?.trigger ?? d.trigger,
    invalidation: inputNote?.invalidation ?? d.invalidation,
    riskScenarios: inputNote?.riskScenarios ?? d.riskScenarios,
    bias: inputNote?.bias ?? d.bias,
    confidence: inputNote?.confidence ?? d.confidence,
    evidence: d.evidence,
  };

  const news = newsItems
    .filter((n) => n.relatedSymbols.includes(ticker))
    .map((n) => ({ ...n }));

  // Use input candidate data for checkpoints if available
  const inputCandidate = input?.candidates?.find((c) => c.ticker === ticker);
  const checkpoints = [
    {
      id: `cp-pre-${ticker.replace(".", "-")}`,
      kind: "pre",
      title: "盤前觀察",
      timestamp: ts(date, "T08:30:00+08:00"),
      status: d.trend === "up" ? "ok" : "watch",
      summary: `${pool.name}（${ticker}）盤前情緒：${pool.latestStatus ?? ""}`,
      confidence: inputNote?.confidence ?? d.confidence,
      whatChanged: "Phase 2A/2B 手動快照，尚無日內更新。",
      trigger: inputCandidate?.trigger ?? inputNote?.trigger ?? d.trigger,
      invalidation: inputCandidate?.invalidation ?? inputNote?.invalidation ?? d.invalidation,
      linkedSymbols: [ticker],
      linkedNewsIds: news.slice(0, 2).map((n) => n.id),
    },
  ];

  return { profile, overview, technical, fundamentals, aiNote, news, checkpoints };
}

// Generates placeholder symbol files for a candidate ticker not found in SYMBOL_DATA/WATCHLIST_POOL.
// All price/technical/fundamental fields are null and clearly marked as placeholder.
function buildUnknownTickerSymbolFiles(candidate, date, newsItems, input) {
  const ticker = candidate.ticker;
  const kind = candidate.kind ?? "stock";

  const profile = {
    ticker,
    name: candidate.name,
    kind,
    market: "TW",
    sector: "placeholder",
    industry: "placeholder",
    tags: candidate.themes ?? [],
    oneLineSummary: candidate.summary,
    externalLinks: buildExternalLinks(ticker, kind),
    _dataNote: "Unknown ticker — not in seed pool. Profile data is placeholder only.",
  };

  const overview = {
    ticker,
    asOf: ts(date, "T09:00:00+08:00"),
    last: null,
    changePct: null,
    rangeDay: null,
    range52w: null,
    volume: null,
    marketCap: null,
    status: "unknown",
    oneLineThesis: candidate.summary.slice(0, 60) + "…",
    _dataNote: "Unknown ticker — price and market data unavailable. Placeholder only.",
  };

  const technical = {
    ticker,
    asOf: ts(date, "T09:00:00+08:00"),
    trend: "unknown",
    rsi14: null,
    ma20: null,
    ma60: null,
    ma200: null,
    supportLevels: [],
    resistanceLevels: [],
    patterns: [],
    notes: "Technical data unavailable — unknown ticker not in seed pool.",
    _dataNote: "Unknown ticker — technical data unavailable. Placeholder only.",
  };

  const fundamentals = {
    ticker,
    asOf: ts(date, "T09:00:00+08:00"),
    revenueMonthly: [],
    _dataNote: "Unknown ticker — fundamental data unavailable. Placeholder only.",
  };

  const inputNote = input?.notes?.[ticker];
  const aiNote = {
    ticker,
    asOf: ts(date, "T09:00:00+08:00"),
    thesis: inputNote?.thesis ?? candidate.summary,
    whySelected: inputNote?.whySelected ?? candidate.whySelected,
    trigger: inputNote?.trigger ?? candidate.trigger,
    invalidation: inputNote?.invalidation ?? candidate.invalidation,
    riskScenarios: inputNote?.riskScenarios ?? [candidate.risk],
    bias: inputNote?.bias ?? "neutral",
    confidence: inputNote?.confidence ?? candidate.confidence ?? "medium",
    evidence: [],
    _dataNote: "Unknown ticker — AI note derived from input candidate only. No seed data.",
  };

  const news = newsItems
    .filter((n) => n.relatedSymbols.includes(ticker))
    .map((n) => ({ ...n }));

  const checkpoints = [
    {
      id: `cp-pre-${ticker.replace(/\./g, "-")}`,
      kind: "pre",
      title: "盤前觀察",
      timestamp: ts(date, "T08:30:00+08:00"),
      status: "unknown",
      summary: `${candidate.name}（${ticker}）盤前觀察：非自選股池標的，資料為 input 輸入驅動，無即時市場數據。`,
      confidence: inputNote?.confidence ?? candidate.confidence ?? "medium",
      whatChanged: "Phase 2F input-driven snapshot — unknown ticker, placeholder data only.",
      trigger: inputNote?.trigger ?? candidate.trigger,
      invalidation: inputNote?.invalidation ?? candidate.invalidation,
      linkedSymbols: [ticker],
      linkedNewsIds: news.slice(0, 2).map((n) => n.id),
      _dataNote: "Unknown ticker — checkpoint derived from input candidate only.",
    },
  ];

  return { profile, overview, technical, fundamentals, aiNote, news, checkpoints };
}

function buildReports(date, input) {
  const week = toISOWeek(date);
  const prevDate = prevTradingDate(date);

  const closeReport = {
    date: prevDate,
    directionVerdict: "bull",
    thesisAccuracyScore: 0.72,
    whatWorked: [
      "AI 主線半導體判斷正確，TSMC 與聯發科同步偏強。",
      "外資動向觀察提供了提前信號。",
    ],
    whatFailed: [
      "廣度確認節奏比預期慢，中小型股跟漲略有延遲。",
    ],
    nextDayWatchpoints: [
      "外資是否延續買超，尤其是中型半導體標的。",
      "中小型股廣度是否與權值同步改善。",
      "聯詠（3034）底部訊號是否持續浮現。",
    ],
    tickerResults: [
      { ticker: "2330.TW", thesis: "AI 多頭核心倉位", outcome: "worked", comment: `+${(0.8).toFixed(1)}%，符合預期，未破 MA20。` },
      { ticker: "2454.TW", thesis: "等待庫存確認後升級", outcome: "partial", comment: "小幅上漲，方向正確但尚未確認突破。" },
    ],
    analysisLayerStatus: [
      { layer: "macro", status: "ok" },
      { layer: "technical", status: "ok" },
      { layer: "news", status: "ok" },
      { layer: "breadth", status: "warn", note: "中小型廣度確認需更快。" },
    ],
    summaryForModels: input?.reports?.closeSummary ?? `${prevDate} 半導體主線偏多，TSMC 守 MA20 確認，廣度尚待驗證。下次優先觀察中型半導體是否同步跟進。`,
    asOf: ts(prevDate, "T14:30:00+08:00"),
  };

  const weeklyReport = {
    week,
    summary: input?.reports?.weeklySummary ?? `本週 AI/半導體主軸持續強勁，TSMC 月營收年增確認需求落地，鴻海 AI Server 訂單延伸。整體偏多但廣度尚待全面確認，中小型跟漲節奏較慢需持續觀察。`,
    keyWins: [
      "TSMC 月營收年增確認 AI 需求非僅情緒炒作。",
      "AI Server 訂單能見度延伸，供應鏈基本面支撐明確。",
    ],
    keyMisses: [
      "廣度確認節奏比預期慢，中小型股跟漲延遲。",
      "高息 ETF 相對強度觀察未充分利用。",
    ],
    biasObservations: [
      "對權值股偏樂觀但廣度驗證應更嚴謹。",
      "驅動 IC 底部訊號過早標記，應等更明確確認再升級。",
    ],
    nextWeekAdjustments: [
      "廣度驗證優先：中型半導體是否同步，否則不擴倉。",
      "聯發科 Q2 法說前持 watch，法說後根據庫存數據決定升降級。",
      "3034 繼續觀察，不主動進場。",
    ],
    dailyReviews: [
      { date: prevDate, oneLine: "半導體領漲，廣度待確認", verdict: "bull", accuracy: 0.72 },
    ],
    summaryForModels: `${week} AI/半導體主線偏多，TSMC 核心倉位成立，聯發科 watch 等待庫存確認，廣度是下週最重要觀察指標。`,
    asOf: ts(date, "T09:00:00+08:00"),
  };

  const recentClose = [{ date: prevDate, href: `/reports/close/${prevDate}` }];
  const recentWeekly = [{ week, href: `/reports/weekly/${week}` }];

  return { closeReport, weeklyReport, recentClose, recentWeekly, prevDate, week };
}

// ============================================================
// File writing helpers
// ============================================================

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`  wrote  ${path.relative(process.cwd(), filePath)}`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  let { date, outDir, inputFile } = parseArgs();

  const input = await loadAndValidateInput(inputFile);

  // Resolve date: --date CLI > input.date > today (Asia/Taipei)
  if (!date && input?.date) {
    date = input.date;
  }
  if (!date) {
    const now = new Date();
    const tpe = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
    date = tpe.toISOString().slice(0, 10);
  }

  console.log(`[generate-v3-snapshot] date=${date} out=${outDir}${input ? " mode=input-driven" : " mode=seed"}`);
  console.log(`[generate-v3-snapshot] generating snapshot...`);

  await ensureDir(outDir);

  // Build shared data once so dashboard can reference the same items
  const ideas = buildIdeas(date, input);
  const newsItems = buildNews(date, input);
  const reports = buildReports(date, input);

  // Identify input candidates that are not in the seed WATCHLIST_POOL
  const poolTickerSet = new Set(WATCHLIST_POOL.map((w) => w.ticker));
  const unknownCandidates = (input?.candidates ?? []).filter((c) => !poolTickerSet.has(c.ticker));

  // Core files
  await writeJson(path.join(outDir, "dashboard.json"), buildDashboard(date, input, ideas, newsItems));
  await writeJson(path.join(outDir, "watchlist.json"), buildWatchlist(date, input));
  await writeJson(path.join(outDir, "watchlist-scans.json"), buildWatchlistScans(date));
  await writeJson(path.join(outDir, "watchlist-ai-summary.json"), buildWatchlistAiSummary(date));
  await writeJson(path.join(outDir, "ideas.json"), ideas);
  await writeJson(path.join(outDir, "themes.json"), buildThemes(date));
  await writeJson(path.join(outDir, "news.json"), newsItems);
  await writeJson(path.join(outDir, "today.json"), buildToday(date));
  await writeJson(path.join(outDir, "system-health.json"), buildSystemHealth(date, outDir, input));
  await writeJson(path.join(outDir, "symbols.json"), buildSymbolIndex(input));

  // Reports
  await writeJson(path.join(outDir, "reports", "recent-close.json"), reports.recentClose);
  await writeJson(path.join(outDir, "reports", "recent-weekly.json"), reports.recentWeekly);
  await writeJson(path.join(outDir, "reports", "close", `${reports.prevDate}.json`), reports.closeReport);
  await writeJson(path.join(outDir, "reports", "weekly", `${reports.week}.json`), reports.weeklyReport);

  // Symbol detail files — seed pool tickers
  for (const { ticker } of WATCHLIST_POOL) {
    const files = buildSymbolFiles(ticker, date, newsItems, input);
    if (!files) continue;
    const base = path.join(outDir, "symbols", ticker);
    await writeJson(path.join(base, "profile.json"), files.profile);
    await writeJson(path.join(base, "overview.json"), files.overview);
    await writeJson(path.join(base, "technical.json"), files.technical);
    await writeJson(path.join(base, "fundamentals.json"), files.fundamentals);
    await writeJson(path.join(base, "ai-note.json"), files.aiNote);
    await writeJson(path.join(base, "news.json"), files.news);
    await writeJson(path.join(base, "checkpoints.json"), files.checkpoints);
  }

  // Symbol detail files — input candidates not in seed pool (placeholder data)
  for (const candidate of unknownCandidates) {
    const files = buildUnknownTickerSymbolFiles(candidate, date, newsItems, input);
    const base = path.join(outDir, "symbols", candidate.ticker);
    await writeJson(path.join(base, "profile.json"), files.profile);
    await writeJson(path.join(base, "overview.json"), files.overview);
    await writeJson(path.join(base, "technical.json"), files.technical);
    await writeJson(path.join(base, "fundamentals.json"), files.fundamentals);
    await writeJson(path.join(base, "ai-note.json"), files.aiNote);
    await writeJson(path.join(base, "news.json"), files.news);
    await writeJson(path.join(base, "checkpoints.json"), files.checkpoints);
    console.log(`  [unknown ticker] ${candidate.ticker}: placeholder symbol files written`);
  }

  const totalSymbols = WATCHLIST_POOL.length + unknownCandidates.length;
  console.log(`\n[generate-v3-snapshot] done. ${totalSymbols} symbols (${WATCHLIST_POOL.length} seed + ${unknownCandidates.length} unknown), 1 date snapshot.`);
  console.log(`\nNext steps:`);
  console.log(`  1. Validate safely: DATA_ROOT=${outDir} node scripts/check-static-data.mjs`);
  console.log(`  2. Do not copy into public/data until Codex review approves it.`);
  console.log(`  3. Inspect the UI only after making a temporary public/data backup.`);
  console.log(`  4. See docs/V3_PHASE2A_SNAPSHOT_GENERATOR.md for full usage guide.`);
}

await main();
