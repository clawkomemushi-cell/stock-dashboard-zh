import type { SymbolProfile, SymbolOverview } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { safePercent, safeNumber, safeText, safeArray } from "@/lib/utils/safe";
import { cn } from "@/lib/utils/cn";
import { kindLabel } from "@/lib/utils/labels";

/**
 * SymbolHeader — title bar for /symbols/[ticker].
 * Profile is required for the title; Overview adds price / status.
 * Either may be null (renders gracefully).
 */
export function SymbolHeader({
  profile,
  overview,
  ticker,
}: {
  ticker: string;
  profile?: SymbolProfile | null;
  overview?: SymbolOverview | null;
}) {
  const changePct = overview?.changePct;
  const dirClass =
    typeof changePct === "number"
      ? changePct > 0
        ? "text-[hsl(var(--bull))]"
        : changePct < 0
          ? "text-[hsl(var(--bear))]"
          : "text-muted-foreground"
      : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-semibold">{ticker}</span>
            <span className="text-base text-muted-foreground">
              {safeText(profile?.name, "")}
            </span>
            {profile?.kind && (
              <Badge variant="outline">
                {kindLabel(profile.kind)}
              </Badge>
            )}
            {profile?.market && (
              <Badge variant="secondary">{profile.market}</Badge>
            )}
          </div>
          {profile?.oneLineSummary && (
            <p className="text-xs text-muted-foreground mt-0.5 max-w-prose">
              {profile.oneLineSummary}
            </p>
          )}
        </div>

        <div className="ml-auto flex flex-col items-end gap-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl">
              {safeNumber(overview?.last)}
            </span>
            <span className={cn("font-mono text-sm", dirClass)}>
              {safePercent(changePct ?? null)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge level={overview?.status} />
            <DataFreshnessBadge asOf={overview?.asOf} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {safeArray(profile?.tags).map((t) => (
          <Badge key={t} variant="secondary">
            #{t}
          </Badge>
        ))}
        {profile?.sector && (
          <Badge variant="outline">產業 · {profile.sector}</Badge>
        )}
        {profile?.industry && (
          <Badge variant="outline">{profile.industry}</Badge>
        )}
        {profile?.issuer && (
          <Badge variant="outline">發行人 · {profile.issuer}</Badge>
        )}
      </div>

      {overview?.oneLineThesis && (
        <div className="rounded-md bg-muted/40 p-2 text-xs">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
            今日觀點
          </span>
          {overview.oneLineThesis}
        </div>
      )}
    </div>
  );
}
