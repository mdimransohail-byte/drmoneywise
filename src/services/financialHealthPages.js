/* ════════════════════════════════════════════════════════════════════════
   /health-check — the Financial Health Check for every company we cover,
   ranked, grouped by industry, with the scoring rules. Free (good for
   search: "is Coca-Cola financially healthy" etc.). Each row links to the
   company page with the full check. Premium members also see each
   company's industry ranking on its own page (public/healthrank.js).
   ════════════════════════════════════════════════════════════════════════ */

import { readCompanies } from './dataEngine.js';
import { HEALTH_RULES, RATING_BANDS, financialHealth, groupOf, starsHtml } from './financialHealthService.js';
import { buildHeadTags, pageShell } from './seoService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const KEYS = ['growth', 'profit', 'record', 'debt', 'cash', 'balance', 'dividend'];
const SHORT = { growth: 'Growth', profit: 'Profit', record: 'Record', debt: 'Debt', cash: 'Cash', balance: 'Balance', dividend: 'Dividend' };

function dots(h) {
  return KEYS.map((k) => {
    const x = h.checks.find((c) => c.key === k);
    const p = x?.points;
    const col = p === null || p === undefined ? '#ddd5c2' : p >= 8 ? '#1baf7a' : p >= 5 ? '#e8a33d' : '#e5566f';
    return `<span class="fh-dot" style="background:${col}" title="${esc(SHORT[k])}: ${p === null || p === undefined ? 'not scored' : `${p}/10`}"></span>`;
  }).join('');
}

export async function renderHealthCheckIndex(origin) {
  const { companies, updatedAt } = await readCompanies();
  const rows = Object.values(companies || {}).filter((c) => c?.ticker)
    .map((c) => ({ c, h: financialHealth(c), g: groupOf(c) }))
    .filter((r) => r.h && r.h.score !== null)
    .sort((a, b) => b.h.score - a.h.score);
  const counts = RATING_BANDS.map((b) => ({ ...b, n: rows.filter((r) => r.h.band.id === b.id).length }));
  const groups = [...new Map(rows.filter((r) => r.g).map((r) => [r.g.id, r.g.name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const head = buildHeadTags({
    title: 'Financial Health Check: scores for every company we cover | Dr MoneyWise',
    description: `Is a company financially healthy? ${rows.length} companies scored out of 100 on growth, profit, debt, spare cash, balance sheet and dividends, from official figures. Free and explained simply.`,
    canonical: `${origin}/health-check`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Financial Health Check: company scores',
      numberOfItems: rows.length,
      itemListElement: rows.slice(0, 50).map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: `${origin}/stock/${encodeURIComponent(r.c.ticker)}`, name: r.c.displayName || r.c.name })),
    },
  });
  const table = rows.map((r, i) => `
          <tr data-group="${esc(r.g?.id || '')}" data-band="${esc(r.h.band.id)}">
            <td class="fh-n">${i + 1}</td>
            <td><a href="/stock/${encodeURIComponent(r.c.ticker)}#healthCheck"><strong>${esc(r.c.displayName || r.c.name)}</strong> <span class="pick-ticker">${esc(r.c.ticker)}</span></a><small>${esc(r.g?.name || r.c.industry || '')}</small></td>
            <td><span class="fh-pill" style="--c:${r.h.band.colour}">${r.h.score}</span></td>
            <td>${starsHtml(r.h.stars, 15)}<small>${esc(r.h.band.label)}</small></td>
            <td class="fh-dots">${dots(r.h)}</td>
          </tr>`).join('');
  const body = `
      <section class="block fh-page">
        <div class="fh-hero">
          <div>
            <span class="pf-badge">Free</span>
            <h1>Financial Health Check</h1>
            <p>Is a company in good financial shape? We score every company we cover out of 100, using seven simple checks on its official figures: growth, profit, track record, debt, spare cash, balance sheet and dividend. ${rows.length} companies so far${updatedAt ? `, figures checked ${esc(updatedAt.slice(0, 10))}` : ''}.</p>
          </div>
          <div class="fh-bands">${counts.map((b) => `<div style="--c:${b.colour}"><strong>${b.n}</strong><span>${esc(b.label)}</span></div>`).join('')}</div>
        </div>

        <div class="fh-filters">
          <label>Industry <select id="fhGroup"><option value="">All industries</option>${groups.map(([id, n]) => `<option value="${esc(id)}">${esc(n)}</option>`).join('')}</select></label>
          <label>Rating <select id="fhBand"><option value="">All ratings</option>${RATING_BANDS.map((b) => `<option value="${b.id}">${esc(b.label)}</option>`).join('')}</select></label>
          <span class="fh-key"><span class="fh-dot" style="background:#1baf7a"></span>Good <span class="fh-dot" style="background:#e8a33d"></span>Okay <span class="fh-dot" style="background:#e5566f"></span>Weak <span class="fh-dot" style="background:#ddd5c2"></span>Not scored · dots in order: ${KEYS.map((k) => SHORT[k]).join(', ')}</span>
        </div>
        ${rows.length ? `<div class="table-scroll"><table class="fh-table">
          <thead><tr><th>#</th><th>Company</th><th>Score</th><th>Rating</th><th>The seven checks</th></tr></thead>
          <tbody id="fhBody">${table}</tbody></table></div>` : '<p class="note-box">Company figures are being collected. Scores appear here after the next update.</p>'}

        <div class="fh-how-box">
          <h2>How we score</h2>
          <div class="fh-rules">${HEALTH_RULES.map(([k, v], i) => `<div class="fh-rule" style="--c:${['#1baf7a', '#2a78d6', '#e8a33d', '#6250d6', '#0fa3b1', '#e5566f', '#c9a227'][i]}"><strong>${i + 1}. ${esc(k)}</strong><span>${esc(v)}</span></div>`).join('')}
            <div class="fh-rule" style="--c:#0a1128"><strong>The overall score</strong><span>The average of the checks we can work out, times ten; a company needs at least four. Stars: the score divided by 20, to the nearest half. 80+ Excellent, 65+ Strong, 50+ Fair, 35+ Weak, under 35 Poor.</span></div></div>
          <p class="note-box">A health score describes a company’s finances from its official reports. It says nothing about whether the share price is cheap or expensive, and it is not advice to buy or sell. Learn more in <a href="/learn/intermediate">the Knights course</a>.</p>
        </div>
        <a class="ax-promo prem" href="/membership"><span class="ax-crown" aria-hidden="true"><svg viewBox="0 0 24 24" width="60%" height="60%"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#0a1128"/></svg></span><span><b>Premium: the Health Check in full</b>See where each company ranks in its industry, check by check against the industry average, plus the health check for your own portfolio.</span></a>
      </section>
      <script>
        (function () {
          var g = document.getElementById('fhGroup'), b = document.getElementById('fhBand');
          function run() { document.querySelectorAll('#fhBody tr').forEach(function (tr) { tr.hidden = (g.value && tr.dataset.group !== g.value) || (b.value && tr.dataset.band !== b.value); }); }
          if (g) { g.addEventListener('change', run); b.addEventListener('change', run); }
        })();
      </script>`;
  return pageShell({ head, body, active: 'markets' });
}

export function healthSitemapEntries(origin) {
  return [{ loc: `${origin}/health-check`, lastmod: new Date().toISOString().slice(0, 10), priority: '0.8' }];
}
