"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, FlaskConical, Plus, X, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { ResearchAIResult } from "@/lib/contracts/research";

export type AuthStatus = "not_configured" | "not_logged_in" | "logged_in";

interface Props {
  authStatus: AuthStatus;
  watchlistTickers: string[];
  aiEnabled: boolean;
}

export function WatchlistResearchPanel({ authStatus, watchlistTickers, aiEnabled }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");

  function toggleTicker(ticker: string) {
    setSelected((prev) =>
      prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker]
    );
  }

  function addManual() {
    const t = manualInput.trim().toUpperCase();
    if (!t || selected.includes(t)) { setManualInput(""); return; }
    setSelected((prev) => [...prev, t]);
    setManualInput("");
  }

  function removeTicker(ticker: string) {
    setSelected((prev) => prev.filter((t) => t !== ticker));
  }

  return (
    <div className="rounded-lg border border-border bg-card/60 flex flex-col gap-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <FlaskConical className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">即時研究</span>
        <Badge variant="outline" className="ml-1 text-[10px]">Beta</Badge>
        <Lock className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
      </div>

      {/* Auth gate layer */}
      {authStatus === "not_configured" && (
        <AuthNotConfigured />
      )}
      {authStatus === "not_logged_in" && (
        <AuthNotLoggedIn />
      )}
      {authStatus === "logged_in" && (
        <ResearchBody
          watchlistTickers={watchlistTickers}
          selected={selected}
          manualInput={manualInput}
          onToggle={toggleTicker}
          onManualInputChange={setManualInput}
          onAddManual={addManual}
          onRemove={removeTicker}
          aiEnabled={aiEnabled}
        />
      )}

      {/* Security notice */}
      <div className="px-4 py-2 bg-muted/20 border-t border-border text-[10px] text-muted-foreground/70 flex items-center gap-1.5">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        <span>
          此功能具備完整安全防護層：登入驗證、許可名單、rate limit、daily quota、audit log。
        </span>
      </div>
    </div>
  );
}

function AuthNotConfigured() {
  return (
    <div className="px-4 py-6 flex flex-col items-center gap-3 text-center">
      <Lock className="h-8 w-8 text-muted-foreground/50" />
      <div>
        <p className="text-sm font-medium">即時研究功能受保護</p>
        <p className="text-xs text-muted-foreground mt-1">
          登入機制尚未設定。請設定下列環境變數後重啟：
        </p>
      </div>
      <div className="text-left w-full max-w-sm rounded-md bg-muted/40 px-3 py-2 font-mono text-[10px] text-muted-foreground space-y-0.5">
        <div>AUTH_USERNAME=your_username</div>
        <div>AUTH_PASSWORD_HASH_B64=bcrypt_hash_base64</div>
        <div>SESSION_SECRET=random_32plus_chars</div>
      </div>
    </div>
  );
}

function AuthNotLoggedIn() {
  return (
    <div className="px-4 py-6 flex flex-col items-center gap-3 text-center">
      <Lock className="h-8 w-8 text-muted-foreground/50" />
      <div>
        <p className="text-sm font-medium">需要登入</p>
        <p className="text-xs text-muted-foreground mt-1">
          即時研究功能需要有效的使用者 session，請先登入。
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        前往登入
      </Link>
    </div>
  );
}

interface ResearchBodyProps {
  watchlistTickers: string[];
  selected: string[];
  manualInput: string;
  onToggle: (ticker: string) => void;
  onManualInputChange: (v: string) => void;
  onAddManual: () => void;
  onRemove: (ticker: string) => void;
  aiEnabled: boolean;
}

function ResearchBody({
  watchlistTickers,
  selected,
  manualInput,
  onToggle,
  onManualInputChange,
  onAddManual,
  onRemove,
  aiEnabled,
}: ResearchBodyProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<ResearchAIResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);

  async function handleSubmit() {
    if (selected.length === 0) return;
    setStatus("loading");
    setResult(null);
    setErrorMsg(null);
    setUsedModel(null);

    try {
      const res = await fetch("/api/v3/research/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: selected }),
      });
      const json = (await res.json()) as {
        status: string;
        data?: { ai?: ResearchAIResult; model?: string; message?: string };
        error?: { message?: string };
      };

      if (!res.ok || json.status !== "ok") {
        setErrorMsg(json.error?.message ?? json.data?.message ?? "研究呼叫失敗，請稍後再試");
        setStatus("error");
        return;
      }

      if (json.data?.ai) {
        setResult(json.data.ai);
        setUsedModel(json.data.model ?? null);
        setStatus("done");
      } else {
        // AI disabled — show message
        setErrorMsg(json.data?.message ?? "AI 模式未啟用");
        setStatus("error");
      }
    } catch {
      setErrorMsg("網路錯誤，請稍後再試");
      setStatus("error");
    }
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {/* Notice: AI disabled */}
      {!aiEnabled && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 flex gap-2">
          <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <p className="font-semibold">AI 模式未啟用</p>
            <p className="mt-0.5 text-amber-700/80 dark:text-amber-300/80">
              請設定 <span className="font-mono">OPENAI_API_KEY</span> 與{" "}
              <span className="font-mono">V3_RESEARCH_AI_ENABLED=true</span> 後重啟以開通即時研究。
            </p>
          </div>
        </div>
      )}

      {/* Ticker selector */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">選擇研究標的（可多選）</p>

        {/* From watchlist */}
        {watchlistTickers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {watchlistTickers.map((ticker) => (
              <button
                key={ticker}
                type="button"
                onClick={() => onToggle(ticker)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-mono border transition-colors",
                  selected.includes(ticker)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                {ticker}
              </button>
            ))}
          </div>
        )}

        {/* Manual input */}
        <div className="flex gap-2">
          <Input
            value={manualInput}
            onChange={(e) => onManualInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onAddManual(); }}
            placeholder="手動輸入代號 (例: 2330.TW)"
            className="max-w-xs text-xs h-8"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddManual}
            disabled={!manualInput.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Selected list */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {selected.map((ticker) => (
              <span
                key={ticker}
                className="flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-mono"
              >
                {ticker}
                <button
                  type="button"
                  onClick={() => onRemove(ticker)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`移除 ${ticker}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Submit button */}
      <div className="flex items-center gap-3">
        {aiEnabled ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={selected.length === 0 || status === "loading"}
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4 mr-1.5" />
            )}
            {status === "loading" ? "研究中…" : `開始研究（${selected.length} 檔）`}
          </Button>
        ) : (
          <Button
            type="button"
            disabled
            className="opacity-50 cursor-not-allowed"
            title="AI 模式未啟用"
          >
            <FlaskConical className="h-4 w-4 mr-1.5" />
            開始研究（{selected.length} 檔）
          </Button>
        )}
        {!aiEnabled && (
          <span className="text-xs text-muted-foreground">
            — AI 模式未啟用 (V3_RESEARCH_AI_ENABLED=false)
          </span>
        )}
      </div>

      {/* Error state */}
      {status === "error" && errorMsg && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Result card */}
      {status === "done" && result && (
        <ResearchResultCard result={result} model={usedModel} />
      )}

      {/* TODO checklist — only show when AI disabled */}
      {!aiEnabled && (
        <details className="text-[11px] text-muted-foreground/70 group">
          <summary className="cursor-pointer hover:text-muted-foreground list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            開通前必備安全機制（展開）
          </summary>
          <ul className="mt-2 ml-3 space-y-0.5 list-none">
            {[
              "[✅] 登入驗證 (AUTH_USERNAME / AUTH_PASSWORD_HASH / SESSION_SECRET)",
              "[✅] 每使用者每日 quota 限制",
              "[✅] Rate limiting (5 req/min/user)",
              "[✅] Audit log — 誰何時請求了什麼",
              "[ ] OPENAI_API_KEY + V3_RESEARCH_AI_ENABLED=true",
              "[ ] 公開 tunnel → IP allowlist 或 Cloudflare Access",
              "[✅] Server-side env secrets (不得暴露到 client bundle)",
            ].map((item) => (
              <li key={item} className="font-mono">{item}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ResearchResultCard({
  result,
  model,
}: {
  result: ResearchAIResult;
  model: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-3 text-xs">
      {/* Model badge */}
      {model && (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] font-mono">{model}</Badge>
          <span className="text-[10px] text-muted-foreground">研究完成</span>
        </div>
      )}

      {/* Summary */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          整體摘要
        </p>
        <p className="text-sm leading-relaxed text-foreground/90">{result.summary}</p>
      </div>

      {/* Per-ticker */}
      {Object.keys(result.perTicker).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            個股重點
          </p>
          <div className="flex flex-col gap-2">
            {Object.entries(result.perTicker).map(([ticker, points]) => (
              <div key={ticker}>
                <span className="font-mono font-semibold text-xs text-foreground">{ticker}</span>
                <ul className="mt-0.5 ml-3 space-y-0.5 list-disc list-inside text-muted-foreground">
                  {points.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {result.risks.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            主要風險
          </p>
          <ul className="ml-3 space-y-0.5 list-disc list-inside text-muted-foreground">
            {result.risks.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {/* Next steps */}
      {result.nextSteps.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            建議觀察指標
          </p>
          <ul className="ml-3 space-y-0.5 list-disc list-inside text-muted-foreground">
            {result.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground/60 border-t border-border pt-2">
        {result.disclaimer}
      </p>
    </div>
  );
}
