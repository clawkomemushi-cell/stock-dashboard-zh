"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChartFallback } from "@/components/chart/ChartFallback";
import { getModeConfig } from "@/lib/modes/config";
import { toTradingViewSymbol } from "@/lib/utils/tradingview";

export function TradingViewAdvancedChartShell({
  ticker,
  height = 480,
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
        "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.async = true;
      script.type = "text/javascript";
      script.onerror = markFailed;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: tvSymbol,
        interval: "D",
        timezone: "Asia/Taipei",
        theme: "dark",
        style: "1",
        locale: "zh_TW",
        allow_symbol_change: false,
        save_image: false,
        hide_side_toolbar: false,
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
  }, [ticker, chartMode, tvSymbol, height, chartKey]);

  if (chartMode !== "tradingview") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            進階圖表
            <Badge variant="outline" className="ml-auto">
              圖表 · {chartMode}
            </Badge>
          </div>
        </CardHeader>
        <CardContent style={{ minHeight: height }}>
          <EmptyState
            title="圖表佔位"
            description={`chartMode = ${chartMode}。後續接入即可顯示。`}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          進階圖表 · {ticker}
          <Badge variant="outline" className="ml-auto">
            TradingView
          </Badge>
        </div>
      </CardHeader>
      <CardContent style={{ minHeight: height }}>
        {failed ? (
          <ChartFallback ticker={ticker} height={height} title="TradingView 進階圖表暫時無法載入" />
        ) : (
          <div ref={containerRef} className="tradingview-widget-container" style={{ height }} />
        )}
      </CardContent>
    </Card>
  );
}
