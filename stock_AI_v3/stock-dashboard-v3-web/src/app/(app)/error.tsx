"use client";

import { useEffect, useMemo } from "react";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { isChunkLoadError } from "@/components/shared/ChunkLoadRecovery";

export default function AppGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkLoadError = useMemo(() => isChunkLoadError(error), [error]);

  useEffect(() => {
    if (!chunkLoadError) return;
    const key = `stock-v3-route-chunk-reload:${window.location.pathname}`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }, [chunkLoadError]);

  return (
    <div className="max-w-lg flex flex-col gap-3">
      <ErrorState
        title={chunkLoadError ? "頁面資源版本已更新" : "Section 載入失敗"}
        description={
          chunkLoadError
            ? "偵測到舊版前端 chunk 載入失敗，已嘗試重新整理一次。若仍看到這裡，請再按重試或重新整理頁面。"
            : "此 section 出現錯誤，但其他導覽仍可使用。"
        }
        detail={error.message}
      />
      <Button onClick={chunkLoadError ? () => window.location.reload() : reset} className="self-start">
        {chunkLoadError ? "重新整理" : "重試"}
      </Button>
    </div>
  );
}
