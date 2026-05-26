"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WatchlistItem } from "@/lib/contracts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WatchlistItemCard } from "@/components/cards/WatchlistItemCard";
import { FilterBar } from "@/components/shared/FilterBar";
import { EmptyState } from "@/components/shared/EmptyState";

const MARKETS = [
  { value: "all", label: "全部" },
  { value: "TW", label: "台股" },
  { value: "US", label: "美股" },
];
const KINDS = [
  { value: "all", label: "全部" },
  { value: "stock", label: "個股" },
  { value: "etf", label: "ETF" },
];

export function WatchlistFilters({ items }: { items: WatchlistItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftTicker, setDraftTicker] = useState("");
  const [market, setMarket] = useState("all");
  const [kind, setKind] = useState("all");
  const [tag, setTag] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => (i.tags ?? []).forEach((t) => set.add(t)));
    return ["all", ...Array.from(set)];
  }, [items]);

  const filtered = items.filter((i) => {
    if (market !== "all" && (i.market ?? "TW") !== market) return false;
    if (kind !== "all" && i.kind !== kind) return false;
    if (tag !== "all" && !(i.tags ?? []).includes(tag)) return false;
    return true;
  });

  async function addManual() {
    const t = draftTicker.trim();
    if (!t) return;
    const ticker = /^\d{4,6}$/.test(t) ? `${t}.TW` : t.toUpperCase();
    setError(null);

    try {
      // Use memberships endpoint: returns prototype response in static mode instead of hard error
      const res = await fetch("/api/v3/watchlist/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const data = (await res.json()) as { status?: string; error?: { message?: string } };
      if (data.status === "prototype") {
        setError(`${ticker} 已標記（prototype 模式，重新整理後不保留）`);
        setDraftTicker("");
        return;
      }
      if (!res.ok) {
        setError(data?.error?.message ?? "新增失敗，請稍後再試");
        return;
      }
    } catch {
      setError("網路錯誤，新增失敗");
      return;
    }

    setDraftTicker("");
    startTransition(() => {
      router.refresh();
    });
  }

  async function removeItem(ticker: string) {
    setError(null);
    try {
      // Use memberships endpoint for consistent static/DB mode handling
      const res = await fetch(`/api/v3/watchlist/memberships?ticker=${encodeURIComponent(ticker)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { status?: string; error?: { message?: string } };
      if (data.status === "prototype") {
        setError("DB 模式未啟用，無法永久刪除（prototype 模式）");
        return;
      }
      if (!res.ok) {
        setError(data?.error?.message ?? "移除失敗，請稍後再試");
        return;
      }
    } catch {
      setError("網路錯誤，移除失敗");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") addManual();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <Input
          value={draftTicker}
          onChange={(e) => setDraftTicker(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="新增代號 (例: 2454, AAPL)"
          className="max-w-xs"
          disabled={isPending}
        />
        <Button
          type="button"
          onClick={addManual}
          disabled={isPending || !draftTicker.trim()}
        >
          {isPending ? "更新中…" : "加入"}
        </Button>
        <Badge variant="muted" className="ml-auto">
          {filtered.length} / {items.length}
        </Badge>
      </div>

      <FilterBar
        groups={[
          {
            id: "market",
            label: "市場",
            value: market,
            onChange: setMarket,
            options: MARKETS,
          },
          {
            id: "kind",
            label: "類型",
            value: kind,
            onChange: setKind,
            options: KINDS,
          },
          {
            id: "tag",
            label: "標籤",
            value: tag,
            onChange: setTag,
            options: tags.map((t) => ({ label: t === "all" ? "全部" : t, value: t })),
          },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState title="無符合條件的標的" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((i) => (
            <div key={i.id} className="flex flex-col gap-1">
              <WatchlistItemCard item={i} />
              <button
                type="button"
                onClick={() => removeItem(i.ticker)}
                disabled={isPending}
                className="self-end text-[11px] text-muted-foreground/60 hover:text-destructive transition-colors px-1 disabled:opacity-40"
              >
                移除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
