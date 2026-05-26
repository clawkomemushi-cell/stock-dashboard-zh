import Link from "next/link";
import type { WeeklyReview } from "@/lib/contracts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { safeArray, safeText } from "@/lib/utils/safe";

export function WeeklySummaryCard({
  review,
  href,
}: {
  review: WeeklyReview;
  href?: string;
}) {
  const wins = safeArray(review.keyWins);
  const inner = (
    <Card className="hover:bg-accent/40 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">{review.week}</span>
          <Badge variant="info">週回顧</Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            {safeArray(review.dailyReviews).length} 天紀錄
          </span>
        </div>
      </CardHeader>
      <CardContent className="text-sm flex flex-col gap-1">
        <p className="text-foreground/90 line-clamp-2">
          {safeText(review.summary)}
        </p>
        {wins.length > 0 && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            做對的地方：{wins.join("、")}
          </p>
        )}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
