import { getAdapters } from "@/lib/adapters";
import { isAuthConfigured, requireSession } from "@/lib/auth/session";
import { isDbMode, dbReadSymbolInsights } from "@/app/api/v3/_lib/db-reader";
import { tryAsync, safeArray, safeText } from "@/lib/utils/safe";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PanelSection } from "@/components/shared/PanelSection";
import { SymbolHeader } from "@/components/symbol/SymbolHeader";
import { ExternalLinksCard } from "@/components/cards/ExternalLinksCard";
import { EvidenceCard } from "@/components/cards/EvidenceCard";
import { NewsCard } from "@/components/cards/NewsCard";
import { TimelineCheckpointCard } from "@/components/cards/TimelineCheckpointCard";
import { YahooCandlestickChartShell } from "@/components/chart/YahooCandlestickChartShell";
import { getYahooOhlc } from "@/lib/market/yahoo-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { confLabel } from "@/lib/utils/labels";
import { CustomResearchPanel } from "@/components/pools/CustomResearchPanel";
import { AIGenerateButton } from "@/components/symbol/AIGenerateButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export default async function SymbolDetailPage({ params }: PageProps) {
  const { ticker: rawTicker } = await params;
  const ticker = decodeURIComponent(rawTicker);
  const adapters = getAdapters();

  const authConfigured = isAuthConfigured();
  let researchAuthStatus: "not_configured" | "not_logged_in" | "logged_in" = "not_configured";
  if (authConfigured) {
    const session = await requireSession();
    researchAuthStatus = session ? "logged_in" : "not_logged_in";
  }

  const [
    profile,
    overview,
    technical,
    fundamentals,
    aiNote,
    news,
    checkpoints,
    yahooDayChart,
    yahooWeekChart,
    yahooMonthChart,
  ] = await Promise.all([
    tryAsync(() => adapters.symbol.getProfile(ticker)),
    tryAsync(() => adapters.symbol.getOverview(ticker)),
    tryAsync(() => adapters.symbol.getTechnical(ticker)),
    tryAsync(() => adapters.symbol.getFundamentals(ticker)),
    tryAsync(() => adapters.symbol.getAINote(ticker)),
    tryAsync(() => adapters.symbol.getNews(ticker)),
    tryAsync(() => adapters.symbol.getCheckpoints(ticker)),
    tryAsync(() => getYahooOhlc(ticker, { range: "6mo", interval: "1d" })),
    tryAsync(() => getYahooOhlc(ticker, { range: "2y", interval: "1wk" })),
    tryAsync(() => getYahooOhlc(ticker, { range: "5y", interval: "1mo" })),
  ]);

  // DB-mode: read symbol_insights for cross-page unified insight stream
  const dbInsights = isDbMode() ? dbReadSymbolInsights(ticker, 10) : null;
  const todayTw = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const latestDeepResearch = (dbInsights as Array<{
    source?: string;
    kind?: string;
    createdAt?: string;
    asOf?: string;
  }> | null)?.find((ins) =>
    ins.source === "research:on_demand" &&
    ins.kind === "ai_summary" &&
    ((ins.asOf ?? ins.createdAt ?? "").slice(0, 10) === todayTw)
  );

  return (
    <div className="flex flex-col gap-4">
      <SymbolHeader
        ticker={ticker}
        profile={profile.ok ? profile.value : null}
        overview={overview.ok ? overview.value : null}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="flex flex-col gap-4">
          {yahooDayChart.ok || yahooWeekChart.ok || yahooMonthChart.ok ? (
            <YahooCandlestickChartShell
              ticker={ticker}
              charts={{
                day: yahooDayChart.ok ? yahooDayChart.value : undefined,
                week: yahooWeekChart.ok ? yahooWeekChart.value : undefined,
                month: yahooMonthChart.ok ? yahooMonthChart.value : undefined,
              }}
            />
          ) : (
            <Card>
              <CardContent className="pt-4">
                <ErrorState title="K 線資料讀取失敗" detail={yahooDayChart.error.message} />
              </CardContent>
            </Card>
          )}

          <PanelSection
            title="AI 研判"
            description="AI 對該標的的看法、進場條件、失效條件、風險情境"
            rightSlot={
              researchAuthStatus === "logged_in" && isDbMode() ? (
                <AIGenerateButton
                  ticker={ticker}
                  hasExistingNote={aiNote.ok && !!aiNote.value}
                  asOf={aiNote.ok && aiNote.value ? aiNote.value.asOf : null}
                />
              ) : undefined
            }
          >
            {!aiNote.ok ? (
              <ErrorState detail={aiNote.error.message} />
            ) : !aiNote.value ? (
              <EmptyState title="尚未發布 AI 研判" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      研判摘要
                      <StatusBadge level={aiNote.value.bias} className="ml-auto" />
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm flex flex-col gap-2">
                    <p>{safeText(aiNote.value.thesis)}</p>
                    <DetailRow label="為何選入" value={aiNote.value.whySelected} />
                    <DetailRow label="進場條件" value={aiNote.value.trigger} />
                    <DetailRow label="失效條件" value={aiNote.value.invalidation} />
                    <DetailRow
                      label="風險情境"
                      value={
                        safeArray(aiNote.value.riskScenarios).length
                          ? aiNote.value.riskScenarios!.map((r) => `• ${r}`).join("\n")
                          : null
                      }
                    />
                    <div className="flex items-center gap-2 mt-1">
                      {aiNote.value.confidence && (
                        <Badge variant="info">信心：{confLabel(aiNote.value.confidence)}</Badge>
                      )}
                      <DataFreshnessBadge asOf={aiNote.value.asOf} />
                    </div>
                  </CardContent>
                </Card>
                <EvidenceCard
                  evidence={aiNote.value.evidence}
                  provenance={aiNote.value.provenance}
                />
              </div>
            )}
          </PanelSection>

          <PanelSection title="今日觀察點">
            {!checkpoints.ok ? (
              <ErrorState detail={checkpoints.error.message} />
            ) : safeArray(checkpoints.value).length === 0 ? (
              <EmptyState description="此標的今日尚無觀察點。" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {checkpoints.value.map((c) => (
                  <TimelineCheckpointCard key={c.id} c={c} />
                ))}
              </div>
            )}
          </PanelSection>

          {/* DB mode: show latest insights from shared symbol_insights table */}
          {dbInsights !== null && (
            <PanelSection
              title="最新同步洞察"
              description="來自 symbol_insights DB — pipeline / 研究請求 / 手動 note 共用同一來源"
            >
              {dbInsights.length === 0 ? (
                <EmptyState description="此標的尚無洞察記錄。可透過即時研究或 pipeline 寫入。" />
              ) : (
                <div className="flex flex-col gap-2">
                  {(dbInsights as Array<{
                    id: string;
                    source: string;
                    kind: string;
                    title?: string | null;
                    body: string;
                    confidence?: string | null;
                    createdAt?: string;
                  }>).map((ins) => (
                    <Card key={ins.id}>
                      <CardContent className="pt-3 pb-3 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {ins.source}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {ins.kind}
                          </Badge>
                          {ins.confidence && (
                            <Badge variant="info" className="text-[10px]">
                              信心：{ins.confidence}
                            </Badge>
                          )}
                          <span className="ml-auto text-muted-foreground text-[10px]">
                            {ins.createdAt ? ins.createdAt.slice(0, 16).replace("T", " ") : ""}
                          </span>
                        </div>
                        {ins.title && (
                          <p className="font-medium text-foreground/90">{ins.title}</p>
                        )}
                        <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                          {ins.body}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </PanelSection>
          )}

          <CollapsibleSection title="技術面">
            {!technical.ok ? (
              <ErrorState detail={technical.error.message} />
            ) : !technical.value ? (
              <EmptyState />
            ) : (
              <Card>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 text-xs">
                  <Stat label="趨勢" value={safeText(technical.value.trend)} />
                  <Stat label="RSI(14)" value={fmt(technical.value.rsi14)} />
                  <Stat label="MA20" value={fmt(technical.value.ma20)} />
                  <Stat label="MA60" value={fmt(technical.value.ma60)} />
                  <Stat label="MA200" value={fmt(technical.value.ma200)} />
                  <Stat
                    label="支撐"
                    value={(technical.value.supportLevels ?? []).join(", ") || "—"}
                  />
                  <Stat
                    label="壓力"
                    value={(technical.value.resistanceLevels ?? []).join(", ") || "—"}
                  />
                  <Stat
                    label="型態"
                    value={(technical.value.patterns ?? []).join("、") || "—"}
                  />
                </CardContent>
              </Card>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="基本面" description="台股月營收、本益比、籌碼等基本面資訊">
            {!fundamentals.ok ? (
              <ErrorState detail={fundamentals.error.message} />
            ) : !fundamentals.value ? (
              <EmptyState />
            ) : (
              <Card>
                <CardContent className="pt-4 flex flex-col gap-3 text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Stat label="本益比" value={fmt(fundamentals.value.pe)} />
                    <Stat label="股價淨值比" value={fmt(fundamentals.value.pb)} />
                    <Stat
                      label="殖利率"
                      value={fmt(fundamentals.value.dividendYield, "%")}
                    />
                    <Stat label="EPS TTM" value={fmt(fundamentals.value.epsTtm)} />
                    <Stat
                      label="營收年增"
                      value={fmt(fundamentals.value.revenueGrowthYoy, "%")}
                    />
                  </div>
                  {safeArray(fundamentals.value.revenueMonthly).length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        月營收
                      </div>
                      <table className="text-xs w-full">
                        <thead className="text-muted-foreground">
                          <tr>
                            <th className="text-left">月份</th>
                            <th className="text-right">營收</th>
                            <th className="text-right">YoY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fundamentals.value.revenueMonthly!.map((r) => (
                            <tr key={r.month}>
                              <td>{r.month}</td>
                              <td className="text-right font-mono">
                                {r.revenue?.toLocaleString() ?? "—"}
                              </td>
                              <td className="text-right font-mono">{fmt(r.yoy, "%")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="相關消息">
            {!news.ok ? (
              <ErrorState detail={news.error.message} />
            ) : safeArray(news.value).length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-2">
                {news.value.map((n) => (
                  <NewsCard key={n.id} n={n} />
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="深度研究 / 快速問答" description="先建立同日深度研究，再用問題追問，避免空中回答">
            {researchAuthStatus === "not_configured" ? (
              <SymbolResearchAuthGate status="not_configured" />
            ) : researchAuthStatus === "not_logged_in" ? (
              <SymbolResearchAuthGate status="not_logged_in" />
            ) : (
              <CustomResearchPanel
                defaultTicker={ticker}
                hasFreshDeepResearch={!!latestDeepResearch}
                latestDeepResearchAt={latestDeepResearch?.createdAt ?? null}
              />
            )}
          </CollapsibleSection>

          <CollapsibleSection title="圖表說明">
            <Card>
              <CardContent className="pt-4 text-xs leading-relaxed text-muted-foreground">
                已改用 GitHub 開源套件 `tradingview/lightweight-charts` 繪製 K 線，資料直接來自 Yahoo Finance v8 chart API 的 OHLC/volume；日 K、週 K、月 K 分別抓 Yahoo 對應 interval，不再使用 TradingView iframe/embed，也不再使用合成趨勢資料。
              </CardContent>
            </Card>
          </CollapsibleSection>
        </div>

        <aside className="flex flex-col gap-4">
          <ExternalLinksCard
            links={profile.ok ? profile.value?.externalLinks : []}
            fallbackTicker={ticker}
          />
        </aside>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border border-border bg-card overflow-hidden group">
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-accent/30 transition-colors list-none">
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">{title}</span>
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground ml-3 shrink-0">展開 ▸</span>
      </summary>
      <div className="px-4 pb-4 pt-2 flex flex-col gap-3">{children}</div>
    </details>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-xs whitespace-pre-wrap text-foreground/85">{safeText(value)}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

function SymbolResearchAuthGate({ status }: { status: "not_configured" | "not_logged_in" }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-lg">🔒</div>
      {status === "not_configured" ? (
        <>
          <p className="text-sm font-medium">即時研究功能受保護</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            登入機制尚未設定。請設定環境變數 AUTH_USERNAME、AUTH_PASSWORD_HASH_B64、SESSION_SECRET 後重啟。
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">需要登入</p>
          <p className="text-xs text-muted-foreground">即時研究功能需要有效的使用者 session，請先登入。</p>
          <Link href="/login">
            <Button size="sm">前往登入</Button>
          </Link>
        </>
      )}
    </div>
  );
}

function fmt(v: number | null | undefined, suffix = ""): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${v.toLocaleString()}${suffix}`;
}
