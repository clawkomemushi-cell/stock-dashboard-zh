/**
 * Phase 2D: Manual pipeline runner — generate + validate in one command.
 *
 * Usage:
 *   node scripts/run-v3-manual-pipeline.mjs [--date YYYY-MM-DD] [--input <file>] [--out <dir>]
 *
 * Runs two steps in sequence:
 *   1. generate-v3-snapshot.mjs  (writes snapshot to --out)
 *   2. check-static-data.mjs     (validates the snapshot via DATA_ROOT=<out>)
 *
 * Safe by design:
 *   - Default output: tmp/manual-pipeline-snapshot
 *   - NEVER writes to public/data/
 *   - NEVER touches cron, credentials, or external APIs
 *   - Exit 1 on any failure; exit 0 only when both steps pass
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let date = null;
  let inputFile = null;
  let outDir = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--date" && args[i + 1]) {
      date = args[++i];
    } else if (args[i] === "--input" && args[i + 1]) {
      inputFile = args[++i];
    } else if (args[i] === "--out" && args[i + 1]) {
      outDir = args[++i];
    }
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`[pipeline] Invalid --date format: ${date}. Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  if (!outDir) {
    outDir = path.resolve(process.cwd(), "tmp", "manual-pipeline-snapshot");
  } else {
    outDir = path.resolve(process.cwd(), outDir);
  }

  if (inputFile) {
    inputFile = path.resolve(process.cwd(), inputFile);
    if (!existsSync(inputFile)) {
      console.error(`[pipeline] --input file not found: ${inputFile}`);
      process.exit(1);
    }
  }

  // Safety guard: refuse to write into public/data
  const publicData = path.resolve(process.cwd(), "public", "data");
  if (outDir === publicData || outDir.startsWith(publicData + path.sep)) {
    console.error(`[pipeline] ERROR: --out must not point to public/data. Aborting.`);
    process.exit(1);
  }

  return { date, inputFile, outDir };
}

// ---------------------------------------------------------------------------
// Run a child process and stream its output
// ---------------------------------------------------------------------------

function runStep(label, cmd, args, env) {
  return new Promise((resolve, reject) => {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`[pipeline] ▶ ${label}`);
    console.log(`[pipeline]   ${cmd} ${args.join(" ")}`);
    if (env) {
      const extra = Object.entries(env)
        .filter(([k]) => k !== "PATH")
        .map(([k, v]) => `${k}=${v}`)
        .join("  ");
      if (extra) console.log(`[pipeline]   env: ${extra}`);
    }
    console.log(`${"─".repeat(60)}\n`);

    const child = spawn(cmd, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });

    child.on("close", (code) => {
      console.log(`\n[pipeline] ${label} → exit ${code}`);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} failed with exit code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`${label} could not start: ${err.message}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { date, inputFile, outDir } = parseArgs();

  const relOut = path.relative(process.cwd(), outDir);

  console.log(`\n${"═".repeat(60)}`);
  console.log(`[pipeline] V3 Manual Pipeline Runner`);
  console.log(`[pipeline] Output → ${relOut}`);
  if (date) console.log(`[pipeline] Date   → ${date}`);
  if (inputFile) console.log(`[pipeline] Input  → ${path.relative(process.cwd(), inputFile)}`);
  console.log(`${"═".repeat(60)}`);

  // Step 1: generate snapshot
  const genArgs = ["scripts/generate-v3-snapshot.mjs", "--out", outDir];
  if (date) genArgs.push("--date", date);
  if (inputFile) genArgs.push("--input", inputFile);

  await runStep("Step 1/2 — generate snapshot", "node", genArgs).catch((err) => {
    console.error(`\n[pipeline] ✗ ${err.message}`);
    console.error(`[pipeline] Pipeline aborted. No validation was run.`);
    process.exit(1);
  });

  // Step 2: validate
  await runStep(
    "Step 2/2 — validate snapshot",
    "node",
    ["scripts/check-static-data.mjs"],
    { DATA_ROOT: relOut }
  ).catch((err) => {
    console.error(`\n[pipeline] ✗ ${err.message}`);
    console.error(`[pipeline] Snapshot was written but failed validation.`);
    process.exit(1);
  });

  // Success summary
  console.log(`\n${"═".repeat(60)}`);
  console.log(`[pipeline] ✓ All steps passed.`);
  console.log(`[pipeline] Snapshot: ${relOut}`);
  console.log(``);
  console.log(`[pipeline] Next steps (manual, not automated):`);
  console.log(`[pipeline]   Inspect files : ls ${relOut}/`);
  console.log(`[pipeline]   Validate again: DATA_ROOT=${relOut} node scripts/check-static-data.mjs`);
  console.log(`[pipeline]   View in UI    : copy snapshot to public/data manually, then:`);
  console.log(`[pipeline]                   NEXT_PUBLIC_DATA_MODE=static-file npm run dev`);
  console.log(`[pipeline]`);
  console.log(`[pipeline]   ⚠  Do NOT run this with --out public/data.`);
  console.log(`[pipeline]   ⚠  Cron is NOT enabled. This is a manual verification tool only.`);
  console.log(`${"═".repeat(60)}\n`);
}

main();
