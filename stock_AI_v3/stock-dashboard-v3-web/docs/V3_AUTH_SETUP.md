# V3 Auth 設定指南

## 環境變數

在 `.env.local` 中設定以下三個變數才能啟用登入功能：

| 變數名稱 | 說明 |
|---|---|
| `AUTH_USERNAME` | 登入帳號（明文，例如 `admin`） |
| `AUTH_PASSWORD_HASH_B64` | bcrypt hash 的 base64 版本，建議使用；可避免 `.env` 對 `$` 做變數展開 |
| `AUTH_PASSWORD_HASH` | bcrypt hash，**不要存明文密碼**；若直接使用需正確 escape `$` |
| `SESSION_SECRET` | Session 加密金鑰，建議 32+ 字元的隨機字串 |

**產生密碼 hash：**
```bash
node scripts/hash-password.mjs
```

若要使用建議的 `AUTH_PASSWORD_HASH_B64`，可將 bcrypt hash 做 base64：
```bash
printf '%s' '<bcrypt hash>' | base64 -w 0
```

**產生 SESSION_SECRET（範例）：**
```bash
openssl rand -base64 32
```

## 未設定時的行為

- 所有頁面仍可正常瀏覽（不整站鎖登入）
- Topbar 顯示「登入未設定」提示
- 即時研究面板顯示設定引導，不顯示研究功能
- `/api/auth/login` 回傳 503

## 已設定但未登入

- Topbar 右上角顯示「登入」按鈕，連結至 `/login`
- 即時研究面板顯示「需要登入」並引導前往 `/login`

## 已登入

- Topbar 顯示使用者名稱與「登出」按鈕
- 即時研究面板顯示 prototype UI（尚未接通模型）

## 安全機制

### Session Cookie
- `httpOnly: true` — 前端 JS 無法存取
- `sameSite: "lax"` — 防止跨站請求偽造
- `secure: true`（production 環境）— 僅 HTTPS 傳送
- 有效期：7 天

### Login API 防護
- 後端 Zod 驗證：帳號 max 64 字元、密碼 max 256 字元，前端 maxLength 同步
- In-memory rate limit：同一 IP 15 分鐘內失敗 10 次即封鎖，重啟後重置
- 不區分「帳號不存在」與「密碼錯誤」，統一回傳相同錯誤訊息（避免枚舉攻擊）

### 注意事項
- Rate limiter 為 in-memory，重啟 server 後重置；多 instance 部署需改用 Redis
- `AUTH_PASSWORD_HASH_B64` / `AUTH_PASSWORD_HASH` 必須代表 bcrypt hash，切勿存明文
- `SESSION_SECRET` 請勿提交到版本控制；`.env.local` 已在 `.gitignore` 中

## 即時研究保護

`WatchlistResearchPanel`（`src/components/watchlist/WatchlistResearchPanel.tsx`）根據 `authStatus` prop 顯示：

- `not_configured` → 顯示環境變數設定引導
- `not_logged_in` → 顯示「前往登入」按鈕
- `logged_in` → 顯示 prototype UI（目前不呼叫任何模型）

Auth 狀態由 `src/app/(app)/watchlist/page.tsx`（server component）讀取後傳入。

## 開通即時研究後端前的必備清單

以下功能尚未實作，開通前須完成：

- [ ] 每使用者每日 quota 限制
- [ ] Rate limiting（5 req/min/user，需 Redis）
- [ ] Job queue（避免同時大量請求）
- [ ] Audit log（誰何時請求了什麼）
- [ ] CSRF / session rotation
- [ ] 公開 tunnel → IP allowlist 或 Cloudflare Access
- [ ] Server-side env secrets（不得暴露到 client bundle）
