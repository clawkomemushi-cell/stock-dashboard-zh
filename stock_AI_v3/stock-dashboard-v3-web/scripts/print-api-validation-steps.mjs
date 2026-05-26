#!/usr/bin/env node
/**
 * Print the three commands needed to validate a generated snapshot via API mode.
 * Does NOT start any server or run any external command.
 *
 * Usage:
 *   node scripts/print-api-validation-steps.mjs [--out <snapshot-dir>] [--port <port>]
 *
 * Defaults:
 *   --out   tmp/manual-pipeline-snapshot
 *   --port  3000
 */

import path from "node:path";

const args = process.argv.slice(2);

let outDir = "tmp/manual-pipeline-snapshot";
let port = "3000";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out" && args[i + 1]) outDir = args[++i];
  if (args[i] === "--port" && args[i + 1]) port = args[++i];
}

// Normalise to a relative path for readability; keep absolute paths as-is.
const snapshotDir = path.isAbsolute(outDir)
  ? path.relative(process.cwd(), outDir) || outDir
  : outDir;

const apiBase = `http://127.0.0.1:${port}/api/v3`;

console.log(`
V3 Generated Snapshot → API Validation  (next steps)
═══════════════════════════════════════════════════════

Snapshot dir : ${snapshotDir}
Dev port     : ${port}

─── Step 1 (already done if you ran the pipeline) ──────────────────────────

  npm run pipeline:manual
  # snapshot written to: ${snapshotDir}

─── Step 2  Start dev server (Terminal 1) ───────────────────────────────────

  V3_API_DATA_ROOT=${snapshotDir} \\
    NEXT_PUBLIC_DATA_MODE=api \\
    NEXT_PUBLIC_API_BASE_URL=${apiBase} \\
    npm run dev

  Wait for "Ready in …ms" before running the smoke test.
  (Use PORT=${port} if the port is different from Next.js default.)

─── Step 3  Run smoke test (Terminal 2, server must be running) ─────────────

  npm run smoke:api-mode -- --base http://127.0.0.1:${port}

─────────────────────────────────────────────────────────────────────────────
All 17 checks passing = snapshot is API-compatible. No files copied to public/data.
`);
