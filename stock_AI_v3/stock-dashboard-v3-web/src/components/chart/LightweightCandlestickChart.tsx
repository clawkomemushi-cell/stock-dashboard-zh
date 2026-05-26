"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { OhlcPoint } from "@/lib/market/yahoo-chart";

export function LightweightCandlestickChart({
  data,
  height = 360,
}: {
  data: OhlcPoint[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const candleData = useMemo(
    () =>
      data.map((p) => ({
        time: toUtcTimestamp(p.time),
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      })),
    [data]
  );

  const ma5Data = useMemo(() => buildMaData(data, 5), [data]);
  const ma20Data = useMemo(() => buildMaData(data, 20), [data]);
  const ma60Data = useMemo(() => buildMaData(data, 60), [data]);

  const volumeData = useMemo(
    () =>
      data
        .filter((p) => p.volume != null)
        .map((p) => ({
          time: toUtcTimestamp(p.time),
          value: p.volume ?? 0,
          color: p.close >= p.open ? "rgba(38, 166, 154, 0.35)" : "rgba(239, 83, 80, 0.35)",
        })),
    [data]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || candleData.length === 0) return;

    const chart = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(226, 232, 240, 0.82)",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.12)" },
        horzLines: { color: "rgba(148, 163, 184, 0.12)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(148, 163, 184, 0.25)" },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.25)",
        timeVisible: false,
        secondsVisible: false,
      },
      localization: { locale: "zh-TW" },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    candles.setData(candleData);

    const ma5 = chart.addSeries(LineSeries, {
      color: "#fbbf24",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ma5.setData(ma5Data);

    const ma20 = chart.addSeries(LineSeries, {
      color: "#60a5fa",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ma20.setData(ma20Data);

    const ma60 = chart.addSeries(LineSeries, {
      color: "#c084fc",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ma60.setData(ma60Data);

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volume.setData(volumeData);

    chart.timeScale().fitContent();
    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = volume;

    const resize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, [candleData, ma5Data, ma20Data, ma60Data, volumeData, height]);

  return <div ref={containerRef} className="h-full w-full" style={{ minHeight: height }} />;
}

function buildMaData(data: OhlcPoint[], period: number) {
  return data
    .map((point, index) => {
      if (index + 1 < period) return null;
      const slice = data.slice(index + 1 - period, index + 1);
      const value = slice.reduce((sum, p) => sum + p.close, 0) / period;
      return { time: toUtcTimestamp(point.time), value };
    })
    .filter((point): point is { time: UTCTimestamp; value: number } => point !== null);
}

function toUtcTimestamp(date: string): UTCTimestamp {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000) as UTCTimestamp;
}
