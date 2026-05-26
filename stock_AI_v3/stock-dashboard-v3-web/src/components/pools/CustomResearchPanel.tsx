"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FlaskConical, CheckCircle2, AlertCircle } from "lucide-react";
import type { ResearchResult } from "@/lib/contracts";

type ResearchStatus = "idle" | "running" | "done" | "error";

interface CustomResearchPanelProps {
  defaultTicker?: string;
  hasFreshDeepResearch?: boolean;
  latestDeepResearchAt?: string | null;
}

/** Normalize bare 4-6 digit TW codes to "XXXX.TW". */
function normalizeTicker(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (/^\d{4,6}$/.test(t)) return `${t}.TW`;
  return t;
}

export function CustomResearchPanel({
  defaultTicker,
  hasFreshDeepResearch = false,
  latestDeepResearchAt = null,
}: CustomResearchPanelProps) {
  const router = useRouter();
  const [ticker, setTicker] = useState(defaultTicker ?? "");
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<ResearchStatus>("idle");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [submittedQuestion, setSubmittedQuestion] = useState<string>("");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const storageKey = useMemo(
    () => `v3-research-job:${normalizeTicker(defaultTicker ?? (ticker || "manual"))}`,
    [defaultTicker, ticker]
  );

  const pollJob = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/v3/research/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    const json = await res.json() as { status: string; data?: ResearchResult; error?: { message?: string } };
    if (!res.ok || json.status === "error" || !json.data) {
      throw new Error(json.error?.message ?? `HTTP ${res.status}`);
    }

    const data = json.data;
    setResult(data);
    if (data.status === "done") {
      setStatus("done");
      setCurrentJobId(null);
      window.localStorage.removeItem(storageKey);
      // Refresh server components so 最新同步洞察 / 技術 / 基準資料 panels can reread DB-backed data.
      router.refresh();
      return true;
    }
    if (data.status === "error") {
      setErrorMsg(data.message ?? "研究任務失敗");
      setStatus("error");
      setCurrentJobId(null);
      window.localStorage.removeItem(storageKey);
      router.refresh();
      return true;
    }
    setStatus("running");
    return false;
  }, [router, storageKey]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    const handle = window.setTimeout(() => {
      setCurrentJobId(saved);
      setStatus("running");
    }, 0);
    return () => window.clearTimeout(handle);
  }, [storageKey]);

  useEffect(() => {
    if (!currentJobId) return;
    let stopped = false;
    const tick = async () => {
      try {
        const done = await pollJob(currentJobId);
        if (!done && !stopped) window.setTimeout(tick, 3000);
      } catch (err) {
        if (stopped) return;
        setErrorMsg(err instanceof Error ? err.message : "研究狀態查詢失敗");
        setStatus("error");
      }
    };
    void tick();
    return () => { stopped = true; };
  }, [currentJobId, pollJob]);

  const handleTrigger = async () => {
    const t = normalizeTicker(ticker);
    if (!t) return;
    setStatus("running");
    setResult(null);
    setErrorMsg("");
    setSubmittedQuestion(question.trim());

    try {
      const res = await fetch("/api/v3/research/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tickers: [t],
        note: question.trim()
          ? `深度研究重點問題：${question.trim()}`
          : "請執行今日深度研究：整合技術面、基本面/基準資料、相關消息、近期量價與風險情境，並更新最新同步洞察。",
      }),
      });
      const json = await res.json() as { status: string; data?: ResearchResult; error?: { message?: string } };
      if (!res.ok || json.status === "error") {
        setErrorMsg(json.error?.message ?? `HTTP ${res.status}`);
        setStatus("error");
        return;
      }
      if (json.data?.jobId) {
        setResult(json.data);
        setCurrentJobId(json.data.jobId);
        window.localStorage.setItem(storageKey, json.data.jobId);
        setStatus(json.data.status === "done" ? "done" : "running");
        if (json.data.status === "done") router.refresh();
      } else {
        setErrorMsg("研究任務建立失敗：缺少 jobId");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "網路錯誤，請稍後重試");
      setStatus("error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleTrigger();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {!hasFreshDeepResearch ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">這檔今天尚無深度研究</p>
            <p className="mt-1 leading-relaxed">
              建議先按「開始今日深度研究」。深度研究完成後會寫入最新同步洞察；之後再做快速問答才有同日資料可以參照。
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
            今日已有深度研究{latestDeepResearchAt ? `（${latestDeepResearchAt.slice(0, 16).replace("T", " ")}）` : ""}。可更新研究，或用下方問題補充追問。
          </div>
        )}
        <div className="flex gap-2 items-center">
          <Input
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入股票代號，如 2330 或 2330.TW"
            className="max-w-xs font-mono text-sm"
            disabled={status === "running"}
          />
          <Button
            onClick={handleTrigger}
            disabled={status === "running" || !ticker.trim()}
            size="sm"
          >
            {status === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <FlaskConical className="h-4 w-4 mr-1" />
            )}
            {status === "running" ? "研究中…" : hasFreshDeepResearch ? "更新今日深度研究" : "開始今日深度研究"}
          </Button>
        </div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={hasFreshDeepResearch ? "補充問題（可留空；例如：現在適合出貨嗎？）" : "深度研究重點（可留空；會先做完整今日研究）"}
          rows={2}
          disabled={status === "running"}
          className="w-full max-w-lg rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      {status === "idle" && (
        <p className="text-xs text-muted-foreground px-1">
          先建立今日深度研究，完成後會同步更新最新洞察；刷新頁面也會保留任務狀態。
        </p>
      )}

      {status === "running" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          研究中（{normalizeTicker(ticker)}）…{currentJobId ? ` job: ${currentJobId.slice(0, 8)}` : ""}
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {errorMsg || "研究失敗，請稍後重試。"}
        </div>
      )}

      {status === "done" && result && (
        <ResearchResultCard result={result} question={submittedQuestion} />
      )}
    </div>
  );
}

function ResearchResultCard({ result, question }: { result: ResearchResult; question?: string }) {
  const ai = result.ai;
  const isMock = result.status === "mock" || result.status === "queued";

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span className="font-semibold text-sm font-mono">
            {result.tickers.join(", ")}
          </span>
          {result.model && (
            <Badge variant="outline" className="text-[10px]">{result.model}</Badge>
          )}
          <Badge
            variant={isMock ? "secondary" : "info"}
            className="ml-auto text-[10px]"
          >
            {isMock ? "排隊中" : "完成"}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          請求時間：{result.createdAt ? new Date(result.createdAt).toLocaleString("zh-TW") : "—"}
        </p>
        {question && (
          <div className="mt-1 rounded bg-muted/50 px-2 py-1 text-xs text-foreground/80">
            <span className="font-medium text-muted-foreground">提問：</span>
            {question}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {isMock && result.message && (
          <p className="text-foreground/70 text-xs leading-relaxed bg-muted/40 rounded px-2 py-1.5">
            {result.message}
          </p>
        )}

        {ai ? (
          <>
            {ai.summary && (
              <p className="text-foreground/90 leading-relaxed">{ai.summary}</p>
            )}

            {ai.perTicker && Object.keys(ai.perTicker).length > 0 && (
              <div>
                {Object.entries(ai.perTicker).map(([t, points]) => (
                  <div key={t} className="mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      {t} 觀察點
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {(points as string[]).map((pt, i) => (
                        <li key={i} className="text-xs text-foreground/85">{pt}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {ai.risks && ai.risks.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">主要風險</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {ai.risks.map((r, i) => (
                    <li key={i} className="text-xs text-foreground/85">{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {ai.nextSteps && ai.nextSteps.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">後續步驟</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {ai.nextSteps.map((s, i) => (
                    <li key={i} className="text-xs text-foreground/85">{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {ai.disclaimer && (
              <p className="text-[10px] text-muted-foreground/60 pt-1">{ai.disclaimer}</p>
            )}
          </>
        ) : (
          !isMock && (
            <p className="text-xs text-muted-foreground">AI 模式未啟用，請設定 V3_RESEARCH_AI_ENABLED=true 及 OPENAI_API_KEY 後重試。</p>
          )
        )}

        <p className="text-[10px] text-muted-foreground/50 pt-1 border-t border-border/40">
          ⚠️ AI 輔助分析僅供參考，不構成投資建議。
        </p>
      </CardContent>
    </Card>
  );
}
