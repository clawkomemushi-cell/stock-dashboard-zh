/**
 * Mode / feature-flag layer.
 *
 * The whole UI is built so that switching these does NOT require code changes
 * in pages — adapters and shells observe these values.
 *
 * Source of truth (in priority order):
 *   1. Per-request override (e.g. cookie ?dataMode=static-file – future)
 *   2. NEXT_PUBLIC_* env vars (set at build / runtime)
 *   3. Default (mock / published / curated / tradingview)
 */

export const DATA_MODES = ["mock", "static-file", "api"] as const;
export type DataMode = (typeof DATA_MODES)[number];

export const AI_MODES = ["published", "live"] as const;
export type AIMode = (typeof AI_MODES)[number];

export const NEWS_MODES = ["curated", "stream"] as const;
export type NewsMode = (typeof NEWS_MODES)[number];

export const CHART_MODES = ["tradingview", "native", "provider-x"] as const;
export type ChartMode = (typeof CHART_MODES)[number];

export interface ModeConfig {
  dataMode: DataMode;
  aiMode: AIMode;
  newsMode: NewsMode;
  chartMode: ChartMode;
}

const DEFAULTS: ModeConfig = {
  // Default to the published static snapshots. Mock mode is still available via
  // NEXT_PUBLIC_DATA_MODE=mock, but it should not be the implicit production/
  // preview default because it can show stale sample numbers.
  dataMode: "static-file",
  aiMode: "published",
  newsMode: "curated",
  chartMode: "tradingview",
};

function pick<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  if (raw && (allowed as readonly string[]).includes(raw)) return raw as T;
  return fallback;
}

export function getModeConfig(): ModeConfig {
  return {
    dataMode: pick(
      process.env.NEXT_PUBLIC_DATA_MODE,
      DATA_MODES,
      DEFAULTS.dataMode
    ),
    aiMode: pick(process.env.NEXT_PUBLIC_AI_MODE, AI_MODES, DEFAULTS.aiMode),
    newsMode: pick(
      process.env.NEXT_PUBLIC_NEWS_MODE,
      NEWS_MODES,
      DEFAULTS.newsMode
    ),
    chartMode: pick(
      process.env.NEXT_PUBLIC_CHART_MODE,
      CHART_MODES,
      DEFAULTS.chartMode
    ),
  };
}
