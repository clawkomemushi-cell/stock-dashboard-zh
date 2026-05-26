# V3 Manual Pipeline Runner

Status: complete, 2026-05-09.

## Goal

Provide a single safe command that chains snapshot generation and static-data
validation into one reviewable run, without touching `public/data/`, without
starting a server, and without enabling cron.

## Scope

This is a **manual verification tool**, not an automated job. It is meant to be
run by a human who wants to confirm that a generated snapshot is well-formed
before doing anything further with it.

## Non-goals

- Does NOT write to `public/data/`.
- Does NOT start a dev or production server.
- Does NOT deploy or publish anything.
- Does NOT enable or modify any cron job.
- Does NOT call external APIs or change credentials.

## Usage

```bash
# Generate + validate with seed data (default output: tmp/manual-pipeline-snapshot)
npm run pipeline:manual

# Generate + validate with the sample input fixture
npm run pipeline:manual:sample

# Custom date and output directory
node scripts/run-v3-manual-pipeline.mjs --date 2026-05-12 --out tmp/my-run

# With a custom input file
node scripts/run-v3-manual-pipeline.mjs --input fixtures/snapshot-input.sample.json

# All options together
node scripts/run-v3-manual-pipeline.mjs \
  --date 2026-05-12 \
  --input fixtures/snapshot-input.sample.json \
  --out tmp/my-run
```

## CLI flags

| Flag | Description | Default |
|---|---|---|
| `--date YYYY-MM-DD` | Override snapshot date | Today (Asia/Taipei) |
| `--input <file>` | Input file for Phase 2B override mode | Seed data only |
| `--out <dir>` | Output directory | `tmp/manual-pipeline-snapshot` |

## What it runs

Two sequential steps:

1. **Generate** — calls `generate-v3-snapshot.mjs` with the given flags,
   writing all JSON files into `<out>/`.
2. **Validate** — calls `check-static-data.mjs` with `DATA_ROOT=<out>`,
   reading from the same output directory.

Both steps stream their output to the terminal. If either step fails (non-zero
exit), the pipeline stops and exits with code 1. Both steps must pass for exit 0.

## Safety guarantees

- `--out` is resolved to an absolute path before anything runs.
- The script **refuses** to run if `--out` resolves to `public/data` or any
  path inside it.
- The default output path is always inside `tmp/`, which is gitignored.
- No files outside `<out>/` are touched.

## npm scripts

| Script | What it does |
|---|---|
| `npm run pipeline:manual` | Seed run → `tmp/manual-pipeline-snapshot` |
| `npm run pipeline:manual:sample` | Sample input run → `tmp/manual-pipeline-snapshot-sample` |

## Interpreting results

After a successful run the terminal shows a next-steps block:

```
[pipeline] ✓ All steps passed.
[pipeline] Snapshot: tmp/manual-pipeline-snapshot
[pipeline] Next steps (manual, not automated):
[pipeline]   Inspect files : ls tmp/manual-pipeline-snapshot/
[pipeline]   Validate again: DATA_ROOT=tmp/manual-pipeline-snapshot node scripts/check-static-data.mjs
[pipeline]   View in UI    : copy snapshot to public/data manually, then:
[pipeline]                   NEXT_PUBLIC_DATA_MODE=static-file npm run dev
```

Copying the snapshot to `public/data/` for UI inspection is always a
**manual, human-reviewed step** and is outside the scope of this tool.

## Relationship to other scripts

| Script | Role |
|---|---|
| `generate-v3-snapshot.mjs` | Generator only; writes snapshot, does not validate |
| `check-static-data.mjs` | Validator only; reads `DATA_ROOT` or `public/data` |
| `run-v3-manual-pipeline.mjs` | Orchestrator: runs both in sequence safely |
| `smoke-api-mode.mjs` | API smoke test; independent from this pipeline |

## Phase position

This script is the Phase 2D deliverable. It wraps the existing Phase 2A
generator and Phase 2B input-override support into a single ergonomic command.
It does not add new data generation logic.

Phase 3 will extend the pipeline to pull live price and news data so the input
file can be populated from real market data rather than hand-crafted JSON.
