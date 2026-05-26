# V3 Frontend Spec

## Product positioning
Taiwan stock **research & decision cockpit**.

It is **not**:
- a marketing landing page
- a single-purpose report viewer
- an AI-only dashboard

It **is**:
- a workbench combining Watchlist · Ideas · News · Today · Symbol research · Reports · System health
- usable for both human research and AI-driven idea surfacing
- designed so that AI / OpenClaw writes data only — the frontend is never modified by AI directly

## Tech stack
- Next.js 16 (App Router, Server Components first)
- TypeScript (strict)
- Tailwind CSS + shadcn/ui-style primitives
- Zod (contracts)
- Recharts (reserved; current pages do not yet use it)
- lucide-react (icons)
- next-themes (dark-first)

## Hard constraints
- Frontend only — no real DB, no real API, no auth, no broker integration, no scheduler
- Adapter-driven — UI never imports mock data directly; pages go through `getAdapters()`
- A/B switchable — `dataMode | aiMode | newsMode | chartMode` are first-class flags
- No GitHub Pages workarounds; deploy targets are Vercel / Cloudflare Pages
- No assumption of Yahoo / paid APIs; preferred external entries: TradingView, TWSE, TPEx, MOPS, ETF issuer

## Stability rules
1. Missing data must not crash the page; render `EmptyState`.
2. Unknown enum values must not crash. All enums in contracts use soft enums (`z.string()` documented with known values).
3. Each adapter call is wrapped in `tryAsync()`; failures render `ErrorState` for that panel only.
4. Each page composes panels — one broken panel never breaks the page.
5. Each card supports fallback text via `safeText()`.
6. Pages do not assume completeness — every field is optional.

## Visual language
- Dark mode primary; light mode supported via `next-themes`
- Dense but disciplined — cockpit feel
- Status badges, freshness badges, mode badges, evidence chips are first-class
- No flashy hero, minimal animation
- Desktop primary; mobile supported via bottom nav

## Differentiation vs generic stock dashboards
- **Ideas** page — AI proactively surfaces candidates with role + trigger + invalidation
- **News** page — curated + impact + theme + symbol-linked, with low-signal segregation
- **System Health** — frontend exposes the freshness/missingness of the data pipeline so users always know the AI's state
- **A/B mode design** — `mock`, `static-file`, `api` data backends are switchable without code changes
