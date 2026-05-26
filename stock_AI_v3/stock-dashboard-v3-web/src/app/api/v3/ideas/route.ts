import { z } from "zod";
import { Candidate } from "@/lib/contracts";
import { readDataSource, successResponse, errorResponse } from "../_lib/data-reader";
import { dbReadIdeas } from "../_lib/db-reader";

export async function GET() {
  const data = await readDataSource("/ideas.json", z.array(Candidate), dbReadIdeas);
  if (data === null) return errorResponse("ideas data unavailable", "pipeline_unavailable");
  return successResponse(data);
}
