import Link from "next/link";
import type { CloseReview } from "@/lib/contracts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { safeText, safeArray } from "@/lib/utils/safe";

export function CloseReviewSummaryCard({
  review,
  href,
}: {
  review: CloseReview;
  href?: string;
}) {
  const worked = safeArray(review.whatWorked);
  const accuracy =
    typeof review.thesisAccuracyScore === "number"
      ? `${(review.thesisAccuracyScore * 100).toFixed(0)}%`
      : "—";
  const inner = (
    <Card className="hover:bg-accent/40 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">{review.date}</span>
          <Badge variant="info">收盤回顧</Badge>
          <StatusBadge level={review.directionVerdict} className="ml-auto" />
        </div>
      </CardHeader>
      <CardContent className="text-sm flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>論點命中率</span>
          <span className="font-mono text-foreground/90">{accuracy}</span>
          <span className="ml-auto">
            已檢討 {safeArray(review.tickerResults).length} 檔
          </span>
        </div>
        {worked.length > 0 && (
          <p className="text-xs text-foreground/85 line-clamp-2">
            ✓ {safeText(worked.join("、"))}
          </p>
        )}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
