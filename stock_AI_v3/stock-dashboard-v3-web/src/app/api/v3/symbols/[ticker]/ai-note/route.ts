import { SymbolAINote } from "@/lib/contracts";
import { readDataFile, successResponse, notFoundResponse } from "../../../_lib/data-reader";
import { isDbMode, dbReadSymbolAINote } from "../../../_lib/db-reader";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  if (isDbMode()) {
    const dbNote = dbReadSymbolAINote(ticker);
    if (dbNote !== null) {
      const parsed = SymbolAINote.safeParse(dbNote);
      if (parsed.success) return successResponse(parsed.data);
    }
  }

  const data = await readDataFile(`/symbols/${ticker}/ai-note.json`, SymbolAINote);
  if (data === null) return notFoundResponse(`symbol ${ticker} AI note not found`);
  return successResponse(data);
}
