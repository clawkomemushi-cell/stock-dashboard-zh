/**
 * Server-side AI usage guardrails: allowlist, rate limit, daily quota, ledger.
 *
 * Storage (no new deps):
 *   tmp/ai-usage/research-state.json   ← rate-window timestamps + daily counts
 *   tmp/ai-usage/research-usage-YYYY-MM-DD.jsonl  ← audit log (never stores secrets)
 *
 * Env overrides:
 *   V3_RESEARCH_ALLOWED_USERS     comma-separated; defaults to AUTH_USERNAME
 *   V3_RESEARCH_RATE_LIMIT_PER_MIN  default 5
 *   V3_RESEARCH_DAILY_QUOTA         default 20
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const USAGE_DIR = path.join(ROOT, "tmp", "ai-usage");
const STATE_FILE = path.join(USAGE_DIR, "research-state.json");
const RATE_WINDOW_MS = 60 * 1000;

function todayTW(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
}

function ledgerFile(date: string): string {
  return path.join(USAGE_DIR, `research-usage-${date}.jsonl`);
}

function ensureDir(): void {
  fs.mkdirSync(USAGE_DIR, { recursive: true });
}

interface UserState {
  rateTimestamps: number[];
  dailyCounts: Record<string, number>;
}

interface State {
  users: Record<string, UserState>;
}

function readState(): State {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as State;
  } catch {
    return { users: {} };
  }
}

function writeState(state: State): void {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function getUserState(state: State, username: string): UserState {
  return state.users[username] ?? { rateTimestamps: [], dailyCounts: {} };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  statusCode?: number;
}

export function checkAllowlist(username: string): GuardResult {
  const defaultOwner = process.env.AUTH_USERNAME ?? "admin";
  const raw = process.env.V3_RESEARCH_ALLOWED_USERS;
  const list = raw ? raw.split(",").map((u) => u.trim()).filter(Boolean) : [defaultOwner];
  if (!list.includes(username)) {
    return { allowed: false, reason: `使用者 ${username} 不在 AI 研究許可名單中`, statusCode: 403 };
  }
  return { allowed: true };
}

export function checkGuardrails(username: string): GuardResult {
  const allowlist = checkAllowlist(username);
  if (!allowlist.allowed) return allowlist;

  const limitPerMin = Number(process.env.V3_RESEARCH_RATE_LIMIT_PER_MIN ?? "5");
  const dailyLimit = Number(process.env.V3_RESEARCH_DAILY_QUOTA ?? "20");
  const now = Date.now();
  const today = todayTW();

  ensureDir();
  const state = readState();
  const user = getUserState(state, username);

  // Rate limit check (read-only — state mutated on accept only)
  const recent = user.rateTimestamps.filter((ts) => now - ts < RATE_WINDOW_MS);
  if (recent.length >= limitPerMin) {
    const retryAfterSec = Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000);
    return {
      allowed: false,
      reason: `Rate limit: 每分鐘最多 ${limitPerMin} 次，請等待約 ${retryAfterSec} 秒後重試`,
      statusCode: 429,
    };
  }

  // Daily quota check
  const todayCount = user.dailyCounts[today] ?? 0;
  if (todayCount >= dailyLimit) {
    return {
      allowed: false,
      reason: `Daily quota: 今日已使用 ${todayCount}/${dailyLimit} 次，明日重置`,
      statusCode: 429,
    };
  }

  return { allowed: true };
}

export interface LedgerEntry {
  username: string;
  tickers: string[];
  status: "accepted" | "rejected";
  reason?: string;
  createdAt: string;
  estimatedUnits: number;
}

export function recordAccepted(username: string, tickers: string[]): void {
  const today = todayTW();
  const now = Date.now();
  ensureDir();

  const state = readState();
  const user = getUserState(state, username);
  user.rateTimestamps = user.rateTimestamps.filter((ts) => now - ts < RATE_WINDOW_MS);
  user.rateTimestamps.push(now);
  user.dailyCounts[today] = (user.dailyCounts[today] ?? 0) + 1;
  state.users[username] = user;
  writeState(state);

  const entry: LedgerEntry = {
    username,
    tickers,
    status: "accepted",
    createdAt: new Date().toISOString(),
    estimatedUnits: tickers.length,
  };
  fs.appendFileSync(ledgerFile(today), JSON.stringify(entry) + "\n", "utf8");
}

export interface ModelUsageEntry {
  type: "model_call";
  username: string;
  tickers: string[];
  jobId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number | null;
  requestId: string | null;
  createdAt: string;
}

export function recordModelUsage(
  username: string,
  tickers: string[],
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number | null;
    requestId: string | null;
    jobId: string;
  }
): void {
  const today = todayTW();
  ensureDir();
  const entry: ModelUsageEntry = {
    type: "model_call",
    username,
    tickers,
    jobId: usage.jobId,
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    estimatedCostUsd: usage.estimatedCostUsd,
    requestId: usage.requestId,
    createdAt: new Date().toISOString(),
  };
  fs.appendFileSync(ledgerFile(today), JSON.stringify(entry) + "\n", "utf8");
}

export function recordRejected(username: string, tickers: string[], reason: string): void {
  const today = todayTW();
  ensureDir();
  const entry: LedgerEntry = {
    username,
    tickers,
    status: "rejected",
    reason,
    createdAt: new Date().toISOString(),
    estimatedUnits: 0,
  };
  fs.appendFileSync(ledgerFile(today), JSON.stringify(entry) + "\n", "utf8");
}
