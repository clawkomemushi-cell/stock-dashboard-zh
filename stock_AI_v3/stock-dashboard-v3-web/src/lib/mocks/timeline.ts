import type { DailyCheckpoint } from "@/lib/contracts";

export const MOCK_TODAY_CHECKPOINTS: DailyCheckpoint[] = [
  {
    id: "cp-pre",
    kind: "pre",
    title: "盤前 Checkpoint",
    timestamp: "2026-05-17T08:30:00+08:00",
    status: "ok",
    summary:
      "美股收紅，費半指數 +1.2%，台積電 ADR +1.5%，盤前情緒偏多。持倉監控池：廣達、台積電均無出貨警訊，thesis 完好。機會候選：緯穎回測 430 支撐成立，今日觀察是否啟動。",
    confidence: "high",
    whatChanged:
      "美元走弱支撐外資回補，AI capex 題材未見反轉；緯穎昨日縮量整理符合進場前條件。",
    trigger: "台積電開高守 1040 且量能 > 前日 80% → 確認多頭結構，緯穎可伺機分批。",
    invalidation: "若指數開高走低 1% 以上 → 候選暫停，持倉轉防禦。",
    linkedSymbols: ["2330.TW", "2382.TW", "6669.TW"],
    linkedNewsIds: ["n-001", "n-002"],
  },
  {
    id: "cp-open-930",
    kind: "open-track",
    title: "開盤後追蹤 09:30",
    timestamp: "2026-05-17T09:30:00+08:00",
    status: "ok",
    summary:
      "台積電開盤後量能充足，守穩 1040 支撐，外資買盤進場；廣達同步走強，AI server 族群整體偏多。緯穎突破 430 且成交量增，進場訊號觸發。",
    confidence: "high",
    whatChanged:
      "台積電 09:15 試盤量已達昨日全日 40%，確認非虛量；緯穎開盤即站上 432，突破盤整區。",
    trigger: "緯穎 430 突破確認 → 第一批進場（1/3 倉位），停損設 415。",
    invalidation: "若台積電 10:00 前跌回 1035 以下 → 暫停追蹤，等盤中再評估。",
    linkedSymbols: ["2330.TW", "6669.TW", "2382.TW"],
    linkedNewsIds: [],
  },
  {
    id: "cp-open-1000",
    kind: "open-track",
    title: "開盤後追蹤 10:00",
    timestamp: "2026-05-17T10:00:00+08:00",
    status: "warn",
    summary:
      "中小型股出現分化，智原（3034）開高後量縮回落，盤中假突破跡象。緯穎走勢維持偏強，廣達略有拉回但守住支撐。",
    confidence: "medium",
    whatChanged:
      "智原量縮回落 → 進場延後，等待下次確認；緯穎站穩 432，第二批進場條件成立。",
    trigger: "緯穎守穩 430 且量能延續 → 第二批進場（追加 1/3 倉位）。",
    invalidation: "若智原失守 495（月線）且大盤量縮 → 候選池縮手，只維持現有持倉。",
    linkedSymbols: ["3035.TW", "6669.TW"],
    linkedNewsIds: [],
  },
  {
    id: "cp-mid",
    kind: "mid",
    title: "午間 Checkpoint",
    timestamp: "2026-05-17T11:30:00+08:00",
    status: "ok",
    summary:
      "台積電上午整體走勢平穩，收盤前守住 1043；緯穎已站穩突破位，兩批進場均有利。持倉池（廣達、台積電）無新出貨訊號。",
    confidence: "medium",
    whatChanged: "妖股雷達：大同下午可能再度放量，注意散戶追高風險。",
    trigger: "維持現有倉位，等收盤確認。",
    invalidation: "若 12:30 出現大量急跌（指數跌逾 0.8%）→ 減碼持倉至七成。",
    linkedSymbols: ["2330.TW", "2382.TW", "6669.TW"],
    linkedNewsIds: [],
  },
  {
    id: "cp-close",
    kind: "close",
    title: "收盤 Checkpoint",
    timestamp: "2026-05-17T13:35:00+08:00",
    status: "ok",
    summary:
      "大盤收紅，加權指數 +0.7%。台積電守住 1042，緯穎 +2.3% 表現最強，廣達小漲。持倉 thesis 今日成立，機會候選緯穎已進場兩批。",
    confidence: "high",
    whatChanged:
      "智原今日假突破，等下次確認才加入候選；力旺今日無明顯訊號，繼續觀察中。",
    trigger: "明日若美股收紅 + 台積電 ADR 穩，持倉維持。",
    invalidation:
      "若美股夜盤 -1.5%+ 或費半大跌 → 明日盤前縮減緯穎至 1/3 倉位，台積電轉防禦。",
    linkedSymbols: ["2330.TW", "6669.TW", "2382.TW"],
    linkedNewsIds: [],
  },
  {
    id: "cp-evening",
    kind: "evening",
    title: "晚間整理 / 隔日候選",
    timestamp: "2026-05-17T21:00:00+08:00",
    status: "ok",
    summary:
      "美股開盤後費半 +0.8%，台積電 ADR 平盤略紅，整體氣氛持穩。整理隔日候選：緯穎繼續持有，智原等回測確認後再觀察。",
    confidence: "medium",
    whatChanged:
      "力旺出現外資小幅買超（100 張），若明日延續 → 可列入機會候選池正式觀察名單。",
    trigger: "如費半持守 +0.5% 以上，明日盤前台積電、緯穎持倉維持不動。",
    invalidation: "若費半轉跌 -1%+ 或 NVIDIA 盤後財報不如預期 → 明日開盤縮減所有候選倉位。",
    linkedSymbols: ["2330.TW", "6669.TW", "3529.TW"],
    linkedNewsIds: [],
  },
];
