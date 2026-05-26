import type { HoldingItem, VolatileRadarItem } from "@/lib/contracts";
import type { Candidate } from "@/lib/contracts";

/** 持倉監控池：已持有，每日評估是否續抱/減碼/賣出 */
export const MOCK_HOLDING_POOL: HoldingItem[] = [
  {
    id: "h-001",
    ticker: "2330.TW",
    name: "台積電",
    kind: "stock",
    holdingSince: "2025-10-15T00:00:00+08:00",
    entryNote: "AI / HPC 結構性多頭主軸，法說 guidance 上修後加碼。",
    continuationVerdict: "watch",
    shippingWarning:
      "5/15 後 ADR 與美股半導體回檔，外資連兩日轉賣超；世界先進股權處分事件引發市場聯想，注意週一補跌後能否收斂。",
    thesisValid: true,
    thesisSummary: "N3/N2 產能滿載，CoWoS 供應緊俏，AI capex 需求未見轉折。",
    sellTrigger: "跌破 MA60 (2150) 且無利多催化 → 減碼至半倉。",
    invalidation: "AI capex 客戶縮減訂單 or 美對台半導體加碼制裁。",
    tags: ["核心", "AI", "半導體"],
    statusLevel: "warn",
    asOf: "2026-05-17T09:30:00+08:00",
  },
  {
    id: "h-002",
    ticker: "0050.TW",
    name: "元大台灣50",
    kind: "etf",
    holdingSince: "2024-03-01T00:00:00+08:00",
    entryNote: "市值型核心，長線定期定額策略。",
    continuationVerdict: "hold",
    shippingWarning: null,
    thesisValid: true,
    thesisSummary: "台股指數多頭結構未破，0050 作為大盤代理部位持續持有。",
    sellTrigger: "指數跌破季線且外資連續 10 日賣超 → 評估減碼。",
    invalidation: "台股結構性空頭（指數跌破年線）。",
    tags: ["核心", "市值型", "ETF"],
    statusLevel: "ok",
    asOf: "2026-05-17T09:30:00+08:00",
  },
  {
    id: "h-003",
    ticker: "2382.TW",
    name: "廣達",
    kind: "stock",
    holdingSince: "2026-02-10T00:00:00+08:00",
    entryNote: "AI server ODM 龍頭，受惠 GB200 NVL72 大量出貨。",
    continuationVerdict: "hold",
    shippingWarning: "近期股價反映大量利多，短線漲幅超前基本面，留意若出現大量換手。",
    thesisValid: true,
    thesisSummary: "CSP 客戶 AI capex 持續上修，廣達拿單比例維持。Q2 法說前為觀察重點。",
    sellTrigger: "Q2 法說展望不如預期 or 股價跌破 280 (MA20)。",
    invalidation: "AI server 訂單出現重大取消 or 競爭對手搶單。",
    tags: ["AI server", "ODM"],
    statusLevel: "ok",
    asOf: "2026-05-17T09:30:00+08:00",
  },
];

/**
 * 機會候選池：未持有的候選股，尋找可能發動、值得觀察或交易的標的。
 * 刻意迴避台積電/日月光等超大型權值，專注中小型題材股。
 */
export const MOCK_OPPORTUNITY_POOL: Candidate[] = [
  {
    id: "op-001",
    ticker: "3035.TW",
    name: "智原",
    kind: "stock",
    role: "watch",
    summary: "客製化 ASIC 設計領域切入 AI 推論晶片，法人籌碼開始異動。",
    whySelected:
      "智原（3035）與台積電合作 N5/N3 ASIC 設計服務，隨 AI 推論晶片需求爆發，客戶委託設計案件增加；本益比仍低於同業，具補漲空間。觀察法人持續買超是否延續。",
    trigger: "站上 520 且法人買超連 3 日。",
    invalidation: "跌破 495 (月線支撐) 且成交量萎縮。",
    risk: "ASIC 設計服務毛利率波動，單一大客戶集中風險。",
    themes: ["ASIC", "AI 推論", "IC 設計"],
    relatedNewsIds: [],
    confidence: "medium",
    hasNews: false,
    asOf: "2026-05-17T09:30:00+08:00",
  },
  {
    id: "op-002",
    ticker: "6669.TW",
    name: "緯穎",
    kind: "stock",
    role: "starter",
    summary: "超大規模 AI 伺服器 ODM，液冷機櫃出貨量加速，訂單能見度延伸至 2027。⚠️ 以下價位為 prototype 範例，非實際建議。",
    whySelected:
      "緯穎聚焦超高端 AI server，與微軟/META 直接合作，毛利率較同業高。液冷技術壁壘高，競爭者追趕需 2-3 年；現股價回測支撐，風報比合理。判斷依據：法人報告上調 EPS 預估 15%，本益比 22x 合理區間。",
    trigger: "（範例）回測 1680 不破且量縮整理 → 分批進場。",
    invalidation: "（範例）跌破 1600 (季線) 且量增 → 停損。",
    risk: "CSP 客戶 capex 砍單、液冷方案替代競爭。",
    themes: ["AI server", "液冷", "ODM"],
    relatedNewsIds: [],
    confidence: "high",
    hasNews: false,
    asOf: "2026-05-17T09:30:00+08:00",
  },
  {
    id: "op-003",
    ticker: "3529.TW",
    name: "力旺",
    kind: "stock",
    role: "observe",
    summary: "嵌入式非揮發記憶體 IP 授權，AI 端側推論晶片需求帶動授權金成長。",
    whySelected:
      "力旺授權 eMRAM/eFlash IP 給全球 IC 設計公司，每顆 AI 邊緣晶片均需記憶體 IP；授權金具備高重複性，無製造風險。股價仍在高點半腰，需等待整理完成再進場。觀察方向：Q2 授權金收入是否超預期。",
    trigger: "站回 1600 且外資轉買。",
    invalidation: "跌破 1480 (半年線)。",
    risk: "IP 授權談判週期長，新客戶開發不如預期。",
    themes: ["IP 授權", "eMRAM", "AI 邊緣"],
    relatedNewsIds: [],
    confidence: "medium",
    hasNews: false,
    asOf: "2026-05-17T09:30:00+08:00",
  },
];

/** 高波動/妖股雷達：異常量價、題材發酵、短線強弱。高風險，附失效條件。 */
export const MOCK_VOLATILE_RADAR: VolatileRadarItem[] = [
  {
    id: "vr-001",
    ticker: "2371.TW",
    name: "大同",
    radarReason:
      "綠能/儲能題材持續發酵，5/16 單日成交量放大至 3 萬張（5 日均量 8,000 張），漲停次數增加，短線強勢但籌碼混亂。",
    abnormalVolume: true,
    theme: "綠能/儲能",
    shortStrength: "strong",
    riskNote:
      "⚠️ 高風險：大同歷史上多次炒作後急速拉回，基本面與股價嚴重脫節，散戶追高容易套牢。本波無基本面支撐，純粹題材炒作，建議只做短線當沖或不碰。",
    invalidation: "跌破 5 日均線且量縮 → 題材退燒，立即退場。",
    tags: ["妖股", "題材", "高風險"],
    asOf: "2026-05-17T09:30:00+08:00",
  },
  {
    id: "vr-002",
    ticker: "2404.TW",
    name: "漢唐",
    radarReason:
      "半導體廠務工程需求旺盛，台積電/三星海外廠擴建帶動廠務訂單，法人買超連 5 日，股價突破近半年盤整區。",
    abnormalVolume: false,
    theme: "半導體廠務",
    shortStrength: "strong",
    riskNote:
      "⚠️ 中高風險：漢唐受惠題材明確但集中，若大廠資本支出砍單或工程延誤，訂單能見度將快速下降。股價短期漲幅已大，需等回檔確認支撐後再跟進。",
    invalidation: "跌破 290 (突破前壓力轉支撐) 且外資轉賣 → 停損。",
    tags: ["廠務", "半導體", "法人追蹤"],
    asOf: "2026-05-17T09:30:00+08:00",
  },
  {
    id: "vr-003",
    ticker: "8046.TW",
    name: "矽統",
    radarReason:
      "近三日量價出現異常：成交量暴增 5 倍，盤中出現多次巨型委買掛單，疑似主力拉抬，原因不明。",
    abnormalVolume: true,
    theme: "不明/觀察",
    shortStrength: "neutral",
    riskNote:
      "⚠️ 極高風險：量價異常原因不明，基本面無明顯催化，疑似人為操控。嚴禁追價，若已持有應設好停損。此類異常通常伴隨急拉後急跌。",
    invalidation: "任何確認主力出貨訊號（大量急拉後長上影線）→ 立即退場。",
    tags: ["妖股", "量價異常", "極高風險"],
    asOf: "2026-05-17T09:30:00+08:00",
  },
];
