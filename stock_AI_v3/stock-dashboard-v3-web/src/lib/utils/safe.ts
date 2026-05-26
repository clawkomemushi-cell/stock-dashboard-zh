/**
 * Defensive helpers used across the UI layer.
 * Stability rule: never crash on missing / unknown data.
 */

export function safeText(
  value: string | null | undefined,
  fallback = "—"
): string {
  if (value === null || value === undefined) return fallback;
  const trimmed = value.toString().trim();
  return trimmed.length === 0 ? fallback : trimmed;
}

export function safeNumber(
  value: number | null | undefined,
  fallback = "—"
): string {
  if (value === null || value === undefined || Number.isNaN(value))
    return fallback;
  return value.toLocaleString();
}

export function safePercent(
  value: number | null | undefined,
  fractionDigits = 2,
  fallback = "—"
): string {
  if (value === null || value === undefined || Number.isNaN(value))
    return fallback;
  return `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`;
}

export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diffMs = Date.now() - t;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

/**
 * Run a Zod schema parse without throwing. Returns null on failure.
 * UI code should branch on this and show ErrorState.
 */
export async function tryAsync<T>(
  fn: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; error: Error }> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
