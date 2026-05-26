import type { CloseReview, WeeklyReview } from "@/lib/contracts";

export const MOCK_CLOSE_REVIEW: CloseReview = {
  date: "2026-04-25",
  directionVerdict: "bull",
  thesisAccuracyScore: 0.78,
  whatWorked: [
    "AI 主線判斷正確,權值股領漲。",
    "盤前判斷美股影響為偏多,結果一致。",
  ],
  whatFailed: [
    "高股息部位錯估,當日表現落後大盤。",
    "對航運回檔深度低估。",
  ],
  nextDayWatchpoints: [
    "外資是否延續買超權值股。",
    "Fed 官員談話對 risk-on 影響。",
    "TSMC 法說後的籌碼變化。",
  ],
  tickerResults: [
    {
      ticker: "2330.TW",
      thesis: "AI 多頭續抱",
      outcome: "worked",
      comment: "+1.4%,符合預期。",
    },
    {
      ticker: "00878.TW",
      thesis: "防禦衛星",
      outcome: "mixed",
      comment: "震盪整理,落後大盤。",
    },
    {
      ticker: "2603.TW",
      thesis: "迴避",
      outcome: "worked",
      comment: "下跌 -1.8%,迴避正確。",
    },
  ],
  analysisLayerStatus: [
    { layer: "macro", status: "ok" },
    { layer: "technical", status: "ok" },
    { layer: "news", status: "warn", note: "RSS 來源延遲。" },
    { layer: "ai_synthesis", status: "ok" },
  ],
  asOf: "2026-04-25T14:00:00+08:00",
};

export const MOCK_WEEKLY_REVIEW: WeeklyReview = {
  week: "2026-W17",
  summary: "本週 AI 主軸延續,權值股強勢,中小型輪動明顯。",
  keyWins: [
    "TSMC 趨勢判斷正確",
    "鴻海 AI server 續抱",
    "迴避航運股",
  ],
  keyMisses: [
    "高股息持平,未跟上大盤",
    "對 Fed 談話影響反應慢半拍",
  ],
  biasObservations: [
    "對權值股偏樂觀,合理且結果支持。",
    "對中小型股略保守,錯失部分輪動。",
  ],
  nextWeekAdjustments: [
    "縮短盤前判斷迴圈,加入 Fed 談話即時 watchpoint。",
    "加強對中小型股的輪動偵測。",
  ],
  dailyReviews: [
    { date: "2026-04-21", oneLine: "權值股震盪", verdict: "neutral", accuracy: 0.6 },
    { date: "2026-04-22", oneLine: "AI 主軸啟動", verdict: "bull", accuracy: 0.82 },
    { date: "2026-04-23", oneLine: "整理日", verdict: "mixed", accuracy: 0.55 },
    { date: "2026-04-24", oneLine: "權值轉強", verdict: "bull", accuracy: 0.74 },
    { date: "2026-04-25", oneLine: "外資加碼", verdict: "bull", accuracy: 0.78 },
  ],
  asOf: "2026-04-25T15:00:00+08:00",
};

export const MOCK_RECENT_CLOSE_REPORTS = [
  { date: "2026-04-25", href: "/reports/close/2026-04-25" },
  { date: "2026-04-24", href: "/reports/close/2026-04-24" },
  { date: "2026-04-23", href: "/reports/close/2026-04-23" },
];

export const MOCK_RECENT_WEEKLY_REPORTS = [
  { week: "2026-W17", href: "/reports/weekly/2026-W17" },
  { week: "2026-W16", href: "/reports/weekly/2026-W16" },
];
