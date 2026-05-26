import type {
  SymbolProfile,
  SymbolOverview,
  SymbolTechnicalSnapshot,
  SymbolFundamentalSnapshot,
  SymbolAINote,
} from "@/lib/contracts";

const NOW = "2026-05-17T10:30:00+08:00";

export const MOCK_SYMBOL_PROFILES: SymbolProfile[] = [
  {
    ticker: "2330.TW",
    name: "台積電",
    kind: "stock",
    market: "TW",
    sector: "半導體",
    industry: "晶圓代工",
    tags: ["AI", "半導體", "權值股"],
    oneLineSummary: "全球最大晶圓代工廠，AI / HPC、先進製程與先進封裝主軸仍強；短線需消化 ADR 與外資賣壓。",
    externalLinks: [
      {
        label: "TradingView",
        url: "https://www.tradingview.com/symbols/TPE-2330/",
        kind: "tradingview",
      },
      {
        label: "TWSE 公開資訊",
        url: "https://mops.twse.com.tw/mops/web/t05st01?TYPEK=sii&co_id=2330",
        kind: "mops",
      },
      {
        label: "TWSE 個股行情",
        url: "https://www.twse.com.tw/zh/stockSearch.html?stockId=2330",
        kind: "twse",
      },
    ],
  },
  {
    ticker: "0050.TW",
    name: "元大台灣50",
    kind: "etf",
    market: "TW",
    issuer: "元大投信",
    expenseRatio: 0.32,
    inceptionDate: "2003-06-30",
    tags: ["ETF", "大型股", "市值型"],
    oneLineSummary: "追蹤台灣50指數,涵蓋 TW 市值前 50 大公司。",
    externalLinks: [
      {
        label: "TradingView",
        url: "https://www.tradingview.com/symbols/TPE-0050/",
        kind: "tradingview",
      },
      {
        label: "元大投信官網",
        url: "https://www.yuantaetfs.com/product/detail/0050/basic",
        kind: "issuer",
      },
    ],
  },
  {
    ticker: "00878.TW",
    name: "國泰永續高股息",
    kind: "etf",
    market: "TW",
    issuer: "國泰投信",
    expenseRatio: 0.3,
    inceptionDate: "2020-07-10",
    tags: ["ETF", "高股息", "ESG"],
    oneLineSummary: "高股息 ETF,結合 ESG 篩選,散戶熱門。",
    externalLinks: [
      {
        label: "國泰投信",
        url: "https://www.cathaysite.com.tw/funds/etf/00878",
        kind: "issuer",
      },
    ],
  },
  {
    ticker: "2454.TW",
    name: "聯發科",
    kind: "stock",
    market: "TW",
    sector: "半導體",
    industry: "IC 設計",
    tags: ["AI", "5G", "IC 設計"],
    oneLineSummary: "台灣最大 IC 設計廠,AI/手機晶片雙引擎。",
    externalLinks: [
      {
        label: "TradingView",
        url: "https://www.tradingview.com/symbols/TPE-2454/",
        kind: "tradingview",
      },
    ],
  },
  {
    ticker: "2317.TW",
    name: "鴻海",
    kind: "stock",
    market: "TW",
    sector: "電子",
    industry: "電子代工",
    tags: ["AI 伺服器", "EV", "權值股"],
    oneLineSummary: "全球最大 EMS,積極轉型 AI 伺服器與電動車。",
    externalLinks: [
      {
        label: "TradingView",
        url: "https://www.tradingview.com/symbols/TPE-2317/",
        kind: "tradingview",
      },
    ],
  },
];

export const MOCK_SYMBOL_OVERVIEWS: Record<string, SymbolOverview> = {
  "2330.TW": {
    ticker: "2330.TW",
    asOf: NOW,
    last: 1085,
    changePct: 1.4,
    rangeDay: [1072, 1090],
    range52w: [720, 1110],
    volume: 32_500_000,
    marketCap: 28_120_000_000_000,
    status: "warn",
    oneLineThesis: "AI / HPC 長線主軸仍強，但 5/15 後 ADR 與美股半導體回檔、外資賣壓及處分世界先進股權事件，讓週一需先看補跌後能否收斂。"
  },
  "0050.TW": {
    ticker: "0050.TW",
    asOf: NOW,
    last: 198.6,
    changePct: 0.85,
    rangeDay: [196.5, 199.2],
    range52w: [142, 205],
    volume: 18_400_000,
    status: "ok",
    oneLineThesis: "權值股普漲,日線維持多頭結構。",
  },
  "00878.TW": {
    ticker: "00878.TW",
    asOf: NOW,
    last: 23.45,
    changePct: -0.21,
    rangeDay: [23.4, 23.55],
    range52w: [20.1, 24.6],
    volume: 26_700_000,
    status: "warn",
    oneLineThesis: "金融類股拉回,短線缺乏催化。",
  },
  "2454.TW": {
    ticker: "2454.TW",
    asOf: NOW,
    last: 1255,
    changePct: 2.45,
    rangeDay: [1230, 1265],
    range52w: [820, 1320],
    volume: 7_200_000,
    status: "ok",
    oneLineThesis: "邊緣 AI 與旗艦 SoC 出貨能見度提升。",
  },
  "2317.TW": {
    ticker: "2317.TW",
    asOf: NOW,
    last: 215.5,
    changePct: 0.7,
    rangeDay: [213, 217.5],
    range52w: [102, 234],
    volume: 41_200_000,
    status: "ok",
    oneLineThesis: "AI server 訂單能見度延伸至 2026 H2。",
  },
};

export const MOCK_SYMBOL_TECHNICAL: Record<string, SymbolTechnicalSnapshot> = {
  "2330.TW": {
    ticker: "2330.TW",
    asOf: NOW,
    trend: "up",
    rsi14: 62.3,
    ma20: 1042,
    ma60: 985,
    ma200: 880,
    supportLevels: [1050, 1020, 980],
    resistanceLevels: [1100, 1130],
    patterns: ["上升通道", "MA20 守住"],
    notes: "短線過熱但中期趨勢未破。",
  },
  "0050.TW": {
    ticker: "0050.TW",
    asOf: NOW,
    trend: "up",
    rsi14: 58.0,
    ma20: 195.4,
    ma60: 188.2,
    supportLevels: [196, 192],
    resistanceLevels: [200, 205],
    patterns: ["多頭排列"],
  },
};

export const MOCK_SYMBOL_FUNDAMENTALS: Record<string, SymbolFundamentalSnapshot> = {
  "2330.TW": {
    ticker: "2330.TW",
    asOf: NOW,
    pe: 22.5,
    pb: 6.4,
    dividendYield: 1.5,
    epsTtm: 48.2,
    revenueGrowthYoy: 18.3,
    revenueMonthly: [
      { month: "2026-03", revenue: 285_000_000_000, yoy: 16.4 },
      { month: "2026-02", revenue: 250_000_000_000, yoy: 14.2 },
      { month: "2026-01", revenue: 270_000_000_000, yoy: 12.8 },
    ],
  },
};

export const MOCK_SYMBOL_AI_NOTES: Record<string, SymbolAINote> = {
  "2330.TW": {
    ticker: "2330.TW",
    asOf: NOW,
    thesis:
      "AI / HPC、先進製程與先進封裝仍是 2330 的長線主軸；但 5/15 後 TSM ADR 與美股半導體從高檔回落，外資籌碼也有鬆動跡象，週一應先當成『強基本面下的高檔壓力測試』，不要只因長線敘事強就追價。",
    whySelected:
      "台積電仍是台股權值與 AI 供應鏈核心；5/15 官方宣布擬出售世界先進約 8.1% 股權，理由是聚焦核心業務，且聲明不影響雙方矽中介層與 GaN 技術授權等合作。這更像資本配置事件，而非 2330 基本面轉弱；但短線市場可能先測試成熟製程情緒與外資賣壓。",
    trigger:
      "週一若 ADR / SOX / NVDA 止穩，2330 開低後跌幅快速收斂，0050 / 006208 同步守穩，且外資賣壓縮小或量縮止跌，才把 2330 從觀察升級為可行候選；若只是一開盤反彈但量價與權值 ETF 沒跟，不追。",
    invalidation:
      "若 2330 放量跌破短期關鍵支撐、外資續大賣，美股半導體未止跌，或市場把處分世界先進股權解讀成晶圓代工成熟製程風險擴散，則短線 thesis 失效，先降回防守觀察。",
    riskScenarios: [
      "ADR / SOX / NVDA 高檔回檔延續，帶動週一台股權值補跌",
      "外資持續賣超 2330，投信承接不足，籌碼面壓過基本面",
      "市場將處分世界先進股權誤讀或延伸成成熟製程風險，拖累半導體情緒",
      "AI capex 預期過熱後修正，導致高估值半導體一起降溫",
      "美元 / 台幣、關稅與地緣政治變數造成外資 risk-off",
    ],
    bias: "neutral",
    confidence: "medium",
    evidence: [
      {
        label: "2330 週末重大資訊整理（docs/research/2330-tsmc-2026-05-15-weekend-news.md）",
        kind: "internal-research",
      },
      {
        label: "台積公司擬出售 8.1% 世界先進公司股權",
        url: "https://pr.tsmc.com/chinese/news/3314",
        kind: "official-news",
      },
      {
        label: "Reuters：AI 驅動全球晶片市場成長",
        url: "https://www.reuters.com/world/asia-pacific/tsmc-says-global-chip-market-hit-15-trillion-by-2030-ai-drives-growth-2026-05-14/",
        kind: "news",
      },
    ],
  },
  "00878.TW": {
    ticker: "00878.TW",
    asOf: NOW,
    thesis: "防禦型高股息,適合作為波動市場的衛星部位。",
    whySelected: "成份股集中金融與電子,殖利率支撐下方。",
    trigger: "23.0 附近若守穩 + 量縮可考慮分批。",
    invalidation: "跌破 22.5 視為短期趨勢破壞。",
    riskScenarios: ["股息調降", "金融股壓力"],
    bias: "neutral",
    confidence: "medium",
  },
};
