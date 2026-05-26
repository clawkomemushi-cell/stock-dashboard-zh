# V3 Generated Snapshot → API Validation

Status: Added 2026-05-09.

## Goal

Prove that the snapshot produced by `run-v3-manual-pipeline.mjs` (in
`tmp/manual-pipeline-snapshot`) can be served directly by the V3 API layer
**without copying files into `public/data/`**.

The bridge is `V3_API_DATA_ROOT`: when set, `src/app/api/v3/_lib/data-reader.ts`
reads from that directory instead of `public/data`. This means a freshly
generated `tmp` snapshot can go through the full API smoke test while the
production data in `public/data` stays untouched.

## Three-step walkthrough

### Step 1 — Run the manual pipeline

```bash
npm run pipeline:manual
# or with a custom date / input:
node scripts/run-v3-manual-pipeline.mjs --date 2026-05-09
```

Default output: `tmp/manual-pipeline-snapshot/`

The runner generates the snapshot **and** validates it with `check-static-data.mjs`
before returning. Exit 0 means the files are well-formed JSON.

To print the exact dev-server and smoke-test commands for the snapshot you just
generated:

```bash
npm run pipeline:print-next-steps
# or point at a custom snapshot dir:
node scripts/print-api-validation-steps.mjs --out tmp/manual-pipeline-snapshot
```

### Step 2 — Start the dev server pointing at the tmp snapshot

```bash
V3_API_DATA_ROOT=tmp/manual-pipeline-snapshot \
  NEXT_PUBLIC_DATA_MODE=api \
  NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000/api/v3 \
  npm run dev
```

> If port 3000 is busy use `PORT=3130` and adjust `NEXT_PUBLIC_API_BASE_URL`
> accordingly.

What each env var does:

| Variable | Effect |
|---|---|
| `V3_API_DATA_ROOT` | Tells `data-reader.ts` to read JSON from `tmp/…` not `public/data` |
| `NEXT_PUBLIC_DATA_MODE=api` | Puts the Next.js app in API-fetch mode (client reads `/api/v3/…`) |
| `NEXT_PUBLIC_API_BASE_URL` | Tells the frontend where to reach the API (same origin is fine) |

Wait for `Ready in …ms` before running the smoke test.

### Step 3 — Run the smoke test

In a **second terminal**, while the dev server from Step 2 is running:

```bash
# Default base (http://127.0.0.1:3130):
npm run smoke:api-mode

# If you used port 3000:
npm run smoke:api-mode -- --base http://127.0.0.1:3000
```

All 17 checks should pass. A passing smoke test means the generated snapshot
is fully compatible with the API layer end-to-end, with no manual file copying.

## What this validates

- The `tmp` snapshot's file layout matches what `data-reader.ts` expects.
- Zod schema validation inside each route handler accepts the generated data.
- Every checked page returns HTTP 200 in API mode.
- Symbol profile auto-discovery works if the snapshot contains symbol entries.

## What this does NOT do

- Does not write to `public/data/` at any point.
- Does not start or kill the dev server automatically (you do that in Step 2).
- Does not test the static-file data mode (covered by `check-static-data.mjs`).
- Does not replace `typecheck` / `lint` / `build`.

## Relationship to other docs

| Doc | Covers |
|---|---|
| `V3_MANUAL_PIPELINE_RUNNER.md` | How to run the pipeline and validate static JSON |
| `V3_API_MODE_SMOKE_TEST.md` | How the smoke test works and what it checks |
| **This doc** | How to bridge a `tmp` snapshot into a live API smoke test |
