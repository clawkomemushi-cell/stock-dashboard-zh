# V3 語言與產品定位規範

**Date:** 2026-05-10
**Status:** 有效，適用於所有後續 UI 更新

---

## 核心原則

### 1. 使用者可見內容以繁體中文為主

- 所有頁面標題、卡片標題、按鈕/連結、空狀態、錯誤狀態、badge label、helper text、篩選器標籤、欄位標籤一律使用繁體中文。
- Code identifiers（變數名稱、function 名稱、type/interface 名稱）**不需要改**，維持英文以利維護。
- 技術指標縮寫（RSI、MA20、MA60、MA200、EPS、P/E、P/B）可以保留英文縮寫，因為這是台股分析界的通用術語；但 label 旁應有脈絡可讓使用者理解。
- TradingView、TWSE、TPEx、MOPS 等專有名詞保留英文。

### 2. 產品定位：台股分析工作台，非泛用 finance SaaS

這個網站是幫米蟲做**台股分析**用的，不是英文 demo dashboard。每次更新 UI 文字時，要確認語氣和措辭符合「個人台股研究工作台」的定位：

- 說「候選池」不說「Ideas」
- 說「觀察點」不說「Checkpoint」
- 說「進場條件」不說「Trigger」
- 說「失效條件」不說「Invalidation」
- 說「消息面工作台」不說「News」
- 說「自選股」不說「Watchlist」
- 說「回顧報告」不說「Reports」
- 說「系統狀態」不說「System Health」

### 3. AI 摘要與研判的寫作規範

AI 產生的摘要內容（候選理由、每週摘要、收盤回顧）必須包含：

- **判斷依據**：為什麼選入這檔？技術面/消息面/基本面/籌碼哪個是主要驅動力？
- **觀察邏輯**：用什麼指標或條件來觀察？觀察的是什麼變化？
- **風險情境**：什麼情況代表判斷失誤？有哪些具體風險事件需要警惕？
- **可執行條件**：進場條件（trigger）和失效條件（invalidation）要具體，不能只說「表現好」

**禁止**：只給結論而不給理由的摘要（例：「此標的表現良好」）。

### 4. 不要泛化成英文 demo

以下情境禁止出現：

- 頁面標題全英文（如 "Dashboard", "Watchlist", "System Health"）
- 篩選器 label 全英文（如 "Kind", "Theme", "Impact", "Mode"）
- 卡片欄位全英文（如 "Why selected", "Trigger", "Invalidation"）
- 空狀態/錯誤狀態英文文字（如 "No data", "no matches"）

### 5. Mock / 樣本資料

- `fixtures/snapshot-input.sample.json` 和 `src/lib/mocks/` 中的顯示資料（title、summary、description 等）應以繁體中文為主。
- Schema 欄位名稱（ticker、role、confidence 等）保留英文。
- 新增 mock 資料時，確保中文內容反映台股分析語境（台積電、半導體、AI Server 等），不要用通用 placeholder。

---

## 術語對照表

| 英文術語 | 中文用語 | 說明 |
|---|---|---|
| Dashboard | 總覽 | 主頁 |
| Watchlist | 自選股 | |
| Ideas / Candidates | 候選池 / AI 主動候選 | |
| News | 消息面 | |
| Today / Timeline | 今日時間軸 | |
| Symbols | 個股查詢 | |
| Reports | 回顧報告 | |
| Close Review | 收盤回顧 | |
| Weekly Review | 週回顧 | |
| System Health | 系統狀態 | |
| Checkpoint | 觀察點 | |
| Trigger | 進場條件 | |
| Invalidation | 失效條件 | |
| Risk Scenarios | 風險情境 | |
| Why selected | 為何選入 | |
| Technical | 技術面 | |
| Fundamentals | 基本面 | |
| Evidence | 研判依據 | |
| Thesis | 研判摘要 | |
| Today thesis | 今日觀點 | |
| Theme | 主題 | |
| Theme Radar | 主題雷達 | |
| Top Themes | 主流主題 | |
| Kind (filter) | 類型 | |
| Role (filter) | 角色 | |
| Conf / Confidence | 信心 | |
| Market (filter) | 市場 | |
| Tag (filter) | 標籤 | |
| Time (filter) | 時間 | |
| Impact (filter) | 影響類型 | |
| Importance (filter) | 重要度 | |
| Mode (filter) | 模式 | |
| Symbol Overview | 個股概覽 | |
| Advanced Chart | 進階圖表 | |
| Current Run | 最新執行 | |
| Data Freshness | 資料新鮮度 | |
| Active modes | 啟用模式 | |
| Routes / Adapters | 路由 / 適配器 | |
| Last successful publish | 上次成功發布 | |
| noisy | 雜訊高 | badge |
| low-signal | 低訊號 | badge |
| in Ideas (today) | 今日候選 | badge |
| Top Market-Moving News | 市場主要消息 | 新聞頁分區標題 |
| Symbol-linked News | 個股相關消息 | 新聞頁分區標題 |
| Policy / Macro / Rate / FX / Tariff | 政策 / 總經 / 利率 / 匯率 / 關稅 | 新聞頁分區標題 |
| Low-signal / Duplicate | 低訊號 / 重複 | 新聞頁分區標題 |
| Daily Review Cards | 每日回顧卡片 | |
| Key Wins | 本週亮點 | |
| Key Misses | 本週失誤 | |
| Bias Observations | 偏誤觀察 | |
| Next Week Adjustments | 下週調整方向 | |
| Summary (weekly) | 本週摘要 | |
| What worked | 判斷正確 | |
| What failed | 判斷失誤 | |
| Next-day watchpoints | 明日關注點 | |
| Analysis layer status | 分析層狀態 | |
| Ticker results | 個股結果 | |
| accuracy | 準確率 | |
| last publish | 上次發布 | |
| warnings | 警告數 | |
| stale: | 過期： | |
| missing: | 缺失： | |

---

## 審查清單（每次 UI 更新前檢查）

- [ ] 所有使用者可見文字是繁體中文？
- [ ] AI 摘要包含判斷依據、觀察邏輯、風險情境？
- [ ] 沒有出現上述「禁止出現」情境？
- [ ] mock/sample 資料是台股分析語境，不是英文 placeholder？
- [ ] `npm run lint && npm run typecheck && npm run build` 全部通過？
