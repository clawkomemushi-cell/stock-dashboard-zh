import { SymbolProfile } from "@/lib/contracts";
import { readDataSource, notFoundResponse } from "../../../_lib/data-reader";
import { dbReadSymbolProfile } from "../../../_lib/db-reader";
import { successResponse } from "../../../_lib/data-reader";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const data = await readDataSource(
    `/symbols/${ticker}/profile.json`,
    SymbolProfile,
    () => dbReadSymbolProfile(ticker)
  );
  if (data === null) return notFoundResponse(`symbol ${ticker} profile not found`);
  return successResponse(data);
}
