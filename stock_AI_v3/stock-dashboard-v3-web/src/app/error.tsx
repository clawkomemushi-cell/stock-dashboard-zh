"use client";

import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-lg w-full flex flex-col gap-3">
          <ErrorState
            title="頁面載入失敗"
            description="這代表整頁 fallback。多數情況應該由 panel-level error state 處理。"
            detail={error.message}
          />
          <Button onClick={reset}>重試</Button>
        </div>
      </body>
    </html>
  );
}
