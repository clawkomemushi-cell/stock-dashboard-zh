# V3 Auth & On-Demand Research — MVP Plan

Date: 2026-05-17

## 摘要

本計劃涵蓋四項改善：

1. **手機版改為左側 Drawer 選單** — 取代原本不夠用的 bottom nav
2. **即時研究 (On-Demand Research) 入口放在自選股頁** — 支援多檔選擇，Auth 保護
3. **自選股與個股查詢整合** — symbols 頁加入「加入自選股」MVP，watchlist 頁確立為「自選股中心」
4. **Auth Gate / 安全 Prototype** — 即時研究區塊受 session 保護，未來開通需完整安全機制

---

## 1. 手機版 Drawer 導覽

### 現況問題
- `MobileNav` 只有 5 個 bottom tab，遺漏今日時間軸、個股查詢、術語字典、回顧報告等入口
- bottom nav 佔用螢幕高度，壓縮可用空間

### 解法
- 新增 `MobileDrawer.tsx` (client component)，包含：
  - 固定在 topbar 左側的 hamburger 按鈕 (md:hidden)
  - 點擊展開的左側抽屜面板 (fixed, z-50, w-72)
  - 使用同一份 `NAV_ITEMS`，覆蓋所有桌面入口
  - 點擊連結或背景 overlay 自動關閉
- `AppLayout.tsx` 換用 `MobileDrawer`，移除 `MobileNav`
- `Topbar.tsx` 為 hamburger button 預留 36px spacer

---

## 2. 即時研究 (On-Demand Research)

### 設計原則
- **這是 prototype / mock**：絕對不會呼叫 OpenClaw 模型或外部 API
- UI 永遠顯示「功能受保護」或「尚未接通模型」，避免誤導
- 搜集 ticker 輸入 (可從自選清單選，或手動填寫多個)

### Auth 狀態分層
| 狀態 | 說明 | UI 呈現 |
|------|------|---------|
| `not_configured` | 未設定 env vars | 顯示設定說明，鎖定研究區 |
| `not_logged_in` | 有設定但未登入 | 顯示「請先登入」+ 導覽連結 |
| `logged_in` | 已驗證 session | 顯示「功能開發中，尚未接通模型」 |

### 元件位置
- `src/components/watchlist/WatchlistResearchPanel.tsx` — client 元件
- 在 `watchlist/page.tsx` 中以 server 端判斷 authStatus 後傳入

---

## 3. 自選股 × 個股整合

### MVP 範疇
- `SymbolsExplorer.tsx`：每張個股卡片加「加入自選股」icon button
  - 目前為 **prototype**：點擊顯示「請至自選股頁面手動加入（尚未接通 DB 寫入）」
  - disabled 視覺提示，不真的呼叫 API write
- `watchlist/page.tsx` 頁面標題更新為「自選股中心」，加說明文字
- 符號頁面加說明：「搜尋後可加入自選股」

### 未來（超出 MVP 範疇）
- 在 WatchlistAdapter 加 `add(ticker)` mock 回傳假成功
- DB 模式下真實寫入

---

## 4. 安全需求（未來開通前必備）

**目前即時研究 API 不存在 / 完全為 mock，不會觸發任何模型或搜尋。**

未來真正開通前，必須實作：

- [ ] 登入驗證 (已有 iron-session 架構，需正確設定 env vars)
- [ ] 每使用者每日 quota 限制
- [ ] Rate limiting (e.g. 5 req/min/user)
- [ ] Job queue — 避免同時大量請求擠爆模型
- [ ] Audit log — 記錄誰什麼時間請求了什麼
- [ ] CSRF 保護 (iron-session sameSite: lax 提供基本保護)
- [ ] SESSION_SECRET 強密鑰 (≥32 chars, 隨機)
- [ ] Server-side env secrets (永遠不要暴露到 client bundle)
- [ ] 定期 session rotation
- [ ] 公開 tunnel 需加 IP allowlist 或 Cloudflare Access

**必要的環境變數：**
```
AUTH_USERNAME=your_username
AUTH_PASSWORD_HASH=bcrypt_hash_of_password
SESSION_SECRET=very_long_random_string_min_32_chars
```

---

## 實作順序

1. `docs/` — 本文件（已完成）
2. `MobileDrawer.tsx` + `AppLayout.tsx` + `Topbar.tsx` 更新
3. `WatchlistResearchPanel.tsx` + `watchlist/page.tsx` 更新
4. `SymbolsExplorer.tsx` 加入自選股按鈕
5. typecheck / static-data check / build
