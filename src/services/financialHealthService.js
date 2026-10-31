/* ════════════════════════════════════════════════════════════════════════
   FINANCIAL HEALTH CHECK — a score out of 100 and a star rating for any
   company with official SEC figures, from seven simple checks.
   ───────────────────────────────────────────────────────────────────────
   Each check gives 0-10 points. The overall score is the average of the
   checks we can work out, times ten. A company needs at least four checks
   to get a score. Rules are fixed and shown on every page ("How we score"),
   so the score always matches the numbers.
     1 Growth          sales this year vs last year
     2 Profit          how many cents of each $1 of sales is kept as profit
     3 Track record    profitable years out of the last five
     4 Debt            years of operating cash needed to repay long-term debt
     5 Spare cash      free cash flow as a share of sales
     6 Balance sheet   what it owes against what it owns
     7 Dividend        covered by spare cash, and years of rises (only if it pays one)
   Banks and insurers: checks 4 and 6 are left out, because borrowing and
   holding customers' money is how they do business.
   This describes the company's finances. It is NOT advice to buy or sell.
   ════════════════════════════════════════════════════════════════════════ */

import { formatMoney, formatPercent } from './reportCardService.js';
import { sectorOf } from '../data/sectorLeaders.js';

export const HEALTH_RULES = [
  ['Growth', 'Sales up more than 10% on the year before: 10 points. 5–10%: 8. 0–5%: 6. Down by up to 5%: 3. Down more: 1.'],
  ['Profit', 'Keeps more than 20 cents of every $1 of sales as profit: 10. 10–20 cents: 8. 5–10: 6. 0–5: 4. A loss: 1.'],
  ['Track record', 'Profitable in 5 of the last 5 years: 10. 4 years: 8. 3: 5. 2: 3. Fewer: 1.'],
  ['Debt', 'No long-term debt, or could repay it with under 1 year of cash from its business: 10. Under 3 years: 8. 3–6 years: 5. More: 2. No cash coming in to repay it: 1. (Not scored for banks and insurers.)'],
  ['Spare cash', 'Free cash flow (cash left after running and investing in the business) above 15% of sales: 10. 5–15%: 8. 0–5%: 5. Negative: 1.'],
  ['Balance sheet', 'Owes less than 40% of what it owns: 10. 40–60%: 8. 60–80%: 5. 80–100%: 3. Owes more than it owns: 1. (Not scored for banks and insurers.)'],
  ['Dividend', 'Raised for 10+ years in a row and paid for by spare cash: 10. Paid for by spare cash: 7. Paid out more than its spare cash: 3. No dividend: not scored, so it doesn’t count against the company.'],
];

export const RATING_BANDS = [
  { min: 80, id: 'excellent', label: 'Excellent', colour: '#12814f' },
  { min: 65, id: 'strong', label: 'Strong', colour: '#1baf7a' },
  { min: 50, id: 'fair', label: 'Fair', colour: '#e8a33d' },
  { min: 35, id: 'weak', label: 'Weak', colour: '#e5713a' },
  { min: 0, id: 'poor', label: 'Poor', colour: '#d64045' },
];
export const bandOf = (score) => (score === null ? { id: 'none', label: 'Not enough data', colour: '#8a8576' } : RATING_BANDS.find((b) => score >= b.min));
export const starsOf = (score) => (score === null ? 0 : Math.max(0.5, Math.round((score / 20) * 2) / 2));

const last = (s) => s?.at?.(-1)?.value ?? null;
const isFinancial = (c) => sectorOf(c.ticker)?.id === 'financials'
  || /\b(bank|banc|insurance|savings institution|credit|finance services|security brokers|investment advice)\b/iu.test(c.industry || '');

function check(key, label, points, plain, value = '') {
  return { key, label, points, plain, value, grade: points === null ? 'none' : points >= 8 ? 'good' : points >= 5 ? 'okay' : 'weak' };
}

/** { score, stars, band, checks[], scored, headline } for one company. */
export function financialHealth(c) {
  if (!c) return null;
  const d = c.derived || {};
  const checks = [];
  const fin = isFinancial(c);

  // 1 Growth
  const g = d.revenueGrowth;
  checks.push(g === null || g === undefined
    ? check('growth', 'Growth', null, 'Not scored: no sales figure we can compare.')
    : check('growth', 'Growth', g > 0.10 ? 10 : g > 0.05 ? 8 : g >= 0 ? 6 : g >= -0.05 ? 3 : 1,
      g >= 0 ? `Sales grew ${formatPercent(g)} last year.` : `Sales fell ${formatPercent(Math.abs(g))} last year.`, formatPercent(g)));

  // 2 Profit
  const m = d.profitMargin;
  checks.push(m === null || m === undefined
    ? check('profit', 'Profit', null, 'Not scored: no profit figure in a standard form.')
    : check('profit', 'Profit', m > 0.20 ? 10 : m > 0.10 ? 8 : m > 0.05 ? 6 : m >= 0 ? 4 : 1,
      m >= 0 ? `Keeps about ${Math.round(m * 100)} cents of every $1 of sales.` : `Made a loss of ${formatMoney(Math.abs(last(c.netIncome) || 0))}.`, `${Math.round(m * 100)}¢ per $1`));

  // 3 Track record
  const years = (c.netIncome || []).slice(-5);
  if (years.length >= 3) {
    const good = years.filter((y) => y.value > 0).length;
    const scaled = Math.round((good / years.length) * 5);
    checks.push(check('record', 'Track record', [1, 1, 3, 5, 8, 10][scaled], `Made a profit in ${good} of the last ${years.length} years.`, `${good} of ${years.length}`));
  } else checks.push(check('record', 'Track record', null, 'Not scored: fewer than three years of figures.'));

  // 4 Debt
  const ocf = last(c.operatingCashFlow);
  if (fin) checks.push(check('debt', 'Debt', null, 'Not scored for banks and insurers: borrowing is part of how they do business.'));
  else if (c.longTermDebt === 0 || (c.longTermDebt !== null && c.longTermDebt !== undefined && c.longTermDebt <= 0)) checks.push(check('debt', 'Debt', 10, 'No long-term debt.', 'None'));
  else if (c.longTermDebt && ocf !== null) {
    const y = ocf > 0 ? c.longTermDebt / ocf : Infinity;
    checks.push(check('debt', 'Debt', y === Infinity ? 1 : y < 1 ? 10 : y < 3 ? 8 : y <= 6 ? 5 : 2,
      y === Infinity ? `Owes ${formatMoney(c.longTermDebt)} with no cash coming in from its business to repay it.` : `Owes ${formatMoney(c.longTermDebt)}: about ${y.toFixed(1)} years of the cash its business brings in.`, y === Infinity ? '—' : `${y.toFixed(1)} yrs`));
  } else checks.push(check('debt', 'Debt', null, 'Not scored: debt is not reported in a standard form.'));

  // 5 Spare cash
  const rev = last(c.revenue);
  if (d.freeCashFlow !== null && d.freeCashFlow !== undefined && rev > 0) {
    const f = d.freeCashFlow / rev;
    checks.push(check('cash', 'Spare cash', f > 0.15 ? 10 : f > 0.05 ? 8 : f >= 0 ? 5 : 1,
      d.freeCashFlow >= 0 ? `${formatMoney(d.freeCashFlow)} spare cash last year, ${Math.round(f * 100)}% of sales.` : `Spent ${formatMoney(Math.abs(d.freeCashFlow))} more than it brought in.`, `${Math.round(f * 100)}% of sales`));
  } else checks.push(check('cash', 'Spare cash', null, 'Not scored: cash flow figures are missing.'));

  // 6 Balance sheet
  if (fin) checks.push(check('balance', 'Balance sheet', null, 'Not scored for banks and insurers: holding customers’ money makes what they owe look large.'));
  else if (c.totalAssets > 0 && c.totalLiabilities !== null && c.totalLiabilities !== undefined) {
    const r = c.totalLiabilities / c.totalAssets;
    checks.push(check('balance', 'Balance sheet', r < 0.4 ? 10 : r < 0.6 ? 8 : r < 0.8 ? 5 : r < 1 ? 3 : 1,
      r < 1 ? `Owes ${Math.round(r * 100)} cents for every $1 it owns.` : 'Owes more than everything it owns.', `${Math.round(r * 100)}%`));
  } else if (c.equity !== null && c.equity !== undefined && c.equity <= 0) {
    checks.push(check('balance', 'Balance sheet', 1, 'Owes more than everything it owns (negative shareholders’ equity).', 'Negative'));
  } else checks.push(check('balance', 'Balance sheet', null, 'Not scored: assets and debts are not reported in a standard form.'));

  // 7 Dividend
  const dps = d.latestDividendPerShare;
  if (dps > 0) {
    const raises = d.yearsOfDividendRaises || 0;
    const covered = d.dividendCoveredByCash !== false;
    checks.push(check('dividend', 'Dividend', raises >= 10 && covered ? 10 : covered ? 7 : 3,
      `Pays $${dps.toFixed(2)} a share${raises >= 2 ? `, raised ${raises} years in a row` : ''}.${covered ? ' Paid for by spare cash.' : ' Paid out more than its spare cash last year.'}`, raises >= 2 ? `${raises} yrs of rises` : 'Pays'));
  } else checks.push(check('dividend', 'Dividend', null, 'No dividend: not scored, so it doesn’t count against the company.', 'None'));

  const scored = checks.filter((x) => x.points !== null);
  const score = scored.length >= 4 ? Math.round((scored.reduce((n, x) => n + x.points, 0) / scored.length) * 10) : null;
  const band = bandOf(score);
  const best = [...scored].sort((a, b) => b.points - a.points)[0];
  const worst = [...scored].sort((a, b) => a.points - b.points)[0];
  const headline = score === null ? 'Not enough official figures to give a score.'
    : `${band.label} health. Strongest: ${best.label.toLowerCase()}${worst && worst.points < 5 ? `. Weakest: ${worst.label.toLowerCase()}` : ''}.`;
  return { score, stars: starsOf(score), band, checks, scored: scored.length, financial: fin, headline };
}

/* ── Drawing ───────────────────────────────────────────────────────── */
const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

export function starsHtml(stars, size = 18) {
  return `<span class="fh-stars" style="font-size:${size}px" aria-label="${stars} out of 5 stars">${[1, 2, 3, 4, 5].map((i) => `<span class="${stars >= i ? 'on' : stars >= i - 0.5 ? 'half' : ''}">★</span>`).join('')}</span>`;
}

/** Semicircle gauge 0-100. */
export function gaugeSvg(score, colour, size = 160) {
  const r = 60; const len = Math.PI * r;
  const v = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return `<svg class="fh-gauge" width="${size}" height="${size * 0.62}" viewBox="0 0 160 100" aria-hidden="true">
      <defs><linearGradient id="fhg" x1="0" x2="1"><stop offset="0" stop-color="#d64045"/><stop offset=".5" stop-color="#e8a33d"/><stop offset="1" stop-color="#12814f"/></linearGradient></defs>
      <path d="M20 85 A60 60 0 0 1 140 85" fill="none" stroke="#ece4d2" stroke-width="16" stroke-linecap="round"/>
      <path d="M20 85 A60 60 0 0 1 140 85" fill="none" stroke="url(#fhg)" stroke-width="16" stroke-linecap="round" stroke-dasharray="${(v * len).toFixed(1)} ${len.toFixed(1)}"/>
      <text x="80" y="78" text-anchor="middle" font-family="Public Sans, sans-serif" font-weight="800" font-size="34" fill="${colour}">${score === null ? '–' : score}</text>
      <text x="80" y="96" text-anchor="middle" font-family="Public Sans, sans-serif" font-size="11" fill="#4a5170">out of 100</text></svg>`;
}

/** The box on each company page. */
export function healthBoxHtml(c, name, { premiumSlot = true } = {}) {
  const h = financialHealth(c);
  if (!h) return '';
  const ticker = c.ticker;
  const rows = h.checks.map((x) => `
        <li class="fh-row ${x.grade}">
          <span class="fh-lab">${esc(x.label)}</span>
          <span class="fh-bar"><i style="width:${x.points === null ? 0 : x.points * 10}%"></i></span>
          <span class="fh-pts">${x.points === null ? 'n/a' : `${x.points}/10`}</span>
          <span class="fh-plain">${esc(x.plain)}</span>
        </li>`).join('');
  return `<section class="block fh-box" id="healthCheck" style="--c:${h.band.colour}">
        <div class="fh-top">
          <div class="fh-score">${gaugeSvg(h.score, h.band.colour)}${starsHtml(h.stars, 22)}<strong class="fh-band">${esc(h.band.label)}</strong></div>
          <div class="fh-intro">
            <span class="pf-badge">Free</span>
            <h2>Financial Health Check: ${esc(name)}</h2>
            <p class="fh-head">${esc(h.headline)}</p>
            <p>Seven simple checks on ${esc(name)}’s official figures, each scored out of 10. ${h.scored < 7 ? (7 - h.scored === 1 ? 'One check could not be scored, so it is left out rather than counted against the company.' : `${7 - h.scored} checks could not be scored, so they are left out rather than counted against the company.`) : ''}</p>
          </div>
        </div>
        <ul class="fh-list">${rows}</ul>
        ${premiumSlot ? `<div class="fh-rank" data-health-rank="${esc(ticker)}"><span class="ax-crown" aria-hidden="true"><svg viewBox="0 0 24 24" width="60%" height="60%"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#0a1128"/></svg></span><div><b>How does ${esc(name)} rank in its industry?</b><span>Premium members see its place among similar companies, check by check.</span></div><a class="pill-gold" href="/membership">See Premium</a></div>` : ''}
        <details class="fh-how"><summary>How we score</summary><ul>${HEALTH_RULES.map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join('')}</ul>
          <p>Overall score: the average of the checks we can work out, times ten. Stars: the score divided by 20, to the nearest half star. 80+ Excellent, 65+ Strong, 50+ Fair, 35+ Weak, below 35 Poor. This describes the company’s finances from its official reports; it is not advice to buy or sell. <a href="/health-check">Compare all companies</a>.</p></details>
      </section>`;
}

/** Rank of each company within its group (sector, or industry when there's no sector). */
export function groupOf(c) {
  const s = sectorOf(c.ticker);
  return s ? { id: s.id, name: s.name } : c.industry ? { id: `ind:${c.industry}`, name: c.industry } : null;
}

export function industryRank(ticker, companies) {
  const all = Object.values(companies || {}).filter((c) => c?.ticker);
  const me = all.find((c) => c.ticker === ticker);
  if (!me) return null;
  const grp = groupOf(me);
  if (!grp) return null;
  const peers = all.filter((c) => groupOf(c)?.id === grp.id)
    .map((c) => ({ ticker: c.ticker, name: c.displayName || c.name, h: financialHealth(c) }))
    .filter((p) => p.h?.score !== null)
    .sort((a, b) => b.h.score - a.h.score);
  const pos = peers.findIndex((p) => p.ticker === ticker);
  if (pos < 0 || peers.length < 2) return { group: grp.name, position: null, of: peers.length, peers: [] };
  const avg = (key) => {
    const v = peers.map((p) => p.h.checks.find((x) => x.key === key)?.points).filter((x) => x !== null && x !== undefined);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };
  const mine = peers[pos].h;
  return {
    group: grp.name, position: pos + 1, of: peers.length,
    average: Math.round(peers.reduce((n, p) => n + p.h.score, 0) / peers.length),
    checks: mine.checks.map((x) => ({ label: x.label, points: x.points, average: avg(x.key) })),
    peers: peers.slice(0, 10).map((p) => ({ ticker: p.ticker, name: p.name, score: p.h.score, band: p.h.band.label })),
  };
}
