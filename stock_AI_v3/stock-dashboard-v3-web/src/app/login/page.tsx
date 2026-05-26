import { isAuthConfigured } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "登入 · 台股 AI Cockpit v3",
};

export default function LoginPage() {
  const configured = isAuthConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">台股 AI Cockpit</h1>
          <p className="text-sm text-muted-foreground">v3 · 請登入以繼續</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <LoginForm configured={configured} />
        </div>
      </div>
    </div>
  );
}
