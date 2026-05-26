#!/usr/bin/env node
/**
 * Print AI research usage summary.
 * Usage: node scripts/print-ai-usage-summary.mjs [--days N]
 * Never prints secrets, passwords, or API keys.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const USAGE_DIR = path.join(ROOT, "tmp", "ai-usage");

const args = process.argv.slice(2);
const daysArg = args.indexOf("--days");
const DAYS = daysArg >= 0 ? Math.max(1, Number(args[daysArg + 1]) || 7) : 7;

function todayTW() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
}

function dateMinusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
}

async function readJSONL(file) {
  try {
    const content = await readFile(file, "utf8");
    return content
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function main() {
  const today = todayTW();
  const dates = Array.from({ length: DAYS }, (_, i) => (i === 0 ? today : dateMinusDays(i)));

  const dailyData = [];
  for (const date of dates) {
    const file = path.join(USAGE_DIR, `research-usage-${date}.jsonl`);
    const entries = await readJSONL(file);
    if (entries.length > 0) dailyData.push({ date, entries });
  }

  console.log("=== AI Research Usage Summary ===");
  console.log(`Generated : ${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`);
  console.log(`Period    : last ${DAYS} day(s)`);
  console.log(`Log dir   : ${USAGE_DIR}`);
  console.log();

  if (dailyData.length === 0) {
    console.log("No usage records found in this period.");
    return;
  }

  // ── Today detail ─────────────────────────────────────────────────────────
  const todayData = dailyData.find((d) => d.date === today);
  if (todayData) {
    const requests = todayData.entries.filter((e) => e.status === "accepted" || e.status === "rejected");
    const accepted = todayData.entries.filter((e) => e.status === "accepted");
    const rejected = todayData.entries.filter((e) => e.status === "rejected");
    const modelCalls = todayData.entries.filter((e) => e.type === "model_call");
    const tokenTotal = modelCalls.reduce((sum, e) => sum + (Number(e.totalTokens) || 0), 0);
    console.log(`Today (${today}):`);
    console.log(`  Requests  : ${requests.length} total | ${accepted.length} accepted | ${rejected.length} rejected`);
    console.log(`  Model use : ${modelCalls.length} calls | ${tokenTotal} tokens`);

    if (accepted.length > 0) {
      const byUser = {};
      for (const e of accepted) {
        byUser[e.username] = (byUser[e.username] ?? 0) + 1;
      }
      console.log(`  By user   : ${Object.entries(byUser).map(([u, c]) => `${u}(${c})`).join(", ")}`);
    }

    if (rejected.length > 0) {
      const byReason = {};
      for (const e of rejected) {
        const key = (e.reason ?? "unknown").split(":")[0].trim();
        byReason[key] = (byReason[key] ?? 0) + 1;
      }
      console.log(`  Rejected  : ${Object.entries(byReason).map(([r, c]) => `${r}(${c})`).join(", ")}`);
    }
    console.log();
  }

  // ── Multi-day table ───────────────────────────────────────────────────────
  const col = (s, w) => String(s).padEnd(w);
  console.log(`${col("Date", 12)} ${col("Req", 6)} ${col("Accepted", 10)} ${col("Rejected", 10)} ${col("AI Calls", 9)} ${col("Tokens", 8)} By User`);
  console.log("─".repeat(86));
  for (const { date, entries } of dailyData) {
    const req = entries.filter((e) => e.status === "accepted" || e.status === "rejected");
    const acc = entries.filter((e) => e.status === "accepted");
    const rej = entries.filter((e) => e.status === "rejected");
    const modelCalls = entries.filter((e) => e.type === "model_call");
    const tokenTotal = modelCalls.reduce((sum, e) => sum + (Number(e.totalTokens) || 0), 0);
    const byUser = {};
    for (const e of acc) byUser[e.username] = (byUser[e.username] ?? 0) + 1;
    const userStr = Object.entries(byUser).map(([u, c]) => `${u}(${c})`).join(", ") || "—";
    console.log(`${col(date, 12)} ${col(req.length, 6)} ${col(acc.length, 10)} ${col(rej.length, 10)} ${col(modelCalls.length, 9)} ${col(tokenTotal, 8)} ${userStr}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
