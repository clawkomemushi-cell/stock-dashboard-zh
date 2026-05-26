"use client";

import { useEffect } from "react";

const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk .* failed/i,
  /Failed to load chunk/i,
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /import\(\) failed/i,
];

function messageFromUnknown(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "object") {
    const maybe = value as { message?: unknown; reason?: unknown; error?: unknown };
    return [maybe.message, maybe.reason, maybe.error]
      .map(messageFromUnknown)
      .filter(Boolean)
      .join("\n");
  }
  return String(value);
}

function isChunkLoadError(value: unknown): boolean {
  const text = messageFromUnknown(value);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

function reloadOnce() {
  const key = `stock-v3-chunk-reload:${window.location.pathname}`;
  if (sessionStorage.getItem(key) === "1") return;
  sessionStorage.setItem(key, "1");
  window.location.reload();
}

/**
 * Recovers from stale Next.js client chunks after a deploy.
 *
 * This usually happens when the browser keeps an older app shell, then a client-side
 * navigation asks for a chunk file that no longer exists on the server. A single hard
 * reload fetches the current document + build manifest and avoids trapping the user in
 * the route error boundary.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error ?? event.message)) reloadOnce();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) reloadOnce();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

export { isChunkLoadError };
