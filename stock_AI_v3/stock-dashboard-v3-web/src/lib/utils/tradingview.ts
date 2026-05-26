/**
 * Converts internal ticker format to TradingView widget symbol format.
 * Internal: "2330.TW" → TradingView: "TWSE:2330"
 * US stocks pass through unchanged (e.g. "AAPL" stays "AAPL").
 */
export function toTradingViewSymbol(ticker: string): string {
  if (ticker.endsWith(".TW")) {
    return `TWSE:${ticker.slice(0, -3)}`;
  }
  return ticker;
}
