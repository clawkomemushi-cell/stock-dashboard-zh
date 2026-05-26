# stock-dashboard-v3-web

> Taiwan stock research & decision **cockpit** — v3 MVP.

This is the V3 TW stock research workbench combining Watchlist · Ideas · News · Today timeline · Symbol research · Reports · System health · Glossary.

> **Current milestone.** The UI now has API/SQLite-backed watchlist CRUD and an opt-in single-user login gate. The AI/data pipeline, production DB/provider, scheduler, broker integration, and OpenClaw write pipeline are still staged work.

## Quick start

```bash
# 1. install
npm install

# 2. run dev
npm run dev

# open http://localhost:3000  → redirects to /dashboard
```

The default mode bundle is `mock + published + curated + tradingview`, which gives you a fully populated UI with the seeded fixtures.

## Mode switches

Set in `.env.local` (see `.env.example`):

```
NEXT_PUBLIC_DATA_MODE=mock          # mock | static-file | api (api is reserved / not yet implemented)
NEXT_PUBLIC_AI_MODE=published       # published | live
NEXT_PUBLIC_NEWS_MODE=curated       # curated | stream
NEXT_PUBLIC_CHART_MODE=tradingview  # tradingview | native | provider-x
NEXT_PUBLIC_STATIC_DATA_BASE=/data
```

When `dataMode=static-file`, the static-file adapter reads JSON from `public/data/...` on the server and falls back to mock per-call if a file is missing or fails schema validation. Add sample JSON files under `public/data/` if you want to validate static-file mode locally.

When `dataMode=api`, the frontend reads the built-in `/api/v3` route handlers. Those handlers can read static files or SQLite depending on `V3_API_SOURCE`. Watchlist CRUD currently supports DB mode as an MVP.

## Documentation

| File | What it covers |
|---|---|
| [docs/V3_FRONTEND_SPEC.md](docs/V3_FRONTEND_SPEC.md) | Product positioning, tech stack, hard constraints, stability rules |
| [docs/V3_PAGE_MAP.md](docs/V3_PAGE_MAP.md) | All 10 routes + their adapter calls |
| [docs/V3_LAYOUT_SPEC.md](docs/V3_LAYOUT_SPEC.md) | App shell, sidebar/topbar/mobile nav, color tokens |
| [docs/V3_COMPONENT_MAP.md](docs/V3_COMPONENT_MAP.md) | Every reusable component and where it's used |
| [docs/V3_CONTRACTS.md](docs/V3_CONTRACTS.md) | Zod schemas, soft-enum policy, validation strategy |
| [docs/V3_ADAPTERS.md](docs/V3_ADAPTERS.md) | Adapter interfaces, mock + static-file impls, where to plug a real API |
| [docs/V3_MODE_SWITCHES.md](docs/V3_MODE_SWITCHES.md) | Feature flags, combinations, degradation behaviour |
| [docs/V3_CLAUDE_CODEX_WORKFLOW.md](docs/V3_CLAUDE_CODEX_WORKFLOW.md) | Claude/Codex collaboration rules, review gates, approval gates |
| [docs/V3_EXECUTION_PLAN.md](docs/V3_EXECUTION_PLAN.md) | Phase 1 execution plan and recommended service-migration path |
| [docs/V3_PRODUCT_SPEC.md](docs/V3_PRODUCT_SPEC.md) | Product positioning, MVP scope, non-goals, success criteria |
| [docs/V3_PAGE_AND_FEATURE_MAP.md](docs/V3_PAGE_AND_FEATURE_MAP.md) | Existing routes, adapter ownership, service-feature map |
| [docs/V3_API_SPEC.md](docs/V3_API_SPEC.md) | Future API mode endpoint map and response/error contract |
| [docs/V3_DB_SCHEMA_DRAFT.md](docs/V3_DB_SCHEMA_DRAFT.md) | DB schema draft for users, watchlists, ideas, news, reports, trades, health |
| [docs/V3_PIPELINE_SPEC.md](docs/V3_PIPELINE_SPEC.md) | Static-file-first OpenClaw/AI pipeline design |
| [docs/V3_DECISION_LOG.md](docs/V3_DECISION_LOG.md) | Confirmed decisions, pending decisions, approval gates |
| [docs/V3_INTRADAY_AND_EVIDENCE_PLAN.md](docs/V3_INTRADAY_AND_EVIDENCE_PLAN.md) | Intraday thesis checks, notification rules, and candidate evidence requirements |

## Project structure

```
stock-dashboard-v3-web/
├── docs/                              # 7 spec docs (above)
├── public/data/                       # (optional) static-file adapter source
├── src/
│   ├── app/
│   │   ├── (app)/                     # All main routes share AppLayout
│   │   │   ├── dashboard/
│   │   │   ├── watchlist/
│   │   │   ├── ideas/
│   │   │   ├── news/
│   │   │   ├── today/
│   │   │   ├── symbols/
│   │   │   │   └── [ticker]/
│   │   │   ├── reports/
│   │   │   │   ├── close/[date]/
│   │   │   │   └── weekly/[week]/
│   │   │   └── system/health/
│   │   ├── globals.css                # theme tokens (dark first)
│   │   ├── layout.tsx                 # ThemeProvider wrap
│   │   ├── page.tsx                   # / → /dashboard
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                        # Card / Button / Badge / Input / Separator
│   │   ├── layout/                    # AppLayout, Sidebar, Topbar, MobileNav, GlobalSearch, ThemeToggle
│   │   ├── shared/                    # StatusBadge, DataFreshnessBadge, ModeBadge, EmptyState, ErrorState, LoadingSkeleton, PanelSection, FilterBar
│   │   ├── cards/                     # CandidateCard, NewsCard, ThemeRadarCard, WatchlistItemCard, ExternalLinksCard, EvidenceCard, TimelineCheckpointCard, CloseReviewSummaryCard, WeeklySummaryCard, SystemWarningCard
│   │   ├── symbol/                    # SymbolHeader
│   │   └── chart/                     # TradingViewSymbolOverviewShell, TradingViewAdvancedChartShell
│   └── lib/
│       ├── contracts/                 # Zod schemas (one file per domain)
│       ├── adapters/                  # interfaces.ts, factory.ts, mock/, static-file/
│       ├── mocks/                     # fixtures used by mock adapter
│       ├── modes/config.ts            # mode flag resolver
│       ├── providers/theme-provider.tsx
│       └── utils/cn.ts, safe.ts
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── package.json
└── .env.example
```

## Login / Auth setup

The login gate is **opt-in**: if `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, and `SESSION_SECRET` are all set in `.env.local`, the site is protected. If any is missing, the site is fully accessible (same as before).

### 1. Generate a password hash

```bash
node scripts/hash-password.mjs
# 互動式輸入密碼，輸出 bcrypt hash
```

### 2. Generate a session secret

```bash
openssl rand -base64 32
# 或任意長度 >= 32 的隨機字串
```

### 3. Set env vars in `.env.local`

```
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=$2b$12$...   # from step 1
SESSION_SECRET=your-random-secret   # from step 2
```

### 4. Restart the dev server

```bash
npm run dev
# → / will now redirect to /login
```

### 5. (Optional) Init SQLite schema

```bash
node scripts/ensure-schema.mjs
# Defaults to tmp/v3-sample.db; set V3_SQLITE_DB_PATH to override
```

## What's intentionally NOT in this milestone

- Production DB/provider selection
- Multi-user auth / OAuth
- Broker / order routing
- WebSocket / streaming
- Real news fetching (Yahoo or otherwise)
- Formal cron activation
- OpenClaw production write pipeline
- Deployment secrets
- GitHub Pages routing workarounds (HashRouter, 404 fallback) — deploy targets are Vercel / Cloudflare Pages

These are deliberately deferred so the service contract stays clean.
