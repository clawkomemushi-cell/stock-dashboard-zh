"use client";

import { useMemo, useState } from "react";
import type { NewsItem } from "@/lib/contracts";
import { NewsCard } from "@/components/cards/NewsCard";
import { FilterBar } from "@/components/shared/FilterBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TIME_RANGES = ["all", "1h", "6h", "24h", "3d"];
const IMPACT_TYPES = ["all", "market", "sector", "symbol", "etf", "macro", "policy"];
const IMPORTANCE = ["all", "0.5+", "0.7+"];
const MODES = ["curated", "stream"];

export function NewsFiltered({ items }: { items: NewsItem[] }) {
  const [time, setTime] = useState("all");
  const [impact, setImpact] = useState("all");
  const [importance, setImportance] = useState("all");
  const [mode, setMode] = useState("curated");
  const [showLow, setShowLow] = useState(false);

  const minImp = importance === "0.5+" ? 0.5 : importance === "0.7+" ? 0.7 : 0;

  const cutoff = useMemo(() => {
    const now = Date.now();
    if (time === "1h") return now - 1 * 3600_000;
    if (time === "6h") return now - 6 * 3600_000;
    if (time === "24h") return now - 24 * 3600_000;
    if (time === "3d") return now - 3 * 24 * 3600_000;
    return 0;
  }, [time]);

  const filtered = items.filter((n) => {
    if (impact !== "all" && n.impactType !== impact) return false;
    if (cutoff && n.publishedAt) {
      if (Date.parse(n.publishedAt) < cutoff) return false;
    }
    if ((n.importanceScore ?? 0) < minImp) return false;
    if (mode === "curated" && n.isLowSignal && !showLow) return false;
    return true;
  });

  const lowSignal = items.filter((n) => n.isLowSignal);

  const policy = items.filter((n) =>
    ["macro", "policy"].includes(String(n.impactType))
  );
  const symbolLinked = filtered.filter((n) =>
    (n.relatedSymbols ?? []).length > 0
  );

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        groups={[
          {
            id: "time",
            label: "時間",
            value: time,
            onChange: setTime,
            options: TIME_RANGES.map((v) => ({ label: v, value: v })),
          },
          {
            id: "impact",
            label: "影響類型",
            value: impact,
            onChange: setImpact,
            options: IMPACT_TYPES.map((v) => ({ label: v, value: v })),
          },
          {
            id: "importance",
            label: "重要度",
            value: importance,
            onChange: setImportance,
            options: IMPORTANCE.map((v) => ({ label: v, value: v })),
          },
          {
            id: "mode",
            label: "模式",
            value: mode,
            onChange: setMode,
            options: MODES.map((v) => ({ label: v, value: v })),
          },
        ]}
      />

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">市場主要消息</h3>
          <Badge variant="muted">{filtered.length}</Badge>
        </div>
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((n) => (
              <NewsCard key={n.id} n={n} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">個股相關消息</h3>
        {symbolLinked.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2">
            {symbolLinked.slice(0, 5).map((n) => (
              <NewsCard key={`s-${n.id}`} n={n} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">政策 / 總經 / 利率 / 匯率 / 關稅</h3>
        {policy.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2">
            {policy.map((n) => (
              <NewsCard key={`p-${n.id}`} n={n} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            低訊號 / 重複
          </h3>
          <Button size="sm" variant="ghost" onClick={() => setShowLow((v) => !v)}>
            {showLow ? "隱藏" : `展開 (${lowSignal.length})`}
          </Button>
        </div>
        {showLow && (
          <div className="flex flex-col gap-2">
            {lowSignal.length === 0 ? (
              <EmptyState />
            ) : (
              lowSignal.map((n) => <NewsCard key={`l-${n.id}`} n={n} />)
            )}
          </div>
        )}
      </section>
    </div>
  );
}
