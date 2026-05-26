import { cn } from "@/lib/utils/cn";

export function LoadingSkeleton({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-busy>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-muted/60 animate-pulse"
          style={{ width: `${60 + ((i * 13) % 35)}%` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 flex flex-col gap-3",
        className
      )}
    >
      <div className="h-4 w-1/3 rounded bg-muted/60 animate-pulse" />
      <LoadingSkeleton lines={4} />
    </div>
  );
}
