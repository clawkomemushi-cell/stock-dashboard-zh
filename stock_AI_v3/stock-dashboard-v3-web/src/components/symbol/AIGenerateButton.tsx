"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface AIGenerateButtonProps {
  ticker: string;
  hasExistingNote: boolean;
  asOf?: string | null;
}

type State = "idle" | "confirming" | "loading" | "success" | "error";

export function AIGenerateButton({ ticker, hasExistingNote, asOf }: AIGenerateButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const isLoading = state === "loading";
  const router = useRouter();

  async function handleConfirm() {
    setState("loading");
    try {
      const res = await fetch(`/api/v3/symbols/${encodeURIComponent(ticker)}/ai-note/generate`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        status: string;
        error?: { message?: string };
      };
      if (!res.ok || json.status !== "ok") {
        setErrorMsg(json.error?.message ?? "未知錯誤");
        setState("error");
        return;
      }
      setState("success");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="text-xs text-green-600 font-medium px-1">
        ✓ AI 研判已產生，頁面已更新
      </div>
    );
  }

  if (state === "confirming") {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader className="pb-2 pt-3 px-4">
          <p className="text-sm font-semibold">
            {hasExistingNote ? "更新 AI 研判？" : "產生 AI 研判？"}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            此操作將呼叫 OpenAI API 為 <span className="font-mono font-semibold">{ticker}</span> 產出正式 AI 研判，計入每日配額。
            {hasExistingNote && " 現有研判將被覆蓋。"}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setState("idle")}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              確認啟動
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">{errorMsg}</span>
        <Button size="sm" variant="outline" onClick={() => setState("idle")}>
          重試
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {hasExistingNote && asOf && (
        <span className="text-[10px] text-muted-foreground">
          最後更新：{asOf.slice(0, 10)}
        </span>
      )}
      <Button
        size="sm"
        variant={hasExistingNote ? "outline" : "default"}
        onClick={() => setState("confirming")}
        disabled={state === "loading"}
      >
        {state === "loading" ? "產生中…" : hasExistingNote ? "更新 AI 研判" : "產生 AI 研判"}
      </Button>
    </div>
  );
}
