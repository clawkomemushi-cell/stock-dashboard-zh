function renderDailyBriefPage() {
  const mount = document.getElementById('dailyBriefList');
  if (!mount) return;
  mount.innerHTML = REPORT_LIBRARY.dailyBriefs.map(item => `
    <article class="card report-card">
      <div class="section-head">
        <div>
          <span class="label">${item.date}</span>
          <h3>${item.title}</h3>
        </div>
        <div class="chips">${item.tags.map(tag => `<span class="chip">${tag}</span>`).join('')}</div>
      </div>
      <p class="report-summary">${item.summary}</p>
      <ul class="help-list report-list">
        ${item.bullets.map(point => `<li>${point}</li>`).join('')}
      </ul>
      <div class="compare-item"><strong>今天比較適合怎麼做</strong><br>${item.action}</div>
    </article>
  `).join('');
}

function renderMarketFocusPage() {
  const data = REPORT_LIBRARY.marketFocus;
  const checklist = document.getElementById('marketChecklist');
  const spotlight = document.getElementById('marketSpotlight');
  const note = document.getElementById('marketCloseNote');
  if (checklist) {
    checklist.innerHTML = data.checklist.map(item => `
      <article class="card mini-card">
        <span class="label">先看這個</span>
        <h3>${item.title}</h3>
        <p>${item.detail}</p>
      </article>
    `).join('');
  }
  if (spotlight) {
    spotlight.innerHTML = data.spotlight.map(item => `
      <div class="compare-item tone-${item.tone}">
        <strong>${item.name}</strong><br>${item.note}
      </div>
    `).join('');
  }
  if (note) {
    note.innerHTML = `<div class="compare-item"><strong>收尾提醒</strong><br>${data.closeNote}</div>`;
  }
  const headline = document.getElementById('marketFocusHeadline');
  if (headline) headline.textContent = data.headline;
}

document.addEventListener('DOMContentLoaded', () => {
  renderDailyBriefPage();
  renderMarketFocusPage();
  renderLearningLabPage();
});
