import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileDrawer } from "./MobileDrawer";

/**
 * AppLayout — global frame.
 *
 *   Sidebar | (Topbar / Main / Optional aside) | MobileDrawer (mobile only)
 *
 * Pages can render their own optional right rail via the `rightRail` slot.
 */
export function AppLayout({
  children,
  rightRail,
}: {
  children: ReactNode;
  rightRail?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex flex-1 min-h-0">
          <main className="flex-1 min-w-0 p-4 pb-6">{children}</main>
          {rightRail && (
            <aside className="hidden xl:block w-72 shrink-0 border-l border-border bg-card/30 p-4">
              {rightRail}
            </aside>
          )}
        </div>
        <MobileDrawer />
      </div>
    </div>
  );
}
