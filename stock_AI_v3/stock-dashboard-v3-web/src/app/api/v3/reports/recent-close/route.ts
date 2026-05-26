import { z } from "zod";
import { readDataSource, successResponse, errorResponse } from "../../_lib/data-reader";
import { dbReadRecentClose } from "../../_lib/db-reader";

const RecentCloseSchema = z.array(z.object({ date: z.string(), href: z.string() }));

export async function GET() {
  const data = await readDataSource(
    "/reports/recent-close.json",
    RecentCloseSchema,
    dbReadRecentClose
  );
  if (data === null) return errorResponse("recent close reports unavailable", "pipeline_unavailable");
  return successResponse(data);
}
