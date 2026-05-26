# V3 Information Architecture

## Purpose

V3 is a **Taiwan stock research & decision cockpit**, not a generic stock portal.
Its information architecture exists to keep the user mentally oriented:

- what is a **market event**
- what is an **AI candidate**
- what is a **user-managed watch item**
- what is a **same-day checkpoint**
- what is a **backward-looking review**
- what is a **data trust / freshness signal**

The goal is to prevent page concepts from blending together as the data pipeline grows.

## Core rule

Each page owns a different **data unit**.

If two pages start showing the same unit with different labels, the architecture is drifting.

## Page responsibilities

### Dashboard
- **Role:** daily entry / overview
- **Primary data unit:** overview entry
- **What it answers:** "What matters right now, and where should I drill in next?"
- **Should contain:** market state, driver, top ideas, top news, key checkpoints, recent reports, system summary
- **Should not become:** the place that carries every detail from every downstream workspace

Dashboard is the cockpit landing page, not the full knowledge base.
It should summarize and route, not replace News / Ideas / Symbols / Reports.

### Watchlist
- **Role:** user-tracked symbol pool
- **Primary data unit:** user-tracked symbol
- **What it answers:** "What symbols am I intentionally following?"
- **Should contain:** watch items, tags, scans, user-oriented organization, AI summary over the watch pool
- **Should not become:** the AI candidate feed

Watchlist is anchored by user intent.
A symbol can exist in Watchlist without being an active idea today.
A symbol can also become an Idea without already being on the Watchlist.

### Ideas
- **Role:** AI proactive candidate pool
- **Primary data unit:** candidate
- **What it answers:** "What should I look at today even if I did not pre-select it?"
- **Should contain:** role, summary, why selected, trigger, invalidation, risk, confidence, supporting evidence
- **Should not become:** a rewritten list of headlines

Ideas are not raw events.
An Idea is a synthesized object representing a trade / research candidate.
It may cite News, but it is not News.

### News
- **Role:** curated event workspace
- **Primary data unit:** event
- **What it answers:** "What happened, why does it matter, and what might it affect?"
- **Should contain:** title, source, publishedAt, one-line summary, why it matters, impact type, related symbols/themes, importance, low-signal status
- **Should not become:** another candidate ranking page

News is event-first.
It should organize information around **events**, not around trade roles like starter / watch / avoid.

### Today
- **Role:** checkpoint timeline
- **Primary data unit:** checkpoint
- **What it answers:** "How did the day evolve across key decision moments?"
- **Should contain:** checkpoint status, summary, what changed, trigger, invalidation, linked symbols/news
- **Should not become:** a full close review or a duplicate of Dashboard

Today is for same-day sequencing.
It is about decision checkpoints, not a complete archive or reflection layer.

### Symbols
- **Role:** symbol research workspace
- **Primary data unit:** symbol research record
- **What it answers:** "What do I need to know about this symbol right now?"
- **Should contain:** profile, overview, technical snapshot, fundamentals, AI note, related news, related checkpoints, external links
- **Should not become:** a replacement for Watchlist or a global scanner

Symbols are for deep dives after the user reaches a name via Dashboard / Watchlist / Ideas / News.

### Reports
- **Role:** review / reflection workspace
- **Primary data unit:** review
- **What it answers:** "What worked, what failed, and what should change next?"
- **Should contain:** close review, weekly review, wins, misses, bias observations, adjustments
- **Should not become:** intraday state tracking

Reports are backward-looking and reflective.
They should influence future judgment, but they are not the live decision surface.

### System Health
- **Role:** data trust / freshness / fallback status
- **Primary data unit:** health snapshot
- **What it answers:** "Can I trust what I am seeing right now?"
- **Should contain:** freshness, missing data, warnings, routes, adapter mode, fallback status, last successful publish
- **Should not become:** a hidden engineering-only page no one checks

Because V3 is data-driven, System Health is not optional chrome.
It is part of the product's trust model.

## Boundary rules between similar pages

### News vs Ideas
- **News unit = event**
- **Ideas unit = candidate**

Rules:
- News must explain what happened and why it matters.
- Ideas must explain why a symbol / ETF / instrument is actionable or worth research.
- News may map to symbols and themes.
- Ideas may cite one or more News items as evidence.
- A News item does **not** automatically deserve an Idea.
- An Idea should survive even if multiple duplicate news items collapse into one event.

Short version:
- **News = evidence workspace**
- **Ideas = decision candidate workspace**

### Watchlist vs Ideas
- **Watchlist unit = user-tracked symbol**
- **Ideas unit = AI candidate**

Rules:
- Watchlist reflects user intent and persistent monitoring.
- Ideas reflect today's AI-driven prioritization.
- A symbol may exist in one, both, or neither.
- Watchlist should not imply endorsement.
- Ideas should not imply persistence.

Short version:
- **Watchlist = what I care about**
- **Ideas = what AI says deserves attention now**

### Today vs Reports
- **Today unit = checkpoint**
- **Reports unit = review**

Rules:
- Today is intra-day / same-day progression.
- Reports are reflective summaries after enough outcome is known.
- Today can feed Reports later.
- Reports should not be forced into same-day checkpoint cards.

## Recommended user journey

1. **Dashboard** gives the top-level orientation.
2. User opens **Ideas** to see AI proactive candidates.
3. User opens **News** to understand the event evidence behind the day's structure.
4. User opens **Symbols** for deeper research on a specific ticker.
5. User uses **Watchlist** to maintain the personal follow pool.
6. User checks **Today** for session checkpoints.
7. User uses **Reports** to review what happened after the fact.
8. User checks **System Health** whenever data freshness or trust is in doubt.

## Architecture smell tests

If any of the following happen, the information architecture is drifting:

- News cards start ranking symbols like starter / watch / avoid.
- Ideas cards are mostly headline rewrites with no trigger / invalidation / risk.
- Watchlist becomes a copy of Ideas with no user-managed purpose.
- Dashboard starts carrying every field from Symbol research or Reports.
- Today starts duplicating full close-review analysis.
- Reports become live state instead of reflection.
- System Health is ignored, hidden, or no longer reflects real fallback state.

## Phase 1 implementation guidance

For the current frontend-only + static-file phase:

- Keep each page's data unit distinct.
- Prefer links between workspaces over stuffing more fields into Dashboard.
- Let Ideas cite News by ID / related links, but do not merge the two schemas.
- Let Watchlist mention whether a symbol is in today's Ideas, but do not make that its main identity.
- Treat Today as a timeline of checkpoints, not a generic event stream.
- Treat Reports as review artifacts, not as the same artifact family as Today.
- Treat System Health as a first-class product page because trust is part of usability.

## Cross-reference rules (minimal governance)

These lightweight rules prevent pages from absorbing each other's responsibilities while
allowing useful cross-links and evidence to flow:

- Ideas may cite News items, technical snapshots, and market driver entries as evidence.
  - Evidence should be referenced by ID (e.g. `relatedNewsIds`, `provenance`, or `evidence` list),
    not by inlining full event payloads.
  - An Idea is still a Candidate object with `trigger` / `invalidation` / `risk` fields.

- News may list `affectedSymbols` / `relatedSymbols` / `affectedThemes`, but a News event
  must not automatically become a Candidate. Editorial judgment or synthesis rules must
  create Ideas separately.

- Symbol pages may aggregate `relatedIdeas`, `relatedNews`, and `checkpoints` as cross-references.
  - These are display aggregations and should not mutate the canonical Idea / News records.

- Dashboard remains a summary & navigation surface. It may show snippets (headline, one-line thesis),
  but should not duplicate full Symbol research or full Report content.

- Reports reference past Ideas and Checkpoints as part of the review; Reports are reflective and
  should not be used as a live decision surface.

These rules are intentionally permissive (IDs and links only). They keep data ownership simple and
avoid accidental coupling between pipelines.

## Enum drift / unknown value principle

To keep the UI stable under schema evolution:

- The frontend MUST NOT crash on unknown enum values.
- Badges / labels should show a neutral or `unknown` state (styling: muted/grey) when encountering
  unrecognized values.
- Adapters and validators should log warnings when unknown values appear; the checker may
  collect these and surface them via `system-health.json`.
- Only after operator review should a new enum value be promoted to a known value in the docs.

## Partial data UI principle

Minimal product rules for partial / missing data:

- If a **core** data slice for a page is missing or corrupted (e.g. dashboard.json parse fail),
  `System Health` should show an error state and the Dashboard should render an ErrorState panel
  explaining the missing core artifact.
- If a **non-core** panel (e.g. symbol technical snapshot, a sample symbol detail) is missing,
  the page should render `EmptyState` or a `WarningBadge` within that panel and continue to render
  other panels normally.
- Never let a single missing panel cause a full-page crash or a blank render. Prefer partial render
  + visible trust signal (System Health) over full-page failure.

These UI rules are intentionally conservative: they protect the user from silent stale data while
keeping the frontend resilient.
