"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── Close/delete button shown under each position card ──────────────────────

interface CloseButtonProps {
  positionId: string;
  ticker: string;
}

export function PortfolioCloseButton({ positionId, ticker }: CloseButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleClose() {
    setFeedback(null);
    try {
      const res = await fetch(`/api/v3/portfolio/positions/${encodeURIComponent(positionId)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { status?: string; error?: { message?: string } };
      if (res.ok && json.status === "ok") {
        startTransition(() => { router.refresh(); });
        return;
      }
      setFeedback({ ok: false, message: json.error?.message ?? "平倉失敗，請稍後再試" });
    } catch {
      setFeedback({ ok: false, message: "網路錯誤，無法連接伺服器" });
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      {feedback && (
        <span className="text-[11px] text-destructive">{feedback.message}</span>
      )}
      <button
        type="button"
        onClick={handleClose}
        disabled={isPending}
        title={`平倉 / 移除 ${ticker}`}
        className="self-end text-[11px] text-muted-foreground/60 hover:text-destructive transition-colors px-1 disabled:opacity-40"
      >
        {isPending ? "處理中…" : "平倉 / 移除"}
      </button>
    </div>
  );
}

// ── Add position form ────────────────────────────────────────────────────────

export function AddPositionPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; isPrototype?: boolean; message: string } | null>(null);

  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [target, setTarget] = useState("");
  const [thesis, setThesis] = useState("");

  function reset() {
    setTicker(""); setQuantity(""); setAvgCost("");
    setStopLoss(""); setTarget(""); setThesis("");
    setFeedback(null);
  }

  async function handleAdd() {
    const t = ticker.trim().toUpperCase();
    const qty = parseFloat(quantity);
    const cost = parseFloat(avgCost);

    if (!t || isNaN(qty) || qty <= 0 || isNaN(cost) || cost <= 0) {
      setFeedback({ ok: false, message: "代號、數量、均價為必填，且數值須大於 0" });
      return;
    }

    const body: Record<string, unknown> = {
      ticker: t,
      quantity: qty,
      avgCost: cost,
    };
    if (stopLoss.trim()) {
      const sl = parseFloat(stopLoss);
      if (!isNaN(sl) && sl > 0) body.stopLoss = sl;
    }
    if (target.trim()) {
      const tgt = parseFloat(target);
      if (!isNaN(tgt) && tgt > 0) body.target = tgt;
    }
    if (thesis.trim()) body.thesis = thesis.trim();

    setFeedback(null);
    try {
      const res = await fetch("/api/v3/portfolio/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { status?: string; error?: { message?: string }; message?: string };
      if ((res.ok || res.status === 201) && json.status === "ok") {
        setFeedback({ ok: true, message: `${t} 持倉已新增` });
        reset();
        setOpen(false);
        startTransition(() => { router.refresh(); });
        return;
      }
      if (json.status === "error") {
        setFeedback({ ok: false, message: json.error?.message ?? "新增失敗，請稍後再試" });
        return;
      }
      setFeedback({ ok: false, message: json.message ?? "新增失敗，請稍後再試" });
    } catch {
      setFeedback({ ok: false, message: "網路錯誤，無法連接伺服器" });
    }
  }

  return (
    <Card className="border-dashed border-blue-400/40 bg-blue-500/5">
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => { setOpen((p) => !p); setFeedback(null); }}
          className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors w-full text-left"
        >
          <Plus className="h-4 w-4 shrink-0" />
          新增持倉
          {open ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
        </button>
        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
          需要 DB 模式 (V3_API_SOURCE=db) 且已登入才能永久儲存
        </p>
      </CardHeader>

      {open && (
        <CardContent className="flex flex-col gap-3 pt-0">
          {feedback && (
            <div className={`rounded-md border px-3 py-2 text-xs ${
              feedback.ok
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}>
              {feedback.message}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">代號 *</label>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="例: 2330.TW"
                className="h-8 text-xs"
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">數量 *</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="股數"
                className="h-8 text-xs"
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">均價 *</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                placeholder="平均成本"
                className="h-8 text-xs"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">停損價（選填）</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="停損"
                className="h-8 text-xs"
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">目標價（選填）</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="目標"
                className="h-8 text-xs"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">持倉 Thesis（選填）</label>
            <Input
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              placeholder="持有原因、觀察邏輯"
              className="h-8 text-xs"
              disabled={isPending}
              maxLength={1000}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={isPending || !ticker.trim() || !quantity || !avgCost}
            >
              {isPending ? "新增中…" : "確認新增"}
            </Button>
            <button
              type="button"
              onClick={() => { setOpen(false); reset(); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              取消
            </button>
            <Badge variant="outline" className="ml-auto text-[10px]">
              * 必填
            </Badge>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
