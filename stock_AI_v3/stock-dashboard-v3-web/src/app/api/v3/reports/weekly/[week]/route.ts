import { WeeklyReview } from "@/lib/contracts";
import { readDataSource, successResponse, notFoundResponse } from "../../../_lib/data-reader";
import { dbReadWeeklyReport } from "../../../_lib/db-reader";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ week: string }> }
) {
  const { week } = await params;
  const data = await readDataSource(
    `/reports/weekly/${week}.json`,
    WeeklyReview,
    () => dbReadWeeklyReport(week)
  );
  if (data === null) return notFoundResponse(`weekly review for ${week} not found`);
  return successResponse(data);
}
