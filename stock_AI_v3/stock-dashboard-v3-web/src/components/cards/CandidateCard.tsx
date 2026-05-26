import Link from "next/link";
import type { Candidate } from "@/lib/contracts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { CandidateEvidenceSummary } from "@/components/shared/CandidateEvidenceSummary";
import { safeText, safeArray } from "@/lib/utils/safe";
import { kindLabel, roleLabel, confLabel } from "@/lib/utils/labels";

const ROLE_VARIANT: Record<string, "success" | "info" | "warn" | "danger" | "muted"> = {
  starter: "success",
  watch: "info",
  observe: "warn",
  avoid: "danger",
};

export function CandidateCard({ c }: { c: Candidate }) {
  const role = c.role ?? "unknown";
  const variant = ROLE_VARIANT[role] ?? "muted";
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/symbols/${encodeURIComponent(c.ticker)}`}
            className="font-mono text-sm font-semibold hover:underline"
          >
            {c.ticker}
          </Link>
          <span className="text-xs text-muted-foreground">
            {safeText(c.name, "")}
          </span>
          <Badge variant="outline" className="ml-auto">
            {kindLabel(c.kind)}
          </Badge>
          <Badge variant={variant}>{roleLabel(role)}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {safeArray(c.themes).map((t) => (
            <Badge key={t} variant="secondary">
              #{t}
            </Badge>
          ))}
          {c.confidence && (
            <StatusBadge level="info" label={`信心：${confLabel(c.confidence)}`} />
          )}
          {c.hasNews && <Badge variant="info">有消息</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p className="text-foreground/90">{safeText(c.summary)}</p>
        <details>
          <summary className="text-[10px] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors list-none">
            研判詳情 ▸
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            <Field label="為何選入" value={c.whySelected} />
            <Field label="進場條件" value={c.trigger} />
            <Field label="失效條件" value={c.invalidation} />
            <Field label="風險" value={c.risk} />
          </div>
        </details>
        <CandidateEvidenceSummary evidence={c.evidence} />
        <div className="flex items-center justify-between mt-1">
          <DataFreshnessBadge asOf={c.asOf} />
          <Link
            href={`/symbols/${encodeURIComponent(c.ticker)}`}
            className="text-xs text-primary hover:underline"
          >
            研究 →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-xs text-foreground/85">{safeText(value)}</span>
    </div>
  );
}
