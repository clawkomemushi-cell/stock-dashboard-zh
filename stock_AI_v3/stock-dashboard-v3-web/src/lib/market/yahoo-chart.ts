export type OhlcPoint = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type YahooChartResult = {
  ticker: string;
  provider: "yahoo-chart";
  asOf?: string;
  currency?: string;
  regularMarketPrice?: number;
  points: OhlcPoint[];
  error?: string;
};

type YahooResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        regularMarketPrice?: number;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
};

export async function getYahooOhlc(
  ticker: string,
  options: { range?: string; interval?: string } = {}
): Promise<YahooChartResult> {
  const range = options.range ?? "6mo";
  const interval = options.interval ?? "1d";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;

  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 OpenClaw stock dashboard",
      },
      next: { revalidate: 60 * 15 },
    });

    if (!res.ok) {
      return { ticker, provider: "yahoo-chart", points: [], error: `Yahoo HTTP ${res.status}` };
    }

    const payload = (await res.json()) as YahooResponse;
    const error = payload.chart?.error;
    if (error) {
      return {
        ticker,
        provider: "yahoo-chart",
        points: [],
        error: error.description ?? error.code ?? "Yahoo chart error",
      };
    }

    const result = payload.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const timestamps = result?.timestamp ?? [];
    const points: OhlcPoint[] = [];
    timestamps.forEach((ts, i) => {
      const open = quote?.open?.[i];
      const high = quote?.high?.[i];
      const low = quote?.low?.[i];
      const close = quote?.close?.[i];
      if (open == null || high == null || low == null || close == null) return;
      const volume = quote?.volume?.[i];
      points.push({
        time: new Date(ts * 1000).toISOString().slice(0, 10),
        open,
        high,
        low,
        close,
        ...(volume == null ? {} : { volume }),
      });
    });

    return {
      ticker,
      provider: "yahoo-chart",
      asOf: result?.meta?.regularMarketTime
        ? new Date(result.meta.regularMarketTime * 1000).toISOString()
        : undefined,
      currency: result?.meta?.currency,
      regularMarketPrice: result?.meta?.regularMarketPrice,
      points,
    };
  } catch (err) {
    return {
      ticker,
      provider: "yahoo-chart",
      points: [],
      error: err instanceof Error ? err.message : "Unknown Yahoo chart fetch error",
    };
  }
}
