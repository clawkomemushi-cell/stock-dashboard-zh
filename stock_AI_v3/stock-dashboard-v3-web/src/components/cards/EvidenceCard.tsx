import type { SymbolAINote, Provenance } from "@/lib/contracts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { safeArray, safeText } from "@/lib/utils/safe";
import { Badge } from "@/components/ui/badge";

/**
 * EvidenceCard / ProvenanceCard - shows the supporting evidence behind an
 * AI judgement, plus a small provenance footer telling the user where the
 * claim ultimately came from.
 */
export function EvidenceCard({
  evidence,
  provenance,
  emptyMessage = "目前沒有附帶研判依據。",
}: {
  evidence?: SymbolAINote["evidence"];
  provenance?: Provenance;
  emptyMessage?: string;
}) {
  const items = safeArray(evidence);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-sm font-semibold">研判依據</div>
        {provenance && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {provenance.source && (
              <Badge variant="outline">來源 · {provenance.source}</Badge>
            )}
            {provenance.generatedBy && (
              <Badge variant="outline">產生 · {provenance.generatedBy}</Badge>
            )}
            {provenance.pipelineRunId && (
              <span className="font-mono">{provenance.pipelineRunId}</span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState title="無研判依據" description={emptyMessage} />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {items.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                {e.url ? (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    {safeText(e.label)}
                  </a>
                ) : (
                  <span>{safeText(e.label)}</span>
                )}
                {e.kind && (
                  <Badge variant="outline" className="ml-auto">
                    {e.kind}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
