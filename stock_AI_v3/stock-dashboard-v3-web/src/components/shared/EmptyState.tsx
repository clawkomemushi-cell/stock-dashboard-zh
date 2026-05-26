import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  title = "暫無資料",
  description = "資料尚未發布,或目前模式不支援此 panel。",
  icon,
  className,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center",
        className
      )}
    >
      <div className="text-muted-foreground">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground max-w-md">{description}</div>
    </div>
  );
}
