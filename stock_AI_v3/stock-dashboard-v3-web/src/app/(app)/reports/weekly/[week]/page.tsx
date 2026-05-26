import Link from "next/link";
import { getAdapters } from "@/lib/adapters";
import { tryAsync, safeArray, safeText } from "@/lib/utils/safe";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PanelSection } from "@/components/shared/PanelSection";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ week: string }>;
}

export default async function WeeklyReviewPage({ params }: PageProps) {
  const { week } = await params;
  const adapters = getAdapters();
  const result = await tryAsync(() => adapters.reports.getWeeklyReview(week));

  if (!result.ok) return <ErrorState detail={result.error.message} />;
  const r = result.value;
  if (!r) return <EmptyState title="找不到此週回顧" />;

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">週回顧 · {r.week}</h1>
        <p className="text-xs text-muted-foreground">
          {safeArray(r.dailyReviews).length} 天回顧 · 勝負分析 + 偏誤觀察
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <div className="text-sm font-semibold">本週摘要</div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/90">{safeText(r.summary)}</p>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm font-semibold">本週亮點</div>
          </CardHeader>
          <CardContent>
            <Bullets items={r.keyWins} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm font-semibold">本週失誤</div>
          </CardHeader>
          <CardContent>
            <Bullets items={r.keyMisses} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm font-semibold">偏誤觀察</div>
          </CardHeader>
          <CardContent>
            <Bullets items={r.biasObservations} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm font-semibold">下週調整方向</div>
          </CardHeader>
          <CardContent>
            <Bullets items={r.nextWeekAdjustments} />
          </CardContent>
        </Card>
      </section>

      <PanelSection title="每日回顧卡片">
        {safeArray(r.dailyReviews).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {r.dailyReviews!.map((d) => (
              <Link key={d.date} href={`/reports/close/${d.date}`}>
                <Card className="hover:bg-accent/40 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{d.date}</span>
                      <StatusBadge level={d.verdict} className="ml-auto" />
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs flex flex-col gap-1">
                    <p className="line-clamp-2">{safeText(d.oneLine)}</p>
                    <Badge variant="muted" className="self-start">
                      acc {typeof d.accuracy === "number" ? `${(d.accuracy * 100).toFixed(0)}%` : "—"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PanelSection>
    </div>
  );
}

function Bullets({ items }: { items?: string[] }) {
  if (!safeArray(items).length) return <EmptyState />;
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {items!.map((x, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-muted-foreground">•</span>
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}
