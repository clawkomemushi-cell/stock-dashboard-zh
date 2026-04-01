# runtime

這個目錄放排程分析階段產出的中間 JSON，供後續 publish / review 任務接力使用。

目前規劃檔案：
- morning-analysis.json
- midday-analysis.json
- close-review.json
- evening-summary.json

原則：
- analysis / generate 任務負責寫入
- publish 任務只讀取這些檔案並落地到網站正式資料
- `stock-dashboard/data/briefs/index.json` 只由 publish 任務更新
