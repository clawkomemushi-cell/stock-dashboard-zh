import { z } from "zod";
import { NextRequest } from "next/server";
import { NewsItem } from "@/lib/contracts";
import { readDataSource, successResponse, errorResponse } from "../_lib/data-reader";
import { dbReadNews } from "../_lib/db-reader";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get("symbol") ?? undefined;
  const impactType = searchParams.get("impactType") ?? undefined;
  const topic = searchParams.get("topic") ?? undefined;
  const minImportance = searchParams.get("minImportance");
  const mode = searchParams.get("mode") ?? undefined;

  const all = await readDataSource("/news.json", z.array(NewsItem), dbReadNews);
  if (all === null) return errorResponse("news data unavailable", "pipeline_unavailable");

  let items = all;
  if (symbol) items = items.filter((n) => (n.relatedSymbols ?? []).includes(symbol));
  if (impactType) items = items.filter((n) => n.impactType === impactType);
  if (topic) items = items.filter((n) => n.topic === topic);
  if (minImportance !== null) {
    const min = Number(minImportance);
    if (!isNaN(min)) items = items.filter((n) => (n.importanceScore ?? 0) >= min);
  }
  if (mode) items = items.filter((n) => !n.mode || n.mode === mode);

  return successResponse(items);
}
