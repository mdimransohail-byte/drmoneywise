/* ════════════════════════════════════════════════════════════════════════
   CHART CHECK (technical analysis) — what a share's price chart shows,
   worked out from daily closing prices by fixed formulas:
     moving averages (20, 50, 200 days), RSI (14), MACD (12, 26, 9),
     Bollinger bands (20, 2), 52-week range, volume, support and
     resistance (recent lows and highs).
   Each signal is described in plain English with a colour. A description
   of the chart, not a forecast and not advice to buy or sell.
   Free readers get 3 headline signals; Regular and Premium get all.
   ════════════════════════════════════════════════════════════════════════ */

export function sma(values, n) {
  const out = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}
export function ema(values, n) {
  const out = Array(values.length).fill(null);
  const k = 2 / (n + 1);
  let prev = null;
  for (let i = 0; i < values.length; i += 1) {
    if (i < n - 1) continue;
    prev = prev === null ? values.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n : values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}
export function rsi(values, n = 14) {
  const out = Array(values.length).fill(null);
  let gain = 0; let loss = 0;
  for (let i = 1; i < values.length; i += 1) {
    const ch = values[i] - values[i - 1];
    if (i <= n) { gain += Math.max(0, ch); loss += Math.max(0, -ch); if (i === n) { gain /= n; loss /= n; out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss); } continue; }
    gain = (gain * (n - 1) + Math.max(0, ch)) / n;
    loss = (loss * (n - 1) + Math.max(0, -ch)) / n;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}
export function macd(values) {
  const e12 = ema(values, 12); const e26 = ema(values, 26);
  const line = values.map((_, i) => (e12[i] !== null && e26[i] !== null ? e12[i] - e26[i] : null));
  const start = line.findIndex((x) => x !== null);
  const sig = Array(values.length).fill(null);
  if (start >= 0) { const s = ema(line.slice(start), 9); s.forEach((v, i) => { sig[start + i] = v; }); }
  return { line, signal: sig, hist: line.map((v, i) => (v !== null && sig[i] !== null ? v - sig[i] : null)) };
}
export function bollinger(values, n = 20, k = 2) {
  const mid = sma(values, n);
  const up = []; const low = [];
  values.forEach((_, i) => {
    if (mid[i] === null) { up.push(null); low.push(null); return; }
    const w = values.slice(i - n + 1, i + 1);
    const sd = Math.sqrt(w.reduce((a, x) => a + (x - mid[i]) ** 2, 0) / n);
    up.push(mid[i] + k * sd); low.push(mid[i] - k * sd);
  });
  return { mid, up, low };
}

/** Support and resistance: the lowest low and highest high of the last 60 days, and of 61-120 days. */
function levels(rows) {
  const r60 = rows.slice(-60); const r120 = rows.slice(-120, -60);
  const lo = (rs) => (rs.length ? Math.min(...rs.map((r) => r.l ?? r.c)) : null);
  const hi = (rs) => (rs.length ? Math.max(...rs.map((r) => r.h ?? r.c)) : null);
  const price = rows.at(-1).c;
  const sup = [lo(r60), lo(r120)].filter((x) => x && x < price).sort((a, b) => b - a);
  const res = [hi(r60), hi(r120)].filter((x) => x && x > price).sort((a, b) => a - b);
  return { support: sup[0] ?? null, resistance: res[0] ?? null };
}

const money = (v) => `$${v >= 100 ? v.toFixed(0) : v.toFixed(2)}`;

export function analyse(rows) {
  const c = rows.map((r) => r.c);
  const n = c.length - 1;
  const price = c[n];
  const s20 = sma(c, 20); const s50 = sma(c, 50); const s200 = sma(c, 200);
  const r = rsi(c); const m = macd(c); const bb = bollinger(c);
  const vol = rows.map((x) => x.v || 0); const v50 = sma(vol, 50);
  const yearRows = rows.slice(-252);
  const hi52 = Math.max(...yearRows.map((x) => x.h ?? x.c)); const lo52 = Math.min(...yearRows.map((x) => x.l ?? x.c));
  const pos52 = hi52 > lo52 ? (price - lo52) / (hi52 - lo52) : null;
  const lv = levels(rows);
  const signals = [];
  const add = (key, label, tone, plain, free = false) => signals.push({ key, label, tone, plain, free });

  if (s200[n] !== null) add('trend', 'Long-term trend', price > s200[n] ? 'good' : 'weak', price > s200[n] ? `The price (${money(price)}) is above its 200-day average (${money(s200[n])}): the long-term trend is up.` : `The price (${money(price)}) is below its 200-day average (${money(s200[n])}): the long-term trend is down.`, true);
  else if (s50[n] !== null) add('trend', 'Trend', price > s50[n] ? 'good' : 'weak', `Less than 200 days of prices, so we use the 50-day average (${money(s50[n])}). The price is ${price > s50[n] ? 'above' : 'below'} it.`, true);
  if (r[n] !== null) add('rsi', 'Momentum (RSI)', r[n] > 70 ? 'watch' : r[n] < 30 ? 'watch' : r[n] >= 50 ? 'good' : 'okay', r[n] > 70 ? `RSI is ${r[n].toFixed(0)}, above 70: the price has risen fast and is often called “overbought”. Fast rises sometimes pause or pull back.` : r[n] < 30 ? `RSI is ${r[n].toFixed(0)}, below 30: the price has fallen fast and is often called “oversold”. Falls sometimes pause or bounce.` : `RSI is ${r[n].toFixed(0)}, between 30 and 70: momentum is ${r[n] >= 50 ? 'mildly positive' : 'mildly negative'}, with no extreme.`, true);
  if (pos52 !== null) add('range', '52-week range', pos52 > 0.8 ? 'good' : pos52 < 0.2 ? 'weak' : 'okay', `The price is ${Math.round(pos52 * 100)}% of the way from its 52-week low (${money(lo52)}) to its high (${money(hi52)}).`, true);
  if (s50[n] !== null && s200[n] !== null) {
    let cross = null;
    for (let i = n; i > Math.max(0, n - 30); i -= 1) {
      if (s50[i - 1] !== null && s200[i - 1] !== null && Math.sign(s50[i] - s200[i]) !== Math.sign(s50[i - 1] - s200[i - 1])) { cross = { i, up: s50[i] > s200[i] }; break; }
    }
    add('cross', 'Moving-average cross', s50[n] > s200[n] ? 'good' : 'weak', cross ? `In the last 30 days the 50-day average crossed ${cross.up ? 'above' : 'below'} the 200-day average (a “${cross.up ? 'golden' : 'death'} cross”).` : `The 50-day average is ${s50[n] > s200[n] ? 'above' : 'below'} the 200-day average, and has been for at least 30 days.`);
  }
  if (s20[n] !== null) add('short', 'Short-term trend', price > s20[n] ? 'good' : 'weak', `The price is ${price > s20[n] ? 'above' : 'below'} its 20-day average (${money(s20[n])}).`);
  if (m.hist[n] !== null) add('macd', 'MACD', m.hist[n] > 0 ? 'good' : 'weak', `The MACD line is ${m.line[n] > m.signal[n] ? 'above' : 'below'} its signal line: short-term momentum is ${m.hist[n] > 0 ? 'rising' : 'fading'}${m.hist[n - 1] !== null && Math.sign(m.hist[n]) !== Math.sign(m.hist[n - 1]) ? ', and it has just crossed' : ''}.`);
  if (bb.up[n] !== null) { const w = (bb.up[n] - bb.low[n]) / bb.mid[n] * 100; add('bands', 'Bollinger bands', price > bb.up[n] ? 'watch' : price < bb.low[n] ? 'watch' : 'okay', price > bb.up[n] ? `The price is above its upper band (${money(bb.up[n])}): an unusually big move up for this share.` : price < bb.low[n] ? `The price is below its lower band (${money(bb.low[n])}): an unusually big move down.` : `The price is inside its bands (${money(bb.low[n])} to ${money(bb.up[n])}). The bands are ${w.toFixed(0)}% wide${w < 6 ? ', narrow: quiet periods are often followed by bigger moves' : ''}.`); }
  if (v50[n]) { const ratio = vol[n] / v50[n]; add('volume', 'Volume', ratio > 1.5 ? 'watch' : 'okay', `Shares traded on the last day were ${ratio.toFixed(1)} times the 50-day average${ratio > 1.5 ? ': unusually busy, often around news' : ''}.`); }
  if (lv.support || lv.resistance) add('levels', 'Support and resistance', 'okay', `${lv.support ? `Nearest support (a recent low where buyers stepped in): ${money(lv.support)}, ${((1 - lv.support / price) * 100).toFixed(1)}% below. ` : ''}${lv.resistance ? `Nearest resistance (a recent high where sellers stepped in): ${money(lv.resistance)}, ${((lv.resistance / price - 1) * 100).toFixed(1)}% above.` : ''}`);

  const good = signals.filter((s) => s.tone === 'good').length; const weak = signals.filter((s) => s.tone === 'weak').length;
  const picture = good >= weak + 3 ? 'Mostly positive' : weak >= good + 3 ? 'Mostly negative' : 'Mixed';
  return {
    price, date: rows.at(-1).d, picture, good, weak, signals, levels: lv, hi52, lo52,
    series: { d: rows.map((x) => x.d), c, s50, s200, up: bb.up, low: bb.low, rsi: r, hist: m.hist },
  };
}

/* ── Drawing: price with averages and bands, RSI and MACD below ────── */
export function chartSvg(a, days = 180) {
  const s = a.series; const n = s.c.length; const from = Math.max(0, n - days);
  const idx = Array.from({ length: n - from }, (_, i) => from + i);
  const W = 760; const L = 52; const R = 14;
  const X = (k) => L + (k / Math.max(1, idx.length - 1)) * (W - L - R);
  const vals = idx.flatMap((i) => [s.c[i], s.up[i], s.low[i], s.s50[i], s.s200[i]]).filter((v) => v !== null && Number.isFinite(v));
  const lo = Math.min(...vals); const hi = Math.max(...vals); const pad = (hi - lo) * 0.06;
  const PH = 260; const Y = (v) => 14 + (1 - (v - (lo - pad)) / ((hi + pad) - (lo - pad))) * (PH - 28);
  const line = (arr, col, w = 2, dash = '') => { const pts = idx.map((i, k) => (arr[i] === null ? null : `${X(k).toFixed(1)},${Y(arr[i]).toFixed(1)}`)).filter(Boolean); return pts.length ? `<polyline fill="none" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} points="${pts.join(' ')}"/>` : ''; };
  const band = (() => { const top = idx.map((i, k) => (s.up[i] === null ? null : `${X(k).toFixed(1)},${Y(s.up[i]).toFixed(1)}`)).filter(Boolean); const bot = idx.map((i, k) => (s.low[i] === null ? null : `${X(k).toFixed(1)},${Y(s.low[i]).toFixed(1)}`)).filter(Boolean).reverse(); return top.length ? `<polygon points="${[...top, ...bot].join(' ')}" fill="#2a78d6" opacity=".08"/>` : ''; })();
  const ticks = [lo, (lo + hi) / 2, hi].map((t) => `<text x="${L - 6}" y="${Y(t) + 4}" text-anchor="end" font-size="11" fill="#4a5170">${t >= 100 ? t.toFixed(0) : t.toFixed(2)}</text><line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" stroke="#ece4d2"/>`).join('');
  const lvl = (v, col, label) => (v ? `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${col}" stroke-dasharray="6 4" stroke-width="1.5"/><text x="${W - R - 4}" y="${Y(v) - 4}" text-anchor="end" font-size="11" font-weight="700" fill="${col}">${label}</text>` : '');
  const months = idx.map((i, k) => [s.d[i], k]).filter(([d], j, arr) => j === 0 || d.slice(5, 7) !== arr[j - 1][0].slice(5, 7)).slice(1);
  const xl = months.map(([d, k]) => `<text x="${X(k)}" y="${PH + 2}" text-anchor="middle" font-size="11" fill="#4a5170">${new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}</text>`).join('');
  // RSI panel
  const RT = PH + 18; const RH = 90; const RY = (v) => RT + (1 - v / 100) * RH;
  const rsiLine = idx.map((i, k) => (s.rsi[i] === null ? null : `${X(k).toFixed(1)},${RY(s.rsi[i]).toFixed(1)}`)).filter(Boolean).join(' ');
  const rsiPanel = `<rect x="${L}" y="${RY(70)}" width="${W - L - R}" height="${RY(30) - RY(70)}" fill="#6250d6" opacity=".07"/><line x1="${L}" x2="${W - R}" y1="${RY(70)}" y2="${RY(70)}" stroke="#e5566f" stroke-dasharray="4 3"/><line x1="${L}" x2="${W - R}" y1="${RY(30)}" y2="${RY(30)}" stroke="#1baf7a" stroke-dasharray="4 3"/><text x="${L - 6}" y="${RY(70) + 4}" text-anchor="end" font-size="11" fill="#4a5170">70</text><text x="${L - 6}" y="${RY(30) + 4}" text-anchor="end" font-size="11" fill="#4a5170">30</text><text x="${L + 4}" y="${RT + 12}" font-size="11" font-weight="700" fill="#6250d6">RSI (14)</text><polyline fill="none" stroke="#6250d6" stroke-width="1.8" points="${rsiLine}"/>`;
  // MACD histogram
  const MT = RT + RH + 16; const MH = 70;
  const hv = idx.map((i) => s.hist[i]).filter((v) => v !== null);
  const hm = Math.max(...hv.map(Math.abs), 0.0001);
  const bw = Math.max(1, (W - L - R) / idx.length - 0.6);
  const bars = idx.map((i, k) => { const v = s.hist[i]; if (v === null) return ''; const h = Math.abs(v) / hm * (MH / 2); return `<rect x="${(X(k) - bw / 2).toFixed(1)}" y="${(v >= 0 ? MT + MH / 2 - h : MT + MH / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${v >= 0 ? '#1baf7a' : '#e5566f'}"/>`; }).join('');
  const H = MT + MH + 6;
  return `<figure class="ta-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Price chart with moving averages, Bollinger bands, RSI and MACD">
      ${ticks}${band}${line(s.s200, '#e8730c', 2)}${line(s.s50, '#1baf7a', 2)}${line(s.c, '#0a1128', 2.2)}
      ${lvl(a.levels.support, '#12814f', 'support')}${lvl(a.levels.resistance, '#c0392b', 'resistance')}${xl}
      ${rsiPanel}<text x="${L + 4}" y="${MT + 10}" font-size="11" font-weight="700" fill="#4a5170">MACD histogram</text><line x1="${L}" x2="${W - R}" y1="${MT + MH / 2}" y2="${MT + MH / 2}" stroke="#d9ccb2"/>${bars}
    </svg>
    <figcaption><i style="--c:#0a1128"></i>Price <i style="--c:#1baf7a"></i>50-day average <i style="--c:#e8730c"></i>200-day average <i style="--c:#2a78d6;opacity:.35"></i>Bollinger bands</figcaption></figure>`;
}

/* ── Chart alerts (Premium): signs that appeared on the latest trading day ──
   Compares the last day with the day before, so each sign is reported once. */
export function chartEvents(rows) {
  if (!rows || rows.length < 60) return [];
  const c = rows.map((r) => r.c);
  const n = c.length - 1; const p = n - 1;
  const s50 = sma(c, 50); const s200 = sma(c, 200); const r = rsi(c);
  const vol = rows.map((x) => x.v || 0); const v50 = sma(vol, 50);
  const ev = [];
  const money = (v) => `$${v >= 100 ? v.toFixed(0) : v.toFixed(2)}`;
  if (s50[p] !== null && s200[p] !== null) {
    if (s50[p] <= s200[p] && s50[n] > s200[n]) ev.push({ key: 'golden', tone: 'good', title: 'Golden cross', text: `The 50-day average (${money(s50[n])}) moved above the 200-day average (${money(s200[n])}). Chart readers often see this as a sign the longer trend is turning up.` });
    if (s50[p] >= s200[p] && s50[n] < s200[n]) ev.push({ key: 'death', tone: 'weak', title: 'Death cross', text: `The 50-day average (${money(s50[n])}) fell below the 200-day average (${money(s200[n])}). Often read as a sign the longer trend is turning down.` });
  }
  if (s200[p] !== null) {
    if (c[p] <= s200[p] && c[n] > s200[n]) ev.push({ key: 'above200', tone: 'good', title: 'Back above the 200-day average', text: `The price closed at ${money(c[n])}, above its 200-day average of ${money(s200[n])}.` });
    if (c[p] >= s200[p] && c[n] < s200[n]) ev.push({ key: 'below200', tone: 'weak', title: 'Fell below the 200-day average', text: `The price closed at ${money(c[n])}, below its 200-day average of ${money(s200[n])}.` });
  }
  if (r[p] !== null && r[n] !== null) {
    if (r[p] <= 70 && r[n] > 70) ev.push({ key: 'rsi70', tone: 'watch', title: 'RSI above 70 (“overbought”)', text: `RSI rose to ${r[n].toFixed(0)}: the price has climbed fast. Fast rises sometimes pause or pull back.` });
    if (r[p] >= 30 && r[n] < 30) ev.push({ key: 'rsi30', tone: 'watch', title: 'RSI below 30 (“oversold”)', text: `RSI fell to ${r[n].toFixed(0)}: the price has dropped fast. Sharp falls sometimes pause or bounce.` });
  }
  const year = rows.slice(-253, -1);
  if (year.length > 200) {
    const hi = Math.max(...year.map((x) => x.h ?? x.c)); const lo = Math.min(...year.map((x) => x.l ?? x.c));
    if (c[n] > hi) ev.push({ key: 'high52', tone: 'good', title: 'New 52-week high', text: `The price closed at ${money(c[n])}, its highest in a year (the previous high was ${money(hi)}).` });
    if (c[n] < lo) ev.push({ key: 'low52', tone: 'weak', title: 'New 52-week low', text: `The price closed at ${money(c[n])}, its lowest in a year (the previous low was ${money(lo)}).` });
  }
  if (v50[p] && vol[n] > 2.5 * v50[p] && Math.abs(c[n] / c[p] - 1) >= 0.03) ev.push({ key: 'volume', tone: c[n] > c[p] ? 'good' : 'weak', title: 'Big move on heavy trading', text: `The price ${c[n] > c[p] ? 'rose' : 'fell'} ${(Math.abs(c[n] / c[p] - 1) * 100).toFixed(1)}% with ${(vol[n] / v50[p]).toFixed(1)} times the usual number of shares traded.` });
  return ev.map((e) => ({ ...e, date: rows[n].d }));
}
