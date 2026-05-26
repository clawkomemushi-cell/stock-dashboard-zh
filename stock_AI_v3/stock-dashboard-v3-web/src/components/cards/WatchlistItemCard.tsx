import Link from "next/link";
import type { WatchlistItem } from "@/lib/contracts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { safeArray, safeText } from "@/lib/utils/safe";
import { kindLabel } from "@/lib/utils/labels";

export function WatchlistItemCard({ item }: { item: WatchlistItem }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/symbols/${encodeURIComponent(item.ticker)}`}
            className="font-mono text-sm font-semibold hover:underline"
          >
            {item.ticker}
          </Link>
          <span className="text-xs text-muted-foreground">
            {safeText(item.name, "")}
          </span>
          <Badge variant="outline" className="ml-auto">
            {kindLabel(item.kind)}
          </Badge>
          {item.inIdeasToday && <Badge variant="success">今日候選</Badge>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {safeArray(item.tags).map((t) => (
            <Badge key={t} variant="secondary">
              #{t}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center gap-2">
          <StatusBadge level={item.latestStatusLevel} />
          <span className="text-xs text-foreground/85">
            {safeText(item.latestStatus)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>消息: {item.recentNewsCount ?? 0}</span>
          <DataFreshnessBadge asOf={item.lastUpdated} />
        </div>
      </CardContent>
    </Card>
  );
}
