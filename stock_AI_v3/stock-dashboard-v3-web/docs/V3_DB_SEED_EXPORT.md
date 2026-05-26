# V3 DB Seed Export

How to turn a manual-pipeline snapshot into a SQLite seed SQL file.

---

## Overview

`scripts/export-snapshot-to-sql.mjs` reads a snapshot directory produced by `run-v3-manual-pipeline.mjs` and emits a SQLite-compatible `INSERT OR REPLACE` SQL file.

- No DB driver required — pure Node.js built-ins, pure text output.
- No `dev.db` created automatically — you control when/whether to import.
- Tables exported: `pipeline_runs`, `symbols`, `watchlists`, `watchlist_items`, `ideas`, `news_events`, `reports`, `system_health_snapshots`.
- Tables intentionally skipped (require auth context): `users`, `idea_user_states`, `paper_holdings`, `paper_trades`.

---

## End-to-End Workflow

### Step 1 — Generate a snapshot

```sh
# Sample run (uses fixtures/snapshot-input.sample.json):
npm run pipeline:manual:sample

# Or a custom run:
npm run pipeline:manual -- --input path/to/input.json --out tmp/my-snapshot
```

Output goes to `tmp/manual-pipeline-snapshot-sample/` (or your `--out` directory).

### Step 2 — Export snapshot → SQL seed file

```sh
# Sample (reads tmp/manual-pipeline-snapshot-sample, writes tmp/v3-seed-sample.sql):
npm run db:export-seed:sample

# Default (reads tmp/manual-pipeline-snapshot, writes tmp/v3-seed.sql):
npm run db:export-seed

# Custom paths:
node scripts/export-snapshot-to-sql.mjs \
  --data-root tmp/my-snapshot \
  --out tmp/my-seed.sql
```

### Step 3 — Import into SQLite (if `sqlite3` is available locally)

```sh
# Create DB from schema + seed:
sqlite3 dev.db < db/schema.sqlite.sql
sqlite3 dev.db < tmp/v3-seed-sample.sql

# Verify:
sqlite3 dev.db ".tables"
sqlite3 dev.db "SELECT COUNT(*) FROM ideas;"
sqlite3 dev.db "SELECT ticker, name, role FROM ideas;"
```

`dev.db` is gitignored. It is a local dev artifact — do not commit it.

---

## In-Memory Validation (no sqlite3 binary needed)

```sh
python3 - <<'EOF'
import sqlite3, pathlib
con = sqlite3.connect(':memory:')
con.executescript(pathlib.Path('db/schema.sqlite.sql').read_text())
con.executescript(pathlib.Path('tmp/v3-seed-sample.sql').read_text())
for t in ['pipeline_runs','symbols','watchlists','watchlist_items',
          'ideas','news_events','reports','system_health_snapshots']:
    print(t, con.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0])
EOF
```

---

## Script Options

| Option | Default | Description |
|---|---|---|
| `--data-root <dir>` | `tmp/manual-pipeline-snapshot` | Snapshot directory to read |
| `--out <file>` | `tmp/v3-seed.sql` | SQL file to write |

---

## Notes

- JSON fields (e.g. `themes_json`, `raw_json`) are stored as SQLite TEXT, with single quotes escaped by doubling (`''`).
- `PRAGMA foreign_keys = OFF` during import allows inserting rows in any order; it is re-enabled after `COMMIT`.
- `INSERT OR REPLACE` is idempotent — re-running the import is safe.
- The `watchlists` table gets one synthetic system default watchlist (`wl-system-default`) derived from the watchlist items in the snapshot.
