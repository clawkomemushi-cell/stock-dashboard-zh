import { getAdapters } from "@/lib/adapters";
import { tryAsync, safeArray } from "@/lib/utils/safe";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PanelSection } from "@/components/shared/PanelSection";
import { NewsFiltered } from "./NewsFiltered";
import { ThemeRadarCard } from "@/components/cards/ThemeRadarCard";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const adapters = getAdapters();
  const [news, themes] = await Promise.all([
    tryAsync(() => adapters.news.list()),
    tryAsync(() => adapters.news.themes()),
  ]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col">
          <h1 className="text-lg font-semibold tracking-tight">消息面工作台</h1>
          <p className="text-xs text-muted-foreground">
            「可用新聞」而非原始 RSS 堆積。重要 + 可解釋 + 可連結。
          </p>
        </header>
        {!news.ok ? (
          <ErrorState detail={news.error.message} />
        ) : safeArray(news.value).length === 0 ? (
          <EmptyState />
        ) : (
          <NewsFiltered items={news.value} />
        )}
      </div>

      <aside className="flex flex-col gap-4">
        <PanelSection title="主題雷達">
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
