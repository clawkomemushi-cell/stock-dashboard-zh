export interface GlossaryTerm {
  id: string;
  term: string;
  english?: string;
  category: string;
  shortDef: string;
  detail?: string;
  related?: string[];
}

export const GLOSSARY_CATEGORIES = [
  "台股基本",
  "技術分析",
  "籌碼法人",
  "ETF配息",
  "風險控管",
  "AI Cockpit",
] as const;

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // ── 台股基本 ──────────────────────────────────────────
  {
    id: "zhangting",
    term: "漲停板",
    english: "Upper Limit",
    category: "台股基本",
    shortDef: "台股單日最大漲幅限制，目前為 ±10%。",
    detail:
      "台灣股市規定，個股每日漲跌幅限制為前一日收盤價的 ±10%（ETF 同標準）。漲停時市場競價在最高價，通常代表強勁買盤；反之跌停代表強力拋壓。連續漲停俗稱「鎖漲停」，難以在市場買到。",
    related: ["跌停板", "融資", "除息"],
  },
  {
    id: "dieting",
    term: "跌停板",
    english: "Lower Limit",
    category: "台股基本",
    shortDef: "台股單日最大跌幅限制，目前為 ±10%。",
    detail:
      "股價觸及跌停（-10%）時，掛單大量堆積在跌停價，流動性趨近於零，持有者難以出脫。連續跌停俗稱「鎖跌停」，是高風險警訊。",
    related: ["漲停板", "停損"],
  },
  {
    id: "rongzi",
    term: "融資",
    english: "Margin Buying",
    category: "台股基本",
    shortDef: "向券商借錢買股票，以槓桿放大報酬與風險。",
    detail:
      "融資比例一般為股價的 6 成，投資人只需自備 4 成保證金。若股價下跌超過維持率門檻（通常 130%），券商將發出追繳通知（Margin Call）；若未補足即強制賣出（斷頭）。融資餘額增加通常代表散戶積極做多。",
    related: ["融券", "籌碼", "散戶"],
  },
  {
    id: "rongquan",
    term: "融券",
    english: "Short Selling",
    category: "台股基本",
    shortDef: "向券商借股票賣出，預期股價下跌後買回獲利。",
    detail:
      "融券需繳交 9 成保證金。除息、除權前夕常有「強迫回補」，融券空頭須買回股票，可能推升股價。融券餘額大量增加代表市場空頭力道強。",
    related: ["融資", "除息", "除權"],
  },
  {
    id: "chuxi",
    term: "除息",
    english: "Ex-Dividend",
    category: "台股基本",
    shortDef: "股票在配發現金股息前，股價依配息金額調降的基準日。",
    detail:
      "除息日當天開盤參考價 = 前收盤價 − 現金股息。若股價後來回升至除息前水準，稱為「填息」；若持續低於則稱「貼息」。填息速度是評估高股息標的吸引力的重要指標。",
    related: ["除權", "填息", "殖利率"],
  },
  {
    id: "chuquan",
    term: "除權",
    english: "Ex-Rights",
    category: "台股基本",
    shortDef: "公司配發股票股利（股票股息）時，股價依比例調整的基準日。",
    detail:
      "除權後股數增加、股價同比例下調，整體市值不變。若除權後股價回升至原水準，稱「填權」。高填息填權率是評估個股競爭力的指標。",
    related: ["除息", "填息"],
  },
  {
    id: "zhiyilv",
    term: "殖利率",
    english: "Dividend Yield",
    category: "台股基本",
    shortDef: "年化股息 ÷ 股價，衡量股息相對成本的報酬率。",
    detail:
      "殖利率 = (年度現金股息 / 股價) × 100%。台股高股息 ETF 常以 5–8% 殖利率吸引投資人。但殖利率高不代表投資報酬好，需搭配填息率、配息來源（獲利 vs. 資本返還）一起看。",
    related: ["除息", "ETF配息", "填息"],
  },
  {
    id: "kucanggu",
    term: "庫藏股",
    english: "Treasury Stock Buyback",
    category: "台股基本",
    shortDef: "公司以自有資金在市場買回自家股票，通常為護盤或股權激勵。",
    detail:
      "公司執行庫藏股買回，會直接減少市場流通股數，具有短期護盤效果。但需注意公司是否有足夠現金流、買回價格是否合理，以及是否可能只是短暫支撐。",
    related: ["籌碼", "外資"],
  },

  // ── 技術分析 ──────────────────────────────────────────
  {
    id: "kd",
    term: "KD 指標",
    english: "Stochastic Oscillator",
    category: "技術分析",
    shortDef: "衡量股價在一段期間內相對位置的震盪指標，常搭配 RSI 確認訊號。",
    detail:
      "KD 由 K 值（快線）與 D 值（慢線）組成，數值介於 0–100。KD < 20 為超賣區，KD > 80 為超買區。K 線上穿 D 線為黃金交叉（多頭訊號），反之為死亡交叉（空頭訊號）。",
    related: ["RSI", "MACD", "支撐"],
  },
  {
    id: "rsi",
    term: "RSI",
    english: "Relative Strength Index",
    category: "技術分析",
    shortDef: "相對強弱指數，衡量一段時間內漲跌力道的比例，範圍 0–100。",
    detail:
      "RSI < 30 通常視為超賣（可能反彈機會），RSI > 70 視為超買（可能拉回風險）。常用週期為 14 日。RSI 與股價的背離（divergence）是重要的反轉預警訊號。",
    related: ["KD 指標", "MACD"],
  },
  {
    id: "macd",
    term: "MACD",
    english: "Moving Average Convergence Divergence",
    category: "技術分析",
    shortDef: "移動平均收斂背離指標，用於判斷趨勢方向與動能轉折。",
    detail:
      "MACD = 12 日 EMA − 26 日 EMA，搭配 9 日 Signal 線。MACD 柱（Histogram）由負轉正是多頭訊號；MACD 與股價背離往往預示趨勢反轉。",
    related: ["KD 指標", "RSI", "均線"],
  },
  {
    id: "junxian",
    term: "均線",
    english: "Moving Average (MA)",
    category: "技術分析",
    shortDef: "過去 N 日收盤價的平均值，常用 5/10/20/60/120/240 日均線。",
    detail:
      "短期均線上穿長期均線為黃金交叉（看多），反之為死亡交叉（看空）。均線常作為動態支撐與壓力。月線（20MA）與季線（60MA）是台股操作常見參考。",
    related: ["MACD", "支撐", "壓力"],
  },
  {
    id: "bulintongdao",
    term: "布林通道",
    english: "Bollinger Bands",
    category: "技術分析",
    shortDef: "以移動平均為中軌，上下加減 2 個標準差形成的動態價格區間。",
    detail:
      "當股價貼近上軌時，代表相對強勢但也可能過熱；貼近下軌則可能超賣。通道收窄（擠壓）後常伴隨大行情爆發。",
    related: ["均線", "支撐", "壓力"],
  },
  {
    id: "chengjiaoliang",
    term: "成交量",
    english: "Trading Volume",
    category: "技術分析",
    shortDef: "某段時間內買賣雙方成交的股票數量，是判斷行情真實性的重要依據。",
    detail:
      "價漲量增為健康多頭；價漲量縮代表動能不足，可能是假突破。台股量能習慣以「億元」計算每日成交金額。",
    related: ["籌碼", "支撐"],
  },
  {
    id: "zhicheng",
    term: "支撐",
    english: "Support Level",
    category: "技術分析",
    shortDef: "股價下跌時預期會遇到買盤支撐、不易跌破的價格區間。",
    detail:
      "支撐可由均線、歷史低點、整數關卡、成交量密集區等形成。一旦跌破支撐，該水準往往轉為壓力（角色轉換）。",
    related: ["壓力", "均線", "KD 指標"],
  },
  {
    id: "yali",
    term: "壓力",
    english: "Resistance Level",
    category: "技術分析",
    shortDef: "股價上漲時預期會遇到賣壓、不易突破的價格區間。",
    detail:
      "壓力來源包括前高、均線、整數關卡等。突破壓力並有量能配合，是趨勢確認的重要訊號；反之假突破很危險。",
    related: ["支撐", "成交量", "均線"],
  },

  // ── 籌碼法人 ──────────────────────────────────────────
  {
    id: "waizi",
    term: "外資",
    english: "Foreign Institutional Investors (FINI)",
    category: "籌碼法人",
    shortDef: "海外法人機構，是台股最大的法人力量，動向對大盤影響最顯著。",
    detail:
      "外資包含外國基金、ETF、主權基金等。外資長線布局某檔股票代表被納入全球投資組合，是強力支撐；外資大幅賣超則可能引發本土跟殺。",
    related: ["投信", "自營商", "三大法人"],
  },
  {
    id: "touxin",
    term: "投信",
    english: "Investment Trust (SITE)",
    category: "籌碼法人",
    shortDef: "國內基金公司，代表台灣本土法人，常在季底作帳布局。",
    detail:
      "投信在季末（3/6/9/12 月）有「作帳行情」，傾向拉抬持股美化績效。投信大量買超的中小型股有時會有爆發性行情，但流動性風險需注意。",
    related: ["外資", "自營商", "三大法人"],
  },
  {
    id: "ziyingshang",
    term: "自營商",
    english: "Proprietary Dealers",
    category: "籌碼法人",
    shortDef: "券商用自己資金買賣，短線為主，方向較難判斷，影響力小於外資與投信。",
    detail:
      "自營商可分為自行買賣、避險部位（選擇權對沖）。避險部位的買賣不代表真實多空觀點，解讀時需扣除避險部位。",
    related: ["外資", "投信", "三大法人"],
  },
  {
    id: "sanda",
    term: "三大法人",
    english: "Three Major Institutional Investors",
    category: "籌碼法人",
    shortDef: "外資、投信、自營商的合稱，每日公布買超/賣超資料。",
    detail:
      "三大法人合計買賣超是判斷法人態度最直接的指標。三大法人同步買超通常為多頭訊號；三大法人齊賣則需警惕。每日收盤後公布，可於台灣證交所或集保結算所查詢。",
    related: ["外資", "投信", "自營商", "籌碼"],
  },
  {
    id: "chouma",
    term: "籌碼",
    english: "Market Chips / Positioning",
    category: "籌碼法人",
    shortDef: "泛指市場上各種參與者的持倉分佈，決定股票的強弱趨勢。",
    detail:
      "好的籌碼結構是：籌碼集中在法人或主力手中、散戶持股少、浮動籌碼低。相反地，籌碼散亂代表高風險。",
    related: ["三大法人", "主力", "散戶"],
  },
  {
    id: "zhuli",
    term: "主力",
    english: "Smart Money / Major Players",
    category: "籌碼法人",
    shortDef: "泛指能影響股價走勢的大資金參與者，可能是法人或大股東。",
    detail:
      "主力並非單一實體，可能是外資、投信、大股東，甚至有問題的人為炒作（違法）。合法意義的「主力進駐」代表籌碼集中、股票可能有行情；但需注意資訊不對稱。",
    related: ["籌碼", "外資", "散戶"],
  },
  {
    id: "sanhu",
    term: "散戶",
    english: "Retail Investors",
    category: "籌碼法人",
    shortDef: "一般個人投資者，相對於法人的「小資金」參與方。",
    detail:
      "散戶常被視為「反向指標」——散戶大量進場時市場可能接近高點；散戶恐慌殺低時可能接近低點。這並非絕對，但籌碼分析中散戶比例的消長具參考意義。",
    related: ["融資", "籌碼", "主力"],
  },

  // ── ETF配息 ──────────────────────────────────────────
  {
    id: "peixilv",
    term: "配息率",
    english: "Distribution Yield",
    category: "ETF配息",
    shortDef: "ETF 年化配息金額 ÷ 淨值（或股價），衡量配息相對報酬率。",
    detail:
      "配息率 ≠ 投資報酬率。若 ETF 淨值下跌幅度大於配息，整體仍是虧損。需搭配填息率、NAV 變化評估真實報酬。",
    related: ["殖利率", "月配息", "季配息", "填息"],
  },
  {
    id: "jiipexi",
    term: "季配息",
    english: "Quarterly Distribution",
    category: "ETF配息",
    shortDef: "ETF 每季（3 個月）配發一次股息的機制。",
    detail:
      "台股高股息 ETF 多採季配息或年配息，近年月配息 ETF 增多。季配息的除息時間點可能對股價造成短暫波動，需注意「過息」後的填息能力。",
    related: ["月配息", "填息", "配息率"],
  },
  {
    id: "yuepexi",
    term: "月配息",
    english: "Monthly Distribution",
    category: "ETF配息",
    shortDef: "ETF 每月配發股息，適合需要穩定現金流的投資人。",
    detail:
      "月配息 ETF（如國泰永續高股息 00878 部分期間）提供更頻繁的現金回收。但需留意：頻繁除息會讓 NAV 較難快速填息，且須確認配息來源非資本侵蝕。",
    related: ["季配息", "配息來源", "填息"],
  },
  {
    id: "tixi",
    term: "填息",
    english: "Post-Dividend Price Recovery",
    category: "ETF配息",
    shortDef: "除息後股價重新回升至除息前水準，代表配息「真正到手」。",
    detail:
      "填息代表市場認可公司價值，投資人不只拿到股息，整體資產也未縮水。填息速度越快（甚至超填），表示標的競爭力越強。未填息甚至貼息，代表股息只是「左手換右手」。",
    related: ["貼息", "殖利率", "配息率"],
  },
  {
    id: "tiexi",
    term: "貼息",
    english: "Post-Dividend Price Decline",
    category: "ETF配息",
    shortDef: "除息後股價未回升至除息前，投資人實際上拿到股息但資產縮水。",
    detail:
      "貼息代表市場對該標的信心不足，或大環境不好。若長期貼息，高股息 ETF 的吸引力會大打折扣，因為股息收益被資本損失抵消。",
    related: ["填息", "配息率"],
  },
  {
    id: "peixilaiyuan",
    term: "配息來源",
    english: "Distribution Source",
    category: "ETF配息",
    shortDef: "ETF 配息是來自投資組合的股息收入、資本利得，或返還資本，需謹慎判斷。",
    detail:
      "健康的配息來源是「股息收入」與「資本利得」；若配息來源含大量「資本返還（Return of Capital）」，代表 ETF 把你自己的本金配回給你，長期 NAV 會侵蝕。",
    related: ["月配息", "季配息", "配息率"],
  },
  {
    id: "zibenlide",
    term: "資本利得",
    english: "Capital Gain",
    category: "ETF配息",
    shortDef: "買入後股價上漲所獲得的價差收益，台股個人免稅（ETF 有差異）。",
    detail:
      "台灣個人投資者的股票資本利得目前免徵所得稅（境內股票）。ETF 若有現金股利，需計入所得；但若是海外 ETF，則有不同稅務處理，需注意申報義務。",
    related: ["配息來源", "殖利率"],
  },

  // ── 風險控管 ──────────────────────────────────────────
  {
    id: "tingsun",
    term: "停損",
    english: "Stop-Loss",
    category: "風險控管",
    shortDef: "預設虧損上限並在觸及時賣出，避免小虧變大虧的自我保護機制。",
    detail:
      "停損是交易紀律的核心。設定方式包括：固定比例（例如 -7%）、技術位（跌破支撐）、ATR 倍數等。心理上難以執行，但堅守停損是長期存活的關鍵。",
    related: ["停利", "部位控制", "最大回撤"],
  },
  {
    id: "tingli",
    term: "停利",
    english: "Take-Profit",
    category: "風險控管",
    shortDef: "預設獲利目標，在達成後出場，避免「坐過山車」吐回利潤。",
    detail:
      "停利可用固定比例（例如 +20%）、技術壓力位、或移動停利（trailing stop）。過早停利可能錯失大行情；但沒有停利紀律容易讓浮盈化為烏有。",
    related: ["停損", "部位控制"],
  },
  {
    id: "buweikonzhi",
    term: "部位控制",
    english: "Position Sizing",
    category: "風險控管",
    shortDef: "決定每筆交易投入多少資金，以控制單一標的對整體組合的影響。",
    detail:
      "常見方法：固定金額（每筆 5 萬）、固定比例（每筆不超過組合 10%）、凱利公式等。部位控制與停損結合，決定了單筆最大可能損失。",
    related: ["停損", "分散投資", "最大回撤"],
  },
  {
    id: "fensantouzi",
    term: "分散投資",
    english: "Diversification",
    category: "風險控管",
    shortDef: "將資金分配於不同標的、產業、市場，以降低單一風險集中。",
    detail:
      "分散投資可降低非系統性風險（個股/產業特定風險），但無法消除系統性風險（整體市場下跌）。過度分散可能稀釋報酬，需在集中與分散間取得平衡。",
    related: ["部位控制", "最大回撤"],
  },
  {
    id: "zuidahuiche",
    term: "最大回撤",
    english: "Maximum Drawdown (MDD)",
    category: "風險控管",
    shortDef: "從某一波高點到後續低點的最大跌幅，衡量策略的最壞情境。",
    detail:
      "MDD = (波段最低點 − 歷史高點) / 歷史高點 × 100%。MDD 越小，代表策略波動控制越好。評估 ETF 或策略時，MDD 比「年化報酬」更能反映你實際要承受的壓力。",
    related: ["停損", "部位控制", "分散投資"],
  },

  // ── AI Cockpit ──────────────────────────────────────────
  {
    id: "houxuanchi",
    term: "候選池",
    english: "Candidate Pool (Ideas)",
    category: "AI Cockpit",
    shortDef: "AI 每日篩選出值得關注或考慮進場的標的清單。",
    detail:
      "候選池依角色分為：入場（starter）、關注（watch）、觀察（observe）、迴避（avoid）。每個標的附帶研判邏輯、進場條件與失效條件，讓你做自己的判斷，而非盲目跟隨。",
    related: ["角色標籤", "進場條件", "失效條件", "信心度"],
  },
  {
    id: "xinxindu",
    term: "信心度",
    english: "Confidence Score",
    category: "AI Cockpit",
    shortDef: "AI 對某標的研判可靠程度的評估，分高/中/低三級。",
    detail:
      "信心度綜合考量資訊完整度、訊號一致性、市場環境等。高信心度 ≠ 一定獲利；低信心度標的僅供參考，不建議重倉。",
    related: ["候選池", "角色標籤"],
  },
  {
    id: "jinchangtiaojian",
    term: "進場條件",
    english: "Entry Trigger",
    category: "AI Cockpit",
    shortDef: "AI 建議的具體進場觸發條件，需自行確認後再行動。",
    detail:
      "進場條件可能是技術條件（突破某均線、成交量放大）、籌碼條件（外資連續買超）或基本面事件（法說會正向）。條件未觸發前不宜輕率進場。",
    related: ["失效條件", "候選池", "停損"],
  },
  {
    id: "shixiaotiaojian",
    term: "失效條件",
    english: "Invalidation Signal",
    category: "AI Cockpit",
    shortDef: "當哪些訊號出現時，原本的研判邏輯不再成立，應重新評估或出場。",
    detail:
      "失效條件是研判的「否命題」，幫助你在情況改變時保持客觀。例如：「若跌破季線且外資轉賣，則多頭假設失效」。",
    related: ["進場條件", "停損", "候選池"],
  },
  {
    id: "jiaosebiaoji",
    term: "角色標籤",
    english: "Role Badge",
    category: "AI Cockpit",
    shortDef: "AI 對候選標的的操作建議分類：入場、關注、觀察、迴避。",
    detail:
      "入場（starter）：條件接近成熟，可開始布局；關注（watch）：值得持續追蹤，尚未達進場標準；觀察（observe）：有一定風險，僅作學習或低度關注；迴避（avoid）：目前不建議參與。",
    related: ["候選池", "信心度"],
  },
  {
    id: "panqianyanpan",
    term: "盤前研判",
    english: "Pre-Market Analysis",
    category: "AI Cockpit",
    shortDef: "開盤前整理的市場情境、今日關注焦點與候選池更新。",
    detail:
      "盤前研判包含：外圍市場夜盤（美股、期貨）、今日重要事件、籌碼異動、候選池更新。目的是讓你在開盤前就有完整的情境地圖，不在慌亂中做決策。",
    related: ["候選池", "進場條件"],
  },
];
