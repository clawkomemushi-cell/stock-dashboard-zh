# V3 Operation Runbook

> 最後更新：2026-05-24（AI 即時研究已接通 OpenAI Responses API）

---

## 1. 資料定期更新（Data Refresh）

### 指令

```bash
# 從 stock-dashboard-v3-web/ 執行
npm run data:refresh
```

或直接執行腳本：

```bash
node scripts/refresh-v3-public-data.mjs
```

### 做了什麼

1. **`scripts/refresh-v3-public-data.mjs`** 是 wrapper：
   - 呼叫 `scripts/refresh-tonight-v3-content.mjs`（從 Yahoo Finance 抓最新行情）
   - 執行 `npm run check:static-data`（驗證 `public/data/` 靜態資料完整性）
   - 寫入 `tmp/v3-refresh-latest.json`（記錄 status、startedAt、finishedAt、steps、errors）

2. **不做的事**：不部署、不 push、不發 Discord/email。

### 建議 Cron 排程

```cron
# 每天 22:30 台灣時間（UTC+8 = 14:30 UTC）
30 14 * * 1-5 cd /path/to/stock-dashboard-v3-web && npm run data:refresh >> /var/log/v3-refresh.log 2>&1
```

> 只在週一～週五跑（台股交易日）。週末收盤後的靜態數據不會有更新，可選擇不執行。

### 確認更新結果

```bash
cat tmp/v3-refresh-latest.json
```

---

## 2. AI 即時研究功能（Research API）

### 目前狀態

**已接通 OpenAI Responses API**（fail-closed 設計）。

- 預設仍為 mock/stub — 只有同時設定 `OPENAI_API_KEY` **且** `V3_RESEARCH_AI_ENABLED=true` 時才真的呼叫 OpenAI。
- 未設定時行為與之前相同：請求通過所有防護層但回傳 mock 結果。

### 如何啟用 AI 研究

在 `.env.local`（或部署環境的 env 設定）加入：

```bash
OPENAI_API_KEY=sk-...           # 你的 OpenAI API key，絕對不要 commit 或 log
V3_RESEARCH_AI_ENABLED=true     # 缺少此項時永遠 fail-closed
V3_RESEARCH_OPENAI_MODEL=gpt-4.1-mini  # 可選，預設 gpt-4.1-mini
```

重啟 Next.js dev server 或重新部署後生效。

### 研究 API 流程

```
POST /api/v3/research/request  ←  { tickers: ["2330.TW", "NVDA"], note?: "..." }

[1] 登入驗證 (requireSession)
[2] 輸入驗證 (Zod ResearchRequest)
[3] 許可名單 (AUTH_USERNAME / V3_RESEARCH_ALLOWED_USERS)
[4] Rate limit (V3_RESEARCH_RATE_LIMIT_PER_MIN, 預設 5/min)
[5] Daily quota (V3_RESEARCH_DAILY_QUOTA, 預設 20/day)
[6] Usage ledger (recordAccepted → tmp/ai-usage/)
[7] OpenAI Responses API (僅 V3_RESEARCH_AI_ENABLED=true 時)
    → model: gpt-4.1-mini (或 V3_RESEARCH_OPENAI_MODEL)
    → 回傳繁中研究結果: summary, perTicker, risks, nextSteps, disclaimer
    → 記錄 model usage: model, inputTokens, outputTokens, totalTokens, requestId
```

回傳 JSON（AI 模式）：
```json
{
  "status": "ok",
  "data": {
    "jobId": "ai-1716553200000-abc123",
    "status": "done",
    "tickers": ["2330.TW"],
    "ai": {
      "summary": "...",
      "perTicker": { "2330.TW": ["重點1", "重點2"] },
      "risks": ["風險1"],
      "nextSteps": ["觀察指標1"],
      "disclaimer": "本分析僅供參考..."
    },
    "model": "gpt-4.1-mini"
  }
}
```

### 已啟用的防護層

| 層級 | 功能 | 設定方式 |
|------|------|----------|
| 登入驗證 | 必須已登入才可 POST | `AUTH_USERNAME` + `AUTH_PASSWORD_HASH` + `SESSION_SECRET` |
| 許可名單 | 只允許 owner 使用 | 預設 `AUTH_USERNAME`；可用 `V3_RESEARCH_ALLOWED_USERS` 覆蓋（逗號分隔） |
| Rate limit | 每分鐘最多 N 次 | `V3_RESEARCH_RATE_LIMIT_PER_MIN`（預設 5） |
| Daily quota | 每日最多 N 次 | `V3_RESEARCH_DAILY_QUOTA`（預設 20） |
| Usage ledger | 記錄所有 accepted/rejected/model 請求 | 自動寫入 `tmp/ai-usage/research-usage-YYYY-MM-DD.jsonl` |
| Fail-closed | 未設 env → 不呼叫 OpenAI | 需同時設定兩個 env 才開通 |

### 查看用量

```bash
npm run ai:usage
# 或加參數查更多天
node scripts/print-ai-usage-summary.mjs --days 14
```

usage ledger 的每筆 `model_call` 紀錄包含：
- `model`、`inputTokens`、`outputTokens`、`totalTokens`
- `requestId`（OpenAI response id）、`jobId`
- 不記錄 API key

### 第一週監控建議

啟用後第一週請每天執行：

```bash
npm run ai:usage  # 確認 token 用量在預期範圍內
cat tmp/ai-usage/research-state.json  # 確認 rate limit 狀態正常
```

重點觀察：
- `totalTokens` 每次呼叫是否合理（預期 500–2000 tokens/request）
- daily quota 是否快被用完（調高 `V3_RESEARCH_DAILY_QUOTA` 或降低使用頻率）
- 有無意外的 500 錯誤（看 server log 中的 `[research/request] AI call failed`）

### 接通前的確認清單（已完成）

- [x] 執行 `npm run ai:usage` 確認用量記錄正常
- [x] 確認 `V3_RESEARCH_RATE_LIMIT_PER_MIN` 與 `V3_RESEARCH_DAILY_QUOTA` 符合預算
- [x] 確認 `V3_RESEARCH_ALLOWED_USERS` 只包含授權使用者
- [x] API key 不在 log、不在 client bundle、不在 git history

---

## 3. 環境變數速查

| 變數 | 必填 | 說明 |
|------|------|------|
| `AUTH_USERNAME` | ✅ | 登入使用者名稱 |
| `AUTH_PASSWORD_HASH` | ✅ | bcrypt hash（`node scripts/hash-password.mjs`） |
| `SESSION_SECRET` | ✅ | iron-session 加密金鑰（≥32 字元） |
| `V3_API_SOURCE` | | `static-file` 或 `db`（預設 `static-file`） |
| `V3_SQLITE_DB_PATH` | | SQLite DB 路徑（`db` 模式用） |
| `V3_RESEARCH_ALLOWED_USERS` | | 逗號分隔許可名單；不設則只允許 `AUTH_USERNAME` |
| `V3_RESEARCH_RATE_LIMIT_PER_MIN` | | 每分鐘限制（預設 5） |
| `V3_RESEARCH_DAILY_QUOTA` | | 每日限制（預設 20） |
| `OPENAI_API_KEY` | | OpenAI API key（設定後需同時設 `V3_RESEARCH_AI_ENABLED=true` 才生效） |
| `V3_RESEARCH_AI_ENABLED` | | `true` 才真的呼叫 OpenAI；缺少或非 `true` → fail-closed |
| `V3_RESEARCH_OPENAI_MODEL` | | 使用模型（預設 `gpt-4.1-mini`） |

---

## 4. 上線授權清單（需米蟲批准）

以下操作**不得未經授權自行執行**：

| 操作 | 原因 |
|------|------|
| 部署 / 公開上線 | 需確認 hosting 平台、DNS、env 注入 |
| 接入 OpenAI API key | 需確認計費帳號、quota 上限、用量監控 |
| 啟用對外通知的 cron | 可能誤發通知 |
| 修改 `.env.production` 或 CI secrets | 安全邊界 |
| 重置或覆蓋正式 DB | 資料不可逆 |
