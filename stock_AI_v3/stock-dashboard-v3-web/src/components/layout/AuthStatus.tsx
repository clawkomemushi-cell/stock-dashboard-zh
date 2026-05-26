"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, User, AlertCircle } from "lucide-react";

interface Props {
  authConfigured: boolean;
  isLoggedIn: boolean;
  username?: string;
}

export function AuthStatus({ authConfigured, isLoggedIn, username }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!authConfigured) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground/60">
        <AlertCircle className="h-3.5 w-3.5" />
        登入未設定
      </span>
    );
  }

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        aria-label="登入"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors sm:px-2.5"
      >
        <LogIn className="h-3.5 w-3.5" />
        <span className="hidden min-[380px]:inline">登入</span>
      </Link>
    );
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground">
        <User className="h-3.5 w-3.5" />
        {username}
      </span>
      <button
        onClick={handleLogout}
        disabled={loading}
        aria-label="登出"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50 sm:px-2.5"
      >
        <LogOut className="h-3.5 w-3.5" />
        {loading ? "…" : <span className="hidden min-[380px]:inline">登出</span>}
      </button>
    </div>
  );
}
