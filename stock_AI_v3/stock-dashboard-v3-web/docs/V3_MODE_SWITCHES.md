# V3 Mode Switches

Four orthogonal flags drive the UI/adapter behaviour. They are read from
`NEXT_PUBLIC_*` env vars at build/runtime and resolved through `getModeConfig()`.

| Flag | Values | Default | Owner |
|---|---|---|---|
| `dataMode` | `mock` · `static-file` · `api` | `mock` | Adapter factory — picks `MOCK_BUNDLE` / `STATIC_FILE_BUNDLE` / (future) api bundle |
| `aiMode` | `published` · `live` | `published` | UI layer — controls AI Notes & Ideas refresh semantics; `live` reserved for future re-run |
| `newsMode` | `curated` · `stream` | `curated` | NewsAdapter filter + News page UI; `stream` reserved for raw event feed |
| `chartMode` | `tradingview` · `native` · `provider-x` | `tradingview` | TradingView shells decide whether to mount the embed or render placeholders |

## Resolver

```ts
// src/lib/modes/config.ts
export function getModeConfig(): ModeConfig {
  return {
    dataMode: pick(process.env.NEXT_PUBLIC_DATA_MODE, DATA_MODES, "mock"),
    aiMode:   pick(process.env.NEXT_PUBLIC_AI_MODE,   AI_MODES,   "published"),
    newsMode: pick(process.env.NEXT_PUBLIC_NEWS_MODE, NEWS_MODES, "curated"),
    chartMode:pick(process.env.NEXT_PUBLIC_CHART_MODE,CHART_MODES,"tradingview"),
  };
}
```

`pick()` validates against the known-values constant; any unrecognised env value falls back to default. **Switching modes requires no code change.**

## Surface in UI
- Topbar shows all four flags as `ModeBadge` chips on `lg+` screens.
- System Health page repeats the same chips and includes them in the routes table.

## A/B coverage today

| Mode value | Status |
|---|---|
| `dataMode=mock` | ✓ functional — default |
| `dataMode=static-file` | ✓ functional — falls back to mock per-call if a file is missing |
| `dataMode=api` | ⌛ reserved — falls back to mock with a console warning; intended for backend integration |
| `aiMode=published` | ✓ functional |
| `aiMode=live` | ⌛ UI flag wired; live re-run requires backend |
| `newsMode=curated` | ✓ functional |
| `newsMode=stream` | ⌛ UI selector wired; stream feed requires backend |
| `chartMode=tradingview` | ✓ functional (loads embed widgets at runtime) |
| `chartMode=native` | ⌛ placeholder — would mount internal `<Recharts>` shell |
| `chartMode=provider-x` | ⌛ placeholder — reserved for paid chart provider swap |

## Combinations expected to work right now
- `mock + published + curated + tradingview` (default) — full dev experience
- `static-file + published + curated + tradingview` — for "AI publishes daily snapshot to /public/data" pipeline

## Combinations that intentionally degrade
- `chartMode != tradingview` — symbol detail still fully usable; only the chart container becomes a placeholder.
- `dataMode = api` — falls back to mock; meant only as a placeholder until the API adapter ships.
