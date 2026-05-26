import { SystemHealthSnapshot } from "@/lib/contracts";
import { getModeConfig } from "@/lib/modes/config";
import { readDataSource, successResponse, errorResponse } from "../../_lib/data-reader";
import { dbReadSystemHealth } from "../../_lib/db-reader";

export async function GET() {
  const data = await readDataSource(
    "/system-health.json",
    SystemHealthSnapshot,
    dbReadSystemHealth
  );
  if (data === null) return errorResponse("system health data unavailable", "pipeline_unavailable");
  const cfg = getModeConfig();
  return successResponse({
    ...data,
    modes: {
      dataMode: cfg.dataMode,
      aiMode: cfg.aiMode,
      newsMode: cfg.newsMode,
      chartMode: cfg.chartMode,
    },
  });
}
