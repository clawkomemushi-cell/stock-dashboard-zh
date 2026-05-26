# V3 DB Mode Runbook

Date: 2026-05-17 | Status: 可用（Phase 2 完成）

---

## 前置條件

```bash
# 安裝 better-sqlite3（已含在 package.json dependencies）
npm install

# 確認 DB 目錄存在
mkdir -p tmp
```

---

## 初始化 DB

### 方法 A：快速初始化（schema only，無 seed data）

```bash
node scripts/ensure-schema.mjs
# 預設建立 tmp/v3-sample.db
# 或指定路徑：
V3_SQLITE_DB_PATH=tmp/mydb.db node scripts/ensure-schema.mjs
```

### 方法 B：完整 seed 初始化（含靜態 JSON 資料匯入）

```bash
# 先生成 seed SQL
npm run pipeline:manual:sample     # 跑一次 pipeline 產出靜態資料
npm run db:export-seed:sample      # 將靜態 JSON 轉為 SQL seed

# 再建立 DB
npm run db:init-sample
# → 建立 tmp/v3-sample.db，匯入 symbols / ideas / news / reports 等
```

---

## 環境變數

| 變數 | 說明 | 範例 |
|------|------|------|
| `V3_API_SOURCE` | 設為 `db` 啟用 DB 模式 | `db` |
| `V3_SQLITE_DB_PATH` | SQLite 檔案路徑（相對或絕對） | `tmp/v3-sample.db` |
| `NEXT_PUBLIC_DATA_MODE` | 前端 adapter 模式 | `api` 或 `static-file` |

建議建立 `.env.local`：

```dotenv
V3_API_SOURCE=db
V3_SQLITE_DB_PATH=tmp/v3-sample.db
NEXT_PUBLIC_DATA_MODE=static-file
```

> 注意：`NEXT_PUBLIC_DATA_MODE=api` 代表前端透過 `/api/v3/*` fetch 資料；
> `static-file` 代表前端直接讀 `public/data/*.json`。
> API routes 的 DB 模式由 `V3_API_SOURCE=db` 控制，與前端 adapter mode 獨立。

---

## 啟動 DB 模式

```bash
# 開發模式
V3_API_SOURCE=db V3_SQLITE_DB_PATH=tmp/v3-sample.db npm run dev

# 或使用 .env.local（推薦）
npm run dev
```

---

## 驗證 DB 模式

### 1. 確認 DB 已建立

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database('tmp/v3-sample.db');
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all();
console.log(tables.map(t => t.name).join(', '));
db.close();
"
```

應顯示：`pipeline_runs, symbols, watchlists, watchlist_items, ideas, ...symbol_insights, research_sessions, portfolio_positions`

### 2. Smoke test API（需先啟動 dev server）

```bash
# 讀取 watchlist memberships（DB mode）
curl http://localhost:3000/api/v3/watchlist/memberships

# 讀取 symbol insights（空 DB 時回傳 []）
curl http://localhost:3000/api/v3/symbols/2330.TW/insights

# 讀取 normalized summaries（DB mode）
curl http://localhost:3000/api/v3/symbols/normalized

# 讀取 portfolio positions（DB mode）
curl http://localhost:3000/api/v3/portfolio/positions
```

### 3. 手動寫入 insight（測試用）

```bash
# 先新增 watchlist item（DB 持久化寫入需已設定 AUTH 並登入；未登入會 401）
curl -X POST http://localhost:3000/api/v3/watchlist/memberships \
  -H "Content-Type: application/json" \
  -d '{"ticker":"2330.TW"}'

# POST insight（需 DB mode 且已登入；auth 未設定時會 fail-closed 回 503）
curl -X POST http://localhost:3000/api/v3/symbols/2330.TW/insights \
  -H "Content-Type: application/json" \
  -d '{"source":"manual","kind":"note","body":"測試洞察：量縮整理中"}'
```

### 4. 寫入 research request

```bash
# 需要先登入；auth 未設定時會 fail-closed 回 503
curl -X POST http://localhost:3000/api/v3/research/request \
  -H "Content-Type: application/json" \
  -d '{"tickers":["2330.TW","0050.TW"],"note":"測試研究請求"}'

# DB mode 回傳 status=queued（非 mock）
# Static mode 回傳 status=mock
```

### 5. Portfolio positions

```bash
# 新增持倉
curl -X POST http://localhost:3000/api/v3/portfolio/positions \
  -H "Content-Type: application/json" \
  -d '{"ticker":"2330.TW","quantity":1000,"avgCost":950,"thesis":"AI 循環題材","stopLoss":900,"target":1100}'

# 讀取持倉
curl http://localhost:3000/api/v3/portfolio/positions
```

---

## 資料同步流

```
watchlist add (POST /memberships)
  → watchlist_items

research request (POST /research/request) — DB mode
  → research_sessions (status=queued)
  → symbol_insights (kind='research_request')

pipeline candiate update (pipelineAddInsight helper)
  → symbol_insights (source='pipeline:close' etc.)

讀取頁面
  → /api/v3/symbols/[ticker]/insights  ← 同一份 symbol_insights
  → /api/v3/symbols/normalized         ← symbol_profiles + watchlist flag + latestInsight
```

---

## Pipeline 腳本寫入 insights

在 pipeline 腳本中使用 `pipelineAddInsight`：

```typescript
import { pipelineAddInsight } from "@/app/api/v3/_lib/pipeline-helpers";

pipelineAddInsight({
  ticker: "2330.TW",
  source: "pipeline:close",
  kind: "checkpoint",
  body: "收盤：量縮整理，短線注意 MA20 支撐...",
  confidence: "medium",
  asOf: "2026-05-17",
  pipelineRunId: runId,
});
```

---

## Pipeline 快照寫入 DB（Phase 1）

從現有 snapshot 目錄直接 upsert 資料進 SQLite，不需要先 export SQL。

### Dry-run（預覽，不觸碰 DB）

```bash
npm run pipeline:write-db:dry-run
# 或手動指定 data-root：
node scripts/write-v3-pipeline-to-db.mjs --dry-run --data-root tmp/manual-pipeline-snapshot
```

### 寫入測試 DB（複製 live DB 再寫入，安全驗證）

```bash
npm run pipeline:write-db:test
# 輸出: tmp/v3-pipeline-test.db（live DB 不受影響）
```

### 寫入 live DB

```bash
npm run pipeline:write-db
# 預設: --data-root tmp/manual-pipeline-snapshot --db tmp/v3-live.db
```

### 自訂參數

```bash
node scripts/write-v3-pipeline-to-db.mjs \
  --data-root tmp/manual-pipeline-snapshot-sample \
  --db tmp/v3-live.db
```

### 寫入的 tables（idempotent upsert）

| Table | 寫入方式 |
|---|---|
| `pipeline_runs` | INSERT OR REPLACE（以 run ID 去重） |
| `symbols` | INSERT ... ON CONFLICT(ticker) DO UPDATE |
| `watchlists` | INSERT ... ON CONFLICT(id) DO UPDATE |
| `watchlist_items` | INSERT OR REPLACE（以 (watchlist_id, ticker) 去重） |
| `ideas` | INSERT OR REPLACE（以 idea.id 去重） |
| `news_events` | INSERT OR REPLACE（以 news.id 去重） |
| `reports` | INSERT OR REPLACE（以 report-{kind}-{date} 去重） |
| `system_health_snapshots` | INSERT OR REPLACE（以 shs-{run_id} 去重） |

**跳過的 tables**（需 auth/user context，請用 API endpoint 或 db-writer helpers）：
`users`, `symbol_insights`, `research_sessions`, `portfolio_positions`

### 驗證寫入結果

```bash
node -e "
const D=require('better-sqlite3');
const db=new D('tmp/v3-live.db');
['symbols','ideas','news_events','reports','watchlist_items','pipeline_runs'].forEach(
  t=>console.log(t.padEnd(30), db.prepare('SELECT COUNT(*) as n FROM '+t).get().n)
);
db.close();
"
```

---

## 重置 DB

```bash
# 刪除並重建（完全重置）
rm tmp/v3-sample.db
node scripts/ensure-schema.mjs

# 或重跑完整 seed
npm run db:init-sample
```

---

## 限制與注意事項

- DB mode 目前為 **local single-user SQLite**，不支援多使用者並發寫入
- DB 寫入端點採 fail-closed：auth 未設定時不允許寫入 research / insight / portfolio
- `research_sessions` 的 model 呼叫尚未接通（status 永遠停在 `queued`）
- Portfolio positions 的 UI 頁面尚未建立，目前僅 API 可用
- 不要把 `tmp/v3-sample.db` commit 到 git（已加入 `.gitignore`）
