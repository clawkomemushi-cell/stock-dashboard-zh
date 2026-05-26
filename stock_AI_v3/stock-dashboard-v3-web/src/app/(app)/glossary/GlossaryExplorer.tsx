"use client";

import { useMemo, useState } from "react";
import { GLOSSARY_TERMS, GLOSSARY_CATEGORIES } from "@/lib/data/glossary";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/shared/FilterBar";
import { EmptyState } from "@/components/shared/EmptyState";

const ALL = "全部";

export function GlossaryExplorer() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(ALL);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return GLOSSARY_TERMS.filter((t) => {
      if (category !== ALL && t.category !== category) return false;
      if (ql) {
        return (
          t.term.toLowerCase().includes(ql) ||
          (t.english ?? "").toLowerCase().includes(ql) ||
          t.shortDef.toLowerCase().includes(ql)
        );
      }
      return true;
    });
  }, [q, category]);

  const categoryOptions = [ALL, ...GLOSSARY_CATEGORIES].map((c) => ({
    label: c,
    value: c,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜尋術語、英文名稱或關鍵字…"
        className="max-w-md"
      />
      <FilterBar
        groups={[
          {
            id: "category",
            label: "分類",
            value: category,
            onChange: setCategory,
            options: categoryOptions,
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        共 {filtered.length} / {GLOSSARY_TERMS.length} 個術語
      </p>
      {filtered.length === 0 ? (
        <EmptyState title="找不到符合的術語" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((term) => (
            <details
              key={term.id}
              className="rounded-lg border border-border bg-card p-4 group"
            >
              <summary className="cursor-pointer select-none list-none">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">
                    {term.term}
                  </span>
                  {term.english && (
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {term.english}
                    </span>
                  )}
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    {term.category}
                  </Badge>
                </div>
                <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">
                  {term.shortDef}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2 group-open:hidden">
                  ▸ 展開詳細說明
                </p>
              </summary>

              {term.detail && (
                <div className="mt-3 text-xs text-foreground/80 leading-relaxed border-t border-border pt-3">
                  {term.detail}
                </div>
              )}

              {term.related && term.related.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted-foreground mr-1 mt-0.5">
                    相關：
                  </span>
                  {term.related.map((r) => (
                    <Badge key={r} variant="outline" className="text-[10px]">
                      {r}
                    </Badge>
                  ))}
                </div>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
