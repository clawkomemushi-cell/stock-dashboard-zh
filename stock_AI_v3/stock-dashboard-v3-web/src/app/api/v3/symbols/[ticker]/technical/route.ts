import { SymbolTechnicalSnapshot } from "@/lib/contracts";
import { readDataFile, successResponse, notFoundResponse } from "../../../_lib/data-reader";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const data = await readDataFile(`/symbols/${ticker}/technical.json`, SymbolTechnicalSnapshot);
  if (data === null) return notFoundResponse(`symbol ${ticker} technical data not found`);
  return successResponse(data);
}
