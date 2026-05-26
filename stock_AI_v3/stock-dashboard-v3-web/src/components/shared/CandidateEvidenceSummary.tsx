import type { CandidateEvidenceSummary as EvidenceSummary, EvidenceItem } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { safeArray, safeText } from "@/lib/utils/safe";

const STATUS_LABEL: Record<string, string> = {
  complete: "資料完整",
  partial: "資料不完整",
  weak: "依據不足",
  stale: "資料過期",
};

const STATUS_VARIANT: Record<string, "success" | "warn" | "danger" | "muted"> = {
  complete: "success",
  partial: "warn",
  weak: "danger",
  stale: "warn",
};

const GROUP_LABELS: Record<string, string> = {
  technical: "技術",
  chip: "籌碼",
  fundamental: "基本面",
  news: "消息",
  macro: "總經",
};

/**
 * Evidence completeness badge and expandable evidence block for a candidate card.
 * Renders nothing if evidence is absent — fully backward compatible.
 */
export function CandidateEvidenceSummary({
  evidence,
}: {
  evidence?: EvidenceSummary;
}) {
  if (!evidence) return null;

  const status = evidence.status ?? "partial";
  const variant = STATUS_VARIANT[status] ?? "muted";
  const label = STATUS_LABEL[status] ?? status;

  const groups = (["technical", "chip", "fundamental", "news", "macro"] as const).filter(
    (g) => safeArray(evidence[g]).length > 0
  );
  const missing = safeArray(evidence.missingFields);
  const warnings = safeArray(evidence.freshnessWarnings);
  const hasContent = groups.length > 0 || missing.length > 0 || warnings.length > 0;

  return (
    <div className="flex flex-col gap-1.5 mt-1 border-t border-border/50 pt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={variant} className="text-[10px]">
          {label}
        </Badge>
        {missing.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            缺：{missing.join("、")}
          </span>
        )}
        {warnings.map((w, i) => (
          <Badge key={i} variant="warn" className="text-[10px]">
            {w}
          </Badge>
        ))}
      </div>

      {hasContent && groups.length > 0 && (
        <details className="text-xs">
          <summary className="text-[10px] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors list-none">
            依據明細 ▸
          </summary>
          <div className="mt-1.5 flex flex-col gap-2 pl-1">
            {groups.map((g) => (
              <EvidenceGroup
                key={g}
                label={GROUP_LABELS[g] ?? g}
                items={safeArray(evidence[g])}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function EvidenceGroup({ label, items }: { label: string; items: EvidenceItem[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex flex-col gap-0.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline text-primary"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  {safeText(item.label)}
                </a>
              ) : (
                <span className="text-foreground/90">{safeText(item.label)}</span>
              )}
              {item.value && (
                <Badge variant="outline" className="text-[9px] ml-auto font-mono">
                  {item.value}
                </Badge>
              )}
            </div>
            {item.interpretation && (
              <p className="text-muted-foreground leading-relaxed pl-4">
                {item.interpretation}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
