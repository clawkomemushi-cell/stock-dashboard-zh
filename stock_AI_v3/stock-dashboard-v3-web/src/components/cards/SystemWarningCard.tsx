import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { safeArray } from "@/lib/utils/safe";

export function SystemWarningCard({
  warnings,
  staleData,
  missingData,
}: {
  warnings?: string[];
  staleData?: string[];
  missingData?: string[];
}) {
  const w = safeArray(warnings);
  const s = safeArray(staleData);
  const m = safeArray(missingData);
  const total = w.length + s.length + m.length;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--warn))]" />
          <span className="text-sm font-semibold">系統警告</span>
          <Badge variant={total === 0 ? "success" : "warn"} className="ml-auto">
            {total}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        {total === 0 && (
          <p className="text-muted-foreground">目前沒有警告。</p>
        )}
        {w.map((x, i) => (
          <p key={`w-${i}`} className="text-foreground/85">
            • {x}
          </p>
        ))}
        {s.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-muted-foreground">過期：</span>
            {s.map((x) => (
              <Badge key={x} variant="warn">
                {x}
              </Badge>
            ))}
          </div>
        )}
        {m.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-muted-foreground">缺失：</span>
            {m.map((x) => (
              <Badge key={x} variant="danger">
                {x}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
