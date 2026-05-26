import Link from "next/link";
import type { DailyCheckpoint } from "@/lib/contracts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { safeText, safeArray } from "@/lib/utils/safe";
import { checkpointKindLabel, confLabel } from "@/lib/utils/labels";

export function TimelineCheckpointCard({ c }: { c: DailyCheckpoint }) {
  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {checkpointKindLabel(c.kind)}
          </Badge>
          <span className="font-semibold text-sm">{safeText(c.title)}</span>
          <StatusBadge level={c.status} className="ml-auto" />
        </div>
        <div className="flex items-center gap-2">
          <DataFreshnessBadge asOf={c.timestamp} />
          {c.confidence && <Badge variant="info">信心：{confLabel(c.confidence)}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p className="text-foreground/90">{safeText(c.summary)}</p>
        <Field label="盤面變化" value={c.whatChanged} />
        <Field label="進場條件" value={c.trigger} />
        <Field label="失效條件" value={c.invalidation} />
        {safeArray(c.linkedSymbols).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {safeArray(c.linkedSymbols).map((s) => (
              <Link key={s} href={`/symbols/${encodeURIComponent(s)}`}>
                <Badge variant="outline" className="hover:bg-accent">
                  {s}
                </Badge>
              </Link>
            ))}
          </div>
        )}
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
