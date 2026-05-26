import { cn } from "@/lib/utils/cn";

/**
 * PanelSection — section wrapper for cockpit-style dashboards.
 * Title row + optional toolbar/right-slot + content.
 *
 * Always render this even when content is empty/error so the page keeps
 * its structure (one panel down ≠ whole page broken).
 */
export function PanelSection({
  title,
  description,
  rightSlot,
  className,
  children,
}: {
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
