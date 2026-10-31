/* ════════════════════════════════════════════════════════════════════════
   CHART READERS diagrams — a labelled picture for each technical-analysis
   lesson (course ids ta-*), drawn here in code from made-up prices, so
   every lesson is illustrated the same clean way. Shown under the lesson
   headline (also to readers who can only see the opening, as a taster).
   ════════════════════════════════════════════════════════════════════════ */

const W = 720; const H = 300; const L = 40; const R = 16; const T = 18; const B = 30;
const ink = '#0a1128'; const grid = '#ece4d2'; const up = '#1baf7a'; const down = '#e5566f'; const blue = '#2a78d6'; const orange = '#e8730c'; const purple = '#6250d6';

/* Repeatable made-up prices: a gentle wave plus a trend */
function series(n, start, drift, wave = 0.04, seed = 1) {
  const out = []; let p = start; let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
  for (let i = 0; i < n; i += 1) { p = p * (1 + drift + rnd() * wave * 0.5) + Math.sin(i / 6) * start * 0.004; out.push(p); }
  return out;
}
function frame(content, title, legend = '') {
  return `<figure class="ta-diagram"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}"><rect width="${W}" height="${H}" rx="14" fill="#fff"/>${content}</svg><figcaption><strong>${title}</strong>${legend ? ` · ${legend}` : ''}</figcaption></figure>`;
}
function scaler(values, top = T, bottom = H - B) {
  const lo = Math.min(...values); const hi = Math.max(...values); const pad = (hi - lo) * 0.08 || 1;
  return (v) => top + (1 - (v - lo + pad) / (hi - lo + pad * 2)) * (bottom - top);
}
const X = (i, n) => L + (i / Math.max(1, n - 1)) * (W - L - R);
const poly = (vals, Y, col, w = 2.4, dash = '') => `<polyline fill="none" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-linejoin="round" points="${vals.map((v, i) => (v === null ? '' : `${X(i, vals.length).toFixed(1)},${Y(v).toFixed(1)}`)).filter(Boolean).join(' ')}"/>`;
const label = (x, y, text, col = ink, anchor = 'start', size = 13) => `<text x="${x}" y="${y}" font-family="Public Sans, sans-serif" font-size="${size}" font-weight="700" fill="${col}" text-anchor="${anchor}">${text}</text>`;
const gridLines = (Y, vals) => { const lo = Math.min(...vals); const hi = Math.max(...vals); return [0, 0.5, 1].map((k) => { const v = lo + (hi - lo) * k; return `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${grid}"/>`; }).join(''); };
const sma = (v, n) => v.map((_, i) => (i < n - 1 ? null : v.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n));

function candles(n = 22, seed = 3) {
  const c = series(n, 50, 0.004, 0.08, seed);
  return c.map((close, i) => { const open = i ? c[i - 1] * (1 + ((i * 37) % 7 - 3) / 400) : close * 0.99; const hi = Math.max(open, close) * 1.012; const lo = Math.min(open, close) * 0.988; return { open, close, hi, lo }; });
}
function drawCandles(cs, Y, x0 = L, x1 = W - R) {
  const w = (x1 - x0) / cs.length;
  return cs.map((k, i) => { const x = x0 + i * w + w / 2; const col = k.close >= k.open ? up : down; return `<line x1="${x}" x2="${x}" y1="${Y(k.hi)}" y2="${Y(k.lo)}" stroke="${col}" stroke-width="1.6"/><rect x="${x - w * 0.32}" y="${Y(Math.max(k.open, k.close))}" width="${w * 0.64}" height="${Math.max(2, Math.abs(Y(k.open) - Y(k.close)))}" rx="2" fill="${col}"/>`; }).join('');
}

const D = {
  'ta-1-1': () => {
    const p = series(80, 40, 0.003, 0.06, 2); const Y = scaler(p, T, 200); const v = p.map((_, i) => 30 + ((i * 53) % 41) + (i > 60 ? 30 : 0));
    const bars = v.map((x, i) => `<rect x="${X(i, 80) - 3}" y="${H - B - x * 0.9}" width="6" height="${x * 0.9}" fill="#c9d3e6"/>`).join('');
    return frame(`${gridLines(Y, p)}${poly(p, Y, ink)}${bars}${label(L + 4, T + 12, 'Price ↑', blue)}${label(W - R, H - 8, 'Time →', blue, 'end')}${label(L + 4, H - B - 70, 'Volume (shares traded each day)', '#6b7896', 'start', 12)}`, 'A price chart', 'price over time, with trading volume underneath');
  },
  'ta-1-2': () => {
    const Y = (v) => T + (1 - (v - 40) / 30) * (H - T - B);
    const one = (x, o, c, h, l, col, name) => `<line x1="${x}" x2="${x}" y1="${Y(h)}" y2="${Y(l)}" stroke="${col}" stroke-width="3"/><rect x="${x - 28}" y="${Y(Math.max(o, c))}" width="56" height="${Math.abs(Y(o) - Y(c))}" rx="4" fill="${col}"/>${label(x, H - 8, name, col, 'middle')}
      ${label(x + 44, Y(h) + 4, 'High')}${label(x + 44, Y(l) + 4, 'Low')}${label(x + 44, Y(Math.max(o, c)) + 4, c > o ? 'Close' : 'Open')}${label(x + 44, Y(Math.min(o, c)) + 4, c > o ? 'Open' : 'Close')}
      <line x1="${x + 30}" x2="${x + 40}" y1="${Y(h)}" y2="${Y(h)}" stroke="#8a8576"/><line x1="${x + 30}" x2="${x + 40}" y1="${Y(l)}" y2="${Y(l)}" stroke="#8a8576"/>`;
    return frame(`${one(200, 48, 62, 67, 44, up, 'Price rose: green')}${one(480, 62, 50, 66, 45, down, 'Price fell: red')}${label(360, T + 20, 'Thick body = open to close · thin wicks = the day’s high and low', '#4a5170', 'middle', 12)}`, 'One candlestick = one day', 'four prices in a single bar');
  },
  'ta-1-3': () => {
    const p = [40, 46, 43, 50, 47, 55, 51, 59, 55, 63, 60, 67]; const Y = scaler(p);
    const lows = [[0, 40], [2, 43], [4, 47], [6, 51], [8, 55], [10, 60]];
    const line = `<line x1="${X(0, 12)}" y1="${Y(40) + 6}" x2="${X(11, 12)}" y2="${Y(62) + 6}" stroke="${blue}" stroke-width="2.5" stroke-dasharray="7 5"/>`;
    return frame(`${gridLines(Y, p)}${line}${poly(p, Y, ink, 3)}${lows.map(([i, v]) => `<circle cx="${X(i, 12)}" cy="${Y(v)}" r="6" fill="${up}"/>`).join('')}${[1, 3, 5, 7, 9, 11].map((i) => `<circle cx="${X(i, 12)}" cy="${Y(p[i])}" r="6" fill="${orange}"/>`).join('')}${label(X(7, 12), Y(40) , 'Trendline joins the higher lows', blue)}${label(L + 6, T + 14, '● higher highs', orange)}${label(L + 130, T + 14, '● higher lows', up)}`, 'An uptrend', 'each peak and each dip higher than the last');
  },
  'ta-1-4': () => {
    const p = [52, 58, 64, 60, 54, 51, 57, 63, 65, 59, 53, 52, 58, 64, 66, 72, 76]; const Y = scaler([...p, 50, 77]);
    return frame(`${gridLines(Y, p)}<rect x="${L}" y="${Y(66)}" width="${W - L - R}" height="${Y(63) - Y(66)}" fill="${down}" opacity=".12"/><rect x="${L}" y="${Y(53)}" width="${W - L - R}" height="${Y(50.5) - Y(53)}" fill="${up}" opacity=".15"/>${poly(p, Y, ink, 3)}${label(W - R - 6, Y(66) - 6, 'Resistance: sellers stepped in here', down, 'end')}${label(W - R - 6, Y(50.5) + 16, 'Support: buyers stepped in here', up, 'end')}${label(X(15, 17), Y(74) , 'Breakout ↑', blue, 'end')}`, 'Support and resistance', 'floors and ceilings that the price keeps meeting');
  },
  'ta-1-5': () => {
    const p = [50, 51, 50.5, 51.5, 51, 50.8, 51.6, 51.2, 51.8, 51.5, 52, 56, 58, 59, 60]; const Y = scaler(p, T, 180);
    const v = [20, 22, 19, 21, 20, 18, 23, 20, 22, 21, 24, 70, 55, 40, 35];
    return frame(`${gridLines(Y, p)}${poly(p, Y, ink, 3)}${v.map((x, i) => `<rect x="${X(i, 15) - 14}" y="${H - B - x * 1.1}" width="28" height="${x * 1.1}" rx="3" fill="${i === 11 ? orange : '#c9d3e6'}"/>`).join('')}${label(X(11, 15) - 22, H - B - 60, 'Volume three times normal on the breakout day', orange, 'end')}`, 'Volume confirms a move', 'a jump on heavy trading carries more weight');
  },
  'ta-2-1': () => {
    const p = series(120, 50, 0.0025, 0.09, 5); const Y = scaler(p); const m20 = sma(p, 20); const m50 = sma(p, 50);
    return frame(`${gridLines(Y, p)}${poly(p, Y, '#9aa3c4', 1.6)}${poly(m20, Y, blue, 2.6)}${poly(m50, Y, orange, 2.6)}${label(L + 6, T + 14, 'Daily price', '#6b7896')}${label(L + 110, T + 14, '20-day average', blue)}${label(L + 240, T + 14, '50-day average', orange)}`, 'Moving averages', 'the averages smooth out day-to-day noise');
  },
  'ta-2-2': () => {
    const p = [...series(70, 60, -0.004, 0.06, 7), ...series(80, 46, 0.006, 0.06, 8)]; const Y = scaler(p); const m50 = sma(p, 50); const m200 = sma(p, 30).map((v, i) => (v === null ? null : v * 0.6 + 53 * 0.4));
    let cross = 0; for (let i = 1; i < p.length; i += 1) if (m50[i - 1] !== null && m200[i - 1] !== null && m50[i - 1] < m200[i - 1] && m50[i] > m200[i]) cross = i;
    return frame(`${gridLines(Y, p)}${poly(p, Y, '#9aa3c4', 1.4)}${poly(m50, Y, up, 2.8)}${poly(m200, Y, orange, 2.8)}${cross ? `<circle cx="${X(cross, p.length)}" cy="${Y(m50[cross])}" r="10" fill="none" stroke="${ink}" stroke-width="2.5"/>${label(X(cross, p.length) - 14, Y(m50[cross]) + 30, 'Golden cross: the faster average moves above the slower one', ink, 'end')}` : ''}${label(L + 6, T + 14, 'Faster average', up)}${label(L + 130, T + 14, 'Slower average', orange)}`, 'Golden cross', 'the opposite, falling below, is called a death cross');
  },
  'ta-2-3': () => {
    const p = series(90, 50, 0.002, 0.14, 9); const ch = p.map((v, i) => (i ? v - p[i - 1] : 0));
    const r = p.map((_, i) => { if (i < 14) return null; const w = ch.slice(i - 13, i + 1); const g = w.filter((x) => x > 0).reduce((a, b) => a + b, 0); const l = -w.filter((x) => x < 0).reduce((a, b) => a + b, 0); return l ? 100 - 100 / (1 + g / l) : 100; });
    const PY = scaler(p, T, 130); const RY = (v) => 160 + (1 - v / 100) * 110;
    return frame(`${poly(p, PY, ink, 2.4)}<rect x="${L}" y="${RY(100)}" width="${W - L - R}" height="${RY(70) - RY(100)}" fill="${down}" opacity=".1"/><rect x="${L}" y="${RY(30)}" width="${W - L - R}" height="${RY(0) - RY(30)}" fill="${up}" opacity=".12"/><line x1="${L}" x2="${W - R}" y1="${RY(70)}" y2="${RY(70)}" stroke="${down}" stroke-dasharray="5 4"/><line x1="${L}" x2="${W - R}" y1="${RY(30)}" y2="${RY(30)}" stroke="${up}" stroke-dasharray="5 4"/>${poly(r, RY, purple, 2.4)}${label(W - R - 4, RY(70) - 5, 'Above 70: “overbought”', down, 'end', 12)}${label(W - R - 4, RY(30) + 15, 'Below 30: “oversold”', up, 'end', 12)}${label(L + 4, 152, 'RSI (0 to 100)', purple, 'start', 12)}${label(L + 4, T + 12, 'Price', '#6b7896', 'start', 12)}`, 'RSI: the speed of recent moves', 'from 0 to 100');
  },
  'ta-2-4': () => {
    const p = series(110, 50, 0.002, 0.1, 11);
    const e = (v, n) => { const k = 2 / (n + 1); let prev = v[0]; return v.map((x) => (prev = x * k + prev * (1 - k))); };
    const line = e(p, 12).map((v, i) => v - e(p, 26)[i]); const sig = e(line, 9); const hist = line.map((v, i) => v - sig[i]);
    const PY = scaler(p, T, 120); const all = [...line, ...sig]; const MY = scaler(all, 150, H - B);
    const hm = Math.max(...hist.map(Math.abs)); const mid = MY(0);
    const bars = hist.map((v, i) => `<rect x="${X(i, 110) - 2}" y="${v >= 0 ? mid - Math.abs(v) / hm * 40 : mid}" width="4" height="${Math.abs(v) / hm * 40}" fill="${v >= 0 ? up : down}" opacity=".6"/>`).join('');
    return frame(`${poly(p, PY, ink, 2.2)}<line x1="${L}" x2="${W - R}" y1="${mid}" y2="${mid}" stroke="${grid}"/>${bars}${poly(line, MY, blue, 2.2)}${poly(sig, MY, orange, 2.2)}${label(L + 4, 146, 'MACD line', blue, 'start', 12)}${label(L + 90, 146, 'Signal line', orange, 'start', 12)}${label(L + 180, 146, 'Bars: the gap between them', '#6b7896', 'start', 12)}`, 'MACD', 'momentum turning up when the blue line crosses above the orange');
  },
  'ta-3-1': () => {
    const p = [...series(50, 50, 0.0005, 0.02, 13), ...series(50, 50.5, 0.006, 0.12, 14)]; const Y = scaler(p); const mid = sma(p, 20);
    const sd = p.map((_, i) => (i < 19 ? null : Math.sqrt(p.slice(i - 19, i + 1).reduce((a, x) => a + (x - mid[i]) ** 2, 0) / 20)));
    const upB = mid.map((m, i) => (m === null ? null : m + 2 * sd[i])); const loB = mid.map((m, i) => (m === null ? null : m - 2 * sd[i]));
    return frame(`${gridLines(Y, p)}${poly(upB, Y, blue, 1.8)}${poly(loB, Y, blue, 1.8)}${poly(mid, Y, blue, 1.2, '4 4')}${poly(p, Y, ink, 2.4)}${label(X(30, 100), Y(Math.max(...p)) + 30, 'Squeeze: narrow bands, quiet price', blue, 'middle')}${label(X(85, 100), T + 14, 'Bands widen as the price moves', blue, 'middle')}`, 'Bollinger bands', 'quiet periods are often followed by bigger moves');
  },
  'ta-3-2': () => {
    const p = [40, 48, 44, 56, 46, 49, 45, 38, 33]; const Y = scaler([...p, 32, 58]);
    const nk = `<line x1="${X(2, 9)}" y1="${Y(44)}" x2="${X(6, 9)}" y2="${Y(45)}" stroke="${down}" stroke-width="2.5" stroke-dasharray="7 5"/>`;
    return frame(`${gridLines(Y, p)}${nk}${poly(p, Y, ink, 3)}${label(X(1, 9), Y(48) - 12, 'Left shoulder', purple, 'middle')}${label(X(3, 9), Y(56) - 12, 'Head', purple, 'middle')}${label(X(5, 9), Y(49) - 12, 'Right shoulder', purple, 'middle')}${label(X(6.2, 9), Y(45) + 24, 'Neckline: a break below is the warning', down, 'end')}`, 'Head and shoulders', 'a pattern often seen near the end of a rise');
  },
  'ta-3-3': () => {
    const p1 = [50, 52, 51, 53, 52, 53.5, 56, 58, 60]; const p2 = [50, 52, 51, 53, 52, 53.5, 55.5, 52.5, 51];
    const Y = scaler([...p1, ...p2]); const res = Y(54);
    const half = (vals, x0, x1, col) => `<polyline fill="none" stroke="${col}" stroke-width="3" points="${vals.map((v, i) => `${(x0 + (i / (vals.length - 1)) * (x1 - x0)).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>`;
    return frame(`<line x1="${L}" x2="${W / 2 - 20}" y1="${res}" y2="${res}" stroke="${down}" stroke-dasharray="6 4"/><line x1="${W / 2 + 20}" x2="${W - R}" y1="${res}" y2="${res}" stroke="${down}" stroke-dasharray="6 4"/>${half(p1, L, W / 2 - 20, up)}${half(p2, W / 2 + 20, W - R, down)}${label(L + (W / 2 - 20 - L) / 2, H - 8, 'Breakout: closes above and keeps going', up, 'middle')}${label(W / 2 + 20 + (W / 2 - 36) / 2, H - 8, 'Fakeout: pokes above, then falls back', down, 'middle')}`, 'Breakout or fakeout?', 'waiting for a close above the level, ideally on high volume');
  },
  'ta-3-4': () => {
    const p = series(120, 50, 0.002, 0.16, 17); const Y1 = scaler(p, T, H - B); const wk = p.filter((_, i) => i % 5 === 4);
    const x0 = L; const x1 = W / 2 - 16; const x2 = W / 2 + 16; const x3 = W - R;
    const at = (vals, a, b) => vals.map((v, i) => `${(a + (i / (vals.length - 1)) * (b - a)).toFixed(1)},${Y1(v).toFixed(1)}`).join(' ');
    return frame(`<polyline fill="none" stroke="${ink}" stroke-width="1.6" points="${at(p, x0, x1)}"/><polyline fill="none" stroke="${blue}" stroke-width="3" points="${at(wk, x2, x3)}"/>${label((x0 + x1) / 2, H - 8, 'Daily: lots of zig-zags', ink, 'middle')}${label((x2 + x3) / 2, H - 8, 'Weekly: the same prices, clearer trend', blue, 'middle')}`, 'Timeframes', 'longer timeframes show the bigger picture');
  },
  'ta-4-1': () => {
    const Y = (v) => T + (1 - (v - 40) / 30) * (H - T - B);
    return frame(`<rect x="${L + 60}" y="${Y(64)}" width="300" height="${Y(52) - Y(64)}" fill="${up}" opacity=".18"/><rect x="${L + 60}" y="${Y(52)}" width="300" height="${Y(46) - Y(52)}" fill="${down}" opacity=".18"/><line x1="${L + 60}" x2="${L + 360}" y1="${Y(52)}" y2="${Y(52)}" stroke="${ink}" stroke-width="2.5"/>${label(L + 370, Y(64) + 4, 'Target $64: possible gain $12')}${label(L + 370, Y(52) + 4, 'Buy at $52')}${label(L + 370, Y(46) + 4, 'Stop-loss $46: most you plan to lose, $6', down)}${label(L + 60, H - 8, 'Reward $12 ÷ risk $6 = 2 to 1. Risk 1% of a $10,000 account ($100) ÷ $6 = about 16 shares.', '#4a5170', 'start', 12)}`, 'Risk first', 'decide the exit and the size before you buy');
  },
  'ta-4-2': () => {
    const box = (x, col, t, lines) => `<rect x="${x}" y="40" width="300" height="200" rx="14" fill="${col}" opacity=".1" stroke="${col}"/>${label(x + 150, 70, t, col, 'middle', 16)}${lines.map((l, i) => label(x + 20, 105 + i * 28, `• ${l}`, ink, 'start', 13)).join('')}`;
    return frame(`${box(40, blue, 'The business (fundamentals)', ['Is it growing and profitable?', 'Is debt under control?', 'Health score, dividends', 'Answers: what to own'])}${box(380, orange, 'The chart (technicals)', ['Which way is the trend?', 'Is momentum rising or fading?', 'Where are support levels?', 'Helps with: when, and how much'])}${label(W / 2, 274, 'Many investors use the business to choose and the chart to time and size', '#4a5170', 'middle', 13)}`, 'Fundamentals and technicals together');
  },
  'ta-4-3': () => {
    const items = [['Costs and taxes eat small edges', down], ['Many patterns are no better than chance once costs are counted', down], ['Trend-following has worked in some long studies', up], ['Momentum effects appear in academic research', up], ['Discipline and risk control matter most', blue]];
    return frame(items.map(([t, c], i) => `<rect x="60" y="${34 + i * 50}" width="600" height="40" rx="10" fill="${c}" opacity=".12"/>${label(80, 60 + i * 50, t, c)}`).join(''), 'What the evidence says, in short');
  },
  'ta-4-4': () => {
    const steps = ['Trend: above or below the 200-day average?', 'Momentum: RSI and MACD', 'Levels: nearest support and resistance', 'Volume: is the move backed by trading?', 'Risk: where is the stop, how big is the position?'];
    return frame(steps.map((t, i) => `<circle cx="70" cy="${50 + i * 50}" r="16" fill="${[up, blue, orange, purple, down][i]}"/>${label(70, 55 + i * 50, String(i + 1), '#fff', 'middle', 14)}${label(100, 55 + i * 50, t, ink, 'start', 15)}`).join(''), 'The five-minute chart checklist', 'try it on any company with the Chart check');
  },
};

/** The diagram for a lesson, or ''. */
export function taDiagramHtml(courseId) {
  const f = D[courseId];
  if (!f) return '';
  try { return f(); } catch { return ''; }
}
