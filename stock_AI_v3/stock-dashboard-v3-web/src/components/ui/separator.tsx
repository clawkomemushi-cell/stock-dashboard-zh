import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Separator({
  orientation = "horizontal",
  className,
  ...props
}: { orientation?: "horizontal" | "vertical" } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn(
        "bg-border shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  );
}
