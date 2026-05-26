# V3 Static Publish Contract

## Purpose

`static-file` mode exists so the frontend can read published JSON snapshots from `public/data/**` without needing a live backend.

This contract defines:
- what files exist
- what each file means
- how stale / missing / invalid data should behave
- how future API responses should stay aligned with the same resource model

The goal is to keep `static-file` mode trustworthy rather than letting it become an informal mock dump.

## Scope

Current phase:
- frontend is live
- backend / DB / API are not yet the primary source
- OpenClaw or a later publisher can write JSON snapshots into `public/data/**`
- the frontend reads those snapshots through `STATIC_FILE_BUNDLE`

This is a **publish contract**, not a UI contract.
The UI should keep consuming typed adapter outputs; the adapter is where raw file validation happens.

## Root path

Default static data root:

```text
public/data/
```

The adapter resolves this from:
- `NEXT_PUBLIC_STATIC_DATA_BASE`
- default: `data`

So the runtime URL shape is `/data/...`, while the filesystem shape is `public/data/...`.

## Core file list

### Daily overview / workspace files

```text
public/data/dashboard.json
public/data/watchlist.json
public/data/watchlist-scans.json
public/data/watchlist-ai-summary.json
public/data/ideas.json
public/data/themes.json
public/data/news.json
public/data/today.json
public/data/system-health.json
public/data/symbols.json
```

### Symbol research files

Per ticker:

```text
public/data/symbols/<TICKER>/profile.json
public/data/symbols/<TICKER>/overview.json
public/data/symbols/<TICKER>/technical.json
public/data/symbols/<TICKER>/fundamentals.json
public/data/symbols/<TICKER>/ai-note.json
public/data/symbols/<TICKER>/news.json
public/data/symbols/<TICKER>/checkpoints.json
```

Example:

```text
public/data/symbols/2330.TW/profile.json
```

### Report files

```text
public/data/reports/recent-close.json
public/data/reports/recent-weekly.json
public/data/reports/close/<YYYY-MM-DD>.json
public/data/reports/weekly/<YYYY-Www>.json
```

Examples:

```text
public/data/reports/close/2026-04-25.json
public/data/reports/weekly/2026-W17.json
```

## Resource meaning by file

- `dashboard.json` = daily overview entry, not the full system state
- `watchlist.json` = user-tracked symbol pool
- `watchlist-scans.json` = watchlist-related scan outputs
- `watchlist-ai-summary.json` = short AI summary over the watch pool
- `ideas.json` = AI candidate pool
- `themes.json` = theme radar / theme cross-links
- `news.json` = curated event workspace output
- `today.json` = same-day checkpoint timeline
- `system-health.json` = trust / freshness / fallback snapshot
- `symbols.json` = symbol index / explorer seed
- `symbols/<ticker>/*` = symbol research slices
- `reports/*` = review / reflection artifacts

## Metadata baseline

For phase 1, metadata is a **recommended baseline**, not a hard requirement for every file shape.
This is intentional so current prototype collections can remain simple arrays where appropriate.

Recommended metadata fields:

- `asOf`: timestamp for when the data slice is valid / observed
- `tradingDate`: canonical trading date for daily artifacts (`YYYY-MM-DD`)
- `generatedAt`: timestamp for when the artifact was published/generated
- `sourceMode`: where this artifact came from (`mock`, `static-file`, `api`, `published`, `sample`, etc.)
- `provenance`: optional source lineage / pipeline metadata

### Phase 1 rule

- If these fields already exist, validate and preserve them.
- If they do not yet exist, do **not** break the frontend just to enforce them.
- Prefer soft checks + warnings first.
- Promote to stricter requirements later when the publisher is stable.

## Metadata hardening roadmap (recommended)

This roadmap describes a measured upgrade path so publishers and the frontend can converge
without breaking existing workflows.

- Phase 1 — soft baseline (current):
  - `asOf`, `tradingDate`, `generatedAt`, `sourceMode` are *recommended*.
  - Missing fields → checker emits **warning** but does not block publish.
  - UI shows trust-level and System Health surfaces warnings.

- Phase 2 — pragmatic enforcement:
  - Core daily artifacts (dashboard, ideas, news, today, system-health) must include
    `tradingDate` and `generatedAt` or the publisher's pipeline should fail the publish.
  - Checker returns non-zero exit when core daily files are missing these fields.

- Phase 3 — full metadata coverage:
  - All published files should include the metadata envelope (or the agreed equivalent)
    with `asOf`, `tradingDate` (if applicable), `generatedAt`, and `sourceMode`.
  - At this stage the frontend and publisher can treat metadata as authoritative.

Notes:
- Use Asia/Taipei timezone (UTC+08:00) for tradingDate/offset when relevant and ISO 8601 with offset
  for timestamps, e.g. `2026-04-26T13:30:00+08:00`.
- Phase transitions should be announced and coordinated with whoever publishes the
  `public/data` artifacts; do not flip enforcement without a migration window.

### Practical note for collection files

Some current artifacts are top-level arrays (`ideas.json`, `news.json`, `today.json`, etc.).
For those files, phase 1 may rely on per-item timestamps such as:
- `asOf`
- `publishedAt`
- `timestamp`
- `lastUpdated`

If a future publisher wants stronger metadata without changing the logical resource, there are two acceptable directions:
1. add a top-level envelope later and update the adapter once, or
2. keep the current raw array shape and publish a lightweight sidecar manifest / health snapshot

Do not force a breaking contract change before the publisher side is ready.

## Daily consistency rule

For the same publish cycle, these artifacts should point to the same daily context whenever applicable:

- `dashboard.json`
- `ideas.json`
- `news.json`
- `today.json`
- `system-health.json`
- optionally `watchlist-scans.json`

If they expose `tradingDate`, those values should match.
If they do not expose `tradingDate`, a checker may derive a representative date from:
- `asOf`
- `publishedAt`
- `timestamp`
- `date`

Derived dates are useful for warnings, but explicit `tradingDate` is preferred once the publisher is stable.

## Stale data principles

### Daily workspaces
These should not mix dates silently.

Bad:
- `dashboard.json` reflects 2026-04-26
- `today.json` reflects 2026-04-25
- `news.json` still shows yesterday's curated batch

Good:
- the checker warns or fails before publish
- `system-health.json` surfaces stale / missing slices
- the UI may still render partial panels, but the trust state must be visible

### Symbol research
Symbol detail slices may be older than the daily overview, but must be explicit via timestamps such as `asOf` or equivalent.
Symbol research can be stale; it must not be *silently stale*.

### Reports
- close review artifacts should align with their `date`
- weekly review artifacts should align with their `week`
- recent report indices should not reference missing files

## Missing file / fallback policy

### In the adapter
Current adapter behavior:
- if a static file is missing or schema-invalid, the call falls back to `MOCK_BUNDLE`
- this prevents a blank page during frontend development

### In the product contract
That fallback is allowed only as a **graceful degradation layer**, not as a silent success condition.

Rules:
- missing / invalid core files should be visible through warnings and System Health
- repeated fallback should not be treated as healthy published data
- publisher-side checks should fail fast on malformed core artifacts before they are considered a good publish

## Schema validation failure policy

If schema validation fails for a core static artifact:

1. adapter should warn
2. UI may degrade gracefully (today: fallback mock)
3. System Health should make the degradation visible
4. publisher-side validation / checking should fail the artifact for operational purposes

In short:
- **frontend behavior:** degrade gracefully
- **publish behavior:** do not call it healthy

## API parity rule

Future `api` mode should reuse the same resource boundaries.

That means:
- `GET /dashboard` should map to the same semantic payload as `dashboard.json`
- `GET /ideas` should map to the same semantic payload as `ideas.json`
- `GET /symbols/:ticker/profile` should map to the same semantic payload as `symbols/<ticker>/profile.json`
- `GET /reports/close/:date` should map to the same semantic payload as `reports/close/<date>.json`

The API does **not** need to mirror file paths literally.
But it should mirror the same **resource contract**.

Do not let static-file responses and API responses drift into two different product models.
If the API later adds envelopes or pagination, keep the payload meaning compatible and adapt that in the adapter boundary.

## What should fail a static publish check

Hard failure candidates:
- `public/data` missing
- core JSON file missing
- core JSON parse failure
- recent report index points at missing report file
- explicit daily metadata is present but contradictory in core files

Warning-only candidates for phase 1:
- recommended metadata missing
- non-core sample symbol detail slices missing
- derived dates unavailable for some optional collections
- some symbol research slices older than daily overview but still timestamped

## Recommended publish workflow

1. Generate / collect raw slices
2. Normalize into contract-shaped JSON artifacts
3. Write into `public/data/**`
4. Run `npm run check:static-data`
5. If the check is clean enough, build / publish
6. Let `system-health.json` reflect warnings / fallback / freshness honestly

## Phase 1 takeaway

The contract should become stricter over time, but not at the cost of breaking the current working prototype.
The current priority order is:

1. stable resource boundaries
2. deterministic file paths
3. parseability + minimal consistency checks
4. visible trust / freshness status
5. stronger metadata discipline later
