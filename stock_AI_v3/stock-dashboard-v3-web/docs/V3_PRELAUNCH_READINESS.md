# V3 上線前 Readiness 狀態

> 最後更新：2026-05-24

---

## ✅ 已完成（可安全合併）

- **AppLayout / MobileDrawer**：MobileDrawer（漢堡選單側拉）已取代舊 MobileNav 底部 tab，文件同步完成，舊 `MobileNav.tsx` 已刪除。
- **nav-config 動態化**：回顧報告導覽不再硬編碼日期，改為 `/reports/close` 與 `/reports/weekly` landing routes。
- **Reports landing routes**：`/reports/close` 與 `/reports/weekly` server-side 讀最新報告清單，有資料自動 redirect；無資料顯示繁中 EmptyState。
- **Sidebar / MobileDrawer active state**：`pathname.startsWith("/reports")` 仍正確 highlight 整個報告群組；子項依 `/reports/close` 或 `/reports/weekly` prefix 判斷。
- **靜態資料適配器**：`listRecentClose` / `listRecentWeekly` 已實作（讀 `/public/data/reports/recent-*.json`，fallback mock）。
- **Auth 框架**：登入頁 + iron-session cookie session check 已完成。
- **適配器架構**：mock / static-file / api 三模式切換，`getAdapters()` 工廠完整。
- **型別合約**：`src/lib/contracts` 完整定義所有資料結構，Zod schema 驗證。
- **靜態資料 CI 驗證**：`npm run check:static-data` 已可跑。

## 🛠️ 今天完成（本輪整理）

| 項目 | 檔案 |
|------|------|
| 修掉硬編碼日期 | `src/components/layout/nav-config.ts` |
| 新增 close landing page | `src/app/(app)/reports/close/page.tsx` |
| 新增 weekly landing page | `src/app/(app)/reports/weekly/page.tsx` |
| 刪除殘留 MobileNav.tsx | `src/components/layout/MobileNav.tsx`（已刪） |
| 文件同步 MobileDrawer | `docs/V3_LAYOUT_SPEC.md`, `docs/V3_PAGE_MAP.md`, `docs/V3_COMPONENT_MAP.md` |
| 本文件 | `docs/V3_PRELAUNCH_READINESS.md` |

## ⏸️ 仍需米蟲批准 / 外部決策

以下項目**不得在未獲明確授權的情況下自行執行**：

| 項目 | 原因 |
|------|------|
| **Deployment / public release** | 需確認 hosting 平台（Vercel / Cloudflare Pages 等）、DNS 設定、環境變數注入 |
| **正式 Auth secrets（SESSION_SECRET / AUTH_PASSWORD_HASH_B64 等）** | 需在部署平台安全設定，不得放進 repo |
| **Production DB / 資料庫 provider 開通** | schema 已備妥，但正式 DB 連線需米蟲決策 |
| **Stock cron 重新啟用** | AI 流程 cron（盤前 / 盤中 / 收盤）暫時停用，待確認上線後再開 |
| **正式上線資料快照選定 / `/public/data` 切換** | 目前已有 sample/static data；若要換成正式上線快照，需先確認採用哪一輪 pipeline 產物 |
| **外部 API keys（新聞源、broker 等）** | 需由米蟲提供並在部署環境注入 |

## 🚫 不可在未批准下執行的事

- 對外 push / deploy（任何讓網站公開上線的動作）
- 修改 `.env.production` 或在 CI 注入 production secrets
- 重置或覆蓋正式 DB 資料
- 啟用任何對外發送通知的 cron job
- 新增外部 API 依賴或變更計費相關設定
