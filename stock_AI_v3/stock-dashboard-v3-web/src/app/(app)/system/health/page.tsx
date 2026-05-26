import { getAdapters } from "@/lib/adapters";
import { tryAsync, safeArray } from "@/lib/utils/safe";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PanelSection } from "@/components/shared/PanelSection";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { SystemWarningCard } from "@/components/cards/SystemWarningCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const adapters = getAdapters();
  const result = await tryAsync(() => adapters.system.getHealth());

  if (!result.ok) return <ErrorState detail={result.error.message} />;
  const h = result.value;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">系統狀態</h1>
        <p className="text-xs text-muted-foreground">
          系統運作概覽：最新執行 · 資料新鮮度 · 過期/缺失 · 適配器路由 · 啟用模式
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">最新執行</span>
              <StatusBadge level={h.currentRun?.status} className="ml-auto" />
            </div>
          </CardHeader>
          <CardContent className="text-xs flex flex-col gap-1">
            <Row label="ID" value={h.currentRun?.id ?? "—"} />
            <Row label="名稱" value={h.currentRun?.name ?? "—"} />
            <Row label="開始" value={h.currentRun?.startedAt ?? "—"} />
            <Row label="結束" value={h.currentRun?.finishedAt ?? "—"} />
            <Row
              label="耗時"
              value={
                typeof h.currentRun?.durationMs === "number"
                  ? `${(h.currentRun.durationMs / 1000).toFixed(1)}s`
                  : "—"
              }
            />
            <Row label="訊息" value={h.currentRun?.message ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <span className="text-sm font-semibold">上次成功發布</span>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <DataFreshnessBadge asOf={h.lastSuccessfulPublishAt} staleAfterMin={120} />
            <span className="text-xs text-muted-foreground">
              {h.lastSuccessfulPublishAt ?? "—"}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <span className="text-sm font-semibold">啟用模式</span>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            <ModeBadge label="data" value={h.modes?.dataMode} />
            <ModeBadge label="ai" value={h.modes?.aiMode} />
            <ModeBadge label="news" value={h.modes?.newsMode} />
            <ModeBadge label="chart" value={h.modes?.chartMode} />
          </CardContent>
        </Card>
      </section>

      <SystemWarningCard
        warnings={h.warnings}
        staleData={h.staleData}
        missingData={h.missingData}
      />

      <PanelSection title="資料新鮮度">
        {safeArray(h.dataFreshness).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
            {h.dataFreshness!.map((f) => (
              <div
                key={f.feed}
                className="grid grid-cols-[200px_1fr_auto] items-center gap-2 p-3 text-sm"
              >
                <span className="font-mono text-xs">{f.feed}</span>
                <DataFreshnessBadge asOf={f.lastUpdated} />
                <StatusBadge level={f.status} />
              </div>
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection title="路由 / 適配器">
        {safeArray(h.routes).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left p-2">路徑</th>
                  <th className="text-left p-2">適配器</th>
                  <th className="text-left p-2">模式</th>
                  <th className="text-left p-2">狀態</th>
                  <th className="text-left p-2">備註</th>
                </tr>
              </thead>
              <tbody>
                {h.routes!.map((r, i) => (
                  <tr key={`${r.path}-${i}`} className="border-b border-border/60 last:border-0">
                    <td className="p-2 font-mono">{r.path}</td>
                    <td className="p-2"><Badge variant="outline">{r.adapter}</Badge></td>
                    <td className="p-2"><Badge variant="secondary">{r.mode}</Badge></td>
                    <td className="p-2"><StatusBadge level={r.status} /></td>
                    <td className="p-2 text-muted-foreground">{r.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelSection>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
