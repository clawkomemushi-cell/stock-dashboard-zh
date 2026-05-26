import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

/**
 * ModeBadge surfaces the active feature-flag value so a user can tell at a
 * glance whether the page is showing real, static, or mocked data.
 */
export function ModeBadge({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-mono uppercase", className)}>
      <span className="text-muted-foreground mr-1 normal-case">{label}</span>
      {value ?? "—"}
    </Badge>
  );
}
