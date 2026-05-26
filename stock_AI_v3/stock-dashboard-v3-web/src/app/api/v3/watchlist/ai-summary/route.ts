import { z } from "zod";
import { readDataFile, successResponse, errorResponse } from "../../_lib/data-reader";

const AISummarySchema = z.object({ text: z.string().nullable() });

export async function GET() {
  const data = await readDataFile("/watchlist-ai-summary.json", AISummarySchema);
  if (data === null) return errorResponse("watchlist AI summary unavailable", "pipeline_unavailable");
  return successResponse(data);
}
