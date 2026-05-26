"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChartFallback } from "@/components/chart/ChartFallback";
import { getModeConfig } from "@/lib/modes/config";
import { toTradingViewSymbol } from "@/lib/utils/tradingview";

/**
 * TradingView Symbol Overview shell.
 *
 * Shell always renders something; widget loading errors do not break the page.
 */
export function TradingViewSymbolOverviewShell({
  ticker,
  height = 220,
}: {
  ticker: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const { chartMode } = getModeConfig();
  const tvSymbol = toTradingViewSymbol(ticker);
  const chartKey = `${chartMode}:${tvSymbol}:${height}`;
  const failed = failedKey === chartKey;

  useEffect(() => {
    if (chartMode !== "tradingview" || !containerRef.current) return;

    const el = containerRef.current;
    el.innerHTML = "";
    let timer: ReturnType<typeof setTimeout> | null = null;

    const markFailed = () => window.setTimeout(() => setFailedKey(chartKey), 0);

    try {
      const script = document.createElement("script");
      script.src =
        "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
      script.async = true;
      script.type = "text/javascript";
      script.onerror = markFailed;
      script.innerHTML = JSON.stringify({
        symbols: [[`${tvSymbol}|1D`]],
        chartOnly: false,
        width: "100%",
        height,
        locale: "zh_TW",
        colorTheme: "dark",
        autosize: true,
        showVolume: false,
        hideDateRanges: false,
        scalePosition: "right",
        scaleMode: "Normal",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        noTimeScale: false,
        valuesTracking: "1",
      });
      el.appendChild(script);
      timer = setTimeout(() => {
        if (!el.querySelector("iframe")) markFailed();
      }, 7000);
    } catch {
      markFailed();
    }

    return () => {
      if (timer) clearTimeout(timer);
      el.innerHTML = "";
    };
  }, [ticker, chartMode, height, tvSymbol, chartKey]);

  if (chartMode !== "tradingview") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            個股概覽
            <Badge variant="outline" className="ml-auto">
              圖表 · {chartMode}
            </Badge>
          </div>
        </CardHeader>
        <CardContent style={{ minHeight: height }}>
          <EmptyState
            title="圖表模式為佔位"
            description={`目前 chartMode = ${chartMode}。實際圖表元件將在切換模式或接入 provider 後啟用。`}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          個股概覽 · {ticker}
          <Badge variant="outline" className="ml-auto">
            TradingView
          </Badge>
        </div>
      </CardHeader>
      <CardContent style={{ minHeight: height }}>
        {failed ? (
          <ChartFallback ticker={ticker} height={height} />
        ) : (
          <div ref={containerRef} className="tradingview-widget-container" style={{ height }} />
        )}
      </CardContent>
    </Card>
  );
}
