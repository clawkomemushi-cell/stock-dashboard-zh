import { access, readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const dataRoot = process.env.DATA_ROOT
  ? path.resolve(projectRoot, process.env.DATA_ROOT)
  : path.join(projectRoot, "public", "data");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEK_RE = /^\d{4}-W\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const errors = [];
const warnings = [];
const oks = [];

const coreFiles = [
  { path: "dashboard.json", label: "dashboard overview", checkDate: true },
  { path: "watchlist.json", label: "watchlist pool", checkDate: true },
  { path: "watchlist-scans.json", label: "watchlist scans", checkDate: true },
  { path: "watchlist-ai-summary.json", label: "watchlist AI summary", checkDate: false },
  { path: "ideas.json", label: "ideas candidate pool", checkDate: true },
  { path: "themes.json", label: "theme radar", checkDate: true },
  { path: "news.json", label: "curated news", checkDate: true },
  { path: "today.json", label: "checkpoint timeline", checkDate: true },
  { path: "system-health.json", label: "system health", checkDate: true },
  { path: "symbols.json", label: "symbol index", checkDate: false },
  { path: "reports/recent-close.json", label: "recent close index", checkDate: false },
  { path: "reports/recent-weekly.json", label: "recent weekly index", checkDate: false },
  { path: "pools/holdings.json", label: "持倉監控池", checkDate: true },
  { path: "pools/opportunities.json", label: "機會候選池", checkDate: true },
  { path: "pools/volatile-radar.json", label: "高波動雷達", checkDate: true },
];

function addOk(message) {
  oks.push(message);
}

function addWarn(message) {
  warnings.push(message);
}

function addError(message) {
  errors.push(message);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeDateFromDateTime(value) {
  return typeof value === "string" && DATETIME_RE.test(value) ? value.slice(0, 10) : null;
}

function validateFieldFormat(fieldPath, key, value) {
  if (value == null) return;

  if (typeof value !== "string") {
    addError(`${fieldPath}: ${key} should be a string`);
    return;
  }

  if (["asOf", "generatedAt", "publishedAt", "timestamp", "lastUpdated", "startedAt", "finishedAt", "lastSuccessfulPublishAt"].includes(key)) {
    if (!DATETIME_RE.test(value)) {
      addError(`${fieldPath}: ${key} is not a valid ISO datetime (${value})`);
    }
    return;
  }

  if (["tradingDate", "date"].includes(key)) {
    if (!DATE_RE.test(value)) {
      addError(`${fieldPath}: ${key} is not a valid YYYY-MM-DD date (${value})`);
    }
    return;
  }

  if (key === "week") {
    if (!WEEK_RE.test(value)) {
      addError(`${fieldPath}: week is not a valid ISO week (${value})`);
    }
    return;
  }

  if (key === "sourceMode") {
    if (value.trim().length === 0) {
      addError(`${fieldPath}: sourceMode should not be empty`);
    }
  }
}

function scanTemporalFields(value, fieldPath) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanTemporalFields(item, `${fieldPath}[${index}]`));
    return;
  }

  if (!isObject(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string") {
      validateFieldFormat(fieldPath, key, child);
    }

    if (Array.isArray(child) || isObject(child)) {
      scanTemporalFields(child, `${fieldPath}.${key}`);
    }
  }
}

function deriveRepresentativeDate(data, relPath) {
  if (isObject(data)) {
    if (typeof data.tradingDate === "string" && DATE_RE.test(data.tradingDate)) {
      return { value: data.tradingDate, source: "tradingDate", explicit: true };
    }
    if (typeof data.date === "string" && DATE_RE.test(data.date)) {
      return { value: data.date, source: "date", explicit: true };
    }
    if (typeof data.asOf === "string") {
      const derived = normalizeDateFromDateTime(data.asOf);
      if (derived) return { value: derived, source: "asOf", explicit: false };
    }
    if (typeof data.generatedAt === "string") {
      const derived = normalizeDateFromDateTime(data.generatedAt);
      if (derived) return { value: derived, source: "generatedAt", explicit: false };
    }
    if (typeof data.lastSuccessfulPublishAt === "string") {
      const derived = normalizeDateFromDateTime(data.lastSuccessfulPublishAt);
      if (derived) return { value: derived, source: "lastSuccessfulPublishAt", explicit: false };
    }
  }

  if (!Array.isArray(data)) return null;

  const keyPriority = [
    "tradingDate",
    "date",
    "asOf",
    "publishedAt",
    "timestamp",
    "lastUpdated",
    "generatedAt",
  ];

  for (const key of keyPriority) {
    const collected = new Set();

    for (const item of data) {
      if (!isObject(item) || typeof item[key] !== "string") continue;
      const raw = item[key];
      const dateValue = key === "tradingDate" || key === "date" ? (DATE_RE.test(raw) ? raw : null) : normalizeDateFromDateTime(raw);
      if (dateValue) collected.add(dateValue);
    }

    if (collected.size === 1) {
      return { value: [...collected][0], source: key, explicit: key === "tradingDate" || key === "date" };
    }

    if (collected.size > 1) {
      addWarn(`${relPath}: multiple dates detected from ${key} (${[...collected].join(", ")})`);
      return { value: [...collected][0], source: key, explicit: false };
    }
  }

  return null;
}

async function fileExists(absPath) {
  try {
    await access(absPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(relPath) {
  const absPath = path.join(dataRoot, relPath);
  try {
    const raw = await readFile(absPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) {
      addError(`${relPath}: JSON parse failed (${error.message})`);
      return null;
    }
    addError(`${relPath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function checkCoreFiles() {
  const parsed = new Map();

  for (const file of coreFiles) {
    const absPath = path.join(dataRoot, file.path);
    const exists = await fileExists(absPath);
    if (!exists) {
      addError(`${file.path}: missing core file (${file.label})`);
      continue;
    }

    const json = await readJson(file.path);
    if (json == null) continue;

    parsed.set(file.path, json);
    scanTemporalFields(json, file.path);
    addOk(`${file.path}: parsed`);
  }

  return parsed;
}

function checkDailyDateConsistency(parsed) {
  const dailyEntries = [];

  for (const file of coreFiles.filter((entry) => entry.checkDate)) {
    const json = parsed.get(file.path);
    if (json == null) continue;

    const rep = deriveRepresentativeDate(json, file.path);
    if (!rep) {
      addWarn(`${file.path}: no representative date found; staleness must be tracked elsewhere`);
      continue;
    }

    dailyEntries.push({ path: file.path, ...rep });
  }

  if (dailyEntries.length === 0) {
    addWarn("no daily representative dates could be derived from core files");
    return;
  }

  const explicitDates = [...new Set(dailyEntries.filter((entry) => entry.explicit).map((entry) => entry.value))];
  if (explicitDates.length > 1) {
    addError(`explicit daily dates disagree across core files (${explicitDates.join(", ")})`);
    return;
  }

  const allDates = [...new Set(dailyEntries.map((entry) => entry.value))];
  if (allDates.length > 1) {
    addWarn(`derived daily dates differ across core files (${allDates.join(", ")})`);
  } else {
    addOk(`daily core files align on ${allDates[0]}`);
  }
}

async function checkReportIndices(parsed) {
  const recentClose = parsed.get("reports/recent-close.json");
  if (Array.isArray(recentClose)) {
    for (const entry of recentClose) {
      if (!isObject(entry) || typeof entry.date !== "string") continue;
      const rel = `reports/close/${entry.date}.json`;
      if (!(await fileExists(path.join(dataRoot, rel)))) {
        addError(`reports/recent-close.json references missing file ${rel}`);
      } else {
        addOk(`reports/recent-close.json -> ${rel}`);
      }
    }
  }

  const recentWeekly = parsed.get("reports/recent-weekly.json");
  if (Array.isArray(recentWeekly)) {
    for (const entry of recentWeekly) {
      if (!isObject(entry) || typeof entry.week !== "string") continue;
      const rel = `reports/weekly/${entry.week}.json`;
      if (!(await fileExists(path.join(dataRoot, rel)))) {
        addError(`reports/recent-weekly.json references missing file ${rel}`);
      } else {
        addOk(`reports/recent-weekly.json -> ${rel}`);
      }
    }
  }
}

async function checkAllSymbolDetailFiles(parsed) {
  const symbols = parsed.get("symbols.json");
  if (!Array.isArray(symbols)) return;

  const detailFiles = [
    "profile.json",
    "overview.json",
    "technical.json",
    "fundamentals.json",
    "ai-note.json",
    "news.json",
    "checkpoints.json",
  ];

  for (const symbol of symbols) {
    if (!isObject(symbol) || typeof symbol.ticker !== "string") continue;

    for (const filename of detailFiles) {
      const rel = `symbols/${symbol.ticker}/${filename}`;
      const exists = await fileExists(path.join(dataRoot, rel));
      if (!exists) {
        addError(`${rel}: missing required symbol detail file`);
        continue;
      }

      const json = await readJson(rel);
      if (json != null) {
        scanTemporalFields(json, rel);
        addOk(`${rel}: parsed`);
      }
    }
  }
}

async function main() {
  const dataRootExists = await fileExists(dataRoot);
  if (!dataRootExists) {
    addError(`data root is missing at ${dataRoot}`);
    printSummaryAndExit();
    return;
  }

  addOk(`found data root at ${dataRoot}`);

  const parsed = await checkCoreFiles();
  checkDailyDateConsistency(parsed);
  await checkReportIndices(parsed);
  await checkAllSymbolDetailFiles(parsed);

  printSummaryAndExit();
}

function printSummaryAndExit() {
  console.log("[check-static-data] results");
  for (const message of oks) console.log(`  OK    ${message}`);
  for (const message of warnings) console.warn(`  WARN  ${message}`);
  for (const message of errors) console.error(`  ERROR ${message}`);

  console.log(
    `[check-static-data] summary: ${oks.length} ok, ${warnings.length} warning(s), ${errors.length} error(s)`
  );

  process.exit(errors.length > 0 ? 1 : 0);
}

await main();
