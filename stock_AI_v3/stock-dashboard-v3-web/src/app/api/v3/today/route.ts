import { z } from "zod";
import { DailyCheckpoint } from "@/lib/contracts";
import { readDataFile, successResponse, errorResponse } from "../_lib/data-reader";

export async function GET() {
  const data = await readDataFile("/today.json", z.array(DailyCheckpoint));
  if (data === null) return errorResponse("today data unavailable", "pipeline_unavailable");
  return successResponse(data);
}
