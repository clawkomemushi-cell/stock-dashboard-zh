/**
 * Client-side action for watchlist membership operations.
 *
 * Calls /api/v3/watchlist/memberships. In non-DB mode the API returns a
 * prototype response — the UI must display that this is not permanently stored.
 * Never call DB / SDK directly from this module; it must be importable in
 * 'use client' components.
 */

export interface AddToWatchlistResult {
  ok: boolean;
  /** true when API accepted the add (DB mode) */
  persisted: boolean;
  /** true when API returned a prototype/not-implemented signal */
  isPrototype: boolean;
  message: string;
}

export async function addToWatchlist(
  ticker: string,
  note?: string
): Promise<AddToWatchlistResult> {
  try {
    const res = await fetch("/api/v3/watchlist/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, note }),
    });

    const json = (await res.json()) as {
      status?: string;
      data?: unknown;
      error?: { code?: string; message?: string };
    };

    if (res.ok && json.status === "ok") {
      return { ok: true, persisted: true, isPrototype: false, message: `${ticker} 已加入自選股` };
    }

    if (json.status === "prototype") {
      return {
        ok: true,
        persisted: false,
        isPrototype: true,
        message: `${ticker} 已標記（prototype 模式，重新整理後不保留）`,
      };
    }

    const msg = json.error?.message ?? "無法加入自選股，請稍後再試";
    return { ok: false, persisted: false, isPrototype: false, message: msg };
  } catch {
    return {
      ok: false,
      persisted: false,
      isPrototype: false,
      message: "網路錯誤，無法聯繫伺服器",
    };
  }
}
