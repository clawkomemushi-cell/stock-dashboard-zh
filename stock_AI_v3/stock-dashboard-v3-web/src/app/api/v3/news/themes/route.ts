import { z } from "zod";
import { ThemeRadarItem } from "@/lib/contracts";
import { readDataFile, successResponse, errorResponse } from "../../_lib/data-reader";

export async function GET() {
  const data = await readDataFile("/themes.json", z.array(ThemeRadarItem));
  if (data === null) return errorResponse("themes data unavailable", "pipeline_unavailable");
  return successResponse(data);
}
