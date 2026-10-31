/* ════════════════════════════════════════════════════════════════════════
   PREMIUM PART OF THE NEWSLETTER — one personal section per Premium member
   ───────────────────────────────────────────────────────────────────────
   1. Your portfolio last week: health score, value and its change over
      7 days (from our own daily price history), best and worst mover,
      biggest holding, areas of the economy (coloured bars).
   2. Your companies last week: results, dividend news and company
      bosses' market buys/sells (SEC Form 4) for portfolio + watchlist.
   3. The coming week: results we expect, estimated from when each company
      filed results a year earlier (SEC 8-K item 2.02), clearly labelled
      as an estimate.
   4. Premium extras: where bosses bought most across all companies,
      the newest deeper explainer, the latest research report, idea lists.
   Everything comes from figures the site already collects; nothing is
   made up. If something isn't available yet it says so plainly.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { readStore } from './storeService.js';

const FILE = path.join(process.cwd(), 'data', 'market', 'price-history.json');
const DAY = 86400000;
const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const pct = (x, dp = 1) => `${x > 0 ? '+' : ''}${(x * 100).toFixed(dp)}%`;
const money = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(2)} million` : `$${Math.round(v).toLocaleString('en-GB')}`);
const nice = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const COLOURS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#6250d6', '#e34948', '#0e8a8a', '#a7adc2'];

/* ── Daily price history (kept 45 days) ───────────────────────────── */
async function readHistory() { try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { return { days: {} }; } }

export async function savePriceSnapshot(prices) {
  const h = await readHistory();
  const day = {};
  for (const [t, p] of Object.entries(prices || {})) if (p?.price) day[t] = p.price;
  h.days[iso(Date.now())] = day;
  const cutoff = iso(Date.now() - 45 * DAY);
  h.days = Object.fromEntries(Object.entries(h.days).filter(([d]) => d >= cutoff));
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(`${FILE}.tmp`, JSON.stringify(h), 'utf8');
  await fs.rename(`${FILE}.tmp`, FILE);
}

/** Prices from the saved day closest to `days` ago (5 to 10 days back). */
async function pricesAgo(days = 7) {
  const h = await readHistory();
  const target = Date.now() - days * DAY;
  const picks = Object.keys(h.days).filter((d) => {
    const age = (Date.now() - new Date(`${d}T00:00:00Z`).getTime()) / DAY;
    return age >= 5 && age <= 10;
  }).sort((a, b) => Math.abs(new Date(a) - target) - Math.abs(new Date(b) - target));
  return picks.length ? { date: picks[0], prices: h.days[picks[0]] } : null;
}

/* ── Email building blocks (inline styles for email apps) ─────────── */
const box = (colour, title, inner) => `<div style="border-left:5px solid ${colour};background:#fff;border-radius:10px;padding:14px 16px;margin:0 0 14px">
  <h2 style="font:700 18px Georgia,serif;margin:0 0 8px">${esc(title)}</h2>${inner}</div>`;
const p = (html) => `<p style="margin:0 0 8px;line-height:1.55">${html}</p>`;
const tile = (big, small, colour) => `<td style="padding:4px;width:33%;vertical-align:top"><div style="background:${colour}14;border-top:4px solid ${colour};border-radius:8px;padding:8px 10px">
  <div style="font:700 20px Georgia,serif;color:${colour}">${big}</div><div style="font-size:12px;color:#4a5170">${small}</div></div></td>`;
const bar = (label, share, colour) => `<tr><td style="font-size:13px;padding:3px 8px 3px 0;white-space:nowrap">${esc(label)}</td>
  <td style="width:100%;padding:3px 0"><div style="background:#eee5d3;border-radius:6px;height:12px"><div style="background:${colour};width:${Math.max(2, Math.round(share * 100))}%;height:12px;border-radius:6px"></div></div></td>
  <td style="font-size:13px;padding:3px 0 3px 8px;font-weight:700">${Math.round(share * 100)}%</td></tr>`;

/* ── Shared facts for the week (worked out once per send) ─────────── */
export async function premiumWeekContext() {
  const to = iso(Date.now()); const from = iso(Date.now() - 7 * DAY);
  const { readResults, readDividends, readReportDates } = await import('./resultsService.js');
  const { insiderTradesBetween } = await import('./insiderService.js');
  const { listReports } = await import('./reportService.js');
  const trades = await insiderTradesBetween(from, to).catch(() => []);
  const results = (readResults().items || []).filter((r) => r.filed >= from);
  const dividends = readDividends().filter((d) => d.filed >= from && d.action !== 'kept');
  // Where bosses put the most of their own money this week
  const buys = {};
  for (const t of trades.filter((x) => x.side === 'buy')) {
    const b = buys[t.ticker] = buys[t.ticker] || { ticker: t.ticker, company: t.company, value: 0, people: new Set() };
    b.value += t.value || 0; b.people.add(t.owner);
  }
  const topBuys = Object.values(buys).filter((b) => b.value > 0).sort((a, b) => b.value - a.value).slice(0, 3);
  const store = await readStore();
  const deeper = (store.articles || []).filter((a) => a.status === 'published' && (a.tags || []).includes('deeper') && new Date(a.publishAt).getTime() <= Date.now())
    .sort((a, b) => String(b.publishAt).localeCompare(String(a.publishAt)))[0] || null;
  const report = (await listReports())[0] || null;
  // The fortnightly market review, if one came out in the last 16 days
  const review = (store.articles || []).filter((a) => a.status === 'published' && (a.tags || []).includes('market-review') && new Date(a.publishAt).getTime() <= Date.now() && Date.now() - new Date(a.publishAt).getTime() < 16 * DAY)
    .sort((a, b) => String(b.publishAt).localeCompare(String(a.publishAt)))[0] || null;
  return { from, to, trades, results, dividends, topBuys, deeper, report, review, reportDates: readReportDates(), before: await pricesAgo(7) };
}

/** Results expected in the next 7 days, from last year's filing dates. */
function expectedSoon(tickers, reportDates) {
  const out = [];
  const start = Date.now(); const end = Date.now() + 7 * DAY;
  for (const t of tickers) {
    for (const d of reportDates[t] || []) {
      const guess = new Date(`${d}T00:00:00Z`).getTime() + 364 * DAY; // same weekday, a year on
      if (guess >= start - DAY && guess <= end) { out.push({ ticker: t, lastYear: d, guess: iso(guess) }); break; }
    }
  }
  return out.sort((a, b) => a.guess.localeCompare(b.guess));
}

/** The Premium section for one member, as email HTML ('' if not Premium). */
export async function premiumWeekHtml(user, ctx, site = '') {
  const { canAccess } = await import('../config.js');
  if (!user || !canAccess(user.plan || 'free', 'premium')) return '';
  const link = (href, text) => `<a href="${esc(site)}${href}" style="color:#1a2a9e;font-weight:700">${esc(text)}</a>`;
  const holdings = (user.portfolio || []).filter((h) => h?.ticker);
  const watch = (user.watchlist || []).map((t) => String(t).toUpperCase());
  const mine = [...new Set([...holdings.map((h) => String(h.ticker).toUpperCase()), ...watch])].slice(0, 30);
  const parts = [];
  parts.push(`<div style="background:#0a1128;color:#c9a227;border-radius:10px;padding:10px 16px;margin:6px 0 14px;font:700 15px Georgia,serif">★ Your Premium section${user.name ? `, ${esc(String(user.name).split(' ')[0])}` : ''}</div>`);

  // 1. Portfolio last week
  if (holdings.length) {
    const { portfolioHealth } = await import('./healthCheckService.js');
    const ph = await portfolioHealth(holdings).catch(() => null);
    if (ph) {
      const inner = [];
      let change = null; let movers = [];
      if (ph.pricesOn && ctx.before) {
        let now = 0; let then = 0;
        for (const r of ph.rows) {
          const old = ctx.before.prices[r.ticker];
          if (r.price && old) {
            movers.push({ ticker: r.ticker, name: r.name, move: r.price / old - 1 });
            if (r.shares) { now += r.price * r.shares; then += old * r.shares; }
          }
        }
        if (then) change = { now, then, move: now / then - 1 };
        movers = movers.sort((a, b) => b.move - a.move);
      }
      const score = ph.overall === null ? '–' : String(ph.overall);
      inner.push(`<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 8px"><tr>
        ${tile(score, `Health score: ${esc(ph.overallBand?.label || 'Not rated')}`, '#2a78d6')}
        ${tile(ph.totalValue ? money(ph.totalValue) : `${ph.rows.length}`, ph.totalValue ? 'Value at the latest prices' : 'Holdings', '#1baf7a')}
        ${tile(change ? pct(change.move) : '–', change ? `Change since ${nice(ctx.before.date)}` : 'Change this week', change && change.move < 0 ? '#e34948' : '#eb6834')}
      </tr></table>`);
      if (change) inner.push(p(`Your holdings were worth <strong>${money(change.now)}</strong> at the latest prices, ${change.move >= 0 ? 'up' : 'down'} <strong>${pct(Math.abs(change.move)).replace('+', '')}</strong> from <strong>${money(change.then)}</strong> on ${nice(ctx.before.date)}.`));
      else if (!ph.pricesOn) inner.push(p('Daily prices are being switched on. Once they are, this section shows how much your portfolio moved each week.'));
      else inner.push(p('We started keeping daily prices recently, so the weekly change appears from next week.'));
      if (movers.length >= 2) inner.push(p(`Best this week: <strong>${esc(movers[0].ticker)}</strong> (${pct(movers[0].move)}). Weakest: <strong>${esc(movers.at(-1).ticker)}</strong> (${pct(movers.at(-1).move)}).`));
      const top = ph.rows[0];
      if (top) inner.push(p(`Biggest holding: <strong>${esc(top.ticker)}</strong>, ${Math.round(top.weight * 100)}% of your portfolio.${ph.income ? ` Expected yearly dividends at current rates: <strong>${money(ph.income)}</strong>.` : ''}`));
      if (ph.sectors.length) inner.push(`<p style="margin:6px 0 4px;font-size:13px;color:#4a5170">Where your money is</p><table role="presentation" style="width:100%;border-collapse:collapse">${ph.sectors.slice(0, 6).map((s, i) => bar(s.name, s.weight, COLOURS[i % COLOURS.length])).join('')}</table>`);
      for (const n of ph.notes.slice(0, 2)) inner.push(p(`• ${esc(n)}`));
      inner.push(p(link('/portfolio-health', 'See your full portfolio check')));
      parts.push(box('#2a78d6', 'Your portfolio last week', inner.join('')));
    }
  } else {
    parts.push(box('#2a78d6', 'Your portfolio last week', p(`Add your holdings and each week this section shows how your portfolio did: its value, the change over the week, the best and worst movers and where your money is. ${link('/#tools', 'Add your portfolio')}`)));
  }

  // 2. Your companies last week
  const set = new Set(mine);
  const res = ctx.results.filter((r) => set.has(r.ticker));
  const divs = ctx.dividends.filter((d) => set.has(d.ticker));
  const bossBy = {};
  for (const t of ctx.trades.filter((x) => set.has(x.ticker))) {
    const b = bossBy[t.ticker] = bossBy[t.ticker] || { buy: 0, sell: 0, n: 0 };
    b[t.side] += t.value || 0; b.n += 1;
  }
  const lines = [
    ...res.slice(0, 6).map((r) => p(`<strong style="color:#1baf7a">Results</strong> ${link(`/stock/${r.ticker}`, `${r.name || r.ticker}`)}: ${esc(r.headline)}.`)),
    ...divs.slice(0, 6).map((d) => p(`<strong style="color:#eda100">Dividend</strong> ${link(`/stock/${d.ticker}`, d.name || d.ticker)}: ${esc({ raised: 'raised', cut: 'cut', started: 'started', stopped: 'stopped', special: 'one-off special dividend' }[d.action] || 'dividend news')}${d.amount ? ` (${esc(d.amount)})` : ''}.`)),
    ...Object.entries(bossBy).slice(0, 6).map(([t, b]) => p(`<strong style="color:#6250d6">Bosses’ trades</strong> ${link(`/stock/${t}`, t)}: ${b.n} trade${b.n === 1 ? '' : 's'}${b.buy ? `, bought ${money(b.buy)}` : ''}${b.sell ? `, sold ${money(b.sell)}` : ''}.`)),
  ];
  parts.push(box('#1baf7a', 'Your companies last week', mine.length
    ? (lines.length ? lines.join('') : p('A quiet week: none of your companies filed results, changed their dividend or had bosses trading shares.'))
    : p(`Add companies to your watchlist or portfolio and we’ll list their results, dividend news and bosses’ trades here. ${link('/#tools', 'Set up your watchlist')}`)));

  // 3. The coming week
  const soon = expectedSoon(mine, ctx.reportDates);
  parts.push(box('#eb6834', 'The coming week', soon.length
    ? soon.slice(0, 8).map((x) => p(`<strong>${nice(x.guess)}</strong> (around): ${link(`/stock/${x.ticker}`, x.ticker)} results expected. Last year they came out on ${nice(x.lastYear)}.`)).join('') + p('<span style="font-size:12px;color:#4a5170">Estimated from when each company filed results a year ago; companies sometimes move the date.</span>')
    : p(mine.length ? 'None of your companies is expected to report results in the next 7 days, judging by when they reported last year.' : 'Once you follow some companies, we’ll show which of them are due to report results in the week ahead.')));

  // 4. The fortnightly market review
  if (ctx.review) {
    const r = ctx.review;
    parts.push(box('#5b2a9e', 'Market review: the last two weeks', [
      p(`<a href="${esc(site)}/learn/${esc(r.slug)}" style="color:#0a1128;font:700 16px Georgia,serif;text-decoration:none">${esc(r.headline)}</a>`),
      r.summary ? p(esc(r.summary)) : '',
      ...(r.takeaways || []).slice(0, 3).map((t) => p(`• ${esc(t)}`)),
      p(link(`/learn/${r.slug}`, 'Read the full review, with the sector chart')),
    ].join('')));
  }

  // 5. Premium extras
  const extras = [];
  if (ctx.topBuys.length) extras.push(p(`<strong>Where company bosses bought most this week:</strong> ${ctx.topBuys.map((b) => `${link(`/stock/${b.ticker}`, b.ticker)} (${money(b.value)} by ${b.people.size} ${b.people.size === 1 ? 'person' : 'people'})`).join(', ')}. ${link('/insiders', 'All bosses’ trades')}`));
  if (ctx.deeper) extras.push(p(`<strong>Deeper explainer:</strong> ${link(`/learn/${ctx.deeper.slug}`, ctx.deeper.headline)}`));
  if (ctx.report) extras.push(p(`<strong>Research report:</strong> ${link(`/reports/${ctx.report.id}`, `${ctx.report.month}${ctx.report.partial ? ' (month so far)' : ''}`)}`));
  if ((user.ideas || []).length) extras.push(p(`<strong>Your idea lists:</strong> ${(user.ideas || []).length} saved. ${link('/ideas', 'See what matches your rules today')}`));
  else extras.push(p(`<strong>Idea lists:</strong> save your own rules in the screener and we’ll tell you when new companies match. ${link('/screener', 'Open the screener')}`));
  parts.push(box('#6250d6', 'Premium extras', extras.join('')));
  parts.push(p('<span style="font-size:12px;color:#4a5170">This section is for your learning, based on figures from company filings and our own price records. It isn’t advice to buy or sell anything.</span>'));
  return parts.join('');
}
