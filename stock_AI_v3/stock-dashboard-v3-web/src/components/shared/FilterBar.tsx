"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

/**
 * FilterBar — generic group-of-segmented-controls used on Ideas/News/Watchlist.
 * Stateless: callers pass `value` and `onChange` per group.
 */
export function FilterBar({
  groups,
  className,
  rightSlot,
}: {
  groups: FilterGroup[];
  className?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md border border-border bg-card/40 p-2",
        className
      )}
    >
      {groups.map((g) => (
        <div key={g.id} className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase text-muted-foreground tracking-wider">
            {g.label}
          </span>
          <div className="flex gap-1 rounded-md border border-border p-0.5 bg-background">
            {g.options.map((o) => {
              const active = o.value === g.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => g.onChange(o.value)}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {rightSlot && <div className="ml-auto">{rightSlot}</div>}
    </div>
  );
}
