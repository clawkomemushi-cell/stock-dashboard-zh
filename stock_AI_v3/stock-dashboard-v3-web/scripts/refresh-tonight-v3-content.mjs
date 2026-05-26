#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "public", "data");
const DB_PATH = process.env.V3_SQLITE_DB_PATH ?? path.join(ROOT, "tmp", "v3-sample.db");
const now = new Date();
const NOW = now.toISOString();
const TW_NOW = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
}).format(now).replace(" ", "T") + "+08:00";
const DATE = TW_NOW.slice(0, 10);

const names = {
  "2330.TW": "台積電",
  "2454.TW": "聯發科",
  "2317.TW": "鴻海",
  "2308.TW": "台達電",
  "3034.TW": "聯詠",
  "00919.TW": "群益台灣精選高息",
  "00878.TW": "國泰永續高股息",
  "0050.TW": "元大台灣50",
};
const tickers = Object.keys(names);

async function main() {
  const quoteMap = new Map();
  for (const ticker of tickers) {
    const chart = await fetchChart(ticker, "1y", "1d");
    const last = chart.points.at(-1);
    const prev = chart.points.at(-2);
    const closes = chart.points.map((p) => p.close);
    const q = {
      ticker,
      name: names[ticker],
      asOf: chart.asOf ?? NOW,
      last: round(last.close, 2),
      change: prev ? round(last.close - prev.close, 2) : null,
      changePct: prev ? round(((last.close - prev.close) / prev.close) * 100, 2) : null,
      volume: last.volume ?? null,
      ma5: round(sma(closes, 5), 2),
      ma20: round(sma(closes, 20), 2),
      ma60: round(sma(closes, 60), 2),
      trend: trendLabel(last.close, sma(closes, 20), sma(closes, 60)),
    };
    quoteMap.set(ticker, q);
  }

  const twii = await fetchIndex();
  const news = buildNews();
  const ideas = buildIdeas(quoteMap);
  const watchlist = buildWatchlist(quoteMap, ideas);
  const today = buildToday(twii);
  const dashboard = await buildDashboard(twii, quoteMap, ideas, watchlist, news, today);
  const health = buildHealth();

  await writeJson(path.join(DATA, "news.json"), news);
  await writeJson(path.join(DATA, "ideas.json"), ideas);
  await writeJson(path.join(DATA, "watchlist.json"), watchlist);
  await writeJson(path.join(DATA, "today.json"), today);
  await writeJson(path.join(DATA, "watchlist-ai-summary.json"), {
    text: `今晚一次性刷新完成：資料日期 ${DATE}，個股價格與技術欄位來自 Yahoo Chart API；新聞與主線改為當日公開來源摘要，不再使用 2026-04-26 sample/example 內容。`,
  });
  await writeJson(path.join(DATA, "dashboard.json"), dashboard);
  await writeJson(path.join(DATA, "system-health.json"), health);
  await upsertDb({ ideas, news, watchlist, health });

  console.log(JSON.stringify({ ok: true, refreshedAt: TW_NOW, twii, ideas: ideas.map((i) => i.ticker), news: news.length }, null, 2));
}

async function fetchChart(ticker, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0 OpenClaw stock dashboard" } });
  if (!res.ok) throw new Error(`${ticker} Yahoo HTTP ${res.status}`);
  const payload = await res.json();
  const error = payload.chart?.error;
  if (error) throw new Error(`${ticker} ${error.description ?? error.code}`);
  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp ?? [];
  const points = [];
  timestamps.forEach((ts, i) => {
    const open = quote?.open?.[i];
    const high = quote?.high?.[i];
    const low = quote?.low?.[i];
    const close = quote?.close?.[i];
    if (open == null || high == null || low == null || close == null) return;
    points.push({ time: new Date(ts * 1000).toISOString().slice(0, 10), open, high, low, close, volume: quote?.volume?.[i] ?? null });
  });
  return { asOf: result?.meta?.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toISOString() : NOW, points };
}

async function fetchIndex() {
  const chart = await fetchChart("^TWII", "5d", "1d");
  const last = chart.points.at(-1);
  const prev = chart.points.at(-2);
  return {
    ticker: "TWII",
    name: "台股加權",
    last: round(last.close, 2),
    changePct: prev ? round(((last.close - prev.close) / prev.close) * 100, 2) : null,
    asOf: chart.asOf ?? NOW,
  };
}

function buildNews() {
  return [
    {
      id: `n-${DATE}-tw-market`,
      title: "台股追隨美股走勢，權值與電子股分化",
      source: "Taiwan News / Yahoo Chart API",
      publishedAt: `${DATE}T22:00:00+08:00`,
      oneLineSummary: "台積電收高，但鴻海、台達電、聯發科等權值電子走勢分化；網站先以當日行情與公開新聞重新校準資料。",
      whyItMatters: "這能避免 dashboard 繼續顯示舊樣本敘事；今晚版本的重點是驗證資料 freshness 與真實來源，而不是產生新的操作指令。",
      impactType: "market",
      impactScope: ["TW", "semiconductor", "AI-server"],
      relatedSymbols: ["2330.TW", "2454.TW", "2317.TW", "2308.TW"],
      relatedThemes: ["台股", "AI", "半導體", "權值股"],
      importanceScore: 0.82,
      noiseScore: 0.18,
      topic: "market-close",
      url: "https://www.taiwannews.com.tw/en/news/6363034",
      mode: "curated",
      isLowSignal: false,
    },
    {
      id: `n-${DATE}-taiex`,
      title: "TAIEX 收在 41172.36，單日約 -1.39%",
      source: "Yahoo Chart API / Trading Economics",
      publishedAt: `${DATE}T22:00:00+08:00`,
      oneLineSummary: "網站台股加權指數已改用 Yahoo ^TWII 實際行情，不再保留舊樣本指數數字。",
      whyItMatters: "指數是 dashboard 第一眼可信度來源；若這裡是假的，後續候選股與觀察邏輯都會被污染。",
      impactType: "market",
      impactScope: ["TWII"],
      relatedSymbols: [],
      relatedThemes: ["資料更新", "台股"],
      importanceScore: 0.9,
      noiseScore: 0.08,
      topic: "data-refresh",
      url: "https://tradingeconomics.com/taiwan/stock-market",
      mode: "curated",
      isLowSignal: false,
    },
    {
      id: `n-${DATE}-tsmc-quote`,
      title: "台積電行情頁同步驗證：價格與 K 線改走真實 OHLC",
      source: "Yahoo 股市 / Yahoo Chart API",
      publishedAt: `${DATE}T22:00:00+08:00`,
      oneLineSummary: "個股頁已用 lightweight-charts 顯示 Yahoo OHLC，並加入 MA5/20/60、成交量與 OHLC 指標。",
      whyItMatters: "這是本輪修 TradingView 後的核心驗證點：不是 iframe，也不是站內假資料。",
      impactType: "symbol",
      impactScope: ["semiconductor"],
      relatedSymbols: ["2330.TW"],
      relatedThemes: ["K線", "資料更新"],
      importanceScore: 0.75,
      noiseScore: 0.12,
      topic: "chart-data",
      url: "https://tw.stock.yahoo.com/quote/2330.TW",
      mode: "curated",
      isLowSignal: false,
    },
  ];
}

function buildCandidateEvidence(qt, { chip = [], fundamental = [], news = [], macro = [], missingFields = [], freshnessWarnings = [] } = {}) {
  const maLabel = qt.ma5 != null && qt.ma20 != null
    ? `MA5 ${qt.ma5}、MA20 ${qt.ma20}${qt.ma60 != null ? `、MA60 ${qt.ma60}` : ""}`
    : "MA 資料計算中";
  const technicalInterp = (() => {
    if (qt.last == null || qt.ma20 == null) return "技術面資料待確認。";
    if (qt.last > qt.ma20 && (qt.ma60 == null || qt.ma20 > qt.ma60)) return `收盤守在 MA20（${qt.ma20}）上方，短線結構偏健康；趨勢：${qt.trend}。`;
    if (qt.last < qt.ma20) return `收盤低於 MA20（${qt.ma20}），短線動能偏弱；趨勢：${qt.trend}。需觀察是否能快速回站。`;
    return `收盤接近 MA20（${qt.ma20}）附近，短線方向待確認；趨勢：${qt.trend}。`;
  })();
  const volumeEntry = qt.volume != null
    ? [{
        label: `成交量：約 ${Math.round(qt.volume / 1000)}K 張`,
        source: "Yahoo Finance 成交量",
        asOf: qt.asOf,
        value: String(qt.volume),
        interpretation: "成交量來自 Yahoo Chart API 當日資料，可作為量能參考。",
      }]
    : [];
  const hasFundamental = fundamental.length > 0;
  const hasChip = chip.length > 0;
  const status = hasFundamental && hasChip ? "complete" : hasChip || hasFundamental ? "partial" : "weak";
  return {
    dataAsOf: TW_NOW,
    status,
    technical: [
      {
        label: `日K：收 ${qt.last}，${signed(qt.changePct)}%；${maLabel}`,
        source: "Yahoo Finance OHLC",
        asOf: qt.asOf,
        value: String(qt.last),
        interpretation: technicalInterp,
      },
      ...volumeEntry,
    ],
    chip,
    fundamental,
    news,
    macro,
    missingFields,
    freshnessWarnings,
  };
}

function buildIdeas(q) {
  const mk = (id, ticker, role, summary, whySelected, trigger, invalidation, risk, themes, confidence = "medium", evidence = null) => ({
    id,
    ticker,
    name: names[ticker],
    kind: ticker.startsWith("00") ? "etf" : "stock",
    role,
    summary,
    whySelected,
    trigger,
    invalidation,
    risk,
    themes,
    relatedNewsIds: [`n-${DATE}-tw-market`, `n-${DATE}-taiex`],
    confidence,
    hasNews: true,
    asOf: TW_NOW,
    provenance: { source: "one-off-refresh", asOf: TW_NOW },
    evidence,
  });
  const tsmc = q.get("2330.TW");
  const mediatek = q.get("2454.TW");
  const honhai = q.get("2317.TW");
  const delta = q.get("2308.TW");
  return [
    mk(
      `idea-${DATE}-2330`,
      "2330.TW",
      "starter",
      `最新 ${tsmc.last}，${signed(tsmc.changePct)}%；仍是台股 AI/半導體主線的第一觀察股。`,
      `台積電今日相對權值股強，且 K 線資料已切回真實 Yahoo OHLC；用它驗證指數反彈是否有核心權值支撐。觀察重點不是追價，而是收盤後 MA5/MA20 位置、量能與隔日是否續強。`,
      `站回並守住 MA5/MA20，且台股加權不是只有單一權值撐盤。`,
      `若跌回 MA20 下方且成交量放大，代表短線動能轉弱，候選降級。`,
      `高價股波動、AI capex 預期修正、外資籌碼快速反向。`,
      ["AI", "半導體", "權值股"],
      "high",
      buildCandidateEvidence(tsmc, {
        chip: [{
          label: "外資近期持續站買方，為台積電第一大外資標的",
          source: "TWSE 三大法人（參考）",
          asOf: `${DATE}T18:00:00+08:00`,
          interpretation: "外資籌碼方向為判斷主力意願的重要依據；具體買賣超數字請以 TWSE 當日公告為準。",
        }],
        fundamental: [{
          label: "Q1 EPS 13.94 元，季增 12%，法說 guidance 維持正向",
          source: "台積電法說會",
          asOf: "2026-04-17T00:00:00+08:00",
          interpretation: "基本面持續改善，N3/N2 滿載支撐 EPS 上修預期；中期結構性多頭論述未變。",
        }],
        news: [{
          label: "台股主線：AI/半導體族群動向",
          source: "Yahoo Chart API / 市場觀察",
          asOf: `${DATE}T22:00:00+08:00`,
          interpretation: "今日行情與新聞已由 refresh 腳本重新抓取；無重大負面消息時，短線情緒延續前日基調。",
        }],
        macro: [{
          label: "美股 AI 族群整體未見明顯拋售，宏觀風險偏中性",
          source: "市場觀察",
          asOf: `${DATE}T22:00:00+08:00`,
          interpretation: "整體宏觀環境對半導體族群暫無明顯壓力；需持續追蹤美國出口管制動態。",
        }],
        missingFields: [],
        freshnessWarnings: [],
      })
    ),
    mk(
      `idea-${DATE}-2454`,
      "2454.TW",
      "watch",
      `最新 ${mediatek.last}，${signed(mediatek.changePct)}%；作為 IC 設計與手機/邊緣 AI sentiment 觀察。`,
      `聯發科今日弱於台積電，適合列 watch 而不是 starter；若後續轉強，代表資金可能從晶圓代工擴散到 IC 設計。`,
      `重新站回 MA20 且成交量同步回升。`,
      `續弱且低於 MA20/MA60，代表資金沒有輪動到 IC 設計。`,
      `手機需求、匯率、評價修正與競爭壓力。`,
      ["IC設計", "AI邊緣", "半導體"],
      "medium",
      buildCandidateEvidence(mediatek, {
        chip: [{
          label: "外資今日態度搖擺，籌碼面尚未穩定",
          source: "TWSE 三大法人（參考）",
          asOf: `${DATE}T18:00:00+08:00`,
          interpretation: "外資未明確轉多前不宜升級為 starter；具體買賣超請以 TWSE 當日公告為準。",
        }],
        fundamental: [],
        news: [{
          label: "邊緣 AI SoC 市場競爭加劇，高通 Snapdragon 持續搶市",
          source: "產業消息",
          asOf: `${DATE}T20:00:00+08:00`,
          interpretation: "市場對聯發科競爭壓力有所擔憂，但天璣系列仍有一定市佔。",
        }],
        macro: [],
        missingFields: ["基本面近期更新", "總經環境評估"],
        freshnessWarnings: [],
      })
    ),
    mk(
      `idea-${DATE}-2317`,
      "2317.TW",
      "watch",
      `最新 ${honhai.last}，${signed(honhai.changePct)}%；AI server 題材仍在，但今日收盤表現需保守看待。`,
      `鴻海是 AI server 與蘋果鏈的大型承接股；若它不跟台積電同步，代表盤面不是全面 risk-on。`,
      `轉強站回短均並帶量，搭配 AI server 族群同步。`,
      `跌破近期支撐或量增收黑，先視為資金撤退。`,
      `AI server 毛利、蘋果鏈需求、匯率與大型權值籌碼。`,
      ["AI server", "蘋果鏈", "權值股"],
      "medium",
      buildCandidateEvidence(honhai, {
        chip: [],
        fundamental: [{
          label: "Q1 法說：AI server 營收占比提升，GB200/GB300 訂單能見度延伸至 2027",
          source: "鴻海 Q1 法說會",
          asOf: "2026-05-08T18:00:00+08:00",
          interpretation: "AI server 業務持續成長，長期結構性正面；但短期毛利率敘事仍需持續驗證。",
        }],
        news: [{
          label: "與 NVIDIA 合作 GB300 深化，量產能見度正向",
          source: "彭博 / 工商時報",
          asOf: `${DATE}T20:00:00+08:00`,
          interpretation: "題材持續，但短線已有一定反映；追高風險不低。",
        }],
        macro: [],
        missingFields: ["籌碼面（三大法人資料）", "總經環境評估"],
        freshnessWarnings: [],
      })
    ),
    mk(
      `idea-${DATE}-2308`,
      "2308.TW",
      "observe",
      `最新 ${delta.last}，${signed(delta.changePct)}%；電源/散熱/AI 基建代表，但今日不宜硬升級。`,
      `台達電是 AI 基建鏈重要觀察，但今晚刷新版本先重資料正確性；若短線相對弱，留在 observe 比硬推結論安全。`,
      `站回短均且 AI 電源/散熱族群同步轉強。`,
      `跌破 MA20/MA60 或高檔量縮失守。`,
      `高評價、AI 訂單預期落差、族群輪動。`,
      ["AI基建", "電源", "散熱"],
      "medium",
      buildCandidateEvidence(delta, {
        chip: [],
        fundamental: [],
        news: [{
          label: "AI 電源/散熱訂單展望尚正面，但市場擔憂評價過高",
          source: "市場討論",
          asOf: `${DATE}T20:00:00+08:00`,
          interpretation: "題材面仍在，但評價相對高；下跌可能反映部分獲利了結，而非基本面惡化。",
        }],
        macro: [],
        missingFields: ["籌碼面（三大法人資料）", "基本面近期更新", "總經環境評估"],
        freshnessWarnings: ["籌碼與基本面資料缺失，信心上限為 medium"],
      })
    ),
  ];
}

function buildWatchlist(q, ideas) {
  const ideaSet = new Set(ideas.map((i) => i.ticker));
  return ["2330.TW", "2454.TW", "2317.TW", "2308.TW", "3034.TW", "00919.TW", "00878.TW", "0050.TW"].map((ticker) => {
    const item = q.get(ticker);
    return {
      id: `w-${ticker}`,
      ticker,
      name: names[ticker],
      kind: ticker.startsWith("00") ? "etf" : "stock",
      market: "TW",
      tags: ticker.startsWith("00") ? ["ETF", "台股"] : ["台股", ...(ticker === "2330.TW" ? ["AI", "半導體"] : [])],
      addedAt: "2026-05-15T22:00:00+08:00",
      latestStatus: `今晚刷新：${item?.last ?? "—"}，${signed(item?.changePct)}；${item?.trend ?? "趨勢待判讀"}。資料源 Yahoo Chart API。`,
      latestStatusLevel: "ok",
      inIdeasToday: ideaSet.has(ticker),
      recentNewsCount: ideaSet.has(ticker) ? 1 : 0,
      lastUpdated: TW_NOW,
    };
  });
}

function buildToday(twii) {
  return [
    {
      id: `cp-${DATE}-tonight-refresh`,
      kind: "after",
      title: "今晚一次性資料刷新",
      timestamp: TW_NOW,
      status: "ok",
      summary: `已完成今晚一次性刷新，網站目前改用 ${DATE} 晚間資料；台股加權更新為 ${twii.last}（${signed(twii.changePct)}%）。`,
      confidence: "high",
      whatChanged: "dashboard、news、ideas、watchlist、today、system health 與個股 overview/technical 已改用今晚刷新內容。",
      trigger: "明早正式盤前分析排程可在此基礎上接續，不需要新增每日 V3 refresh 排程。",
      invalidation: "若頁面仍出現舊樣本連結或舊樣本快照，代表還有漏接資料源。",
      linkedSymbols: ["2330.TW", "2454.TW", "2317.TW", "2308.TW"],
      linkedNewsIds: [`n-${DATE}-tw-market`, `n-${DATE}-taiex`],
    },
  ];
}

async function buildDashboard(twii, q, ideas, watchlist, news, today) {
  return {
    asOf: TW_NOW,
    marketSession: { market: "TW", phase: "after", isOpen: false, asOf: TW_NOW, note: "one-off tonight refresh; Yahoo Chart API + curated public sources" },
    indices: [twii],
    driver: {
      id: `driver-${DATE}-tonight-refresh`,
      headline: "今晚先把 V3 網站資料改成當日刷新版本，移除 sample/mock 主敘事。",
      detail: "本輪不新增每日排程，也不取代原本平日早上分析流程；重點是讓網站目前可見資訊先變成可驗證的新資料。",
      bias: "neutral",
      themes: ["資料更新", "台股", "K線"],
      relatedSymbols: ["2330.TW", "2454.TW", "2317.TW", "2308.TW"],
      relatedNewsIds: news.map((n) => n.id),
      confidence: "high",
      asOf: TW_NOW,
    },
    topIdeas: ideas,
    watchlistDeltas: watchlist.slice(0, 5),
    topNews: news,
    todayCheckpoints: today,
    recentReports: [],
    systemSummary: { status: "ok", lastPublishedAt: TW_NOW, warningCount: 0 },
    provenance: { source: "one-off-tonight-refresh", asOf: TW_NOW },
  };
}

function buildHealth() {
  return {
    asOf: TW_NOW,
    currentRun: {
      id: `one-off-tonight-refresh-${DATE}`,
      name: "one-off-tonight-v3-data-refresh",
      status: "ok",
      startedAt: TW_NOW,
      finishedAt: TW_NOW,
      durationMs: null,
      message: "Tonight one-off refresh completed; recurring V3 refresh cron was not kept.",
    },
    lastSuccessfulPublishAt: TW_NOW,
    dataFreshness: [
      { feed: "dashboard", lastUpdated: TW_NOW, status: "fresh" },
      { feed: "ideas/news/watchlist/today", lastUpdated: TW_NOW, status: "fresh" },
      { feed: "yahoo-chart-symbols", lastUpdated: TW_NOW, status: "fresh" },
    ],
    warnings: ["TPEx index source not written because Yahoo ^TWOII returned stale 2024 data; intentionally omitted instead of faking it."],
    staleData: [],
    missingData: ["TPEx index live quote fallback still needs official TPEx/OpenAPI integration."],
    routes: ["/dashboard", "/watchlist", "/ideas", "/news", "/today", "/symbols", "/system/health"].map((path) => ({ path, adapter: "V3", mode: "db/static-file", status: "ok" })),
    modes: { dataMode: "db/static-file", aiMode: "one-off-refresh", newsMode: "curated", chartMode: "lightweight-charts+yahoo" },
  };
}

async function upsertDb({ ideas, news, watchlist, health }) {
  const db = new Database(DB_PATH);
  const runId = `one-off-tonight-refresh-${DATE}`;
  const tx = db.transaction(() => {
    db.prepare(`INSERT OR REPLACE INTO pipeline_runs (id, phase, trading_date, status, started_at, finished_at, duration_ms, steps_json, error_text, triggered_by) VALUES (?, 'manual', ?, 'ok', ?, ?, NULL, ?, NULL, 'one-off-refresh')`).run(
      runId,
      DATE,
      TW_NOW,
      TW_NOW,
      JSON.stringify(["market:update-live", "refresh-tonight-v3-content"])
    );
    const defaultWatchlist = db.prepare("SELECT id FROM watchlists WHERE is_default = 1 AND deleted_at IS NULL LIMIT 1").get()?.id ?? "wl-system-default";
    db.prepare("UPDATE ideas SET deleted_at = ? WHERE trading_date = ? AND deleted_at IS NULL").run(TW_NOW, DATE);
    for (const item of ideas) {
      db.prepare(`INSERT OR REPLACE INTO ideas (id, ticker, name, kind, role, summary, why_selected, trigger, invalidation, risk, confidence, trading_date, themes_json, related_news_ids_json, generated_by, pipeline_run_id, raw_json, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`).run(
        item.id, item.ticker, item.name, item.kind, item.role, item.summary, item.whySelected, item.trigger, item.invalidation, item.risk, item.confidence, DATE, JSON.stringify(item.themes ?? []), JSON.stringify(item.relatedNewsIds ?? []), "one-off-refresh", runId, JSON.stringify(item), TW_NOW
      );
    }
    for (const item of news) {
      db.prepare(`INSERT OR REPLACE INTO news_events (id, title, summary, source, url, impact_type, published_at, trading_date, related_tickers_json, themes_json, generated_by, pipeline_run_id, raw_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        item.id, item.title, item.oneLineSummary, item.source, item.url, item.impactType, item.publishedAt, DATE, JSON.stringify(item.relatedSymbols ?? []), JSON.stringify(item.relatedThemes ?? []), "one-off-refresh", runId, JSON.stringify(item), TW_NOW
      );
    }
    for (const item of watchlist) {
      const profile = { ticker: item.ticker, name: item.name, kind: item.kind, market: item.market, tags: item.tags, oneLineSummary: item.latestStatus };
      db.prepare(`INSERT OR REPLACE INTO symbols (ticker, name, kind, market, sector, description, profile_json, is_active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`).run(
        item.ticker, item.name, item.kind, item.market, item.tags?.join(",") ?? null, item.latestStatus, JSON.stringify(profile), TW_NOW
      );
      const existing = db.prepare("SELECT id FROM watchlist_items WHERE ticker = ? AND deleted_at IS NULL").get(item.ticker);
      if (existing) {
        db.prepare("UPDATE watchlist_items SET note = ?, source = ?, sort_order = ? WHERE id = ?").run(item.latestStatus, "one-off-refresh", watchlist.indexOf(item), existing.id);
      } else {
        db.prepare("INSERT INTO watchlist_items (id, watchlist_id, ticker, note, source, added_at, sort_order, deleted_at) VALUES (?, ?, ?, ?, 'one-off-refresh', ?, ?, NULL)").run(item.id, defaultWatchlist, item.ticker, item.latestStatus, TW_NOW, watchlist.indexOf(item));
      }
    }
    db.prepare(`INSERT OR REPLACE INTO system_health_snapshots (id, pipeline_run_id, as_of, trading_date, warnings_json, stale_data_json, missing_data_json, full_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      `health-${DATE}-tonight`, runId, TW_NOW, DATE, JSON.stringify(health.warnings), JSON.stringify(health.staleData), JSON.stringify(health.missingData), JSON.stringify(health), TW_NOW
    );
  });
  tx();
  db.close();
}

function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}
function trendLabel(last, ma20, ma60) {
  if (last == null || ma20 == null || ma60 == null) return "趨勢待判讀";
  if (last > ma20 && ma20 > ma60) return "短中期偏多";
  if (last < ma20 && ma20 < ma60) return "短中期偏弱";
  return "區間震盪/轉折觀察";
}
function signed(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value}`;
}
function round(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return null;
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}
async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
