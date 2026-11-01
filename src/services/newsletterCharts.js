/* ════════════════════════════════════════════════════════════════════════
   NEWSLETTER CHARTS — pictures for the Saturday newsletter.
   Email apps can't run charts, so each one is drawn as a picture (PNG),
   saved in data/newsletter-charts/ and served at /newsletter-charts/<file>.
   Only our own saved figures are used; a chart is left out when its
   figures aren't there, so nothing is ever guessed.
     economyChart   the US economy in five numbers (latest and before)
     bigSevenChart  the market value of the seven biggest US tech companies
                    (shares in issue from SEC filings × the latest close)
     indexYtdChart  S&P 500 and Nasdaq 100 since 1 January (via the SPY and
                    QQQ funds that track them, from daily closes)
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'data', 'newsletter-charts');
const W = 1200;
const NAVY = '#0a1128'; const GOLD = '#c9a227'; const INK = '#1d2433'; const GREY = '#5a6478';
const COLS = ['#2a78d6', '#1baf7a', '#e8a33d', '#6250d6', '#e5566f', '#0fa3b1', '#eb6834'];
const x = (t) => String(t ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

function frame(h, title, sub, body, source) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}">
  <rect width="${W}" height="${h}" fill="#fbf7ef"/>
  <rect width="${W}" height="10" fill="${GOLD}"/>
  <text x="48" y="74" font-family="Libre Baskerville" font-weight="700" font-size="40" fill="${NAVY}">${x(title)}</text>
  <text x="48" y="116" font-family="Lato" font-size="24" fill="${GREY}">${x(sub)}</text>
  ${body}
  <text x="48" y="${h - 26}" font-family="Lato" font-size="19" fill="${GREY}">${x(source)}</text>
  <text x="${W - 48}" y="${h - 26}" font-family="Libre Baskerville" font-weight="700" font-size="22" fill="${GOLD}" text-anchor="end">Dr MoneyWise</text>
</svg>`;
}

async function save(name, svg) {
  const { svgToPng } = await import('./socialCardService.js');
  await fs.mkdir(DIR, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const file = `${day}-${name}.png`;
  await fs.writeFile(path.join(DIR, file), svgToPng(svg));
  // Keep about three months of pictures (old emails still show them)
  for (const f of await fs.readdir(DIR).catch(() => [])) {
    const d = f.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/u.test(d) && Date.now() - new Date(d).getTime() > 100 * 86400000) await fs.rm(path.join(DIR, f), { force: true }).catch(() => {});
  }
  return file;
}

export async function readChart(file) {
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.png$/u.test(file)) return null;
  return fs.readFile(path.join(DIR, file)).catch(() => null);
}

/* 1. The US economy in five numbers */
export async function economyChart() {
  const { readEconomy } = await import('./dataEngine.js');
  const raw = (await readEconomy()).figures || {};
  // Never show a figure that can't be a real percentage (same rule as the site)
  const f = Object.fromEntries(Object.entries(raw).filter(([, v]) => Number.isFinite(v?.value) && v.value > -30 && v.value < 50));
  const rows = [
    ['unemployment', 'Unemployment', 'Share of people looking for work'],
    ['inflation', 'Inflation', 'Prices compared with a year ago'],
    ['interestRate', 'Central bank rate', 'The Federal Reserve’s main rate'],
    ['tenYearYield', '10-year bond yield', 'What the government pays to borrow'],
    ['mortgageRate', '30-year mortgage', 'Average home-loan rate'],
  ].filter(([k]) => Number.isFinite(f[k]?.value));
  if (rows.length < 3) return null;
  // Rows of tiles with no gaps: 3 → [3], 4 → [2, 2], 5 → [3, 2]
  const lines = rows.length === 4 ? [2, 2] : rows.length === 5 ? [3, 2] : [rows.length];
  const th = 170; let k = 0; let tiles = '';
  lines.forEach((n, line) => {
    const tw = (W - 96 - (n - 1) * 20) / n;
    for (let j = 0; j < n; j += 1, k += 1) {
      const [key, label, note] = rows[k];
      const v = f[key].value; const p = f[key].previous;
      const col = COLS[k % COLS.length];
      const tx = 48 + j * (tw + 20); const ty = 150 + line * (th + 20);
      const diff = Number.isFinite(p) ? v - p : null;
      const change = diff === null || Math.abs(diff) < 0.005 ? 'no change' : `${diff > 0 ? 'up' : 'down'} ${Math.abs(diff).toFixed(2)} points`;
      const when = f[key].asOf ? new Date(f[key].asOf).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '';
      tiles += `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="16" fill="#ffffff" stroke="${col}" stroke-width="3"/>
      <rect x="${tx}" y="${ty}" width="${tw}" height="10" rx="5" fill="${col}"/>
      <text x="${tx + 22}" y="${ty + 50}" font-family="Lato" font-weight="700" font-size="24" fill="${INK}">${x(label)}</text>
      <text x="${tx + 22}" y="${ty + 108}" font-family="Lato" font-weight="900" font-size="52" fill="${col}">${v.toFixed(2).replace(/\.?0+$/u, '')}%</text>
      <text x="${tx + 22}" y="${ty + 140}" font-family="Lato" font-size="19" fill="${GREY}">${x(change)}${when ? ` · ${x(when)}` : ''}</text>
      <text x="${tx + 22}" y="${ty + 162}" font-family="Lato" font-size="16" fill="${GREY}">${x(note)}</text>`;
    }
  });
  const h = 150 + lines.length * (th + 20) + 50;
  const title = `The US economy in ${['', '', '', 'three', 'four', 'five'][rows.length]} numbers`;
  const svg = frame(h, title, 'The latest official figures, and the change from the one before', tiles, 'Sources: US Bureau of Labor Statistics, New York Fed, US Treasury, Freddie Mac');
  return { file: await save('economy', svg), title, text: `${[f.unemployment ? `Unemployment is ${f.unemployment.value.toFixed(1)}%` : '', f.inflation ? `prices are ${f.inflation.value.toFixed(1)}% higher than a year ago` : '', f.interestRate ? `the central bank rate is ${f.interestRate.value.toFixed(2)}%` : ''].filter(Boolean).join(', ')}. What each number means for your savings and loans is explained on our economy page.`.replace(/^./u, (m) => m.toUpperCase()), url: '/today', button: 'The economy today' };
}

/* 2. The Big Seven by market value */
const SEVEN = [['AAPL', 'Apple'], ['MSFT', 'Microsoft'], ['NVDA', 'Nvidia'], ['AMZN', 'Amazon'], ['GOOGL', 'Alphabet (Google)'], ['META', 'Meta'], ['TSLA', 'Tesla']];
// Alphabet reports its share classes separately; below this the figure is one class only, so it's left out
const MIN_SHARES = { GOOGL: 10e9 };

export async function bigSevenChart() {
  const { readPrices } = await import('./dataEngine.js');
  const { getCompany } = await import('./companyLookup.js');
  const prices = (await readPrices()).prices || {};
  const rows = [];
  let asOf = '';
  for (const [t, name] of SEVEN) {
    const p = prices[t]?.price; const c = await getCompany(t).catch(() => null);
    const shares = c?.sharesOutstanding;
    if (!p || !shares || shares < (MIN_SHARES[t] || 0)) continue;
    rows.push({ t, name, cap: p * shares });
    if (prices[t]?.date && prices[t].date > asOf) asOf = prices[t].date;
  }
  if (rows.length < 5) return null;
  rows.sort((a, b) => b.cap - a.cap);
  const total = rows.reduce((n, r) => n + r.cap, 0);
  const max = rows[0].cap; const barX = 360; const barW = W - barX - 230; const rh = 66;
  const tn = (v) => (v >= 1e12 ? `$${(v / 1e12).toFixed(2)} trillion` : `$${Math.round(v / 1e9)} billion`);
  const bars = rows.map((r, i) => {
    const y = 160 + i * rh; const col = COLS[i % COLS.length];
    return `<text x="48" y="${y + 34}" font-family="Lato" font-weight="700" font-size="26" fill="${INK}">${x(r.name)}</text>
      <rect x="${barX}" y="${y + 8}" width="${barW}" height="38" rx="10" fill="${col}" fill-opacity="0.12"/>
      <rect x="${barX}" y="${y + 8}" width="${Math.max(10, r.cap / max * barW)}" height="38" rx="10" fill="${col}"/>
      <text x="${barX + barW + 16}" y="${y + 36}" font-family="Lato" font-weight="900" font-size="24" fill="${col}">${x(tn(r.cap))}</text>`;
  }).join('');
  const h = 160 + rows.length * rh + 70;
  const when = asOf ? new Date(asOf).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : 'the latest close';
  const title = rows.length === 7 ? 'The Big Seven: what each is worth' : 'America’s tech giants: what each is worth';
  const svg = frame(h, title, `Market value at the close on ${when}: together ${tn(total)}`, bars, 'Market value = share price × shares in issue. Shares from SEC filings; prices from daily closes.');
  return { file: await save('big-seven', svg), title, text: `Together the ${rows.length} companies are worth about ${tn(total)}. Market value is the share price multiplied by every share in issue: what it would cost to buy the whole company at today’s price.`, url: '/top-10', button: 'See our Top 10 lists' };
}

/* 3. S&P 500 and Nasdaq 100 since 1 January */
export async function indexYtdChart() {
  const { getPriceHistory } = await import('./marketstackClient.js');
  const year = new Date().getUTCFullYear();
  const series = [];
  for (const [t, name, col] of [['SPY', 'S&P 500', '#2a78d6'], ['QQQ', 'Nasdaq 100', '#e8730c']]) {
    const h = await getPriceHistory(t).catch(() => null);
    const rows = h?.ok ? h.rows : [];
    const base = [...rows].reverse().find((r) => r.d < `${year}-01-01`);
    const ytd = rows.filter((r) => r.d >= `${year}-01-01`);
    if (!base || ytd.length < 10) continue;
    series.push({ name, col, pts: ytd.map((r) => ({ d: r.d, v: (r.c / base.c - 1) * 100 })) });
  }
  if (!series.length) return null;
  const all = series.flatMap((s) => s.pts.map((p) => p.v));
  const lo = Math.min(0, ...all) - 2; const hi = Math.max(0, ...all) + 2;
  const L = 110; const R = W - 220; const T = 160; const B = 600;
  const days = Math.max(...series.map((s) => s.pts.length));
  const px = (i) => L + (i / Math.max(1, days - 1)) * (R - L);
  const py = (v) => B - ((v - lo) / (hi - lo)) * (B - T);
  const step = (hi - lo) > 40 ? 10 : 5;
  let grid = '';
  for (let g = Math.ceil(lo / step) * step; g <= hi; g += step) {
    grid += `<line x1="${L}" x2="${R}" y1="${py(g)}" y2="${py(g)}" stroke="${g === 0 ? '#8a93a8' : '#e2dccd'}" stroke-width="${g === 0 ? 2 : 1}"/>
      <text x="${L - 14}" y="${py(g) + 7}" font-family="Lato" font-size="19" fill="${GREY}" text-anchor="end">${g > 0 ? '+' : ''}${g}%</text>`;
  }
  const months = []; let lastM = '';
  series[0].pts.forEach((p, i) => { const m = p.d.slice(5, 7); if (m !== lastM) { lastM = m; months.push([i, new Date(p.d).toLocaleDateString('en-GB', { month: 'short' })]); } });
  grid += months.map(([i, m]) => `<text x="${px(i)}" y="${B + 32}" font-family="Lato" font-size="18" fill="${GREY}">${m}</text>`).join('');
  const lines = series.map((s) => {
    const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(p.v).toFixed(1)}`).join(' ');
    const last = s.pts.at(-1); const i = s.pts.length - 1;
    return `<path d="${d}" fill="none" stroke="${s.col}" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="${px(i)}" cy="${py(last.v)}" r="8" fill="${s.col}"/>
      <text x="${px(i) + 16}" y="${py(last.v) - 4}" font-family="Lato" font-weight="900" font-size="26" fill="${s.col}">${last.v >= 0 ? '+' : '−'}${Math.abs(last.v).toFixed(1)}%</text>
      <text x="${px(i) + 16}" y="${py(last.v) + 22}" font-family="Lato" font-weight="700" font-size="19" fill="${INK}">${x(s.name)}</text>`;
  }).join('');
  const lastDay = series[0].pts.at(-1).d;
  const svg = frame(B + 110, `Since 1 January: S&P 500 and Nasdaq 100`, `Change this year to the close on ${new Date(lastDay).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`, grid + lines, 'Measured with the SPY and QQQ funds, which track each index. Daily closing prices.');
  const words = series.map((s) => `the ${s.name} is ${s.pts.at(-1).v >= 0 ? 'up' : 'down'} ${Math.abs(s.pts.at(-1).v).toFixed(1)}%`).join(' and ');
  return { file: await save('indexes-ytd', svg), title: 'The stock market this year', text: `Since 1 January ${words}. An index is a basket of shares that shows how a whole market is doing.`, url: '/markets', button: 'See the markets' };
}

/** Every chart that has its figures, as newsletter items. */
export async function newsletterChartItems(site) {
  const out = [];
  for (const fn of [indexYtdChart, bigSevenChart, economyChart]) {
    const c = await fn().catch((error) => { console.error(`[newsletter] chart: ${error.message}`); return null; });
    if (c) out.push({ heading: c.title, text: c.text, image: `${site}/newsletter-charts/${c.file}`, url: c.url, button: c.button });
  }
  return out;
}
