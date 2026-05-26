"use client";

import { useMemo, useState } from "react";
import type { Candidate } from "@/lib/contracts";
import { CandidateCard } from "@/components/cards/CandidateCard";
import { FilterBar } from "@/components/shared/FilterBar";
import { EmptyState } from "@/components/shared/EmptyState";

const KINDS = [
  { value: "all", label: "全部" },
  { value: "stock", label: "個股" },
  { value: "etf", label: "ETF" },
];
const ROLES = [
  { value: "all", label: "全部" },
  { value: "starter", label: "入場" },
  { value: "watch", label: "關注" },
  { value: "observe", label: "觀察" },
  { value: "avoid", label: "迴避" },
];
const CONFS = [
  { value: "all", label: "全部" },
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];
const NEWS = [
  { value: "all", label: "全部" },
  { value: "with", label: "有消息" },
  { value: "without", label: "無消息" },
];

export function IdeasFiltered({ candidates }: { candidates: Candidate[] }) {
  const [kind, setKind] = useState("all");
  const [role, setRole] = useState("all");
  const [conf, setConf] = useState("all");
  const [news, setNews] = useState("all");
  const [theme, setTheme] = useState("all");

  const themes = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => (c.themes ?? []).forEach((t) => set.add(t)));
    return ["all", ...Array.from(set)];
  }, [candidates]);

  const filtered = candidates.filter((c) => {
    if (kind !== "all" && c.kind !== kind) return false;
    if (role !== "all" && c.role !== role) return false;
    if (conf !== "all" && c.confidence !== conf) return false;
    if (news === "with" && !c.hasNews) return false;
    if (news === "without" && c.hasNews) return false;
    if (theme !== "all" && !(c.themes ?? []).includes(theme)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
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
            id: "role",
            label: "角色",
            value: role,
            onChange: setRole,
            options: ROLES,
          },
          {
            id: "conf",
            label: "信心",
            value: conf,
            onChange: setConf,
            options: CONFS,
          },
          {
            id: "news",
            label: "消息",
            value: news,
            onChange: setNews,
            options: NEWS,
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
        <EmptyState title="無符合候選" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <CandidateCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
