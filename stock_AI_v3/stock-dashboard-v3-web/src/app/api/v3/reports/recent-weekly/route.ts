import { z } from "zod";
import { readDataSource, successResponse, errorResponse } from "../../_lib/data-reader";
import { dbReadRecentWeekly } from "../../_lib/db-reader";

const RecentWeeklySchema = z.array(z.object({ week: z.string(), href: z.string() }));

export async function GET() {
  const data = await readDataSource(
    "/reports/recent-weekly.json",
    RecentWeeklySchema,
    dbReadRecentWeekly
  );
  if (data === null) return errorResponse("recent weekly reports unavailable", "pipeline_unavailable");
  return successResponse(data);
}
