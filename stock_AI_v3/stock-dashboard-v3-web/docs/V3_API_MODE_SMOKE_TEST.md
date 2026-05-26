# V3 API Mode Smoke Test

Status: Added 2026-05-09.

## Goal

Provide a fast, zero-dependency CLI check that the `NEXT_PUBLIC_DATA_MODE=api` path returns valid JSON envelopes and pages return HTTP 200. Designed to run after every API-layer change — no manual `curl` required.

## Scope

- JSON API endpoints: checks HTTP 200, `status: "ok"`, `data` field present.
- Array endpoints: also checks that `data` is an array.
- Page routes: checks HTTP 200.
- Symbol profile / symbol page: auto-discovered from `/api/v3/symbols`; skipped gracefully if no symbols exist.

## Non-goals

- Does not validate Zod contracts (that is the API adapter's responsibility).
- Does not start or stop the dev server.
- Does not test write APIs (none exist in Phase 1).
- Does not replace `typecheck` / `lint` / `build`.

## Prerequisites

Node.js 18+ (uses `fetch` and `AbortSignal.timeout`, both built-in since Node 18).

The dev server must be running before you run the smoke test:

```bash
# Terminal 1 — start dev server in api mode
NEXT_PUBLIC_DATA_MODE=api npm run dev
```

Default dev port is `3000`. If you use a different port (e.g. `3130` via `PORT=3130`), set `--base` accordingly.

## Running

```bash
# Default base: API_BASE_URL env or http://127.0.0.1:3130
npm run smoke:api-mode

# Custom base
npm run smoke:api-mode -- --base http://127.0.0.1:3000

# Or via API_BASE_URL env
API_BASE_URL=http://127.0.0.1:3000 npm run smoke:api-mode
```

## Example output

```
V3 API Mode Smoke Test
Base:    http://127.0.0.1:3130
API:     http://127.0.0.1:3130/api/v3
Started: 2026-05-09T10:00:00.000Z

── API endpoints ─────────────────────────────────────────────────
  ✓ dashboard/summary
  ✓ watchlist (list)
  ✓ watchlist/scans
  ✓ watchlist/ai-summary
  ✓ ideas (list)
  ✓ ideas/themes
  ✓ news (list)
  ✓ reports/recent-close
  ✓ reports/recent-weekly
  ✓ symbols (list)
  ✓ system/health
  ✓ symbols/2330/profile

── Pages ─────────────────────────────────────────────────────────
  ✓ / (root redirect)
  ✓ /dashboard
  ✓ /ideas
  ✓ /system/health
  ✓ /symbols/2330

──────────────────────────────────────────────────────────────────
Result: 17 passed, 0 failed

All checks passed ✓
```

## Checked endpoints

| Endpoint | Array? |
|---|---|
| `GET /api/v3/dashboard/summary` | no |
| `GET /api/v3/watchlist` | yes |
| `GET /api/v3/watchlist/scans` | yes |
| `GET /api/v3/watchlist/ai-summary` | no |
| `GET /api/v3/ideas` | yes |
| `GET /api/v3/ideas/themes` | yes |
| `GET /api/v3/news` | yes |
| `GET /api/v3/reports/recent-close` | yes |
| `GET /api/v3/reports/recent-weekly` | yes |
| `GET /api/v3/symbols` | yes |
| `GET /api/v3/system/health` | no |
| `GET /api/v3/symbols/:ticker/profile` | no (auto-discovered) |

## Checked pages

| Page |
|---|
| `/` |
| `/dashboard` |
| `/ideas` |
| `/system/health` |
| `/symbols/:ticker` (auto-discovered) |

## Exit codes

| Code | Meaning |
|---|---|
| `0` | All checks passed |
| `1` | One or more checks failed |

## Integration tip

Add to CI or a pre-deploy step:

```bash
NEXT_PUBLIC_DATA_MODE=api npm run dev &
DEV_PID=$!
sleep 5
npm run smoke:api-mode -- --base http://127.0.0.1:3000
kill $DEV_PID
```

Or run against a staging URL:

```bash
npm run smoke:api-mode -- --base https://staging.example.com
```
