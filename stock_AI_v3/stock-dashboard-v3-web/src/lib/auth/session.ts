import { getIronSession, type SessionOptions, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export interface SessionData {
  username?: string;
  isLoggedIn?: boolean;
}

export const SESSION_COOKIE_NAME = "v3_session";

function getPasswordHash(): string | null {
  if (process.env.AUTH_PASSWORD_HASH_B64) {
    return Buffer.from(process.env.AUTH_PASSWORD_HASH_B64, "base64").toString("utf8");
  }
  return process.env.AUTH_PASSWORD_HASH ?? null;
}

export function isAuthConfigured(): boolean {
  return !!(
    process.env.AUTH_USERNAME &&
    getPasswordHash() &&
    process.env.SESSION_SECRET
  );
}

function buildSessionOptions(): SessionOptions {
  return {
    // Placeholder keeps iron-session happy when auth is not configured.
    // It is never used for real encryption unless SESSION_SECRET is set.
    password:
      process.env.SESSION_SECRET ??
      "placeholder-not-configured-v3-dashboard-auth-2026",
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, buildSessionOptions());
}

export async function requireSession(): Promise<SessionData | null> {
  if (!isAuthConfigured()) return null;
  const session = await getSession();
  if (!session.isLoggedIn) return null;
  return { username: session.username, isLoggedIn: true };
}

export async function performLogin(
  username: string,
  password: string
): Promise<boolean> {
  const passwordHash = getPasswordHash();
  if (!isAuthConfigured() || !passwordHash) return false;
  if (username !== process.env.AUTH_USERNAME) return false;
  return bcrypt.compare(password, passwordHash);
}
