"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!configured) {
    return (
      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
        <p className="font-semibold">尚未完成登入設定</p>
        <p className="mt-1 text-yellow-300/80">
          請在 <code className="rounded bg-black/30 px-1">.env.local</code> 設定{" "}
          <code className="rounded bg-black/30 px-1">AUTH_USERNAME</code>、
          <code className="rounded bg-black/30 px-1">AUTH_PASSWORD_HASH</code>、
          <code className="rounded bg-black/30 px-1">SESSION_SECRET</code>，
          重啟 dev server 後即可使用登入功能。
        </p>
        <p className="mt-2 text-yellow-300/60 text-xs">
          產生密碼 hash：<code className="rounded bg-black/30 px-1">node scripts/hash-password.mjs</code>
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "登入失敗，請再試一次");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("網路錯誤，請再試一次");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm text-muted-foreground" htmlFor="username">
          帳號
        </label>
        <Input
          id="username"
          type="text"
          autoComplete="username"
          maxLength={64}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm text-muted-foreground" htmlFor="password">
          密碼
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          maxLength={256}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "登入中…" : "登入"}
      </Button>
    </form>
  );
}
