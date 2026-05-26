import fs from "node:fs";
import path from "node:path";

export interface SymbolUniverseEntry {
  ticker: string;
  code: string;
  name: string;
  kind: string;
  market: string;
  industryCode?: string | null;
}

interface SymbolUniverseFile {
  generatedAt?: string;
  source?: string;
  entries?: SymbolUniverseEntry[];
}

let cache: SymbolUniverseEntry[] | null = null;

export function normalizeTicker(raw: string): string {
  const ticker = raw.trim().toUpperCase();
  if (/^\d{4,6}$/.test(ticker)) return `${ticker}.TW`;
  return ticker;
}

export function readSymbolUniverse(): SymbolUniverseEntry[] {
  if (cache) return cache;
  try {
    const file = path.join(process.cwd(), "public", "data", "symbol-universe.json");
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as SymbolUniverseFile;
    cache = Array.isArray(parsed.entries) ? parsed.entries : [];
    return cache;
  } catch {
    cache = [];
    return cache;
  }
}

export function findSymbolUniverseEntry(rawTicker: string): SymbolUniverseEntry | null {
  const ticker = normalizeTicker(rawTicker);
  const code = ticker.replace(/\.TW$/, "");
  return (
    readSymbolUniverse().find((entry) => entry.ticker === ticker || entry.code === code) ?? null
  );
}
