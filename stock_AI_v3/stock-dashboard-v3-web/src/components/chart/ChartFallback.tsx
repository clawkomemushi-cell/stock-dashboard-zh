import { ExternalLink } from "lucide-react";
import { toTradingViewSymbol } from "@/lib/utils/tradingview";

export function ChartFallback({
  ticker,
  height,
  title = "TradingView 內嵌圖表暫時無法載入",
}: {
  ticker: string;
  height: number;
  title?: string;
}) {
  const tvSymbol = toTradingViewSymbol(ticker);
  const normalizedTicker = ticker.replace(/\.TW$/, "");
  const yahooSymbol = ticker.endsWith(".TW") ? `${normalizedTicker}.TW` : ticker;
  const tradingViewSlug = tvSymbol.replace(":", "-");

  return (
    <div
      className="flex flex-col items-start justify-center gap-3 rounded-md border border-border/70 bg-muted/20 p-4 text-sm"
      style={{ minHeight: height }}
    >
      <div className="font-semibold">{title}</div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        可能是 TradingView widget 被瀏覽器、網路或外部服務擋下；此處改提供外部圖表入口，個股頁其他 AI 研判、技術面、基本面與消息仍可正常閱讀。
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <a
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-accent"
          href={`https://www.tradingview.com/symbols/${tradingViewSlug}/`}
          target="_blank"
          rel="noreferrer"
        >
          TradingView <ExternalLink className="h-3 w-3" />
        </a>
        <a
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-accent"
          href={`https://tw.stock.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}`}
          target="_blank"
          rel="noreferrer"
        >
          Yahoo 股市 <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="text-[10px] text-muted-foreground">symbol: {tvSymbol}</div>
    </div>
  );
}
