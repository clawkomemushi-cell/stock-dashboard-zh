import Link from "next/link";
import { getAdapters } from "@/lib/adapters";
import { tryAsync, safeArray } from "@/lib/utils/safe";
import { isAuthConfigured, requireSession } from "@/lib/auth/session";
import { PanelSection } from "@/components/shared/PanelSection";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { WatchlistFilters } from "./WatchlistFilters";
import { WatchlistResearchPanel, type AuthStatus } from "@/components/watchlist/WatchlistResearchPanel";
import { SymbolsExplorer } from "../symbols/SymbolsExplorer";
import { readSymbolUniverse } from "@/lib/symbol-universe";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const adapters = getAdapters();
  const universe = readSymbolUniverse();
  const [items, scans, ai, symbolProfiles] = await Promise.all([
    tryAsync(() => adapters.watchlist.list()),
    tryAsync(() => adapters.watchlist.getScans()),
    tryAsync(() => adapters.watchlist.getAISummary()),
    tryAsync(() => adapters.symbol.list()),
  ]);

  // Determine auth status for the research panel
  const authConfigured = isAuthConfigured();
  let authStatus: AuthStatus = "not_configured";
  if (authConfigured) {
    const session = await requireSession();
    authStatus = session ? "logged_in" : "not_logged_in";
  }

  // AI enabled flag — read server env vars (never sent to client bundle)
  const aiEnabled = !!(process.env.OPENAI_API_KEY && process.env.V3_RESEARCH_AI_ENABLED === "true");

  // Extract tickers for research panel
  const watchlistTickers = items.ok
    ? safeArray(items.value).map((i) => i.ticker)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">自選股中心</h1>
        <p className="text-xs text-muted-foreground">
          手工加入的自選股 · 個股搜尋 · 掃描監控
        </p>
      </header>

      {/* Symbol search & add — integrated directly */}
      <PanelSection
        title="個股搜尋"
        description="搜尋代號 / 名稱，加入自選股 · DB 未啟用前不永久儲存"
      >
        {!symbolProfiles.ok ? (
          <ErrorState detail={symbolProfiles.error.message} />
        ) : (
          <SymbolsExplorer profiles={safeArray(symbolProfiles.value)} universe={universe} />
        )}
      </PanelSection>

      {/* Instant Research — auth-gated, AI enabled when env vars set */}
      <PanelSection
        title="即時研究"
        description={
          aiEnabled
            ? "選擇多檔標的，請 AI 綜合分析 · 模型已接通"
            : "選擇多檔標的，請 AI 綜合分析 · AI 模式未啟用"
        }
      >
        <WatchlistResearchPanel
          authStatus={authStatus}
          watchlistTickers={watchlistTickers}
          aiEnabled={aiEnabled}
        />
      </PanelSection>

      {/* Watchlist list — scrollable container */}
      <PanelSection
        title="自選股列表"
        description="DB 模式下支援新增/移除持久化；非 DB 模式僅供瀏覽"
      >
        {!items.ok ? (
          <ErrorState detail={items.error.message} />
        ) : safeArray(items.value).length === 0 ? (
          <EmptyState
            title="尚未加入自選股"
            description="使用上方個股搜尋區塊加入自選股"
          />
        ) : (
          <div className="max-h-[640px] overflow-y-auto pr-1">
            <WatchlistFilters items={items.value} />
          </div>
        )}
      </PanelSection>

      {/* Watchlist scan results */}
      <PanelSection title="自選股掃描">
        {!scans.ok ? (
          <ErrorState detail={scans.error.message} />
        ) : safeArray(scans.value).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scans.value.map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="text-sm font-semibold">{s.label}</div>
                  <p className="text-xs text-muted-foreground">{s.description ?? "—"}</p>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {safeArray(s.matchedTickers).length === 0 ? (
                    <span className="text-xs text-muted-foreground">無符合標的</span>
                  ) : (
                    s.matchedTickers!.map((t) => (
                      <Link key={t} href={`/symbols/${encodeURIComponent(t)}`}>
                        <Badge variant="outline" className="hover:bg-accent">
                          {t}
                        </Badge>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PanelSection>

      {/* Scan summary — moved below list, renamed to avoid AI recommendation confusion */}
      {ai.ok && ai.value.text && (
        <PanelSection
          title="自選股掃描摘要"
          description="對手工加入的自選股進行監控摘要 · 非 AI 推薦候選"
        >
          <div className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed text-foreground/85">
            {ai.value.text}
          </div>
          <p className="text-[11px] text-muted-foreground/60 px-1 mt-1">
            ⚠️ 此摘要為已加入自選股的監控結果，不是 AI 建議買入的候選股。
          </p>
        </PanelSection>
      )}

      <p className="text-[11px] text-muted-foreground/60 px-1">
        自訂掃描 · 後端接通後啟用
      </p>
    </div>
  );
}
