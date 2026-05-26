import { readFile } from "node:fs/promises";
import path from "node:path";
import { getAdapters } from "@/lib/adapters";
import { tryAsync, safeArray, safeText } from "@/lib/utils/safe";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { TimelineCheckpointCard } from "@/components/cards/TimelineCheckpointCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DailyCheckpoint } from "@/lib/contracts";

export const dynamic = "force-dynamic";

const KIND_ORDER = ["pre", "open-track", "mid", "noon", "close", "evening", "after"];

function sortCheckpoints(checkpoints: DailyCheckpoint[]): DailyCheckpoint[] {
  return [...checkpoints].sort((a, b) => {
    const ai = KIND_ORDER.indexOf(a.kind ?? "");
    const bi = KIND_ORDER.indexOf(b.kind ?? "");
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    const at = a.timestamp ?? "";
    const bt = b.timestamp ?? "";
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
}

export default async function TodayPage() {
  const adapters = getAdapters();
  const [result, premarketPlan] = await Promise.all([
    tryAsync(() => adapters.timeline.getToday()),
    loadPremarketPlan(),
  ]);

  if (!result.ok) return <ErrorState detail={result.error.message} />;
  const checkpoints = safeArray(result.value);
  if (checkpoints.length === 0) {
    return (
      <div className="flex flex-col gap-4 max-w-3xl">
        <PageHeader />
        {premarketPlan && <PremarketPlanCard plan={premarketPlan} />}
        <EmptyState title="今日尚無觀察點" />
      </div>
    );
  }

  const sorted = sortCheckpoints(checkpoints);

  // Group by kind in KIND_ORDER; unknown kinds go last
  const byKind = new Map<string, DailyCheckpoint[]>();
  for (const c of sorted) {
    const k = c.kind ?? "__unknown";
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k)!.push(c);
  }
  const groupKeys = [...KIND_ORDER, "__unknown"].filter((k) => byKind.has(k));

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <PageHeader />
      {premarketPlan && <PremarketPlanCard plan={premarketPlan} />}

      <div className="relative pl-6">
        <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
        <div className="flex flex-col gap-4">
          {groupKeys.flatMap((kind) => {
            const items = byKind.get(kind)!;
            if (kind === "open-track") {
              return [<OpenTrackSection key="open-track-section" items={items} />];
            }
            return items.map((c) => <CheckpointNode key={c.id} c={c} />);
          })}
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <header>
      <h1 className="text-lg font-semibold tracking-tight">今日時間軸</h1>
      <p className="text-xs text-muted-foreground">
        盤前 → 開盤後追蹤 → 午間 → 收盤 → 晚間。每段附進場條件 / 失效條件。
      </p>
    </header>
  );
}

function CheckpointNode({ c }: { c: DailyCheckpoint }) {
  return (
    <div className="relative">
      <span className="absolute -left-[18px] top-3 h-3 w-3 rounded-full border-2 border-primary bg-background" />
      <TimelineCheckpointCard c={c} />
    </div>
  );
}

type PremarketCandidate = {
  ticker?: string;
  name?: string;
  whyToday?: string;
  observableConditions?: string;
  entryOrWatchTrigger?: string;
  invalidation?: string;
  risks?: string;
  fractionalShareView?: string;
};

type PremarketPlan = {
  date?: string;
  generatedAt?: string;
  marketContext?: string;
  candidates?: PremarketCandidate[];
  validation?: string;
  risks?: string;
  nextChecks?: string;
};

async function loadPremarketPlan(): Promise<PremarketPlan | null> {
  try {
    const file = path.join(process.cwd(), "public", "data", "premarket-plan.json");
    const parsed = JSON.parse(await readFile(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function PremarketPlanCard({ plan }: { plan: PremarketPlan }) {
  const candidates = safeArray(plan.candidates);
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">盤前 AI 計畫</Badge>
          <span className="font-semibold text-sm">真正盤前 / 早盤交易計畫</span>
          {plan.generatedAt && <Badge variant="info" className="ml-auto">{safeText(plan.generatedAt)}</Badge>}
        </div>
        {plan.date && <p className="text-xs text-muted-foreground">日期：{safeText(plan.date)}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <PlanField label="大盤與題材背景" value={plan.marketContext} />
        {plan.validation && <PlanField label="開盤後驗證" value={plan.validation} />}
        {candidates.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">今日候選</span>
            {candidates.map((candidate, index) => (
              <div key={`${candidate.ticker ?? candidate.name ?? "candidate"}-${index}`} className="rounded-lg border bg-background/70 p-3">
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  {candidate.ticker && <Badge variant="outline">{candidate.ticker}</Badge>}
                  <span>{safeText(candidate.name ?? candidate.ticker ?? `候選 ${index + 1}`)}</span>
                </div>
                <div className="mt-2 grid gap-1.5 text-xs text-foreground/85">
                  <PlanField label="為什麼今天注意" value={candidate.whyToday} />
                  <PlanField label="觀察條件" value={candidate.observableConditions} />
                  <PlanField label="進場 / 加碼觸發" value={candidate.entryOrWatchTrigger} />
                  <PlanField label="不要碰 / 失效條件" value={candidate.invalidation} />
                  <PlanField label="主要風險" value={candidate.risks} />
                  <PlanField label="零股觀點" value={candidate.fractionalShareView} />
                </div>
              </div>
            ))}
          </div>
        )}
        <PlanField label="整體風險" value={plan.risks} />
        <PlanField label="後續檢查" value={plan.nextChecks} />
      </CardContent>
    </Card>
  );
}

function PlanField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="whitespace-pre-wrap text-xs text-foreground/85">{safeText(value)}</span>
    </div>
  );
}

function OpenTrackSection({ items }: { items: DailyCheckpoint[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex items-center gap-2">
        <span className="absolute -left-[18px] top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-blue-500 bg-background" />
        <div className="ml-0 flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30">
            開盤後追蹤區段
          </span>
          <span className="text-muted-foreground font-normal">
            確認候選是否真發動、是否假突破
          </span>
        </div>
      </div>
      <div className="ml-4 flex flex-col gap-3 border-l-2 border-blue-500/30 pl-4">
        {items.map((c) => (
          <TimelineCheckpointCard key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}
