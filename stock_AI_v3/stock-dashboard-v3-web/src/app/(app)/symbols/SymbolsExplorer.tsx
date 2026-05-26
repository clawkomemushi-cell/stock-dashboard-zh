"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { BookmarkPlus, Check, Loader2, AlertCircle, Search } from "lucide-react";
import type { SymbolProfile } from "@/lib/contracts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/shared/FilterBar";
import { safeText, safeArray } from "@/lib/utils/safe";
import { kindLabel } from "@/lib/utils/labels";
import { addToWatchlist } from "@/lib/client/watchlist-actions";

const KINDS = [
  { value: "all", label: "全部" },
  { value: "stock", label: "個股" },
  { value: "etf", label: "ETF" },
  { value: "index", label: "指數" },
  { value: "future", label: "期貨" },
];

type FeedbackState = { ticker: string; ok: boolean; isPrototype: boolean; message: string } | null;

interface SymbolUniverseEntry {
  ticker: string;
  code: string;
  name: string;
  kind: string;
  market: string;
  industryCode?: string | null;
}

export function SymbolsExplorer({
  profiles,
  universe = [],
  initialQ = "",
}: {
  profiles: SymbolProfile[];
  universe?: SymbolUniverseEntry[];
  initialQ?: string;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(initialQ);
  const [kind, setKind] = useState("all");
  const [theme, setTheme] = useState("all");
  // Tracks tickers that have been added (persisted or prototype)
  const [addedTickers, setAddedTickers] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingTicker, setPendingTicker] = useState<string | null>(null);

  const themes = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => (p.tags ?? []).forEach((t) => set.add(t)));
    return ["all", ...Array.from(set)];
  }, [profiles]);

  const universeProfiles = useMemo<SymbolProfile[]>(() => {
    const existing = new Set(profiles.map((p) => p.ticker.toUpperCase()));
    const ql = q.trim().toLowerCase();
    if (!ql) return [];
    return universe
      .filter((entry) => {
        if (existing.has(entry.ticker.toUpperCase())) return false;
        if (kind !== "all" && entry.kind !== kind) return false;
        return (
          entry.ticker.toLowerCase().includes(ql) ||
          entry.code.toLowerCase().includes(ql) ||
          entry.name.toLowerCase().includes(ql)
        );
      })
      .slice(0, 20)
      .map((entry) => ({
        ticker: entry.ticker,
        name: entry.name,
        kind: entry.kind,
        market: entry.market,
        tags: [entry.market],
        oneLineSummary: "尚未建立研究資料，可直接進入研究頁觸發 AI 即時分析。",
        externalLinks: [],
      }));
  }, [profiles, universe, q, kind]);

  const filteredFromProfiles = useMemo(() => profiles.filter((p) => {
    if (kind !== "all" && p.kind !== kind) return false;
    if (theme !== "all" && !(p.tags ?? []).includes(theme)) return false;
    if (q) {
      const ql = q.toLowerCase();
      if (
        !p.ticker.toLowerCase().includes(ql) &&
        !(p.name ?? "").toLowerCase().includes(ql)
      ) {
        return false;
      }
    }
    return true;
  }), [profiles, kind, theme, q]);

  const filteredFromKnownUniverse = useMemo(
    () => [...filteredFromProfiles, ...universeProfiles],
    [filteredFromProfiles, universeProfiles]
  );

  const filtered: SymbolProfile[] = filteredFromKnownUniverse;

  function handleAddToWatchlist(e: React.MouseEvent, ticker: string) {
    e.preventDefault();
    e.stopPropagation();
    if (addedTickers.has(ticker) || pendingTicker === ticker) return;

    setPendingTicker(ticker);
    startTransition(async () => {
      const result = await addToWatchlist(ticker);
      setFeedback({ ticker, ok: result.ok, isPrototype: result.isPrototype, message: result.message });
      if (result.ok) {
        setAddedTickers((prev) => new Set([...prev, ticker]));
      }
      setPendingTicker(null);
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    searchInputRef.current?.blur();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground/70">
        搜尋後點擊個股可進入研究頁。點擊{" "}
        <BookmarkPlus className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
        可加入自選股（DB 模式會永久儲存；若環境未啟用會顯示提醒）。
      </p>

      {/* Feedback message */}
      {feedback && (
        <div
          className={`rounded-md border px-3 py-2 text-xs flex items-center gap-2 ${
            feedback.ok
              ? feedback.isPrototype
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                : "bg-primary/10 border-primary/20 text-primary"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {feedback.ok ? (
            <Check className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{feedback.message}</span>
          {feedback.isPrototype && (
            <span className="ml-1 text-[10px] opacity-70">（重整後消失）</span>
          )}
        </div>
      )}

      <form onSubmit={handleSearchSubmit} className="flex w-full max-w-md gap-2">
        <Input
          ref={searchInputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋代號或名稱"
          inputMode="search"
          enterKeyHint="search"
          aria-label="搜尋股票代號或名稱"
          className="min-w-0 flex-1"
        />
        <Button type="submit" aria-label="搜尋股票" className="shrink-0 px-3">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">搜尋</span>
        </Button>
      </form>
      <FilterBar
        groups={[
          {
            id: "kind",
            label: "類型",
            value: kind,
            onChange: setKind,
            options: KINDS,
          },
          {
            id: "theme",
            label: "主題",
            value: theme,
            onChange: setTheme,
            options: themes.map((v) => ({ label: v === "all" ? "全部" : v, value: v })),
          },
        ]}
      />
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
          <div className="text-muted-foreground text-2xl">🔍</div>
          <div className="text-sm font-medium">找不到符合的標的</div>
          <p className="text-xs text-muted-foreground max-w-md">
            請調整搜尋條件，或確認代號是否存在於目前台股上市/上櫃清單。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const added = addedTickers.has(p.ticker);
            const loading = pendingTicker === p.ticker && isPending;
            return (
              <Link key={p.ticker} href={`/symbols/${encodeURIComponent(p.ticker)}`}>
                <Card className="hover:bg-accent/40 transition-colors relative group">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{p.ticker}</span>
                      <span className="text-xs text-muted-foreground">{safeText(p.name, "")}</span>
                      <Badge variant="outline" className="ml-auto">{kindLabel(p.kind)}</Badge>
                      <button
                        type="button"
                        onClick={(e) => handleAddToWatchlist(e, p.ticker)}
                        disabled={added || loading}
                        title={
                          added
                            ? "已加入自選股"
                            : loading
                            ? "處理中..."
                            : "加入自選股"
                        }
                        aria-label={`加入 ${p.ticker} 到自選股`}
                        className={
                          added
                            ? "shrink-0 p-1 rounded text-primary"
                            : loading
                            ? "shrink-0 p-1 rounded text-muted-foreground/60"
                            : "shrink-0 p-1 rounded text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        }
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : added ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <BookmarkPlus className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1.5 text-xs">
                    <p className="text-foreground/85 line-clamp-2">
                      {safeText(p.oneLineSummary)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {safeArray(p.tags).slice(0, 4).map((t) => (
                        <Badge key={t} variant="secondary">#{t}</Badge>
                      ))}
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>連結: {safeArray(p.externalLinks).length}</span>
                      {added && (
                        <span className="text-primary/70 text-[10px]">已加入自選股</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
