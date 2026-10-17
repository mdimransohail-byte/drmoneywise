/* ════════════════════════════════════════════════════════════════════════
   Members-only "Full financial results" on company pages.
   Free visitors keep the teaser. Signed-in paying members get the numbers,
   fetched from /api/stock/details (never part of the free page's HTML).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  const box = document.getElementById('membersFinancials');
  const content = document.getElementById('membersContent');
  if (!box || !content) return;

  let token = '';
  try {
    token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || '';
  } catch (e) { token = ''; }
  if (!token) return; // not signed in: keep the teaser

  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const money = (v) => {
    if (v === null || v === undefined) return '—';
    const a = Math.abs(v);
    const sign = v < 0 ? '−' : '';
    if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(2)}tn`;
    if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(1)}bn`;
    if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(0)}m`;
    return `${sign}$${a.toLocaleString('en-US')}`;
  };
  const perShare = (v) => (v === null || v === undefined ? '—' : `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(2)}`);
  const count = (v) => (v ? `${(v / 1e9 >= 1 ? (v / 1e9).toFixed(2) + 'bn' : (v / 1e6).toFixed(0) + 'm')}` : '—');
  const when = (iso) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

  function yearTable(d) {
    const lines = [
      ['Sales', 'revenue', money],
      ['Gross profit', 'grossProfit', money],
      ['Operating profit', 'operatingIncome', money],
      ['Net profit', 'netIncome', money],
      ['Earnings per share', 'eps', perShare],
      ['Cash from operations', 'operatingCashFlow', money],
      ['Investment spending', 'capex', money],
      ['Spare cash (free cash flow)', 'freeCashFlow', money],
      ['Dividend per share', 'dividendPerShare', perShare],
    ].filter(([, key]) => d.years.some((y) => y[key] !== null));
    const years = d.years.slice().reverse(); // newest first
    return `
      <h3>Year by year (newest first)</h3>
      <div class="table-scroll"><table class="members-table">
        <thead><tr><th>Figure</th>${years.map((y) => `<th class="num">${y.year}</th>`).join('')}</tr></thead>
        <tbody>${lines.map(([label, key, fmt]) => `<tr><th scope="row">${label}</th>${years.map((y) => `<td class="num">${fmt(y[key])}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`;
  }

  function quarterTable(q) {
    const ends = [...new Set([...(q.revenue || []), ...(q.netIncome || []), ...(q.eps || [])].map((r) => r.end))].sort().reverse().slice(0, 5);
    if (!ends.length) return '';
    const val = (series, end) => (series || []).find((r) => r.end === end)?.value ?? null;
    return `
      <h3>Latest quarters (three months to…)</h3>
      <div class="table-scroll"><table class="members-table">
        <thead><tr><th>Figure</th>${ends.map((e) => `<th class="num">${when(e)}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">Sales</th>${ends.map((e) => `<td class="num">${money(val(q.revenue, e))}</td>`).join('')}</tr>
          <tr><th scope="row">Net profit</th>${ends.map((e) => `<td class="num">${money(val(q.netIncome, e))}</td>`).join('')}</tr>
          <tr><th scope="row">Earnings per share</th>${ends.map((e) => `<td class="num">${perShare(val(q.eps, e))}</td>`).join('')}</tr>
        </tbody>
      </table></div>
      <p class="helper-note">Companies report their fourth quarter inside the yearly report, so it may not appear here.</p>`;
  }

  function balanceTable(b) {
    const rows = [
      ['Cash in the bank', money(b.cash)],
      ['Long-term debt', money(b.longTermDebt)],
      ['Everything it owns (total assets)', money(b.totalAssets)],
      ['Everything it owes (total liabilities)', money(b.totalLiabilities)],
      ["Owners' share (equity)", money(b.equity)],
      ['Shares in issue', count(b.sharesOutstanding)],
    ];
    return `
      <h3>What it owns and owes${b.asOf ? ` (as of ${when(b.asOf)})` : ''}</h3>
      <table class="fact-table members-balance">${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('')}</table>`;
  }

  fetch(`/api/stock/details?ticker=${encodeURIComponent(box.dataset.ticker)}`, { headers: { 'x-session-token': token } })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        const cta = content.querySelector('.members-cta');
        if (cta) cta.innerHTML = 'You are on the free plan. <a class="pill-gold" href="/#membership">Upgrade to see full results</a>';
        return;
      }
      if (!res.ok) return; // signed out or error: keep the teaser
      content.classList.remove('members-teaser');
      content.innerHTML = `${yearTable(data)}${quarterTable(data.quarters || {})}${balanceTable(data.balance || {})}
        <p class="helper-note">Source: ${esc(data.source)}. Negative numbers (losses, cash going out) show with a minus sign.</p>`;
    })
    .catch(() => { /* network problem: keep the teaser */ });
}());
