import { ExternalLink } from "lucide-react";
import type { ExternalResearchLink } from "@/lib/contracts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { safeArray } from "@/lib/utils/safe";

/**
 * ExternalLinksCard — outbound research entries.
 * Default kinds: tradingview, twse, tpex, mops, issuer, other.
 * Prefers TradingView / TWSE / TPEx / MOPS / ETF issuer (no Yahoo).
 */
export function ExternalLinksCard({
  links,
  fallbackTicker,
}: {
  links?: ExternalResearchLink[];
  fallbackTicker?: string;
}) {
  const items = safeArray(links);

  // If we have nothing but a ticker, synthesise some default external links.
  // This keeps the symbol page useful even when AI hasn't shipped curated links yet.
  const synth = items.length === 0 && fallbackTicker
    ? buildDefaultLinks(fallbackTicker)
    : items;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-sm font-semibold">外部研究入口</div>
        <p className="text-xs text-muted-foreground">
          TradingView · TWSE · TPEx · MOPS · ETF issuer
        </p>
      </CardHeader>
      <CardContent>
        {synth.length === 0 ? (
          <EmptyState title="無外部連結" description="尚未提供外部研究連結。" />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {synth.map((l, i) => (
              <li key={l.id ?? `${l.url}-${i}`}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{l.label}</span>
                  {l.kind && (
                    <Badge variant="outline" className="ml-auto">
                      {l.kind}
                    </Badge>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function buildDefaultLinks(ticker: string): ExternalResearchLink[] {
  const isTW = ticker.endsWith(".TW");
  const numeric = ticker.replace(".TW", "");
  if (!isTW) {
    return [
      {
        label: "TradingView",
        url: `https://www.tradingview.com/symbols/${ticker}/`,
        kind: "tradingview",
      },
    ];
  }
  return [
    {
      label: "TradingView",
      url: `https://www.tradingview.com/symbols/TPE-${numeric}/`,
      kind: "tradingview",
    },
    {
      label: "TWSE 個股行情",
      url: `https://www.twse.com.tw/zh/stockSearch.html?stockId=${numeric}`,
      kind: "twse",
    },
    {
      label: "TPEx 個股行情",
      url: `https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430.php?l=zh-tw&stkno=${numeric}`,
      kind: "tpex",
    },
    {
      label: "MOPS 公開資訊",
      url: `https://mops.twse.com.tw/mops/web/t05st01?TYPEK=sii&co_id=${numeric}`,
      kind: "mops",
    },
  ];
}
