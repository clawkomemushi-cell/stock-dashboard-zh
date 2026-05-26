import { CloseReview } from "@/lib/contracts";
import { readDataSource, successResponse, notFoundResponse } from "../../../_lib/data-reader";
import { dbReadCloseReport } from "../../../_lib/db-reader";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const data = await readDataSource(
    `/reports/close/${date}.json`,
    CloseReview,
    () => dbReadCloseReport(date)
  );
  if (data === null) return notFoundResponse(`close review for ${date} not found`);
  return successResponse(data);
}
