const SITE_NAV_ITEMS = [
  { href: './index.html', label: '首頁總覽', match: ['index.html', '/'] },
  { href: './daily-brief.html', label: '日報中心', match: ['daily-brief.html'] },
  { href: './market-focus.html', label: '今日股市', match: ['market-focus.html'] },
  { href: './learning-lab.html', label: '股票學習', match: ['learning-lab.html'] },
  { href: './trade-center.html', label: '交易紀錄', match: ['trade-center.html'] }
];

const REPORT_LIBRARY = {
  latestDate: '2026-03-23',
  dailyBriefs: [
    {
      date: '2026-03-23',
      title: '午間重點：跌深有收斂，但今天仍先用防守節奏看盤',
      summary: '台股早盤一度重挫逾千點，午盤前跌點雖有收斂，但整體還是風險偏高的一天。今天不是證明自己敢抄底的日子，比較像練習怎麼在大震盪裡守住節奏。',
      tags: ['午間整理', '跌深收斂', '高股息承接'],
      bullets: [
        '今天一句話：跌很深不等於馬上變便宜，先看撐住，再決定要不要小量分批。',
        '今天我注意的 ETF：0050、006208、0056、00878、00919。大盤型先看權值有沒有穩，高股息型先看承接有沒有續航。',
        '今天我注意的個股：2330、2303、2382、2884；另外把 2408 列為高波動避開觀察，把 3131 列為逆勢強但不建議新追。',
        '依照米蟲預算比較能考慮：下午零股若想小量參與，ETF 可先看 00878、0056、00919，其次是 006208；個股則 2303、2884 比較適合新手觀察。',
        '和前一天比，今天盤勢明顯從晨間的震盪保守，升級成早盤恐慌後的防守盤；高股息 ETF 的相對抗跌性比權值電子更突出。'
      ],
      action: '今天比較適合怎麼做：偏觀望、偏分批、偏零股、偏 ETF。若下午還是沒有明顯止穩訊號，就把重點放在觀察，不用硬做。'
    },
    {
      date: '2026-03-22',
      title: '晚間整理：高檔震盪下，先把「想買」跟「適合買」分開',
      summary: '市場氣氛不差，但越是這種時候，越容易讓人把熱門股誤認成低風險。對新手來說，能看懂的機會比看起來很帥的機會更重要。',
      tags: ['晚間整理', '高檔震盪', '新手節奏'],
      bullets: [
        '加權指數維持高檔，但量縮代表追價意願沒有全面開。',
        '高股息 ETF 仍值得放在前排觀察名單。',
        '熱門 AI 股能看，但不要因為 FOMO 就進場。'
      ],
      action: '先保留現金彈性，比一次押滿更重要。'
    }
  ],
  marketFocus: {
    date: '2026-03-23',
    headline: '今天先看三件事：台積電 1800 附近有沒有站穩、高股息 ETF 承接有沒有延續、記憶體與高波動股能不能先別碰',
    checklist: [
      { title: '今天一句話', detail: '今天有收斂，不代表今天安全。能慢慢做的盤，就不要急著帥。' },
      { title: '今天我注意的 ETF', detail: '0050 / 006208 看權值回穩，0056 / 00878 / 00919 看高股息資金承接。' },
      { title: '今天我注意的個股', detail: '2330 看電子風向，2303 與 2884 看較親民的零股選項，2382 只觀察不追，2408 與高波動強勢股先保守。' }
    ],
    spotlight: [
      { name: '依照米蟲預算比較能考慮', note: '若想用壓力較低方式參與，ETF 可優先看 00878、0056、00919、006208；個股先看 2303、2884 這種比較好理解、價格相對友善的標的。', tone: 'safe' },
      { name: '今天比較適合怎麼做', note: '下午零股交易以小量分批為主，先確認大盤沒有再擴大跌勢、高股息 ETF 沒有轉弱，再考慮慢慢買。若還是反覆震盪，就偏觀望。', tone: 'watch' },
      { name: '今天要特別避開', note: '記憶體、追價型強勢股、高價設備股，以及一早大跌後突然急拉但量價不穩的標的，都不適合新手硬追。', tone: 'risk' }
    ],
    closeNote: '今天若你看完還是不確定，那真的很正常。這種盤先少做一點，不是錯過，是保護自己。'
  },
  learningLab: {
    date: '2026-03-23',
    modules: [
      {
        title: '為什麼今天高股息 ETF 比熱門股更值得先看？',
        summary: '因為今天市場是先殺情緒，再看誰有承接。高股息 ETF 雖然也跌，但波動通常比單一熱門股小，對新手更容易執行分批。',
        takeaways: ['先求買得下去、抱得住，再求買得漂亮。', '成交量放大不一定是壞事，但要看是不是有人願意接。']
      },
      {
        title: '跌深收斂是不是就能直接抄底？',
        summary: '不一定。跌深收斂只能代表恐慌稍微降溫，不能自動等於趨勢反轉。要先看權值、量能、族群有沒有一起穩。',
        takeaways: ['收斂是觀察訊號，不是無腦買進訊號。', '如果你只能接受一點點錯，那就用一點點部位。']
      },
      {
        title: '下午零股最該練的是什麼？',
        summary: '練習把買進理由說清楚：因為高股息承接、因為權值止穩、因為價格適合分批，而不是因為跌很多看起來便宜。',
        takeaways: ['新手不是不能買，而是不要亂追。', '能重複做、做了睡得著的操作，才比較有機會長久。']
      }
    ]
  }
};

function renderSiteNav(activeLabel) {
  const nav = document.getElementById('siteNav');
  if (!nav) return;
  nav.innerHTML = SITE_NAV_ITEMS.map(item => {
    const active = item.label === activeLabel;
    return `<a class="site-tab ${active ? 'active' : ''}" href="${item.href}">${item.label}</a>`;
  }).join('');
}

function renderSharedHeroMeta() {
  const nodes = document.querySelectorAll('[data-latest-date]');
  nodes.forEach(node => { node.textContent = REPORT_LIBRARY.latestDate; });
}

document.addEventListener('DOMContentLoaded', () => {
  renderSharedHeroMeta();
});
