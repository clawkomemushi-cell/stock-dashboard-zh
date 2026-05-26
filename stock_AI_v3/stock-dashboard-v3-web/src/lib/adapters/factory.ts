/**
 * Resolves the active AdapterBundle based on dataMode.
 *
 * dataMode = mock        → MOCK_BUNDLE
 * dataMode = static-file → STATIC_FILE_BUNDLE (reads /public/data/*)
 * dataMode = api         → API_BUNDLE (fetches from NEXT_PUBLIC_API_BASE_URL)
 *
 * Pages MUST go through getAdapters(); never import MOCK_BUNDLE directly.
 */

import type { AdapterBundle } from "./interfaces";
import { MOCK_BUNDLE } from "./mock";
import { STATIC_FILE_BUNDLE } from "./static-file";
import { API_BUNDLE } from "./api";
import { getModeConfig } from "@/lib/modes/config";

export function getAdapters(): AdapterBundle {
  const { dataMode } = getModeConfig();
  switch (dataMode) {
    case "static-file":
      return STATIC_FILE_BUNDLE;
    case "api":
      return API_BUNDLE;
    case "mock":
    default:
      return MOCK_BUNDLE;
  }
}

export type { AdapterBundle } from "./interfaces";
