"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChevronRight, LineChart } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS } from "./nav-config";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-56 lg:w-60 shrink-0 border-r border-border bg-card/40 flex-col">
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
        <LineChart className="h-5 w-5 text-primary" />
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">
            台股研究工作台
          </span>
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
            v3 · 分析
          </span>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 p-2 text-sm">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const matchPrefix =
            item.href.startsWith("/reports") ? "/reports" : item.href;
          const active =
            pathname === item.href || pathname?.startsWith(matchPrefix);
          return (
            <div key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.children && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
              </Link>
              {item.children && (
                <div className="ml-6 mt-0.5 flex flex-col gap-0.5">
                  {item.children.map((child) => {
                    const childActive = pathname?.startsWith(
                      child.href.split("/").slice(0, 3).join("/")
                    );
                    return (
                      <Link
                        key={child.label}
                        href={child.href}
                        className={cn(
                          "rounded-md px-2 py-1 text-xs",
                          childActive
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto p-3 text-[10px] text-muted-foreground border-t border-border flex flex-col gap-1">
        <span>靜態資料模式 · 適配器驅動</span>
        <Link
          href="/system/health"
          className="flex items-center gap-1 text-muted-foreground/70 hover:text-muted-foreground transition-colors"
        >
          <Activity className="h-3 w-3" />
          系統狀態
        </Link>
      </div>
    </aside>
  );
}
