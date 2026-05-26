/**
 * Shared helper for V3 API route handlers.
 * Reads JSON files from public/data (or V3_API_DATA_ROOT env override),
 * validates with a Zod schema, and returns a standard API envelope response.
 * Runs server-side only (Next.js route handlers).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isDbMode } from "./db-reader";

const DATA_ROOT = process.env.V3_API_DATA_ROOT
  ? path.resolve(/* turbopackIgnore: true */ process.env.V3_API_DATA_ROOT)
  : path.join(/* turbopackIgnore: true */ process.cwd(), "public", "data");

export async function readDataFile<T>(
  relativePath: string,
  schema: z.ZodType<T>
): Promise<T | null> {
  const normalized = relativePath.replace(/^\//, "");
  const absolute = path.join(DATA_ROOT, normalized);
  try {
    const raw = await readFile(absolute, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const result = schema.safeParse(parsed);
    if (!result.success) {
      console.warn(`[api/v3] schema validation failed for ${absolute}:`, result.error.flatten());
      return null;
    }
    return result.data;
  } catch (err) {
    const isNotFound =
      err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
    if (!isNotFound) {
      console.error(`[api/v3] failed reading ${absolute}:`, err);
    }
    return null;
  }
}

export function successResponse<T>(data: T): NextResponse {
  const now = new Date().toISOString();
  if (Array.isArray(data)) {
    return NextResponse.json({
      data,
      count: (data as unknown[]).length,
      status: "ok",
      lastUpdated: now,
    });
  }
  return NextResponse.json({
    data,
    status: "ok",
    lastUpdated: now,
  });
}

export function notFoundResponse(message = "Resource not found"): NextResponse {
  return NextResponse.json(
    { error: { code: "not_found", message, retryable: false }, status: "error" },
    { status: 404 }
  );
}

export function errorResponse(message: string, code = "internal_error"): NextResponse {
  return NextResponse.json(
    { error: { code, message, retryable: false }, status: "error" },
    { status: 500 }
  );
}

/**
 * DB-aware data source reader.
 * 當 V3_API_SOURCE=db 且 V3_SQLITE_DB_PATH 有值時，優先呼叫 dbFn() 並以 schema 驗證。
 * 若 DB 未啟用、dbFn 未提供、或 DB 查詢失敗，則 fallback 到靜態 JSON 檔案。
 */
export async function readDataSource<T>(
  relativePath: string,
  schema: z.ZodType<T>,
  dbFn?: () => unknown
): Promise<T | null> {
  if (isDbMode() && dbFn) {
    try {
      const raw = dbFn();
      if (raw !== null && raw !== undefined) {
        const result = schema.safeParse(raw);
        if (result.success) return result.data;
        console.warn(
          `[api/v3] DB 資料驗證失敗 (${relativePath}):`,
          result.error.flatten()
        );
      }
    } catch (err) {
      console.error(`[api/v3] DB 讀取失敗 (${relativePath})，退回靜態檔案:`, err);
    }
  }
  return readDataFile(relativePath, schema);
}
