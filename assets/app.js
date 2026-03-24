const fallbackData = {
  index: {
    latest: '2026-03-22',
    files: ['2026-03-20', '2026-03-21', '2026-03-22']
  },
  daily: {
    '2026-03-20': {
      date: '2026-03-20',
      summary: {
        headline: '權值股整理，資金回流高股息 ETF',
        marketBias: 'neutral',
        overview: '市場進入財報前觀望期，資金偏向穩健防禦與高息族群，短線追價意願偏低。',
        tags: ['高股息', '防禦輪動', '量縮'],
        metrics: { weightedIndexChangePct: -0.28, breadthPct: 44, etfSignals: 3, stockSignals: 3 }
      },
      etfs: [
        { symbol: '0056', name: '元大高股息', action: 'watch', trendScore: 71, priceChangePct: 0.8, note: '量能穩定，適合防守型配置' },
        { symbol: '00878', name: '國泰永續高股息', action: 'watch', trendScore: 69, priceChangePct: 0.5, note: '月線附近有支撐' },
        { symbol: '006208', name: '富邦台50', action: 'hold', trendScore: 58, priceChangePct: -0.3, note: '權值股整理期，先觀察' }
      ],
      stocks: [
        { symbol: '2330', name: '台積電', action: 'hold', trendScore: 57, priceChangePct: -0.4, note: '千元附近震盪，等待法人表態' },
        { symbol: '2454', name: '聯發科', action: 'watch', trendScore: 65, priceChangePct: 0.6, note: '季線附近整理，有反彈機會' },
        { symbol: '2303', name: '聯電', action: 'avoid', trendScore: 41, priceChangePct: -1.2, note: '短線弱勢未扭轉' }
      ]
    },
    '2026-03-21': {
      date: '2026-03-21',
      summary: {
        headline: '半導體回穩，ETF 與大型權值同步轉強',
        marketBias: 'positive',
        overview: '買盤回流大型股，市場風險偏好略有升溫，ETF 與權值股表現同步改善。',
        tags: ['半導體反彈', '權值止穩', '風險偏好升溫'],
        metrics: { weightedIndexChangePct: 0.62, breadthPct: 56, etfSignals: 3, stockSignals: 3 }
      },
      etfs: [
        { symbol: '0050', name: '元大台灣50', action: 'watch', trendScore: 74, priceChangePct: 1.0, note: '指數型 ETF 轉強' },
        { symbol: '0056', name: '元大高股息', action: 'hold', trendScore: 68, priceChangePct: 0.2, note: '穩定但彈性不如市值型' },
        { symbol: '00919', name: '群益台灣精選高息', action: 'watch', trendScore: 72, priceChangePct: 0.7, note: '人氣續強' }
      ],
      stocks: [
        { symbol: '2330', name: '台積電', action: 'watch', trendScore: 70, priceChangePct: 1.1, note: 'ADR 帶動信心回升' },
        { symbol: '2382', name: '廣達', action: 'watch', trendScore: 67, priceChangePct: 0.9, note: 'AI 題材維持熱度' },
        { symbol: '2603', name: '長榮', action: 'hold', trendScore: 55, priceChangePct: 0.1, note: '運價題材需再觀察' }
      ]
    },
    '2026-03-22': {
      date: '2026-03-22',
      summary: {
        headline: '台股高檔震盪，資金聚焦高息 ETF 與 AI 權值股',
        marketBias: 'positive',
        overview: '加權指數維持高檔整理，成交量略縮。資金一邊回防高股息 ETF，一邊集中在具題材的半導體與伺服器族群。短線適合看強不追高。',
        tags: ['高檔震盪', 'AI 權值股', '高股息回流'],
        metrics: { weightedIndexChangePct: 0.84, breadthPct: 61, etfSignals: 4, stockSignals: 4 }
      },
      etfs: [
        { symbol: '0050', name: '元大台灣50', action: 'watch', trendScore: 78, priceChangePct: 1.2, note: '權值股回穩，適合追蹤大盤強度' },
        { symbol: '0056', name: '元大高股息', action: 'watch', trendScore: 76, priceChangePct: 0.9, note: '高息買盤回流，波動相對溫和' },
        { symbol: '00878', name: '國泰永續高股息', action: 'hold', trendScore: 66, priceChangePct: 0.4, note: '月線之上整理，續抱可' },
        { symbol: '00919', name: '群益台灣精選高息', action: 'watch', trendScore: 73, priceChangePct: 0.8, note: '人氣與量能維持' }
      ],
      stocks: [
        { symbol: '2330', name: '台積電', action: 'watch', trendScore: 81, priceChangePct: 1.5, note: '高階製程與 AI 題材續強' },
        { symbol: '2382', name: '廣達', action: 'watch', trendScore: 77, priceChangePct: 1.9, note: '伺服器族群續強，短線仍有量價優勢' },
        { symbol: '3017', name: '奇鋐', action: 'hold', trendScore: 64, priceChangePct: 0.3, note: '散熱族群高檔震盪，等待再突破' },
        { symbol: '2308', name: '台達電', action: 'hold', trendScore: 62, priceChangePct: -0.2, note: '漲多後整理，觀察支撐' }
      ]
    }
  }
};

const state = { manifest: null, dataset: {}, currentDate: null, compareDate: null, mode: 'fallback' };

async function safeFetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Fetch failed: ${url}`);
  return response.json();
}

function fmtPct(value) {
  const n = Number(value ?? 0);
  const cls = n > 0 ? 'pos' : n < 0 ? 'neg' : 'neu';
  const sign = n > 0 ? '+' : '';
  return `<span class="${cls}">${sign}${n.toFixed(2)}%</span>`;
}

function badgeLabel(action) {
  return action === 'watch' ? '觀察' : action === 'hold' ? '續抱/觀望' : action === 'avoid' ? '避開' : action;
}

function sentimentLabel(bias) {
  return bias === 'positive' ? '偏多' : bias === 'negative' ? '偏空' : '震盪';
}

function renderMetrics(metrics, bias) {
  const items = [
    ['市場傾向', sentimentLabel(bias)],
    ['加權漲跌', `${metrics.weightedIndexChangePct > 0 ? '+' : ''}${metrics.weightedIndexChangePct.toFixed(2)}%`],
    ['上漲家數比', `${metrics.breadthPct}%`],
    ['ETF 訊號數', `${metrics.etfSignals}`],
    ['個股訊號數', `${metrics.stockSignals}`]
  ];
  document.getElementById('metrics').innerHTML = items.map(([label, value]) => `
    <div class="stat">
      <span class="label">${label}</span>
      <span class="value">${value}</span>
    </div>
  `).join('');
}

function renderTable(items, mountId) {
  const html = `
    <table>
      <thead>
        <tr>
          <th>代碼</th>
          <th>名稱</th>
          <th>建議</th>
          <th>分數</th>
          <th>漲跌</th>
          <th>備註</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.symbol}</td>
            <td>${item.name}</td>
            <td><span class="chip">${badgeLabel(item.action)}</span></td>
            <td>${item.trendScore}</td>
            <td>${fmtPct(item.priceChangePct)}</td>
            <td>${item.note}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  document.getElementById(mountId).innerHTML = html;
}

function compareSets(currentItems, previousItems) {
  const prevMap = new Map(previousItems.map(item => [item.symbol, item]));
  const added = [];
  const removed = [];
  const changed = [];

  currentItems.forEach(item => {
    const prev = prevMap.get(item.symbol);
    if (!prev) {
      added.push(item.symbol);
      return;
    }
    if (prev.action !== item.action || prev.trendScore !== item.trendScore) {
      changed.push(`${item.symbol} ${badgeLabel(prev.action)} → ${badgeLabel(item.action)} / ${prev.trendScore} → ${item.trendScore}`);
    }
    prevMap.delete(item.symbol);
  });
  prevMap.forEach((_, symbol) => removed.push(symbol));
  return { added, removed, changed };
}

function renderComparison(current, previous) {
  const panel = document.getElementById('comparisonPanel');
  if (!previous) {
    panel.innerHTML = '<div class="compare-item">目前沒有更早的歷史資料可比較。</div>';
    return;
  }
  const etfDiff = compareSets(current.etfs, previous.etfs);
  const stockDiff = compareSets(current.stocks, previous.stocks);
  const metricsDiff = current.summary.metrics.weightedIndexChangePct - previous.summary.metrics.weightedIndexChangePct;

  panel.innerHTML = [
    `<div class="compare-item"><strong>摘要變化</strong><br>${previous.date} → ${current.date}<br>加權漲跌差：${metricsDiff > 0 ? '+' : ''}${metricsDiff.toFixed(2)}%</div>`,
    `<div class="compare-item"><strong>ETF 變化</strong><br>新增：${etfDiff.added.join('、') || '無'}<br>移除：${etfDiff.removed.join('、') || '無'}<br>調整：${etfDiff.changed.join('<br>') || '無'}</div>`,
    `<div class="compare-item"><strong>個股變化</strong><br>新增：${stockDiff.added.join('、') || '無'}<br>移除：${stockDiff.removed.join('、') || '無'}<br>調整：${stockDiff.changed.join('<br>') || '無'}</div>`
  ].join('');
}

function populateSelect(selectId, dates, selected) {
  const select = document.getElementById(selectId);
  select.innerHTML = dates.map(date => `<option value="${date}" ${date === selected ? 'selected' : ''}>${date}</option>`).join('');
}

function render(date) {
  const current = state.dataset[date];
  const compareDate = state.compareDate && state.dataset[state.compareDate] ? state.compareDate : null;
  const previous = compareDate ? state.dataset[compareDate] : null;
  state.currentDate = date;

  document.getElementById('currentDate').textContent = current.date;
  document.getElementById('historyCount').textContent = Object.keys(state.dataset).length;
  document.getElementById('dataMode').textContent = state.mode;
  document.getElementById('marketHeadline').textContent = current.summary.headline;
  document.getElementById('marketSummary').textContent = current.summary.overview;
  document.getElementById('marketTags').innerHTML = current.summary.tags.map(tag => `<span class="chip">${tag}</span>`).join('');
  document.getElementById('etfCount').textContent = current.etfs.length;
  document.getElementById('stockCount').textContent = current.stocks.length;

  renderMetrics(current.summary.metrics, current.summary.marketBias);
  renderTable(current.etfs, 'etfTable');
  renderTable(current.stocks, 'stockTable');
  renderComparison(current, previous);
}

async function loadData() {
  try {
    const manifest = await safeFetchJson('./data/index.json');
    const pairs = await Promise.all(manifest.files.map(async date => [date, await safeFetchJson(`./data/daily/${date}.json`)]));
    state.manifest = manifest;
    state.dataset = Object.fromEntries(pairs);
    state.mode = 'live-json';
  } catch (error) {
    console.warn('Using fallback data:', error.message);
    state.manifest = fallbackData.index;
    state.dataset = fallbackData.daily;
    state.mode = 'fallback';
  }

  const dates = [...state.manifest.files].sort();
  const latest = state.manifest.latest || dates[dates.length - 1];
  const compareDefault = dates.length > 1 ? dates[dates.length - 2] : dates[0];
  state.currentDate = latest;
  state.compareDate = compareDefault === latest && dates.length > 1 ? dates[0] : compareDefault;

  populateSelect('dateSelect', dates.slice().reverse(), state.currentDate);
  populateSelect('compareSelect', dates.slice().reverse(), state.compareDate);
  render(state.currentDate);
}

document.getElementById('dateSelect')?.addEventListener('change', event => {
  render(event.target.value);
});

document.getElementById('compareSelect')?.addEventListener('change', event => {
  state.compareDate = event.target.value;
  render(state.currentDate);
});

document.getElementById('reloadBtn')?.addEventListener('click', loadData);

loadData();
