# V3 Phase 2B/C/D/F — Snapshot Generator Input Spec

Status: updated Phase 2F, 2026-05-09.

## Goal

Extend `generate-v3-snapshot.mjs` to accept a structured input file so real
analysis context (candidates, news, market summary, per-ticker notes) can drive
the generated snapshot — without changing any of the generator's safe defaults
or touching `public/data/`.

## Scope

- **Phase 2B**: `--input <file>` flag support in the generator.
- **Phase 2C**: Input schema validation with clear error messages.
- **Phase 2D**: `fixtures/snapshot-input.sample.json` + `generate:snapshot:sample` npm script.
- **Phase 2E**: Consistent next-steps prompt in the generator output; validation
  documented below.

## Non-goals

- No external API calls.
- No changes to `public/data/`.
- No new npm dependencies (validation is pure JS).
- No automation or cron integration.

## Usage

```bash
# Seed mode (original Phase 2A behavior, unchanged)
npm run generate:snapshot

# Input-driven mode (Phase 2B)
node scripts/generate-v3-snapshot.mjs --input fixtures/snapshot-input.sample.json

# Input with explicit date and output directory
node scripts/generate-v3-snapshot.mjs \
  --input fixtures/snapshot-input.sample.json \
  --date 2026-05-09 \
  --out ./tmp/my-snapshot

# Sample run (shortcut)
npm run generate:snapshot:sample
```

## Date resolution

Priority (highest to lowest):

1. `--date` CLI flag
2. `input.date` field in the input file
3. Today's date in Asia/Taipei timezone

## Input file format

The input file is a JSON object. All fields are optional — omit any section to
fall back to the Phase 2A seed behavior for that section.

```jsonc
{
  // Optional: override the snapshot date (YYYY-MM-DD)
  "date": "2026-05-09",

  // Optional: override dashboard.driver
  "marketSummary": {
    "headline": "One-line market read (required if marketSummary is present)",
    "detail": "Longer explanation of today's main driver",
    "bias": "long | short | neutral",
    "themes": ["AI", "半導體"],
    "confidence": "high | medium | low"
  },

  // Optional: override ideas.json and dashboard.topIdeas (max 5)
  "candidates": [
    {
      "ticker": "2330.TW",           // required
      "name": "台積電",               // required
      "role": "starter",             // required: starter | watch | observe | avoid
      "summary": "...",              // required
      "whySelected": "...",          // required — why now, what's the thesis
      "trigger": "...",              // required — specific entry condition
      "invalidation": "...",         // required — when is the thesis wrong
      "risk": "...",                 // required — key risks
      "themes": ["AI", "半導體"],    // optional
      "confidence": "high",          // optional: high | medium | low (default: medium)
      "relatedNewsIds": ["n-001"],   // optional; auto-derived from news if omitted
      "kind": "stock",               // optional; looked up from seed pool if omitted
      "id": "c-001"                  // optional; auto-assigned if omitted
    }
  ],

  // Optional: override news.json (replaces all seed news)
  "news": [
    {
      "id": "n-001",                 // required
      "title": "...",                // required
      "source": "工商時報",           // required
      "oneLineSummary": "...",       // required
      "whyItMatters": "...",         // required — the investment reasoning
      "relatedSymbols": ["2330.TW"], // optional
      "relatedThemes": ["AI"],       // optional
      "importanceScore": 0.9,        // optional: 0–1 (default: 0.70)
      "noiseScore": 0.05,            // optional: 0–1 (default: 0.20)
      "topic": "earnings",           // optional: earnings | supply-chain | macro | product | flow | news | other
      "url": "https://...",          // optional
      "publishedAt": "2026-05-09T08:30:00+08:00",  // optional; defaults to date T08:00
      "impactType": "symbol",        // optional
      "impactScope": ["semiconductor"], // optional
      "isLowSignal": false           // optional (default: false)
    }
  ],

  // Optional: override close/weekly report summary text
  "reports": {
    "closeSummary": "...",   // optional; overrides close report summaryForModels text
    "weeklySummary": "..."   // optional; overrides weekly report summary text
  },

  // Optional: per-ticker ai-note overrides (keyed by ticker string)
  "notes": {
    "2330.TW": {
      "thesis": "...",               // optional; overrides seed thesis
      "whySelected": "...",          // optional
      "trigger": "...",              // optional; also used in symbol checkpoints
      "invalidation": "...",         // optional; also used in symbol checkpoints
      "riskScenarios": ["..."],      // optional; array of risk strings
      "bias": "long",                // optional: long | short | neutral
      "confidence": "high"           // optional: high | medium | low
    }
  }
}
```

## Validation rules (Phase 2C)

The generator validates the input before writing any files and exits with a
clear error list if any check fails. Rules:

| Field | Rule |
|---|---|
| `date` | YYYY-MM-DD format if present |
| `marketSummary.headline` | Required non-empty string if `marketSummary` is present |
| `marketSummary.bias` | One of: `long`, `short`, `neutral` |
| `marketSummary.confidence` | One of: `high`, `medium`, `low` |
| `candidates` | Array, max 5 items |
| `candidates[i].ticker` | Required non-empty string |
| `candidates[i].name` | Required non-empty string |
| `candidates[i].role` | One of: `starter`, `watch`, `observe`, `avoid` |
| `candidates[i].summary` | Required non-empty string |
| `candidates[i].whySelected` | Required non-empty string |
| `candidates[i].trigger` | Required non-empty string |
| `candidates[i].invalidation` | Required non-empty string |
| `candidates[i].risk` | Required non-empty string |
| `candidates[i].confidence` | One of: `high`, `medium`, `low` if present |
| `news[i].id` | Required non-empty string |
| `news[i].title` | Required non-empty string |
| `news[i].source` | Required non-empty string |
| `news[i].oneLineSummary` | Required non-empty string |
| `news[i].whyItMatters` | Required non-empty string |
| `news[i].importanceScore` | Number 0–1 if present |
| `news[i].noiseScore` | Number 0–1 if present |
| `news[i].topic` | One of valid topics if present |
| `notes.<ticker>` | Object; `bias` and `confidence` validated if present |
| `reports.closeSummary` | Non-empty string if present |
| `reports.weeklySummary` | Non-empty string if present |

## Override behavior

| Section | When input provides it | When input omits it |
|---|---|---|
| `candidates` | Replaces `ideas.json` entirely | Seed 2 ideas (TSMC, MediaTek) |
| `news` | Replaces `news.json` entirely | Seed 5 news items |
| `marketSummary` | Drives `dashboard.driver` | Seed driver text |
| `notes.<ticker>` | Merges into `symbols/<ticker>/ai-note.json` | Seed SYMBOL_DATA values |
| `reports.closeSummary` | Overrides close report `summaryForModels` | Seed summary text |
| `reports.weeklySummary` | Overrides weekly report `summary` | Seed summary text |

Notes do **not** change `WATCHLIST_POOL` — the 5 seed watchlist entries are
always used for `watchlist.json`. `inIdeasToday` flags are updated dynamically
based on which tickers appear in `candidates`.

## Unknown ticker behavior (Phase 2F)

Input `candidates` may include tickers that are **not** in the seed
`WATCHLIST_POOL` or `SYMBOL_DATA`. These "unknown tickers" are fully supported:

- They appear in `ideas.json` (same as any candidate).
- They appear in `symbols.json` with `sector: "placeholder"` and a `_dataNote` field.
- All 7 symbol detail files are generated under `symbols/<ticker>/`:
  - `profile.json` — uses candidate `name`, `kind`, `themes`; sector/industry are `"placeholder"`.
  - `overview.json` — `last`, `changePct`, `rangeDay`, `range52w`, `volume`, `marketCap` are all `null`; `status` is `"unknown"`.
  - `technical.json` — all numeric fields are `null`; `trend` is `"unknown"`; arrays are empty.
  - `fundamentals.json` — no numeric fundamentals; `revenueMonthly` is empty.
  - `ai-note.json` — derived from candidate fields (`summary`, `whySelected`, `trigger`, `invalidation`, `risk`) and any matching `notes.<ticker>` override.
  - `news.json` — filtered from input `news` where `relatedSymbols` includes the ticker.
  - `checkpoints.json` — one pre-market checkpoint derived from candidate `trigger`/`invalidation`.
- Every placeholder file includes a `_dataNote` string field marking it as placeholder/unknown.
- These tickers do **not** appear in `watchlist.json` — they are ideas-only.
- `check-static-data.mjs` will scan their files (via `symbols.json` index) and report any format errors.

### Unknown ticker limitations

- Price, technical, and fundamental data are all `null` — no inference is attempted.
- The `status` field in `overview.json` is `"unknown"`, not `"ok"` or `"warn"`.
- `watchlist-ai-summary.json` still covers only the 5 seed watchlist entries.
- `watchlist-scans.json` scan results still reference only seed pool tickers.
- Themes, related symbols, and news cross-references still require explicit input.

## Validation workflow (Phase 2E)

After running the generator, always validate before any UI inspection:

```bash
# Validate the default output
DATA_ROOT=tmp/generated-v3-snapshot node scripts/check-static-data.mjs

# Validate the sample output
DATA_ROOT=tmp/generated-v3-snapshot-sample node scripts/check-static-data.mjs
```

The generator prints these commands in its next-steps output automatically.

## Sample fixture

`fixtures/snapshot-input.sample.json` is a ready-to-run example showing all
four sections (date, marketSummary, candidates, news, notes). Run it with:

```bash
npm run generate:snapshot:sample
```

Output goes to `tmp/generated-v3-snapshot-sample/` and never touches `public/data/`.

## Phase 2B/2F limitations

- `WATCHLIST_POOL` and `SYMBOL_DATA` (price, technical, fundamental data) are
  still Phase 2A seed values. Input overrides text fields only for seed tickers.
- `reports.closeSummary` overrides only `summaryForModels` in the close report.
  `reports.weeklySummary` overrides only `summary` in the weekly report.
  Other report fields (tickerResults, keyWins, etc.) are still seed content.
- `watchlist-ai-summary.json` still uses the seed 5-stock summary text.
- `today.json` dashboard checkpoints are not driven by input.
- Unknown ticker symbol files contain fully placeholder numeric data (all null).

## Next phase

Phase 3 will add live price/news data ingestion so the input file can be
populated from real market data rather than hand-crafted JSON.
