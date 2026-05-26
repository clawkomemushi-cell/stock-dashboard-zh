import { getIronSession, type SessionOptions } from "iron-session";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface SessionData {
  username?: string;
  isLoggedIn?: boolean;
}

const SESSION_COOKIE = "v3_session";

// V3 MVP: do NOT lock the whole site. Only future user-triggered research
// endpoints are protected here; the watchlist research panel is gated by the
// page/session state. Scheduled/static V3 APIs remain public for preview.
const PROTECTED_PREFIXES = ["/api/v3/research", "/api/v3/on-demand-research"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthConfigured(): boolean {
  return !!(
    process.env.AUTH_USERNAME &&
    (process.env.AUTH_PASSWORD_HASH_B64 || process.env.AUTH_PASSWORD_HASH) &&
    process.env.SESSION_SECRET
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname) || !isAuthConfigured()) {
    return NextResponse.next();
  }

  const sessionOptions: SessionOptions = {
    password: process.env.SESSION_SECRET!,
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    },
  };

  const passThrough = NextResponse.next();
  const session = await getIronSession<SessionData>(request, passThrough, sessionOptions);
  if (session.isLoggedIn) return passThrough;

  return NextResponse.json(
    { error: { code: "unauthorized", message: "請先登入" }, status: "error" },
    { status: 401 }
  );
}

export const config = {
  matcher: ["/api/v3/:path*"],
};
