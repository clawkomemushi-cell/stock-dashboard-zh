"use client";

import { useMemo, useState } from "react";
import type { YahooChartResult } from "@/lib/market/yahoo-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataFreshnessBadge } from "@/components/shared/DataFreshnessBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { LightweightCandlestickChart } from "@/components/chart/LightweightCandlestickChart";

type ChartPeriod = "day" | "week" | "month";

type ChartSet = Partial<Record<ChartPeriod, YahooChartResult>>;

const PERIODS: Array<{ key: ChartPeriod; label: string }> = [
  { key: "day", label: "日" },
  { key: "week", label: "週" },
  { key: "month", label: "月" },
];

export function YahooCandlestickChartShell({
  ticker,
  charts,
}: {
  ticker: string;
  charts: ChartSet;
}) {
  const defaultPeriod = charts.day?.points.length ? "day" : charts.week?.points.length ? "week" : "month";
  const [period, setPeriod] = useState<ChartPeriod>(defaultPeriod);
  const chart = charts[period] ?? charts.day ?? charts.week ?? charts.month;
  const last = chart?.points.at(-1);
  const prev = chart?.points.at(-2);
  const change = last && prev ? last.close - prev.close : null;
  const changePct = last && prev ? (change! / prev.close) * 100 : null;
  const amplitudePct = last ? ((last.high - last.low) / last.open) * 100 : null;
  const ma5 = chart ? movingAverage(chart.points.map((p) => p.close), 5) : null;
  const ma20 = chart ? movingAverage(chart.points.map((p) => p.close), 20) : null;
  const ma60 = chart ? movingAverage(chart.points.map((p) => p.close), 60) : null;
  const periodLabel = useMemo(() => PERIODS.find((p) => p.key === period)?.label ?? "日", [period]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          K 線圖 · {ticker}
          <Badge variant="outline" className="ml-auto">Lightweight Charts</Badge>
          <Badge variant="secondary">Yahoo Chart API · {periodLabel}K</Badge>
          <DataFreshnessBadge asOf={chart?.asOf} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => {
            const count = charts[p.key]?.points.length ?? 0;
            return (
              <Button
                key={p.key}
                type="button"
                size="sm"
                variant={period === p.key ? "default" : "outline"}
                disabled={count < 5}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}K
              </Button>
            );
          })}
        </div>

        {!chart || chart.points.length < 5 ? (
          <EmptyState
            title="Yahoo K 線資料暫時讀不到"
            description={chart?.error ?? "目前沒有足夠 OHLC 資料，請稍後再試。"}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
              <Metric label="最新收盤" value={fmt(last?.close)} strong />
              <Metric
                label={`${periodLabel}漲跌`}
                value={changePct == null ? "—" : `${changePct > 0 ? "+" : ""}${fmt(change)} (${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%)`}
                tone={changePct == null ? undefined : changePct >= 0 ? "bull" : "bear"}
              />
              <Metric label="開盤 / 高 / 低" value={`${fmt(last?.open)} / ${fmt(last?.high)} / ${fmt(last?.low)}`} />
              <Metric label="成交量" value={fmtVolume(last?.volume)} />
              <Metric label="振幅" value={amplitudePct == null ? "—" : `${amplitudePct.toFixed(2)}%`} />
              <Metric label="MA5" value={fmt(ma5)} tone="ma5" />
              <Metric label="MA20" value={fmt(ma20)} tone="ma20" />
              <Metric label="MA60" value={fmt(ma60)} tone="ma60" />
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><i className="h-2 w-4 rounded bg-[#26a69a]" />紅/綠 K：OHLC</span>
              <span className="inline-flex items-center gap-1"><i className="h-0.5 w-4 bg-[#fbbf24]" />MA5</span>
              <span className="inline-flex items-center gap-1"><i className="h-0.5 w-4 bg-[#60a5fa]" />MA20</span>
              <span className="inline-flex items-center gap-1"><i className="h-0.5 w-4 bg-[#c084fc]" />MA60</span>
              <span>下方柱狀：成交量</span>
            </div>
            <div className="overflow-hidden rounded-md border border-border bg-background/40 p-1">
              <LightweightCandlestickChart key={period} data={chart.points} />
            </div>
            <div className="text-[11px] leading-relaxed text-muted-foreground">
              圖表套件：open-source GitHub 專案 `tradingview/lightweight-charts`。資料來源：Yahoo Finance v8 chart API，日/週/月分別直接取 OHLC/volume，不使用 TradingView iframe/embed，也不使用合成價格。
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, strong = false, tone }: { label: string; value: string; strong?: boolean; tone?: "bull" | "bear" | "ma5" | "ma20" | "ma60" }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-mono ${strong ? "text-base font-semibold" : "text-sm"} ${tone === "bull" ? "text-[hsl(var(--bull))]" : tone === "bear" ? "text-[hsl(var(--bear))]" : tone === "ma5" ? "text-[#fbbf24]" : tone === "ma20" ? "text-[#60a5fa]" : tone === "ma60" ? "text-[#c084fc]" : ""}`}>{value}</div>
    </div>
  );
}

function movingAverage(values: number[], period: number) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

function fmt(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1000) return value.toLocaleString("zh-TW", { maximumFractionDigits: 0 });
  return value.toLocaleString("zh-TW", { maximumFractionDigits: 2 });
}

function fmtVolume(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)}億`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}萬`;
  return value.toLocaleString("zh-TW");
}
