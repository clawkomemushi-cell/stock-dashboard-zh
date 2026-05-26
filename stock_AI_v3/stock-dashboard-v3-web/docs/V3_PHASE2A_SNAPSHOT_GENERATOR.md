# V3 Phase 2A — Snapshot Generator

Status: v1 complete, 2026-05-09.

## What this is

`scripts/generate-v3-snapshot.mjs` is the Phase 2A manual static-file snapshot generator.

It produces a complete draft snapshot aligned with `public/data/**` format, written to a safe output directory (`tmp/generated-v3-snapshot/` by default). It never touches `public/data/` or any production file.

## Usage

```bash
# Generate with default date (today, Asia/Taipei) into tmp/generated-v3-snapshot/
npm run generate:snapshot

# Or with explicit date
node scripts/generate-v3-snapshot.mjs --date 2026-05-12

# With a custom output directory
node scripts/generate-v3-snapshot.mjs --date 2026-05-12 --out ./tmp/my-snapshot
```

## What it generates

All core files required by `npm run check:static-data`:

| File | Description |
|---|---|
| `dashboard.json` | Overview: market session, driver, top ideas, news, checkpoints |
| `watchlist.json` | 5 watchlist candidates with status |
| `watchlist-scans.json` | Technical scan results |
| `watchlist-ai-summary.json` | Free-text AI summary of watchlist |
| `ideas.json` | Candidate idea pool (max 5) |
| `themes.json` | Theme radar (AI, 半導體, AI Server, 高息防禦) |
| `news.json` | Curated news items with importance/noise scores |
| `today.json` | Timeline checkpoints (pre / midday / close) |
| `system-health.json` | Run status, data freshness, route health |
| `symbols.json` | Symbol index |
| `symbols/{ticker}/profile.json` | Company profile, links |
| `symbols/{ticker}/overview.json` | Price, market cap, one-line thesis |
| `symbols/{ticker}/technical.json` | RSI, MA, support/resistance |
| `symbols/{ticker}/fundamentals.json` | PE, PB, EPS, revenue monthly |
| `symbols/{ticker}/ai-note.json` | Full AI thesis, trigger, invalidation, risk |
| `symbols/{ticker}/news.json` | News filtered for this symbol |
| `symbols/{ticker}/checkpoints.json` | Symbol-level checkpoints |
| `reports/recent-close.json` | Index of recent close reports |
| `reports/recent-weekly.json` | Index of recent weekly reports |
| `reports/close/{prevDate}.json` | Close review (previous trading day) |
| `reports/weekly/{week}.json` | Weekly report |

## Current watchlist (Phase 2A seed)

5 stocks representing the AI/semiconductor Taiwan market landscape:

| Ticker | Name | Role | Rationale |
|---|---|---|---|
| 2330.TW | 台積電 | starter | AI 主線核心，N3/N2 月營收年增確認需求落地 |
| 2454.TW | 聯發科 | watch | 手機+AI邊緣推論，等待庫存確認後升級 |
| 2317.TW | 鴻海 | watch | AI Server 組裝訂單能見度延伸，估值彈性有限 |
| 00919.TW | 群益台灣精選高息 | observe | 防禦型 ETF 衛星倉，震盪市場穩定器 |
| 3034.TW | 聯詠 | observe | 驅動 IC 景氣底部，等待補庫訂單訊號 |

## How to validate against check:static-data

`npm run check:static-data` normally reads from `public/data/`, but the checker also accepts `DATA_ROOT` for safe draft validation:

```bash
DATA_ROOT=tmp/generated-v3-snapshot node scripts/check-static-data.mjs
```

This does **not** overwrite existing `public/data/`.

If you want to inspect the generated snapshot in the UI, then make a temporary backup/copy manually and restore it afterward. Do not do that as part of automated checks.

## How to inspect in the UI

```bash
# Copy to public/data (see Option A above), then:
NEXT_PUBLIC_DATA_MODE=static-file npm run dev
# Open http://localhost:3000
```

## Content design principles

The generated content follows `V3_PIPELINE_SPEC.md` principles:

- **Explain reasoning, not just conclusions** — every idea has thesis, trigger, invalidation, risk.
- **Report quality feedback loop** — close/weekly reports include `summaryForModels` for future context.
- **Max 5 candidates** — not always 5; only 2 in `ideas.json` (starter + watch) as appropriate for current phase.
- **No paid data** — all content is hand-crafted / semi-real, no external API calls.

## Phase 2A limitations

- Content is static semi-real data, not live market data.
- Date arithmetic uses naive prev-trading-day (no holiday calendar).
- No intraday or midday checkpoint generation (only pre-market).
- No news fetching or web scraping (future pipeline step).

## Next phase

Phase 2B will extend this generator to accept real news/price context as structured input, so the AI can fill in the `thesis`, `trigger`, and `invalidation` fields with genuine analysis. See `V3_PIPELINE_SPEC.md` for the full pipeline vision.
