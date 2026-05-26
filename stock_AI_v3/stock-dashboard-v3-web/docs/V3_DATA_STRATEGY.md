# V3 長期資料策略 (Data Strategy)

Date: 2026-05-17 | Status: 架構決策文件

---

## 核心原則

### 1. Canonical Symbol Master 是唯一基礎來源

`SymbolProfile` 是所有個股資料的根。每支 ticker 只有一份 canonical profile，所有其他資料表/視圖均以 ticker 為外鍵關聯，不複製 profile 欄位。

```
symbol_profiles           ← 唯一真相：name, kind, market, sector, tags, summary
  ↓ ticker FK
symbol_overviews          ← 最新行情快照 (last, changePct, range...)
symbol_technicals         ← 技術指標快照 (rsi, ma, trend...)
symbol_fundamentals       ← 基本面快照 (pe, pb, dividendYield...)
symbol_ai_notes           ← AI 判斷摘要 (thesis, bias, confidence...)
symbol_insights           ← 事件/洞察/checkpoint stream (append-only)
```

### 2. Watchlist / Holdings / Opportunities / Volatile Radar 都是 Relation，不是資料複製

**錯誤做法：** watchlist 每筆存完整的 name, sector, tags...  
**正確做法：** watchlist 只存 ticker + metadata（addedAt, note, source），顯示時 JOIN symbol_profiles。

```sql
-- 對的
watchlist_memberships (id, ticker FK, user_id, added_at, note, source)
pool_holdings         (id, ticker FK, pool_id, weight, entered_at)
pool_opportunities    (id, ticker FK, pool_id, score, reason, updated_at)
volatile_radar        (id, ticker FK, recorded_at, trigger_label)

-- 錯的（不要這樣）
watchlist_items (ticker, name, sector, tags, ...)  ← 複製了 profile 欄位
```

### 3. Symbol-Level Event / Insight / Checkpoint — 共享同一張表

每當候選池更新、即時研究完成、收盤檢查點落地，一律寫入 `symbol_insights`，各頁面從同一份表讀取，不各自維護私有資料。

```
symbol_insights
  ticker       TEXT   -- FK → symbol_profiles
  source       TEXT   -- 'pipeline:close', 'pipeline:morning', 'research:on_demand', 'manual'
  kind         TEXT   -- 'checkpoint', 'note', 'ai_summary', 'news_event', 'opportunity_reason'
  body         TEXT   -- JSON or markdown
  created_at   TEXT
  session_id   TEXT   -- optional: links to on-demand research job
```

### 4. Scheduled Pipeline vs User-Triggered Research 的分工

| 面向 | Scheduled Pipeline | On-Demand Research |
|------|-------------------|-------------------|
| 觸發 | cron (盤前/午間/收盤) | 使用者明確請求 |
| 輸入 | 固定全量掃描 | 使用者指定 tickers (最多 10) |
| 輸出 | 寫入 symbol_insights (source='pipeline:*') | 寫入 symbol_insights (source='research:on_demand') + research_sessions |
| Auth | 系統內部 | 需要 session / quota / audit |
| 共享 | 共用 symbol_profiles + symbol_insights | 共用 symbol_profiles + symbol_insights |

兩者共享 canonical symbol store，讓前端永遠從同一份 symbol_insights 讀取最新洞察。

### 5. 前端一律透過 Adapter/Service 讀取 SymbolNormalizedSummary

前端頁面（watchlist、pools、ideas、symbols）不直接解析原始 JSON 欄位，而是透過 adapter 取得 `SymbolNormalizedSummary`：

```typescript
interface SymbolNormalizedSummary {
  ticker: string;
  name?: string;
  kind?: string;
  oneLineSummary?: string;
  latestStatus?: string;         // from symbol_overviews or pipeline checkpoint
  bias?: string;                 // from latest ai_note
  tags?: string[];
  inWatchlist?: boolean;         // injected by WatchlistMembership join
  latestInsight?: SymbolInsight; // most recent insight entry
}
```

---

## MVP → 正式 DB 遷移路徑

### Phase 0（現況）：Static JSON Prototype

- 所有資料來自 `public/data/*.json`（pipeline 產出）
- Watchlist 沒有 DB，`/api/v3/watchlist POST` 在非 DB 模式回傳 503
- Symbol profile 在 `symbols.json` 陣列，各頁各自讀取

### Phase 1：DB-backed Symbol + Watchlist（MVP）

目標：symbol_profiles + watchlist_memberships 進 DB，其他欄位仍可 JSON。

```sql
CREATE TABLE symbol_profiles (...);
CREATE TABLE watchlist_memberships (
  id         TEXT PRIMARY KEY,
  ticker     TEXT NOT NULL REFERENCES symbol_profiles(ticker),
  user_id    TEXT NOT NULL DEFAULT 'default',
  added_at   TEXT NOT NULL,
  note       TEXT,
  source     TEXT DEFAULT 'manual'
);
```

移轉方式：
1. `npm run db:init-sample` → 建立 DB + seed symbol_profiles
2. `db-writer.ts` 新增 `dbAddWatchlistMembership()` / `dbRemoveWatchlistMembership()`
3. `/api/v3/watchlist/memberships` 成為主要 CRUD 端點

### Phase 2：Symbol Insights 進 DB

目標：pipeline 與 on-demand research 都寫入 symbol_insights。

1. schema 增加 `symbol_insights` 表
2. pipeline script 在每次產出後 INSERT insights
3. `/api/v3/symbols/[ticker]/checkpoints` 改由 DB 讀取
4. WatchlistResearchPanel 的「開始研究」送出後 INSERT research_session + symbol_insights

### Phase 3（長期）：全量 DB-backed

- symbol_overviews / technicals / fundamentals 進 DB
- 前端 adapter 切換到 `api` 模式
- symbol_profiles 成為真正的唯一真相，static JSON 僅保留做 export 用途

---

## 「個股查詢加入自選股」的短期與長期設計

### 短期 Prototype（目前）

- `SymbolsExplorer` 點擊「加入自選股」按鈕
- 呼叫 `addToWatchlist(ticker)` client action
- client action 呼叫 `/api/v3/watchlist/memberships` POST
- 非 DB 模式：API 回傳 `{status: "prototype", message: "..."}` → UI 顯示提示
- DB 模式：API 真正寫入 `watchlist_memberships`，回傳 `{status: "ok"}`
- UI 清楚標示「prototype / 尚未永久儲存」，不隱瞞狀態

### 長期 DB API

```
POST /api/v3/watchlist/memberships
Body: { ticker, note?, source? }
Auth: 需要 session (logged_in)
Response: { data: { id, ticker, addedAt }, status: "ok" }

DELETE /api/v3/watchlist/memberships?ticker=XXX
Auth: 需要 session

GET /api/v3/watchlist/memberships
Auth: 需要 session (或 public read-only mode)
Response: { data: WatchlistMembership[], status: "ok" }
```

---

## On-Demand Research 安全流程

```
使用者送出 tickers[] (最多10, 格式驗證)
    ↓
POST /api/v3/research/request
    ↓ [1] session 驗證 (requireSession)
    ↓ [2] 輸入驗證 (zod: tickers 格式, 長度, 內容)
    ↓ [3] quota 檢查 (今日已用次數 ≤ MAX_DAILY_QUOTA) [未來實作]
    ↓ [4] rate limit (5 req/min/user) [未來實作]
    ↓ [5] INSERT research_sessions (jobId, status='queued') [未來實作]
    ↓ [6] 回傳 { jobId, status: 'queued' } to client
    ↓
[背景 Job]
    ↓ [7] 呼叫模型 (目前: MOCK, 不接真正模型)
    ↓ [8] INSERT symbol_insights (source='research:on_demand')
    ↓ [9] UPDATE research_sessions status='done'
    ↓
GET /api/v3/research/status/[jobId] → client polling [未來實作]
```

### 開通前必備安全機制清單

- [ ] AUTH_USERNAME / AUTH_PASSWORD_HASH / SESSION_SECRET 環境變數
- [ ] 每使用者每日 quota (MAX_DAILY_RESEARCH_REQUESTS)
- [ ] Rate limiting: 5 req/min/user
- [ ] Job queue (BullMQ / SQLite queue)
- [ ] Audit log (research_sessions 表)
- [ ] CSRF 保護 (iron-session sameSite:lax 基本保護)
- [ ] SESSION_SECRET ≥ 32 chars random
- [ ] Server-side env secrets (絕不暴露到 client bundle)
- [ ] 公開 tunnel → Cloudflare Access 或 IP allowlist

---

## 自選股 vs 掃描 vs AI 推薦的界線

這三個概念容易混淆，以下說明各自定義：

| 概念 | 定義 | 來源 | 典型頁面 |
|------|------|------|---------|
| **自選股（Watchlist）** | 使用者手工加入的標的，代表「我想追蹤這支」，不代表 AI 推薦買入 | 使用者操作 | `/watchlist` |
| **掃描（Scan）** | 對已加入的自選股執行條件監控（新聞異常、技術觸發、風險警示），屬監控/提醒性質 | pipeline 或規則引擎 | `/watchlist` 掃描區塊 |
| **AI 推薦候選（Ideas）** | AI 主動篩選出的潛在進場標的，每日更新，不受使用者自選股影響 | pipeline (morning/close) | `/ideas`, `/dashboard` |

**關鍵原則：**
- 自選股頁的「掃描摘要」是對*已加入*標的的監控結果，不能解讀成 AI 買入建議
- AI 候選池（`/ideas`）才是 AI 主動推薦的標的，有 thesis、trigger、invalidation
- 使用者可以把 AI 候選池的標的手動加入自選股，但自選股本身無推薦語意

---

## 已落地進度（2026-05-17）

### Phase 1（完成）
- `db/schema.sqlite.sql`：`symbol_profiles (symbols)` + `watchlist_memberships (watchlist_items)` 已落地
- `db-writer.ts`：`dbAddToWatchlist` / `dbRemoveFromWatchlist` 可用
- `/api/v3/watchlist/memberships` GET/POST/DELETE 真正寫入 DB

### Phase 2（完成）
- **新表：`symbol_insights`** — append-only insight stream
  - pipeline / on-demand research / manual note 均寫入此表
  - 欄位：id, ticker, source, kind, title, body, payload_json, confidence, created_at, as_of, session_id, pipeline_run_id, user_id, deleted_at
- **新表：`research_sessions`** — on-demand research audit trail
- **新表：`portfolio_positions`** — 實際持倉監控（thesis / stop_loss / target）
- **db-writer.ts 新增：**
  - `dbEnsureSymbol` — upsert symbol profile
  - `dbAddSymbolInsight` — 寫入 insight
  - `dbCreateResearchSession` / `dbUpdateResearchSession`
  - `dbAddPortfolioPosition` / `dbUpdatePortfolioPosition` / `dbDeletePortfolioPosition`
  - `dbPipelineAddInsight` — pipeline helper
- **db-reader.ts 新增：**
  - `dbReadSymbolInsights(ticker)` — 讀取 ticker 的最新 insights
  - `dbReadSymbolNormalizedSummaries()` — 所有 symbols 含 watchlist flag + latestInsight
  - `dbReadSymbolNormalizedSummary(ticker)` — 單一 ticker normalized view
  - `dbReadPortfolioPositions()` — 讀取 active 持倉
  - `dbReadWatchlist()` 擴充：JOIN symbol_insights 取 latestInsight
- **新 API endpoints：**
  - `GET /api/v3/symbols/normalized` — SymbolNormalizedSummary[] (DB mode)
  - `GET /api/v3/symbols/[ticker]/insights` — SymbolInsight[] (DB mode)
  - `POST /api/v3/symbols/[ticker]/insights` — 寫入 insight (DB + auth)
  - `GET /api/v3/portfolio/positions` — 讀取持倉
  - `POST /api/v3/portfolio/positions` — 新增持倉
  - `PATCH /api/v3/portfolio/positions/[id]` — 更新持倉
  - `DELETE /api/v3/portfolio/positions/[id]` — 軟刪除持倉
  - `/api/v3/research/request` POST — DB mode 下建立 research_session + symbol_insights
- **UI：**
  - `/symbols/[ticker]` 在 DB mode 顯示「最新同步洞察」區塊（讀 symbol_insights）
  - `/watchlist` 自選股列表在 DB mode 取 latestInsight
- **Pipeline helper：**
  - `src/app/api/v3/_lib/pipeline-helpers.ts` 提供 `pipelineAddInsight` / `pipelineBulkAddInsights`
  - 供候選池更新、收盤 checkpoint 等 pipeline 腳本共用

### 目前資料同步流（DB mode 已落地）

```
使用者操作 (watchlist add/remove)
  → /api/v3/watchlist/memberships POST/DELETE
  → watchlist_items table

研究請求 (on-demand)
  → /api/v3/research/request POST
  → research_sessions (status=queued)
  → symbol_insights (kind='research_request', source='research:on_demand')

Pipeline 候選池更新 (外部腳本使用 pipelineAddInsight)
  → symbol_insights (source='pipeline:close' 等)

任何頁面讀取
  → /api/v3/symbols/[ticker]/insights
  → 同一份 symbol_insights table
```

### 下一步（Phase 3）
- [ ] Pipeline scripts 接 `pipelineAddInsight` 寫入真實候選池 checkpoints
- [ ] `/api/v3/research/request` 接通 job queue + 模型（需完整 quota/rate limit）
- [ ] 持倉監控頁整合 `/api/v3/portfolio/positions`
- [ ] symbol_overviews / technicals / fundamentals 進 DB
- [ ] 自選股頁在 DB mode 顯示 latestInsight 區塊

---

## 頁面資料責任對照

| 頁面 | 讀取來源 | 寫入責任 |
|------|---------|---------|
| `/symbols` | symbol_profiles 列表 + watchlist_memberships (inWatchlist flag) | addToWatchlist action |
| `/symbols/[ticker]` | symbol_profiles + symbol_insights (checkpoints) + ai_notes | 無（唯讀） |
| `/watchlist` | watchlist_memberships JOIN symbol_profiles + symbol_insights + symbol_profiles (搜尋用) | addMember / removeMember |
| `/pools` | pool_holdings/opportunities/volatile_radar → ticker FK → symbol_profiles | pipeline 寫入 |
| `/ideas` | Candidate (ticker + thesis) → 可聯結 symbol_profiles | pipeline 寫入 |
| `/today` | symbol_insights WHERE date=today (checkpoint kind) | pipeline 寫入 |
