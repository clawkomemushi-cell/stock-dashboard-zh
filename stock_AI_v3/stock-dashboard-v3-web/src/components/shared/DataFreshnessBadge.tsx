import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils/safe";
import { cn } from "@/lib/utils/cn";

export function DataFreshnessBadge({
  asOf,
  className,
  staleAfterMin = 30,
}: {
  asOf?: string | null;
  className?: string;
  staleAfterMin?: number;
}) {
  if (!asOf) {
    return (
      <Badge variant="muted" className={cn("gap-1", className)}>
        <Clock className="h-3 w-3" />
        無時間戳
      </Badge>
    );
  }
  const ageMin = (Date.now() - Date.parse(asOf)) / 60000;
  const isStale = !Number.isNaN(ageMin) && ageMin > staleAfterMin;
  return (
    <Badge variant={isStale ? "warn" : "muted"} className={cn("gap-1", className)}>
      <Clock className="h-3 w-3" />
      {formatRelative(asOf)}
    </Badge>
  );
}
