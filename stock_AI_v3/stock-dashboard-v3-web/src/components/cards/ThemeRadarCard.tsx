import Link from "next/link";
import type { ThemeRadarItem } from "@/lib/contracts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Minus, TrendingDown } from "lucide-react";
import { safeArray, safeText } from "@/lib/utils/safe";

const ICON: Record<string, React.ReactNode> = {
  rising: <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--bull))]" />,
  stable: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
  fading: <TrendingDown className="h-3.5 w-3.5 text-[hsl(var(--bear))]" />,
};

export function ThemeRadarCard({ t }: { t: ThemeRadarItem }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">#{safeText(t.theme)}</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            {t.momentum && (ICON[t.momentum] ?? null)}
            {safeText(t.momentum, "—")}
          </span>
        </div>
        {t.description && (
          <p className="text-xs text-muted-foreground">{t.description}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1.5">
        {safeArray(t.relatedSymbols).map((s) => (
          <Link key={s} href={`/symbols/${encodeURIComponent(s)}`}>
            <Badge variant="outline" className="hover:bg-accent">
              {s}
            </Badge>
          </Link>
        ))}
        {safeArray(t.relatedSymbols).length === 0 && (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </CardContent>
    </Card>
  );
}
