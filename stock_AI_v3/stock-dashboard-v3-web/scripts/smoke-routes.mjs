#!/usr/bin/env node
/**
 * Route smoke check for V3 stock dashboard.
 * Fetches every main page route and confirms HTTP 200 (or allowed redirect).
 *
 * Usage:
 *   npm run smoke:routes               # default http://127.0.0.1:3000
 *   node scripts/smoke-routes.mjs [--base http://127.0.0.1:3130]
 *
 * Exit 0 if all pass, exit 1 on any failure.
 * Env: BASE_URL overrides the default.
 */

const DEFAULT_BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = (baseIdx !== -1 && args[baseIdx + 1] ? args[baseIdx + 1] : DEFAULT_BASE).replace(/\/+$/, "");

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✓  ${label}`);
  passed++;
}

function fail(label, reason) {
  console.error(`  ✗  ${label}: ${reason}`);
  failed++;
}

// Pages that redirect to a dynamic child route — we accept 2xx or 3xx
async function checkRoute(label, path, { allowRedirect = false } = {}) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      redirect: allowRedirect ? "manual" : "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (allowRedirect && (res.status >= 200 && res.status < 400)) {
      ok(label);
      return;
    }
    if (!allowRedirect && res.ok) {
      ok(label);
      return;
    }
    fail(label, `HTTP ${res.status} from ${url}`);
  } catch (err) {
    fail(label, err instanceof Error ? err.message : String(err));
  }
}

console.log(`\nV3 Route Smoke Check`);
console.log(`Base:    ${BASE}`);
console.log(`Started: ${new Date().toISOString()}\n`);

console.log("── Static / auth ──────────────────────────────────────────────────");
await checkRoute("/ (redirect to /dashboard)",  "/");
await checkRoute("/login",                       "/login");

console.log("\n── Core pages ─────────────────────────────────────────────────────");
await checkRoute("/dashboard",                   "/dashboard");
await checkRoute("/watchlist",                   "/watchlist");
await checkRoute("/ideas",                       "/ideas");
await checkRoute("/news",                        "/news");
await checkRoute("/today",                       "/today");
await checkRoute("/pools",                       "/pools");
await checkRoute("/symbols",                     "/symbols");
await checkRoute("/glossary",                    "/glossary");
await checkRoute("/system/health",               "/system/health");

console.log("\n── Reports (redirect to latest) ───────────────────────────────────");
await checkRoute("/reports/close (→ latest)",    "/reports/close",  { allowRedirect: true });
await checkRoute("/reports/weekly (→ latest)",   "/reports/weekly", { allowRedirect: true });

console.log("\n───────────────────────────────────────────────────────────────────");
console.log(`Result: ${passed} passed, ${failed} failed`);
console.log(`Finished: ${new Date().toISOString()}\n`);

if (failed > 0) {
  console.error(`${failed} route(s) failed smoke check.\n`);
  process.exit(1);
} else {
  console.log("All routes OK ✓\n");
}
