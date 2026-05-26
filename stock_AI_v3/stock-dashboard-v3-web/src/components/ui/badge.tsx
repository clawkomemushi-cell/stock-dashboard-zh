import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/15 text-primary",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success:
          "border-transparent bg-[hsl(var(--bull)/0.15)] text-[hsl(var(--bull))]",
        danger:
          "border-transparent bg-[hsl(var(--bear)/0.15)] text-[hsl(var(--bear))]",
        warn:
          "border-transparent bg-[hsl(var(--warn)/0.18)] text-[hsl(var(--warn))]",
        info:
          "border-transparent bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]",
        muted:
          "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
