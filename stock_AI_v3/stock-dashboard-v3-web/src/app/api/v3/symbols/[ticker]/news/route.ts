import { z } from "zod";
import { NewsItem } from "@/lib/contracts";
import { readDataFile, successResponse, errorResponse } from "../../../_lib/data-reader";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const data = await readDataFile(`/symbols/${ticker}/news.json`, z.array(NewsItem));
  if (data === null) return errorResponse(`symbol ${ticker} news not found`, "not_found");
  return successResponse(data);
}
