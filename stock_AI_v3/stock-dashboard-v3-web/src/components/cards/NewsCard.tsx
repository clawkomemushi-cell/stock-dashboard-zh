import Link from "next/link";
import type { NewsItem } from "@/lib/contracts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { ExternalLink } from "lucide-react";
import { safeText, safeArray } from "@/lib/utils/safe";

export function NewsCard({ n }: { n: NewsItem }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-semibold leading-snug flex-1">
            {safeText(n.title)}
          </h3>
          {n.url && (
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              aria-label="open original"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="text-muted-foreground">{safeText(n.source)}</span>
          {n.impactType && <Badge variant="info">{n.impactType}</Badge>}
          {typeof n.importanceScore === "number" && (
            <Badge variant="secondary">
              重要度 {(n.importanceScore * 100).toFixed(0)}
            </Badge>
          )}
          {typeof n.noiseScore === "number" && n.noiseScore > 0.6 && (
            <Badge variant="warn">雜訊高</Badge>
          )}
          {n.isLowSignal && <Badge variant="muted">低訊號</Badge>}
          <DataFreshnessBadge asOf={n.publishedAt} className="ml-auto" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p className="text-foreground/90">{safeText(n.oneLineSummary)}</p>
        {n.whyItMatters && (
          <div className="rounded-md bg-muted/50 p-2 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
              為何重要
            </span>
            {n.whyItMatters}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {safeArray(n.relatedSymbols).map((s) => (
            <Link
              key={s}
              href={`/symbols/${encodeURIComponent(s)}`}
              className="text-xs"
            >
              <Badge variant="outline" className="hover:bg-accent">
                {s}
              </Badge>
            </Link>
          ))}
          {safeArray(n.relatedThemes).map((t) => (
            <Badge key={t} variant="secondary">
              #{t}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
