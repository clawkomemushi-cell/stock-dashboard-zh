import { z } from "zod";
import { WatchlistScanResult } from "@/lib/contracts";
import { readDataFile, successResponse, errorResponse } from "../../_lib/data-reader";

export async function GET() {
  const data = await readDataFile("/watchlist-scans.json", z.array(WatchlistScanResult));
  if (data === null) return errorResponse("watchlist scans data unavailable", "pipeline_unavailable");
  return successResponse(data);
}
