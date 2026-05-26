import Link from "next/link";
import { getAdapters } from "@/lib/adapters";
import { tryAsync, safeArray } from "@/lib/utils/safe";
import { ErrorState } from "@/components/shared/ErrorState";
import { readSymbolUniverse } from "@/lib/symbol-universe";
import { SymbolsExplorer } from "./SymbolsExplorer";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SymbolsPage({ searchParams }: PageProps) {
  const adapters = getAdapters();
  const universe = readSymbolUniverse();
  const { q: initialQ } = await searchParams;
  const result = await tryAsync(() => adapters.symbol.list());

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">個股查詢</h1>
          <p className="text-xs text-muted-foreground">
            搜尋代號 / 名稱，從候選清單點擊後進入研究頁。可標記後至{" "}
            <Link href="/watchlist" className="underline hover:text-foreground">自選股</Link>{" "}
            頁確認加入。
          </p>
        </div>
      </header>
      {!result.ok ? (
        <ErrorState detail={result.error.message} />
      ) : (
        <SymbolsExplorer profiles={safeArray(result.value)} universe={universe} initialQ={initialQ} />
      )}
    </div>
  );
}
