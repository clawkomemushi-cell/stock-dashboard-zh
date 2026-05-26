import Link from "next/link";
import { getAdapters } from "@/lib/adapters";
import { tryAsync, safeArray, safePercent } from "@/lib/utils/safe";
import { PanelSection } from "@/components/shared/PanelSection";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { CandidateCard } from "@/components/cards/CandidateCard";
import { NewsCard } from "@/components/cards/NewsCard";
import { WatchlistItemCard } from "@/components/cards/WatchlistItemCard";
import { TimelineCheckpointCard } from "@/components/cards/TimelineCheckpointCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const adapters = getAdapters();
  const result = await tryAsync(() => adapters.dashboard.getSummary());

  if (!result.ok) {
    return (
      <ErrorState
        title="總覽載入失敗"
        description="這通常代表 adapter 層失敗。其他頁面仍可訪問。"
        detail={result.error.message}
      />
    );
  }
  const d = result.value;

  // Derive AI cockpit content from available data
  const biasRaw = d.driver?.bias;
  const biasLabel =
    biasRaw === "long" ? "偏多" :
    biasRaw === "short" ? "偏空" :
    biasRaw === "avoid" ? "避開" : "觀望";
  const biasColor =
    biasRaw === "long" ? "text-[hsl(var(--bull))]" :
    biasRaw === "short" ? "text-[hsl(var(--bear))]" : "text-muted-foreground";
  const cockpitObs: string[] = [];
  for (const cp of safeArray(d.todayCheckpoints).slice(0, 2)) {
    if (cp.summary) cockpitObs.push(cp.summary);
  }
  for (const idea of safeArray(d.topIdeas).slice(0, 3 - cockpitObs.length)) {
    if (idea.summary) cockpitObs.push(`${idea.ticker}：${idea.summary}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* AI Cockpit — full-width, first thing visible on mobile */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">今日 AI 結論</span>
            <div className="flex items-center gap-2">
              <DataFreshnessBadge asOf={d.driver?.asOf} />
              <span className={`text-xs font-bold tabular-nums ${biasColor}`}>
                {biasLabel}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium leading-snug">
              {d.driver?.headline ?? "今日尚無 AI 結論，請稍候資料更新。"}
            </p>
            {d.driver?.detail && (
              <p className="text-xs text-muted-foreground">
                行動建議：{d.driver.detail}
              </p>
            )}
            {cockpitObs.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  觀察重點
                </span>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {cockpitObs.map((o, idx) => (
                    <li key={idx} className="flex gap-1">
                      <span className="shrink-0">·</span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top row: market state — driver first on mobile, system health last */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">主要盤面驅動</span>
              {d.driver?.bias && <StatusBadge level={d.driver.bias} />}
            </div>
          </CardHeader>
          <CardContent>
            {d.driver ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{d.driver.headline}</p>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {d.driver.detail}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {safeArray(d.driver.themes).map((t) => (
                    <Badge key={t} variant="secondary">#{t}</Badge>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="尚無主線" description="今日尚未發布盤面驅動。" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">市場狀態</span>
              <StatusBadge level={d.marketSession?.phase} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{d.marketSession?.market ?? "—"}</Badge>
              <span className="text-xs text-muted-foreground">
                {d.marketSession?.isOpen ? "交易中" : "休市"}
              </span>
              <DataFreshnessBadge asOf={d.asOf} className="ml-auto" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {safeArray(d.indices).slice(0, 3).map((i) => (
                <div key={i.ticker} className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">{i.name ?? i.ticker}</span>
                  <span className="font-mono text-sm">{i.last ?? "—"}</span>
                  <span
                    className={`text-xs font-mono ${
                      (i.changePct ?? 0) > 0
                        ? "text-[hsl(var(--bull))]"
                        : (i.changePct ?? 0) < 0
                          ? "text-[hsl(var(--bear))]"
                          : "text-muted-foreground"
                    }`}
                  >
                    {safePercent(i.changePct ?? null)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">系統健康</span>
              <StatusBadge level={d.systemSummary?.status} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">上次發布</span>
              <DataFreshnessBadge asOf={d.systemSummary?.lastPublishedAt} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">警告數</span>
              <span className="font-mono">{d.systemSummary?.warningCount ?? 0}</span>
            </div>
            <Link
              href="/system/health"
              className="text-xs text-primary hover:underline mt-1"
            >
              詳細 →
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Mid section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <PanelSection
            title="今日 AI 候選池"
            description="AI 候選摘要 — 完整列表請見候選池"
            rightSlot={<Link href="/ideas" className="text-xs text-primary hover:underline">查看全部 →</Link>}
          >
            {safeArray(d.topIdeas).length === 0 ? (
              <EmptyState title="無候選" description="今日尚未發布候選標的。" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {safeArray(d.topIdeas).map((c) => (
                  <CandidateCard key={c.id} c={c} />
                ))}
              </div>
            )}
          </PanelSection>

          <PanelSection
            title="今日時間軸摘要"
            rightSlot={<Link href="/today" className="text-xs text-primary hover:underline">展開 →</Link>}
          >
            {safeArray(d.todayCheckpoints).length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {safeArray(d.todayCheckpoints).map((cp) => (
                  <TimelineCheckpointCard key={cp.id} c={cp} />
                ))}
              </div>
            )}
          </PanelSection>
        </div>

        <div className="flex flex-col gap-4">
          <PanelSection
            title="最新新聞"
            rightSlot={<Link href="/news" className="text-xs text-primary hover:underline">更多 →</Link>}
          >
            {safeArray(d.topNews).length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-2">
                {safeArray(d.topNews).slice(0, 4).map((n) => (
                  <NewsCard key={n.id} n={n} />
                ))}
              </div>
            )}
          </PanelSection>

          <PanelSection
            title="自選股異動"
            rightSlot={<Link href="/watchlist" className="text-xs text-primary hover:underline">全部 →</Link>}
          >
            {safeArray(d.watchlistDeltas).length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-2">
                {safeArray(d.watchlistDeltas).map((w) => (
                  <WatchlistItemCard key={w.id} item={w} />
                ))}
              </div>
            )}
          </PanelSection>
        </div>
      </section>

      <PanelSection title="近期回顧">
        {safeArray(d.recentReports).length === 0 ? (
          <EmptyState title="無近期回顧" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {safeArray(d.recentReports).map((r) => (
              <Card key={r.id} className="hover:bg-accent/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{r.kind ?? "—"}</Badge>
                    <span className="font-mono text-sm">{r.label}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href={r.href} className="text-xs text-primary hover:underline">
                    打開 →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PanelSection>
    </div>
  );
}
