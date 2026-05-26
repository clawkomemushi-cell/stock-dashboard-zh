"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight, LineChart, Activity } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS } from "./nav-config";

export function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Hamburger trigger — fixed over topbar, mobile only */}
      <button
        className="md:hidden fixed top-0 left-0 z-50 flex items-center justify-center h-14 w-14 text-foreground"
        onClick={() => setOpen(true)}
        aria-label="開啟選單"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          "md:hidden fixed left-0 top-0 h-full w-72 z-50 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight">台股研究工作台</span>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">v3 · 分析</span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
            aria-label="關閉選單"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5 p-2 text-sm overflow-y-auto flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const matchPrefix = item.href.startsWith("/reports") ? "/reports" : item.href;
            const active = pathname === item.href || pathname?.startsWith(matchPrefix);
            return (
              <div key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.children && (
                    <ChevronRight className="ml-auto h-3 w-3 opacity-60" />
                  )}
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
                          onClick={() => setOpen(false)}
                          className={cn(
                            "block rounded-md px-3 py-1.5 text-xs transition-colors",
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

        {/* Footer */}
        <div className="p-3 text-[10px] text-muted-foreground border-t border-border flex flex-col gap-1 shrink-0">
          <span>靜態資料模式 · 適配器驅動</span>
          <Link
            href="/system/health"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1 text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            <Activity className="h-3 w-3" />
            系統狀態
          </Link>
        </div>
      </div>
    </>
  );
}
