import { DashboardSummary } from "@/lib/contracts";
import { readDataFile, successResponse, errorResponse } from "../../_lib/data-reader";

export async function GET() {
  const data = await readDataFile("/dashboard.json", DashboardSummary);
  if (data === null) return errorResponse("dashboard data unavailable", "pipeline_unavailable");
  return successResponse(data);
}
