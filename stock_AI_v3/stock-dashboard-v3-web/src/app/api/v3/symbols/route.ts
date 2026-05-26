import { z } from "zod";
import { SymbolProfile } from "@/lib/contracts";
import { readDataSource, successResponse, errorResponse } from "../_lib/data-reader";
import { dbReadSymbols } from "../_lib/db-reader";

export async function GET() {
  const data = await readDataSource("/symbols.json", z.array(SymbolProfile), dbReadSymbols);
  if (data === null) return errorResponse("symbols data unavailable", "pipeline_unavailable");
  return successResponse(data);
}
