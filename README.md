# stock-dashboard

台股分析網站 MVP，純靜態 HTML/CSS/JS。

## 目錄

- `index.html`：網站入口，會轉向 `market-focus.html`
- `market-focus.html`：今日股市主頁
- `daily-brief.html`：日報中心
- `trade-center.html`：交易紀錄
- `assets/`：前端 JS / CSS
- `data/index.json`：資料清單與最新日期
- `data/daily/YYYY-MM-DD.json`：每日分析 JSON
- `data/csv/etf-signals.csv`：ETF 訊號 CSV
- `data/csv/stock-signals.csv`：個股訊號 CSV

## 本地預覽

### 方法 1：Python 內建 HTTP Server

```bash
cd /home/barrysu/.openclaw/workspace/stock-dashboard
python3 -m http.server 8080
```

然後打開：<http://localhost:8080>

### 方法 2：直接打開 `market-focus.html`

可看到內建 fallback sample，但部分瀏覽器會因 CORS 無法讀本機 JSON，所以仍建議用 HTTP server。

## 每日 JSON 格式

```json
{
  "date": "2026-03-22",
  "summary": {
    "headline": "台股高檔震盪，資金聚焦高息 ETF 與 AI 權值股",
    "marketBias": "positive",
    "overview": "今天的整體摘要",
    "tags": ["高檔震盪", "AI 權值股"],
    "metrics": {
      "weightedIndexChangePct": 0.84,
      "breadthPct": 61,
      "etfSignals": 4,
      "stockSignals": 4
    }
  },
  "etfs": [
    {
      "symbol": "0050",
      "name": "元大台灣50",
      "action": "watch",
      "trendScore": 78,
      "priceChangePct": 1.2,
      "note": "備註"
    }
  ],
  "stocks": []
}
```

## 接排程輸出建議

1. 排程分析程式每日產出一份 `data/daily/YYYY-MM-DD.json`
2. 同步覆蓋更新：
   - `data/csv/etf-signals.csv`
   - `data/csv/stock-signals.csv`
3. 更新 `data/index.json`：
   - `latest` 改成當日
   - `files` 追加當日日期
4. 若部署在 GitHub Pages / 靜態主機，推送後頁面就會讀到新資料

## 備註

- 目前主更新目標以 `market-focus.html`、`daily-brief.html`、`trade-center.html` 為主。
- `index.html` 已退役為入口轉址頁，排程不應再把它當主要內容頁維護。
- 若抓不到 JSON，會退回內建 sample data，方便展示與除錯。
