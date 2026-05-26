import { getAdapters } from "@/lib/adapters";
import { tryAsync, safeArray } from "@/lib/utils/safe";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PanelSection } from "@/components/shared/PanelSection";
import { IdeasFiltered } from "./IdeasFiltered";
import { ThemeRadarCard } from "@/components/cards/ThemeRadarCard";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const adapters = getAdapters();
  const [ideas, themes] = await Promise.all([
    tryAsync(() => adapters.ideas.list()),
    tryAsync(() => adapters.ideas.themes()),
  ]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col">
          <h1 className="text-lg font-semibold tracking-tight">AI 主動候選池</h1>
          <p className="text-xs text-muted-foreground">
            這是 V3 與一般 watchlist 工具最大的差異點。
          </p>
        </header>

        {!ideas.ok ? (
          <ErrorState detail={ideas.error.message} />
        ) : safeArray(ideas.value).length === 0 ? (
          <EmptyState title="今日尚無候選" description="AI 尚未發布今日 ideas。" />
        ) : (
          <IdeasFiltered candidates={ideas.value} />
        )}
      </div>

      <aside className="flex flex-col gap-4">
        <PanelSection title="主流主題">
          {!themes.ok ? (
            <ErrorState detail={themes.error.message} />
          ) : safeArray(themes.value).length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-2">
              {themes.value.map((t) => (
                <ThemeRadarCard key={t.id} t={t} />
              ))}
            </div>
          )}
        </PanelSection>
      </aside>
    </div>
  );
}
