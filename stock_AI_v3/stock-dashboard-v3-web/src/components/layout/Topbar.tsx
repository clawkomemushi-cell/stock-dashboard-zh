import { GlobalSearch } from "./GlobalSearch";
import { ThemeToggle } from "./ThemeToggle";
import { AuthStatus } from "./AuthStatus";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getModeConfig } from "@/lib/modes/config";
import { getAdapters } from "@/lib/adapters";
import { tryAsync } from "@/lib/utils/safe";
import { isAuthConfigured, requireSession } from "@/lib/auth/session";

export async function Topbar() {
  const cfg = getModeConfig();
  const adapters = getAdapters();
  const result = await tryAsync(() => adapters.system.getHealth());
  const status =
    result.ok ? result.value.currentRun?.status ?? "unknown" : "unknown";

  const authConfigured = isAuthConfigured();
  const sessionData = authConfigured ? await requireSession() : null;
  const isLoggedIn = !!sessionData;
  const username = sessionData?.username;

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-4">
        {/* Spacer for fixed hamburger button (mobile only) */}
        <div className="md:hidden w-9 shrink-0" aria-hidden />
        <div className="md:hidden min-w-0 flex-1 truncate font-semibold text-sm">台股工作台</div>
        <div className="hidden sm:block flex-1 max-w-2xl">
          <GlobalSearch />
        </div>
        <div className="ml-auto hidden lg:flex items-center gap-1.5">
          <ModeBadge label="data" value={cfg.dataMode} />
          <ModeBadge label="ai" value={cfg.aiMode} />
          <ModeBadge label="news" value={cfg.newsMode} />
          <ModeBadge label="chart" value={cfg.chartMode} />
        </div>
        <StatusBadge
          level={status}
          label={`SYS ${String(status).toUpperCase()}`}
          className="hidden sm:inline-flex"
        />
        <AuthStatus
          authConfigured={authConfigured}
          isLoggedIn={isLoggedIn}
          username={username}
        />
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
