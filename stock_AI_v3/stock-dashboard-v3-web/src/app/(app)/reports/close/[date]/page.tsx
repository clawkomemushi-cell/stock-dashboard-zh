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
  params: Promise<{ date: string }>;
}

export default async function CloseReviewPage({ params }: PageProps) {
  const { date } = await params;
  const adapters = getAdapters();
  const result = await tryAsync(() => adapters.reports.getCloseReview(date));

  if (!result.ok) {
    return <ErrorState detail={result.error.message} />;
  }
  const r = result.value;
  if (!r) return <EmptyState title="找不到該日報告" />;

  const accuracy =
    typeof r.thesisAccuracyScore === "number"
      ? `${(r.thesisAccuracyScore * 100).toFixed(0)}%`
      : "—";

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold tracking-tight">
          收盤回顧 · {r.date}
        </h1>
        <StatusBadge level={r.directionVerdict} />
        <Badge variant="info">準確率 {accuracy}</Badge>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm font-semibold">判斷正確</div>
          </CardHeader>
          <CardContent>
            <BulletList items={r.whatWorked} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm font-semibold">判斷失誤</div>
          </CardHeader>
          <CardContent>
            <BulletList items={r.whatFailed} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm font-semibold">明日關注點</div>
          </CardHeader>
          <CardContent>
            <BulletList items={r.nextDayWatchpoints} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="text-sm font-semibold">分析層狀態</div>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {safeArray(r.analysisLayerStatus).length === 0 ? (
              <EmptyState />
            ) : (
              r.analysisLayerStatus!.map((l) => (
                <div key={l.layer} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{l.layer}</Badge>
                  <StatusBadge level={l.status} />
                  <span className="text-muted-foreground">
                    {safeText(l.note, "")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <PanelSection title="個股結果">
        {safeArray(r.tickerResults).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
            {r.tickerResults!.map((t) => (
              <div
                key={t.ticker}
                className="grid grid-cols-[120px_1fr_120px_120px] gap-3 p-3 items-center text-sm"
              >
                <Link
                  href={`/symbols/${encodeURIComponent(t.ticker)}`}
                  className="font-mono font-semibold hover:underline"
                >
                  {t.ticker}
                </Link>
                <span className="text-foreground/85">{safeText(t.thesis)}</span>
                <StatusBadge level={t.outcome} />
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {safeText(t.comment)}
                </span>
              </div>
            ))}
          </div>
        )}
      </PanelSection>
    </div>
  );
}

function BulletList({ items }: { items?: string[] }) {
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
