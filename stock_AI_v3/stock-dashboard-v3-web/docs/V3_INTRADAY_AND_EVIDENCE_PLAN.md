# V3 Intraday Tracking & Evidence Plan

Status: draft implemented as planning doc on 2026-05-10.

## Why this matters

A useful stock cockpit cannot publish a pre-market thesis and wait until noon to check it. The highest-risk window is often the first 30–60 minutes after open, and thesis invalidation can happen before lunch.

V3 should therefore treat each market day as a sequence of lightweight thesis checks, not one large report.

## Intraday schedule proposal

All times are Taiwan time.

| Time | Phase | Main purpose | Website update | Push rule |
|---|---|---|---|---|
| 08:30 | Pre-market thesis | Overnight context, market bias, candidate pool | Dashboard / Ideas / Today | Send concise pre-market summary |
| 09:05 | Open check | Gap, opening breadth, first-volume anomaly | Today checkpoint only | Push only if index > ±0.5%, watchlist gap > ±2%, or thesis invalidated |
| 09:30 | Early thesis check | Confirm whether open move has follow-through | Today + candidate state patch | Push only if candidate trigger/invalidation fires |
| 10:00 | Intraday check 1 | Breadth, volume vs prior sessions, key levels | Today + Ideas state | Silent if no material change |
| 11:30 | Intraday check 2 | Mid-session thesis health, new material news | Today + News | Push only major news or risk change |
| 12:15 | Noon summary | Lunch break review and afternoon risk | Dashboard + Today | Send short summary only if morning thesis changed |
| 13:00 | Pre-close check | Last 30-min risk, stop/target proximity | Today + candidate state patch | Push only high/medium priority alerts |
| 13:35 | Close capture | Final prices, candidate result state | Close review draft data | No push unless critical |
| 18:00–20:30 | Full review | Close review, lessons, next-day watchpoints | Reports / Dashboard | Send final daily summary when ready |

## Anti-spam rules

1. Silent by default: cron may run without sending Discord messages.
2. One symbol / one direction / one session alert only once.
3. Push immediately only for high-priority events:
   - limit up/down
   - trading halt or major announcement
   - candidate invalidation
   - watchlist move > ±3% with abnormal volume
4. Medium-priority events are batched at scheduled checkpoints:
   - breakout / breakdown
   - volume > 150% of comparable prior-session pace
   - major index move > ±1%
5. Low-priority changes update the site only.

## Candidate evidence model

Every AI candidate should carry visible evidence. If evidence is missing, confidence must be downgraded instead of silently pretending the recommendation is strong.

Recommended candidate evidence payload:

```ts
interface CandidateEvidenceSummary {
  dataAsOf: string;
  technical: EvidenceItem[];
  chip: EvidenceItem[];
  fundamental: EvidenceItem[];
  news: EvidenceItem[];
  macro: EvidenceItem[];
  missingFields: string[];
  freshnessWarnings: string[];
}

interface EvidenceItem {
  label: string;
  source: string;
  asOf: string;
  value?: string;
  interpretation: string;
  url?: string;
}
```

## Minimum required sources before a candidate can be `入場`

A candidate may only be marked as `starter` / `入場` when at least these source groups are present:

1. Technical: recent price/volume and key levels.
2. Chip/flow: at least one of foreign investors, investment trust, margin/short, or comparable flow signal.
3. News/event: either no material negative news found, or relevant news explicitly reviewed.
4. Freshness: core data no older than the latest available trading session.

If only technical data exists, role must be at most `watch` / `關注`.

## Confidence downgrade rules

| Condition | Action |
|---|---|
| Missing one core source group | high → medium, medium → low |
| Missing two or more core source groups | max confidence = low |
| Data older than two trading sessions | downgrade one level + stale warning |
| Candidate relies on unverified news headline only | max role = observe |
| Invalidation already triggered intraday | mark as invalidated, do not keep as active idea |

## UI implications

Candidate cards should eventually show:

- evidence completeness badge: `資料完整`, `資料不完整`, `資料過期`
- expandable evidence block grouped by 技術 / 籌碼 / 基本面 / 消息 / 總經
- missing data list in plain Chinese
- timestamp of the newest and oldest source

## Implementation status (Phase 3, 2026-05-18)

All phases complete:

1. ✅ `Candidate` contract extended with `evidence?: CandidateEvidenceSummary` (optional, backward compatible). Also exports `EvidenceItem` and `CandidateEvidenceSummary` types from `src/lib/contracts/ideas.ts`.
2. ✅ `CandidateCard` now renders `<CandidateEvidenceSummary>` — completeness badge, missing-data chip row, and expandable grouped evidence items. Shared component at `src/components/shared/CandidateEvidenceSummary.tsx`.
3. ✅ DB pipeline writer (`scripts/write-v3-pipeline-to-db.mjs`) already stores `raw_json: JSON.stringify(idea)` — evidence fields are preserved without any schema change needed.
4. ✅ `public/data/ideas.json` updated with evidence data for all 4 candidates (台積電: complete, 聯發科/鴻海: partial, 台達電: weak).
5. ✅ Intraday checkpoint writer implemented: `scripts/run-v3-intraday-checkpoint.mjs` (Phase 3).
6. ✅ Dedup state via `tmp/v3-intraday-dedup-state.json`.

## Remaining implementation sequence

7. Only after manual validation, enable cron schedules (requires explicit user approval).

---

## Intraday Checkpoint — How to Use (Phase 3)

### Script: `scripts/run-v3-intraday-checkpoint.mjs`

```bash
# Dry-run (default, no files modified)
npm run intraday:checkpoint:dry-run
# or
node scripts/run-v3-intraday-checkpoint.mjs --dry-run

# Write mode (updates public/data/today.json + tmp/v3-intraday-dedup-state.json)
npm run intraday:checkpoint:write
# or
node scripts/run-v3-intraday-checkpoint.mjs --write

# With DB write (also appends symbol_insights to SQLite)
node scripts/run-v3-intraday-checkpoint.mjs --write --db tmp/v3-live.db

# Override phase (auto-detected from TW time by default)
node scripts/run-v3-intraday-checkpoint.mjs --dry-run --phase mid
```

### Phase auto-detection (Taiwan time)

| Time (TW) | Phase |
|---|---|
| 00:00–07:59 | after (overnight) |
| 08:00–08:59 | pre |
| 09:00–09:29 | open-track |
| 09:30–13:34 | mid |
| 13:35–17:59 | close |
| 18:00–23:59 | evening |

### What the dry-run outputs

- Which tickers were fetched and quote results
- All alert candidates (priority, event type, shouldNotify flag, message)
- How many were deduped vs new
- The checkpoint that **would** be written (id, status, summary)
- Which dedup keys would be recorded

### What write mode does

1. Appends a `DailyCheckpoint` entry to `public/data/today.json` (avoids same-id duplicates)
2. Updates `tmp/v3-intraday-dedup-state.json` with new keys — same alert won't fire twice in the same phase
3. Optionally writes per-ticker `symbol_insights` rows to SQLite (if `--db` provided)

### Dedup key format

```
{date}|{phase}|{ticker}|{eventType}|{direction}
Example: 2026-05-18|mid|2454.TW|price-move|up
```

- dry-run never updates the state
- `--write` records new keys; same event in same phase is suppressed
- Different phases: same event can re-fire (e.g., stale-evidence in pre + mid)

### Alert event types

| eventType | Priority | shouldNotify default |
|---|---|---|
| `stale-evidence` | medium | false (silent) |
| `price-move` (≥3%) | medium | false |
| `price-move` (≥5%) | high | true |
| `near-stop` | high | true |
| `hit-stop` | high | true |
| `near-target` | medium | false |
| `hit-target` | high | true |
| `watchlist-move` (≥3%) | medium | false |
| `watchlist-move` (≥5%) | high | true |

### Why it won't spam

- Same (date, phase, ticker, eventType, direction) tuple is recorded in dedup state after first write
- Subsequent runs in the same phase skip already-seen events
- No Discord or external messaging is ever sent by this script
- `shouldNotify` in checkpoint payload is informational only — cron must explicitly be enabled to act on it

## Cron activation rule

Do not enable formal stock cron jobs until:

1. ✅ Manual pipeline produces valid DB/API data.
2. ✅ Evidence completeness is visible on the site.
3. ✅ Intraday checks can run silently without duplicate pushes.
4. ❌ User approves re-enabling stock schedules. (BLOCKED — do not enable without explicit approval)
