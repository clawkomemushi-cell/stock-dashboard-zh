import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthConfigured, getSession, performLogin } from "@/lib/auth/session";

// In-memory rate limiter: max 10 failed attempts per IP per 15-minute window
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

interface RateLimitEntry {
  failures: number;
  windowStart: number;
}

const failedAttempts = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (!entry) return false;
  if (now - entry.windowStart > WINDOW_MS) {
    failedAttempts.delete(ip);
    return false;
  }
  return entry.failures >= MAX_FAILURES;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    failedAttempts.set(ip, { failures: 1, windowStart: now });
  } else {
    entry.failures++;
  }
}

function clearFailures(ip: string): void {
  failedAttempts.delete(ip);
}

const LoginInput = z.object({
  username: z.string().min(1).max(64).transform((s) => s.trim()),
  password: z.string().min(1).max(256),
});

export async function POST(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: { code: "setup_required", message: "登入功能尚未設定" }, status: "error" },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: { code: "too_many_requests", message: "登入嘗試次數過多，請稍後再試" }, status: "error" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "無效的請求格式" }, status: "error" },
      { status: 400 }
    );
  }

  const parsed = LoginInput.safeParse(body);
  if (!parsed.success) {
    recordFailure(ip);
    return NextResponse.json(
      { error: { code: "bad_request", message: "帳號或密碼不正確" }, status: "error" },
      { status: 400 }
    );
  }

  const ok = await performLogin(parsed.data.username, parsed.data.password);
  if (!ok) {
    recordFailure(ip);
    return NextResponse.json(
      { error: { code: "unauthorized", message: "帳號或密碼不正確" }, status: "error" },
      { status: 401 }
    );
  }

  clearFailures(ip);

  const session = await getSession();
  session.username = parsed.data.username;
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ data: { username: parsed.data.username }, status: "ok" });
}
