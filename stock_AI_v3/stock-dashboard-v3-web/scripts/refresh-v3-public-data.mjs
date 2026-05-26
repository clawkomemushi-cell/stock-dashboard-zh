#!/usr/bin/env node
/**
 * Wrapper: refresh V3 public data, validate static files, write run log.
 *
 * Steps:
 *   1. Run refresh-tonight-v3-content.mjs  (fetches Yahoo Finance quotes)
 *   2. Refresh public/data/symbol-universe.json from TWSE/TPEx OpenAPI
 *   3. Run `npm run check:static-data`
 *   4. Write tmp/v3-refresh-latest.json    (status, timestamps, summary, errors)
 *
 * Does NOT deploy, push to git, or send Discord/email notifications.
 * Safe to run as a cron job (e.g. daily at 22:30 Taiwan time).
 *
 * Usage: node scripts/refresh-v3-public-data.mjs
 *   or:  npm run data:refresh
 */
import { execSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TMP = path.join(ROOT, "tmp");
const LOG_FILE = path.join(TMP, "v3-refresh-latest.json");

function nowTW() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date()).replace(" ", "T") + "+08:00";
}

function run(cmd, label) {
  console.log(`\n▶ ${label}`);
  try {
    const output = execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
    console.log(output.trim());
    return { ok: true, output: output.trim(), error: null };
  } catch (err) {
    const msg = (err.stdout ?? "") + (err.stderr ?? "") || err.message;
    console.error(`✗ ${label} failed:\n${msg}`);
    return { ok: false, output: msg.trim(), error: msg.trim() };
  }
}

async function main() {
  const startedAt = nowTW();
  console.log(`[refresh-v3-public-data] started at ${startedAt}`);

  const steps = [];

  // Step 1: run the refresh script
  const step1 = run(
    "node scripts/refresh-tonight-v3-content.mjs",
    "Refresh public/data via Yahoo Finance"
  );
  steps.push({ step: "refresh-tonight-v3-content", ...step1 });

  // Step 2: refresh searchable TW symbol universe
  const step2 = run(
    "node scripts/refresh-symbol-universe.mjs",
    "Refresh TWSE/TPEx symbol universe"
  );
  steps.push({ step: "refresh-symbol-universe", ...step2 });

  // Step 3: validate static data files
  const step3 = run("npm run check:static-data", "check:static-data validation");
  steps.push({ step: "check:static-data", ...step3 });

  const finishedAt = nowTW();
  const allOk = steps.every((s) => s.ok);
  const errors = steps.filter((s) => !s.ok).map((s) => `${s.step}: ${s.error}`);

  // Step 3: write run log
  const log = {
    status: allOk ? "ok" : "error",
    startedAt,
    finishedAt,
    steps: steps.map(({ step, ok, error }) => ({ step, ok, error: error ?? null })),
    changedFiles: "see refresh-tonight-v3-content output above",
    errors,
  };

  await mkdir(TMP, { recursive: true });
  await writeFile(LOG_FILE, JSON.stringify(log, null, 2) + "\n", "utf8");
  console.log(`\n[refresh-v3-public-data] wrote ${LOG_FILE}`);
  console.log(`[refresh-v3-public-data] status: ${log.status} | finished at ${finishedAt}`);

  if (!allOk) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
