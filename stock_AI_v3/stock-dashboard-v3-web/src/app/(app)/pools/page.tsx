import Link from "next/link";
import { getAdapters } from "@/lib/adapters";
import { tryAsync, safeArray } from "@/lib/utils/safe";
import { PanelSection } from "@/components/shared/PanelSection";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { CandidateEvidenceSummary } from "@/components/shared/CandidateEvidenceSummary";
import { safeText } from "@/lib/utils/safe";
import { shortStrengthLabel } from "@/lib/utils/labels";
import type {
  Candidate,
  DailyCheckpoint,
  SymbolOverview,
  SymbolTechnicalSnapshot,
  VolatileRadarItem,
} from "@/lib/contracts";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { dbReadPortfolioPositions, isDbMode } from "@/app/api/v3/_lib/db-reader";
import { AddPositionPanel, PortfolioCloseButton } from "@/components/pools/PortfolioActions";

type PortfolioPosition = {
  id: string;
  ticker: string;
  name?: string;
  quantity: number;
  avgCost: number;
  currency?: string;
  thesis?: string;
  stopLoss?: number;
  target?: number;
  openedAt?: string;
  status?: string;
  note?: string;
};

type PortfolioMonitorLevel = "ok" | "info" | "warn" | "critical" | "unknown";

type PortfolioMonitor = {
  level: PortfolioMonitorLevel;
  verdict: string;
  overview?: SymbolOverview | null;
  technical?: SymbolTechnicalSnapshot | null;
  latestCheckpoint?: DailyCheckpoint | null;
  pnlPct?: number;
  stopDistancePct?: number;
  targetDistancePct?: number;
  monitorNote?: string;
};

type MonitoredPortfolioPosition = PortfolioPosition & {
  monitor: PortfolioMonitor;
};

async function getActualPortfolioPositions(): Promise<PortfolioPosition[]> {
  if (!isDbMode()) return [];
  const rows = dbReadPortfolioPositions();
  return Array.isArray(rows) ? (rows as PortfolioPosition[]) : [];
}

export const dynamic = "force-dynamic";

export default async function PoolsPage() {
  const adapters = getAdapters();
  const [portfolioPositions, opportunities, volatileRadar] = await Promise.all([
    tryAsync(() => getActualPortfolioPositions()),
    tryAsync(() => adapters.pools.getOpportunities()),
    tryAsync(() => adapters.pools.getVolatileRadar()),
  ]);

  const monitoredPortfolioPositions: MonitoredPortfolioPosition[] = portfolioPositions.ok
    ? await Promise.all(
        safeArray(portfolioPositions.value).map(async (position) => ({
          ...position,
          monitor: await getPortfolioMonitor(position, adapters),
        }))
      )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">分池監控</h1>
        <p className="text-xs text-muted-foreground">
          實際持倉 · 機會候選 · 高波動雷達｜實際持倉是唯一持倉來源；候選與雷達只做觀察，不混成持倉
        </p>
      </header>

      {/* Actual portfolio positions: persisted DB holdings */}
      <PanelSection
        title="實際持倉"
        description="讀取 portfolio_positions DB；這裡是唯一的持倉來源。AI 檢查之後應直接接在每筆實際持倉上，不再另外做平行持倉名單。"
      >
        {!portfolioPositions.ok ? (
          <ErrorState detail={portfolioPositions.error.message} />
        ) : safeArray(portfolioPositions.value).length === 0 ? (
          <EmptyState
            title="目前沒有實際持倉資料"
            description="若你已新增持倉但這裡是空的，代表目前不是 DB mode (V3_API_SOURCE=db)，或 portfolio_positions 尚未寫入。使用下方「新增持倉」表單可新增（需 DB 模式 + 登入）。"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {monitoredPortfolioPositions.map((position) => (
              <div key={position.id} className="flex flex-col gap-1">
                <PortfolioPositionCard position={position} />
                <PortfolioCloseButton positionId={position.id} ticker={position.ticker} />
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <AddPositionPanel />
        </div>
      </PanelSection>

      {/* Pool 2: 機會候選池 */}
      <PanelSection
        title="機會候選池"
        description="未持有候選股 · 尋找可能發動、值得觀察或交易的標的 · 聚焦中小型題材，迴避超大型權值股"
      >
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span className="text-xs text-muted-foreground">
            未達觸發條件前不進場；以判斷依據、觀察邏輯為決策核心
          </span>
        </div>
        {!opportunities.ok ? (
          <ErrorState detail={opportunities.error.message} />
        ) : safeArray(opportunities.value).length === 0 ? (
          <EmptyState title="機會候選池暫無資料" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {opportunities.value.map((c) => (
              <OpportunityCard key={c.id} item={c} />
            ))}
          </div>
        )}
      </PanelSection>

      {/* Pool 3: 高波動/妖股雷達 */}
      <PanelSection
        title="高波動 / 妖股雷達"
        description="異常量價 · 題材發酵 · 短線強弱追蹤 · 每筆均標明風險等級與失效條件"
      >
        <div className="flex items-center gap-1.5 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            高風險區域：此池標的均具高度投機性，請嚴守失效條件並控制倉位
          </span>
        </div>
        {!volatileRadar.ok ? (
          <ErrorState detail={volatileRadar.error.message} />
        ) : safeArray(volatileRadar.value).length === 0 ? (
          <EmptyState title="妖股雷達暫無追蹤標的" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {volatileRadar.value.map((v) => (
              <VolatileCard key={v.id} item={v} />
            ))}
          </div>
        )}
      </PanelSection>

    </div>
  );
}

async function getPortfolioMonitor(
  position: PortfolioPosition,
  adapters: ReturnType<typeof getAdapters>
): Promise<PortfolioMonitor> {
  const [overview, technical, checkpoints] = await Promise.all([
    adapters.symbol.getOverview(position.ticker),
    adapters.symbol.getTechnical(position.ticker),
    adapters.symbol.getCheckpoints(position.ticker),
  ]);

  const latestCheckpoint = safeArray(checkpoints).find((checkpoint) =>
    safeArray(checkpoint.linkedSymbols).includes(position.ticker)
  ) ?? safeArray(checkpoints)[0] ?? null;

  const last = typeof overview?.last === "number" ? overview.last : undefined;
  const pnlPct = last && position.avgCost
    ? ((last - position.avgCost) / position.avgCost) * 100
    : undefined;
  const stopDistancePct = last && position.stopLoss
    ? ((last - position.stopLoss) / last) * 100
    : undefined;
  const targetDistancePct = last && position.target
    ? ((position.target - last) / last) * 100
    : undefined;

  let level: PortfolioMonitorLevel = "ok";
  let verdict = "續抱監控中";
  let monitorNote = "Thesis、停損、目標與最新行情一起追蹤。";

  if (!last) {
    level = "unknown";
    verdict = "等待行情";
    monitorNote = "目前缺少最新價，先只保留持倉紀錄與 thesis。";
  } else if (position.stopLoss && last <= position.stopLoss) {
    level = "critical";
    verdict = "觸及停損";
    monitorNote = "最新價已低於/等於停損，應優先檢查是否要退場。";
  } else if (typeof stopDistancePct === "number" && stopDistancePct <= 3) {
    level = "warn";
    verdict = "接近停損";
    monitorNote = "距離停損小於 3%，需要提高監控頻率。";
  } else if (position.target && last >= position.target) {
    level = "info";
    verdict = "達到目標";
    monitorNote = "最新價已達目標價，應檢查是否分批停利或上修 thesis。";
  } else if (typeof targetDistancePct === "number" && targetDistancePct >= 0 && targetDistancePct <= 3) {
    level = "info";
    verdict = "接近目標";
    monitorNote = "距離目標價小於 3%，可先規劃停利/續抱條件。";
  } else if (!position.thesis) {
    level = "warn";
    verdict = "缺少 Thesis";
    monitorNote = "缺少持有理由，後續不容易判斷續抱或停損。";
  } else if (overview?.status === "warn" || overview?.status === "critical") {
    level = overview.status === "critical" ? "critical" : "warn";
    verdict = overview.status === "critical" ? "行情警報" : "行情提醒";
    monitorNote = overview.oneLineThesis ?? monitorNote;
  }

  return {
    level,
    verdict,
    overview,
    technical,
    latestCheckpoint,
    pnlPct,
    stopDistancePct,
    targetDistancePct,
    monitorNote,
  };
}

function PortfolioPositionCard({ position }: { position: MonitoredPortfolioPosition }) {
  const currency = position.currency ?? "TWD";
  const formatMoney = (value?: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? `${currency} ${value.toLocaleString()}`
      : undefined;
  const formatPct = (value?: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
      : undefined;
  const monitorVariant = {
    ok: "success",
    info: "info",
    warn: "warn",
    critical: "danger",
    unknown: "muted",
  }[position.monitor.level] as "success" | "info" | "warn" | "danger" | "muted";
  const last = position.monitor.overview?.last ?? undefined;
  const trend = position.monitor.technical?.trend;
  const rsi = position.monitor.technical?.rsi14;

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/symbols/${encodeURIComponent(position.ticker)}`}
              className="font-semibold text-sm hover:underline"
            >
              {position.ticker}
            </Link>
            {position.name && (
              <span className="text-xs text-muted-foreground ml-1.5">{position.name}</span>
            )}
          </div>
          <Badge variant="outline" className="text-[10px]">
            {position.status ?? "active"}
          </Badge>
        </div>
        {position.openedAt && (
          <div className="mt-1">
            <DataFreshnessBadge asOf={position.openedAt} />
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <PoolField label="最新價" value={formatMoney(last ?? undefined)} />
          <PoolField label="未實現" value={formatPct(position.monitor.pnlPct)} />
          <PoolField label="數量" value={position.quantity?.toLocaleString()} />
          <PoolField label="均價" value={formatMoney(position.avgCost)} />
          <PoolField label="停損" value={formatMoney(position.stopLoss)} />
          <PoolField label="目標" value={formatMoney(position.target)} />
        </div>
        <div className="rounded-md border border-border/70 bg-background/70 p-2">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              持倉監控
            </span>
            <Badge variant={monitorVariant} className="text-[10px]">
              {position.monitor.verdict}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PoolField label="離停損" value={formatPct(position.monitor.stopDistancePct)} />
            <PoolField label="離目標" value={formatPct(position.monitor.targetDistancePct)} />
            <PoolField
              label="趨勢 / RSI"
              value={trend ? `${trend}${typeof rsi === "number" ? ` / ${rsi.toFixed(1)}` : ""}` : undefined}
            />
            <PoolField label="行情時間" value={position.monitor.overview?.asOf} />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {position.monitor.monitorNote}
          </p>
          {position.monitor.latestCheckpoint?.summary && (
            <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">
              {position.monitor.latestCheckpoint.summary}
            </p>
          )}
        </div>
        <PoolField label="持倉 Thesis" value={position.thesis} />
        {position.note && <PoolField label="備註" value={position.note} />}
      </CardContent>
    </Card>
  );
}

function OpportunityCard({ item }: { item: Candidate }) {
  const roleColor = {
    starter: "bg-green-500/10 text-green-700 dark:text-green-400",
    watch: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    observe: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    avoid: "bg-red-500/10 text-red-700 dark:text-red-400",
  }[item.role ?? ""] ?? "bg-muted text-muted-foreground";

  const roleLabel = {
    starter: "可進場",
    watch: "觀察中",
    observe: "遠期關注",
    avoid: "迴避",
  }[item.role ?? ""] ?? item.role ?? "—";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/symbols/${encodeURIComponent(item.ticker)}`}
              className="font-semibold text-sm hover:underline"
            >
              {item.ticker}
            </Link>
            {item.name && (
              <span className="text-xs text-muted-foreground ml-1.5">{item.name}</span>
            )}
          </div>
          {item.confidence && (
            <Badge variant="info" className="text-[10px]">
              信心：{item.confidence === "high" ? "高" : item.confidence === "medium" ? "中" : "低"}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {item.role && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColor}`}>
              {roleLabel}
            </span>
          )}
          {item.asOf && <DataFreshnessBadge asOf={item.asOf} />}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        {item.summary && (
          <p className="text-foreground/90 leading-relaxed">{item.summary}</p>
        )}
        {item.whySelected && (
          <PoolField label="為什麼關注" value={item.whySelected} />
        )}
        <PoolField label="進場觸發" value={item.trigger} />
        <PoolField label="失效條件" value={item.invalidation} />
        <PoolField label="主要風險" value={item.risk} />
        {safeArray(item.themes).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {item.themes!.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        )}
        <CandidateEvidenceSummary evidence={item.evidence} />
      </CardContent>
    </Card>
  );
}

function VolatileCard({ item }: { item: VolatileRadarItem }) {
  const strengthColor = {
    strong: "text-green-600 dark:text-green-400",
    neutral: "text-muted-foreground",
    weak: "text-red-600 dark:text-red-400",
  }[item.shortStrength ?? ""] ?? "text-muted-foreground";

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/symbols/${encodeURIComponent(item.ticker)}`}
              className="font-semibold text-sm hover:underline"
            >
              {item.ticker}
            </Link>
            {item.name && (
              <span className="text-xs text-muted-foreground ml-1.5">{item.name}</span>
            )}
          </div>
          {item.shortStrength && (
            <span className={`text-xs font-semibold ${strengthColor}`}>
              {shortStrengthLabel(item.shortStrength)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {item.abnormalVolume && (
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
              量能異常
            </Badge>
          )}
          {item.theme && (
            <Badge variant="outline" className="text-[10px]">
              {item.theme}
            </Badge>
          )}
          {item.asOf && <DataFreshnessBadge asOf={item.asOf} />}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        <PoolField label="進雷達原因" value={item.radarReason} />
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2">
          <span className="text-[10px] uppercase tracking-wider text-red-600 dark:text-red-400">
            風險說明
          </span>
          <p className="text-red-700 dark:text-red-300 mt-0.5 leading-relaxed">{item.riskNote}</p>
        </div>
        <PoolField label="失效條件" value={item.invalidation} />
        {safeArray(item.tags).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {item.tags!.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PoolField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-foreground/85 leading-relaxed">{safeText(value)}</span>
    </div>
  );
}
