import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ErrorState({
  title = "讀取失敗",
  description = "此 panel 暫時無法顯示。其他 panel 不受影響。",
  detail,
  className,
}: {
  title?: string;
  description?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-md border border-[hsl(var(--bear)/0.4)] bg-[hsl(var(--bear)/0.05)] p-3 text-left",
        className
      )}
    >
      <div className="flex items-center gap-2 text-[hsl(var(--bear))]">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-xs text-muted-foreground">{description}</div>
      {detail && (
        <pre className="mt-1 max-h-32 w-full overflow-auto rounded bg-background/40 p-2 text-[10px] text-muted-foreground">
          {detail}
        </pre>
      )}
    </div>
  );
}
