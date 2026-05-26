import { z } from "zod";
import { NextRequest } from "next/server";
import { SymbolProfile } from "@/lib/contracts";
import { readDataSource, successResponse, errorResponse } from "../../_lib/data-reader";
import { dbReadSymbols } from "../../_lib/db-reader";
import { readSymbolUniverse } from "@/lib/symbol-universe";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase();
  const all = await readDataSource("/symbols.json", z.array(SymbolProfile), dbReadSymbols);
  if (all === null) return errorResponse("symbols data unavailable", "pipeline_unavailable");
  const matched = q
    ? all.filter(
        (p) =>
          p.ticker.toLowerCase().includes(q) ||
          (p.name ?? "").toLowerCase().includes(q)
      )
    : all;

  if (q) {
    const existing = new Set(matched.map((p) => p.ticker.toUpperCase()));
    const universeMatches = readSymbolUniverse()
      .filter(
        (entry) =>
          !existing.has(entry.ticker.toUpperCase()) &&
          (entry.ticker.toLowerCase().includes(q) ||
            entry.code.toLowerCase().includes(q) ||
            entry.name.toLowerCase().includes(q))
      )
      .slice(0, 20)
      .map((entry) => ({
        ticker: entry.ticker,
        name: entry.name,
        kind: entry.kind,
        market: entry.market,
        tags: [entry.market],
        oneLineSummary: "尚未建立研究資料，可直接進入研究頁觸發 AI 即時分析。",
        externalLinks: [],
      }));
    return successResponse([...matched, ...universeMatches]);
  }

  return successResponse(matched);
}
