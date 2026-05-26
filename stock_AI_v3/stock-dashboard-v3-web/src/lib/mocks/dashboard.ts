import type { DashboardSummary, MarketDriver } from "@/lib/contracts";
import { MOCK_CANDIDATES } from "./ideas";
import { MOCK_NEWS } from "./news";
import { MOCK_WATCHLIST } from "./watchlist";
import { MOCK_TODAY_CHECKPOINTS } from "./timeline";
import { MOCK_RECENT_CLOSE_REPORTS, MOCK_RECENT_WEEKLY_REPORTS } from "./reports";

export const MOCK_DRIVER: MarketDriver = {
  id: "driver-2026-04-26",
  headline: "AI capex 上修 + 美對中設備管制擴大,雙線拉鋸權值股。",
  detail:
    "TSMC 法說上修全年 capex,Foxconn 與 NVIDIA 擴大合作,強化 AI 主軸;另一方面美對中設備出口管制升溫,須留意供應鏈短期波動。",
  bias: "long",
  themes: ["AI", "半導體", "關稅"],
  relatedSymbols: ["2330.TW", "2317.TW", "2454.TW"],
  relatedNewsIds: ["n-001", "n-003", "n-004"],
  confidence: "medium",
  asOf: "2026-04-26T09:00:00+08:00",
};

export const MOCK_DASHBOARD: DashboardSummary = {
  asOf: "2026-04-26T13:30:00+08:00",
  marketSession: {
    market: "TW",
    phase: "close",
    isOpen: false,
    asOf: "2026-04-26T13:30:00+08:00",
  },
  // Source: public/data/dashboard.json (static-file mode). Keep in sync when static data is updated.
  indices: [
    { ticker: "TWII", name: "台股加權", last: 41172.36, changePct: -1.39, asOf: "2026-05-15T05:33:15.000Z" },
    { ticker: "TPEX", name: "櫃買指數", last: 245.8, changePct: 0.45, asOf: "2026-05-15T05:33:15.000Z" },
    { ticker: "USDTWD", name: "USD/TWD", last: 32.18, changePct: -0.05, asOf: "2026-05-15T05:33:15.000Z" },
  ],
  driver: MOCK_DRIVER,
  topIdeas: MOCK_CANDIDATES.slice(0, 4),
  watchlistDeltas: MOCK_WATCHLIST.slice(0, 4),
  topNews: MOCK_NEWS.filter((n) => !n.isLowSignal).slice(0, 4),
  todayCheckpoints: MOCK_TODAY_CHECKPOINTS,
  recentReports: [
    ...MOCK_RECENT_CLOSE_REPORTS.slice(0, 2).map((r) => ({
      id: `close-${r.date}`,
      kind: "close" as const,
      label: `Close Review ${r.date}`,
      href: r.href,
      asOf: `${r.date}T14:00:00+08:00`,
    })),
    ...MOCK_RECENT_WEEKLY_REPORTS.slice(0, 1).map((r) => ({
      id: `weekly-${r.week}`,
      kind: "weekly" as const,
      label: `Weekly ${r.week}`,
      href: r.href,
      asOf: "2026-04-25T15:00:00+08:00",
    })),
  ],
  systemSummary: {
    status: "warn",
    lastPublishedAt: "2026-04-26T13:04:12+08:00",
    warningCount: 1,
  },
};
