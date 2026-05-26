#!/usr/bin/env node
/**
 * API mode smoke test for V3 stock dashboard.
 *
 * Usage:
 *   node scripts/smoke-api-mode.mjs [--base http://127.0.0.1:3130]
 *
 * Exit 0 if all checks pass, exit 1 on first ERROR.
 * Env: API_BASE_URL overrides the default base.
 */

const DEFAULT_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:3130";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx !== -1 && args[baseIdx + 1] ? args[baseIdx + 1] : DEFAULT_BASE;
const API = `${BASE.replace(/\/+$/, "")}/api/v3`;

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label, reason) {
  console.error(`  ✗ ${label}: ${reason}`);
  failed++;
}

async function checkEndpoint(label, path, { expectArray = false } = {}) {
  const url = `${API}${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      fail(label, `HTTP ${res.status} from ${url}`);
      return;
    }
    const json = await res.json();
    if (typeof json !== "object" || json === null) {
      fail(label, "response is not an object");
      return;
    }
    if (json.status !== "ok") {
      fail(label, `status="${json.status}" (expected "ok")`);
      return;
    }
    if (!("data" in json)) {
      fail(label, 'missing "data" field');
      return;
    }
    if (expectArray && !Array.isArray(json.data)) {
      fail(label, '"data" is not an array');
      return;
    }
    ok(label);
  } catch (err) {
    fail(label, err instanceof Error ? err.message : String(err));
  }
}

async function checkPage(label, path) {
  const url = `${BASE.replace(/\/+$/, "")}${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      fail(label, `HTTP ${res.status} from ${url}`);
      return;
    }
    ok(label);
  } catch (err) {
    fail(label, err instanceof Error ? err.message : String(err));
  }
}

console.log(`\nV3 API Mode Smoke Test`);
console.log(`Base:    ${BASE}`);
console.log(`API:     ${API}`);
console.log(`Started: ${new Date().toISOString()}\n`);

// ── API endpoints ────────────────────────────────────────────────────────────
console.log("── API endpoints ─────────────────────────────────────────────────");

await checkEndpoint("dashboard/summary",        "/dashboard/summary");
await checkEndpoint("watchlist (list)",         "/watchlist",              { expectArray: true });
await checkEndpoint("watchlist/scans",          "/watchlist/scans",        { expectArray: true });
await checkEndpoint("watchlist/ai-summary",     "/watchlist/ai-summary");
await checkEndpoint("ideas (list)",             "/ideas",                  { expectArray: true });
await checkEndpoint("ideas/themes",             "/ideas/themes",           { expectArray: true });
await checkEndpoint("news (list)",              "/news",                   { expectArray: true });
await checkEndpoint("reports/recent-close",     "/reports/recent-close",   { expectArray: true });
await checkEndpoint("reports/recent-weekly",    "/reports/recent-weekly",  { expectArray: true });
await checkEndpoint("symbols (list)",           "/symbols",                { expectArray: true });
await checkEndpoint("system/health",            "/system/health");

// Symbol profile — pick first symbol from /symbols if possible
let sampleTicker = null;
try {
  const r = await fetch(`${API}/symbols`, { signal: AbortSignal.timeout(8000) });
  if (r.ok) {
    const j = await r.json();
    if (Array.isArray(j.data) && j.data.length > 0 && j.data[0]?.ticker) {
      sampleTicker = j.data[0].ticker;
    }
  }
} catch { /* ignore */ }

if (sampleTicker) {
  await checkEndpoint(`symbols/${sampleTicker}/profile`, `/symbols/${sampleTicker}/profile`);
} else {
  console.log(`  - symbols/:ticker/profile skipped (no tickers available)`);
}

// ── Pages (HTML responses) ───────────────────────────────────────────────────
console.log("\n── Pages ─────────────────────────────────────────────────────────");

await checkPage("/ (root redirect)",      "/");
await checkPage("/dashboard",             "/dashboard");
await checkPage("/ideas",                 "/ideas");
await checkPage("/system/health",         "/system/health");

if (sampleTicker) {
  await checkPage(`/symbols/${sampleTicker}`, `/symbols/${sampleTicker}`);
} else {
  console.log(`  - /symbols/:ticker skipped (no tickers available)`);
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log("\n──────────────────────────────────────────────────────────────────");
console.log(`Result: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\nSmoke test FAILED — fix errors above before deploying.\n`);
  process.exit(1);
} else {
  console.log(`\nAll checks passed ✓\n`);
  process.exit(0);
}
