#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/barrysu/.openclaw/workspace/stock_AI_v3/stock-dashboard-v3-web"
LOG_DIR="$ROOT/tmp"
LOG_FILE="$LOG_DIR/v3-scheduler.log"
START_DATE="${V3_SCHEDULE_START_DATE:-2026-05-26}"
TODAY="$(TZ=Asia/Taipei date +%F)"
NOW="$(TZ=Asia/Taipei date '+%F %T %z')"
TASK="${1:-}"

mkdir -p "$LOG_DIR"

if [[ -z "$TASK" ]]; then
  echo "[$NOW] missing task" >> "$LOG_FILE"
  exit 2
fi

# User asked to stop today's V3 schedules due quota/rate-limit. Do not run before START_DATE.
if [[ "$TODAY" < "$START_DATE" ]]; then
  echo "[$NOW] skip task=$TASK because TODAY=$TODAY < START_DATE=$START_DATE" >> "$LOG_FILE"
  exit 0
fi

cd "$ROOT"
echo "[$NOW] start task=$TASK" >> "$LOG_FILE"

case "$TASK" in
  premarket)
    npm run premarket:plan:generate >> "$LOG_FILE" 2>&1
    node scripts/run-v3-intraday-checkpoint.mjs --write --phase pre >> "$LOG_FILE" 2>&1
    npm run check:static-data >> "$LOG_FILE" 2>&1
    ;;
  checkpoint)
    npm run intraday:checkpoint:write >> "$LOG_FILE" 2>&1
    npm run check:static-data >> "$LOG_FILE" 2>&1
    ;;
  refresh)
    npm run data:refresh >> "$LOG_FILE" 2>&1
    ;;
  *)
    echo "[$NOW] unknown task=$TASK" >> "$LOG_FILE"
    exit 2
    ;;
esac

echo "[$(TZ=Asia/Taipei date '+%F %T %z')] done task=$TASK" >> "$LOG_FILE"
