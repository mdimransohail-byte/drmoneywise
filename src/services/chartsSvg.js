/* ════════════════════════════════════════════════════════════════════════
   CHARTS — plain SVG charts and number words shared by the Property,
   Commodities, Bonds and ETF pages. Readable without JavaScript; hover or
   tap shows the exact figure. Colours: blue + orange (a pair that stays
   distinct for colour-blind readers), text in the site's ink colours.
   ════════════════════════════════════════════════════════════════════════ */

export const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

// Chart colours (validated pair: blue + orange, safe for colour-blind readers)
export const C = { blue: '#2a78d6', orange: '#eb6834', grid: '#e4d9c3', axis: '#8b8571', text: '#4a5170', ink: '#0a1128' };

/* ── Words for periods and numbers ────────────────────────────────── */
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const QWORDS = { 1: 'Jan–Mar', 2: 'Apr–Jun', 3: 'Jul–Sep', 4: 'Oct–Dec' };
export function periodWords(p) {
  if (/^\d{4}-Q[1-4]$/u.test(p)) return `${QWORDS[p.slice(-1)]} ${p.slice(0, 4)}`;
  if (/^\d{4}-\d{2}$/u.test(p)) return `${MONTHS[Number(p.slice(5)) - 1]} ${p.slice(0, 4)}`;
  return p || '';
}
export const shortPeriod = (p) => (/^\d{4}-Q/u.test(p) ? `Q${p.slice(-1)} ${p.slice(2, 4)}` : /^\d{4}-\d{2}$/u.test(p) ? `${MONTHS[Number(p.slice(5)) - 1].slice(0, 3)} ${p.slice(2, 4)}` : p);
export const pct = (v, dp = 1) => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const shown = Math.abs(v).toFixed(dp);
  if (Number(shown) === 0) return `${(0).toFixed(dp)}%`; // no "−0.0%"
  return `${v > 0 ? '+' : '−'}${shown}%`;
};
export const plainPct = (v, dp = 1) => `${Math.abs(v).toFixed(dp)}%`;
export const upDown = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat');
export const money = (v, cur) => {
  if (v === null || v === undefined) return '—';
  const sym = { GBP: '£', USD: '$', AED: 'AED ' }[cur] || '';
  return `${sym}${Math.round(v).toLocaleString('en-GB')}`;
};


export function changeOver(list, steps) {
  if (!list || list.length <= steps) return null;
  const a = list[list.length - 1 - steps].v;
  const b = list.at(-1).v;
  return a ? ((b / a) - 1) * 100 : null;
}


/* ── Charts (plain SVG, readable without JavaScript) ──────────────── */
export function niceTicks(min, max, count = 5) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return ticks;
}

/** Line chart. series: [{ name, color, points: [{ p, v }] }] (same periods). */
export function lineChart({ series, title, fmt = (v) => v.toFixed(0), height = 280, labelEnds = true }) {
  const W = 760; const H = height; const L = 48; const R = labelEnds ? 112 : 18; const T = 16; const B = 34;
  const all = series.flatMap((s) => s.points.map((x) => x.v));
  if (!all.length) return '';
  const ticks = niceTicks(Math.min(...all), Math.max(...all));
  const y0 = ticks[0]; const y1 = ticks.at(-1);
  const n = Math.max(...series.map((s) => s.points.length));
  const X = (i) => L + (i / Math.max(1, n - 1)) * (W - L - R);
  const Y = (v) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const periods = series[0].points.map((x) => x.p);
  const years = periods.map((p, i) => [p, i]).filter(([p]) => /-Q1$|-01$/u.test(p));
  const every = Math.ceil(years.length / 7) || 1;
  const grid = ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" stroke="${C.grid}" stroke-width="1"/><text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="12" fill="${C.text}">${esc(fmt(t))}</text>`).join('');
  const xlabels = years.filter((_, k) => k % every === 0).map(([p, i]) => `<text x="${X(i)}" y="${H - 10}" text-anchor="middle" font-size="12" fill="${C.text}">${p.slice(0, 4)}</text>`).join('');
  const lines = series.map((s) => `<polyline fill="none" stroke="${s.color}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" points="${s.points.map((x, i) => `${X(i).toFixed(1)},${Y(x.v).toFixed(1)}`).join(' ')}"/>`).join('');
  // Direct labels at the right end (kept apart if they would overlap)
  const ends = series.map((s) => ({ s, y: Y(s.points.at(-1).v) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i += 1) if (ends[i].y - ends[i - 1].y < 30) ends[i].y = ends[i - 1].y + 30;
  const labels = labelEnds ? ends.map(({ s, y }) => `<circle cx="${X(s.points.length - 1)}" cy="${Y(s.points.at(-1).v)}" r="4" fill="${s.color}" stroke="#fbf7ef" stroke-width="2"/><text x="${W - R + 10}" y="${y - 2}" font-size="13" font-weight="700" fill="${C.ink}">${esc(fmt(s.points.at(-1).v))}</text><text x="${W - R + 10}" y="${y + 13}" font-size="11.5" fill="${C.text}">${esc(s.name)}</text>`).join('') : '';
  // Hover: one invisible column per period, with a tooltip listing every series
  const step = (W - L - R) / Math.max(1, n - 1);
  const hits = periods.map((p, i) => `<g class="pr-hit"><rect x="${X(i) - step / 2}" y="${T}" width="${Math.max(step, 4)}" height="${H - T - B}" fill="transparent"/><line x1="${X(i)}" x2="${X(i)}" y1="${T}" y2="${H - B}" stroke="${C.axis}" stroke-width="1"/>${series.map((s) => (s.points[i] ? `<circle cx="${X(i)}" cy="${Y(s.points[i].v)}" r="4" fill="${s.color}" stroke="#fff" stroke-width="2"/>` : '')).join('')}<title>${esc(periodWords(p))}: ${series.map((s) => (s.points[i] ? `${s.name} ${fmt(s.points[i].v)}` : '')).filter(Boolean).join(' · ')}</title></g>`).join('');
  return `<div class="pr-chart"><svg class="pr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${grid}${xlabels}${lines}${labels}${hits}</svg></div>`;
}

/** Column chart of % changes (blue above zero, orange below), every bar labelled. */
export function changeBars({ points, title, height = 240, fmt = pct, tip = 'on a year earlier', axisFmt = (t) => `${t}%`, label = shortPeriod }) {
  if (!points?.length) return '';
  const W = 760; const H = height; const L = 44; const R = 12; const T = 22; const B = 34;
  const vals = points.map((x) => x.v);
  const ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals), 4);
  const y0 = ticks[0]; const y1 = ticks.at(-1);
  const Y = (v) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const slot = (W - L - R) / points.length;
  const bw = Math.min(46, slot * 0.62);
  const grid = ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" stroke="${t === 0 ? C.axis : C.grid}" stroke-width="1"/><text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="12" fill="${C.text}">${esc(axisFmt(t))}</text>`).join('');
  const bars = points.map((x, i) => {
    const cx = L + slot * i + slot / 2;
    const top = Math.min(Y(x.v), Y(0));
    const h = Math.max(1.5, Math.abs(Y(x.v) - Y(0)));
    const r = Math.min(4, h / 2);
    const up = x.v >= 0;
    const path = up
      ? `M${cx - bw / 2},${top + h} V${top + r} Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top} H${cx + bw / 2 - r} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r} V${top + h} Z`
      : `M${cx - bw / 2},${top} V${top + h - r} Q${cx - bw / 2},${top + h} ${cx - bw / 2 + r},${top + h} H${cx + bw / 2 - r} Q${cx + bw / 2},${top + h} ${cx + bw / 2},${top + h - r} V${top} Z`;
    return `<g class="pr-hit"><path d="${path}" fill="${up ? C.blue : C.orange}"/><text x="${cx}" y="${up ? top - 6 : top + h + 15}" text-anchor="middle" font-size="12" font-weight="700" fill="${C.ink}">${esc(fmt(x.v))}</text><text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="11.5" fill="${C.text}">${esc(label(x.p))}</text><title>${esc(x.tipLabel || periodWords(x.p))}: ${esc(fmt(x.v))} ${esc(tip)}</title></g>`;
  }).join('');
  return `<div class="pr-chart"><svg class="pr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${grid}${bars}</svg></div>`;
}

/** Horizontal ranking (places, holdings…). rows: [{ name, v, href?, p?, tip? }] */
export function rankBars({ rows, title, fmt = pct, labelWidth = 150, link = true }) {
  if (!rows.length) return '';
  const W = 760; const rowH = 34; const L = labelWidth; const R = 70; const T = 8;
  const H = T * 2 + rows.length * rowH;
  const vals = rows.map((r) => r.v);
  const lo = Math.min(0, ...vals); const hi = Math.max(0, ...vals);
  const X = (v) => L + ((v - lo) / (hi - lo || 1)) * (W - L - R);
  const zero = X(0);
  const body = rows.map((r, i) => {
    const y = T + i * rowH + 7;
    const x1 = Math.min(X(r.v), zero); const w = Math.max(2, Math.abs(X(r.v) - zero));
    const up = r.v >= 0;
    const name = String(r.name || '');
    const short = name.length > Math.floor(L / 7.6) ? `${name.slice(0, Math.floor(L / 7.6) - 1)}…` : name;
    const inner = `<text x="${L - 10}" y="${y + 14}" text-anchor="end" font-size="13.5" fill="${C.ink}">${esc(short)}</text><rect x="${x1}" y="${y + 2}" width="${w}" height="16" rx="3" fill="${up ? C.blue : C.orange}"/><text x="${up ? x1 + w + 6 : zero + 6}" y="${y + 15}" text-anchor="start" font-size="12.5" font-weight="700" fill="${C.ink}">${esc(fmt(r.v))}</text>`;
    const href = r.href || (r.slug ? `/property/${r.slug}` : '');
    return `<g class="pr-hit">${link && href ? `<a href="${esc(href)}">${inner}</a>` : inner}<title>${esc(name)}: ${esc(fmt(r.v))}${r.tip ? ` ${esc(r.tip)}` : r.p ? ` (${esc(periodWords(r.p))})` : ''}</title></g>`;
  }).join('');
  return `<div class="pr-chart"><svg class="pr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><line x1="${zero}" x2="${zero}" y1="${T}" y2="${H - T}" stroke="${C.axis}"/>${body}</svg></div>`;
}

/** Small trend line for a place card. */
export function spark(list) {
  const pts = (list || []).slice(-21);
  if (pts.length < 3) return '';
  const W = 120; const H = 34;
  const vs = pts.map((x) => x.v); const lo = Math.min(...vs); const hi = Math.max(...vs);
  const d = pts.map((x, i) => `${((i / (pts.length - 1)) * W).toFixed(1)},${(H - 3 - ((x.v - lo) / (hi - lo || 1)) * (H - 6)).toFixed(1)}`).join(' ');
  return `<svg class="pr-spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline fill="none" stroke="${C.blue}" stroke-width="2" points="${d}"/></svg>`;
}

/** Gauge: where a ratio sits against its long-term average (100). */
export function gauge({ value, label, low, high }) {
  const lo = 60; const hi = 160;
  const clamp = Math.max(lo, Math.min(hi, value));
  const pos = ((clamp - lo) / (hi - lo)) * 100;
  const gap = value - 100;
  return `<div class="pr-gauge">
        <div class="pr-gauge-head"><span>${esc(label)}</span><strong>${Math.round(value)}</strong></div>
        <div class="pr-gauge-bar"><span class="pr-gauge-avg" style="left:40%"></span><span class="pr-gauge-dot" style="left:${pos}%"></span></div>
        <div class="pr-gauge-scale"><span>${esc(low)}</span><span>100 = long-term average</span><span>${esc(high)}</span></div>
        <p>${Math.abs(gap) < 3 ? 'About the same as its long-term average.' : `${plainPct(gap, 0)} ${gap > 0 ? 'above' : 'below'} its long-term average.`}</p>
      </div>`;
}

export function tile(label, value, note, tone = '') {
  return `<div class="pr-tile${tone ? ` ${tone}` : ''}"><span class="pr-tile-label">${esc(label)}</span><strong>${value}</strong>${note ? `<span class="pr-tile-note">${note}</span>` : ''}</div>`;
}
export const toneOf = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'up' : 'down');
