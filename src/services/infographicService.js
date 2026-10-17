/* ════════════════════════════════════════════════════════════════════════
   INFOGRAPHICS — drawn by code as SVG, straight from the data files
   ───────────────────────────────────────────────────────────────────────
   Replaces paid Gamma images for data pictures: free, instant, and always
   matching the numbers on the page. Each function returns an <svg> string
   that can sit inside a page or be served on its own.

   Design rules (approved homepage style): navy bars on paper, gold for
   crypto, one hue per chart, rounded bar ends, values labelled at the bar
   end, ratings always shown with a symbol + word (never colour alone).
   ════════════════════════════════════════════════════════════════════════ */

import { GRADE_TEXT } from './reportCardService.js';

const C = {
  navy: '#0a1128',
  gold: '#c9a227',
  paper: '#fbf7ef',
  track: '#efe5d0',
  ink: '#0a1128',
  ink2: '#4a5170',
  line: '#d9ccb2',
  good: '#23704a',
  okay: '#8a6d12',
  weak: '#a8322d',
  none: '#6b7089',
};
const FONT_SANS = "'Public Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_SERIF = "'Literata', Georgia, serif";
const GRADE_ICON = { good: '✓', okay: '–', weak: '✕', none: '•' };

function esc(value) {
  return String(value ?? '')
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;');
}

/** Bar with rounded data end (4px) and square baseline end. */
function barPath(x, y, width, height, radius = 4) {
  const w = Math.max(width, 0.01);
  const r = Math.min(radius, w / 2, height / 2);
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + height - r} Q${x + w},${y + height} ${x + w - r},${y + height} H${x} Z`;
}

function wrap(svgBody, { width, height, title, desc }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-labelledby="t d" style="max-width:${width}px;height:auto;display:block">
  <title id="t">${esc(title)}</title><desc id="d">${esc(desc || title)}</desc>
  <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="${C.paper}"/>
  ${svgBody}
</svg>`;
}

function footer(width, height, source) {
  return `<text x="28" y="${height - 18}" font-family="${FONT_SANS}" font-size="12" fill="${C.ink2}">${esc(source)}</text>
  <text x="${width - 28}" y="${height - 18}" text-anchor="end" font-family="${FONT_SERIF}" font-size="13" font-weight="700" fill="${C.gold}">Dr MoneyWise</text>`;
}

/**
 * Ranked horizontal bars (Top 10 lists).
 * rows: [{ label, sublabel?, value, display }]
 */
export function rankingBars({ title, subtitle = '', rows = [], accent = 'navy', source = '' }) {
  const width = 720;
  const rowH = 40;
  const top = subtitle ? 92 : 70;
  const height = top + rows.length * rowH + 52;
  const labelW = 220;
  const valueW = 90;
  const barX = 28 + labelW;
  const barMax = width - barX - valueW - 28;
  const max = Math.max(...rows.map((row) => row.value), 0) || 1;
  const fill = accent === 'gold' ? C.gold : C.navy;

  const body = rows.map((row, i) => {
    const y = top + i * rowH;
    const w = (row.value / max) * barMax;
    return `<g>
      <text x="28" y="${y + 17}" font-family="${FONT_SANS}" font-size="15" font-weight="700" fill="${C.ink}">${i + 1}. ${esc(row.label)}</text>
      ${row.sublabel ? `<text x="28" y="${y + 33}" font-family="${FONT_SANS}" font-size="12" fill="${C.ink2}">${esc(row.sublabel)}</text>` : ''}
      <rect x="${barX}" y="${y + 6}" width="${barMax}" height="16" rx="4" fill="${C.track}"/>
      <path d="${barPath(barX, y + 6, w, 16)}" fill="${fill}"><title>${esc(`${row.label}: ${row.display}`)}</title></path>
      <text x="${width - 28}" y="${y + 19}" text-anchor="end" font-family="${FONT_SANS}" font-size="15" font-weight="600" fill="${C.ink}" style="font-variant-numeric:tabular-nums">${esc(row.display)}</text>
    </g>`;
  }).join('\n');

  return wrap(`
  <text x="28" y="42" font-family="${FONT_SERIF}" font-size="24" font-weight="700" fill="${C.ink}">${esc(title)}</text>
  ${subtitle ? `<text x="28" y="66" font-family="${FONT_SANS}" font-size="14" fill="${C.ink2}">${esc(subtitle)}</text>` : ''}
  ${body}
  ${footer(width, height, source)}`, { width, height, title, desc: rows.map((r) => `${r.label} ${r.display}`).join(', ') });
}

/**
 * Yearly bars (e.g. 5 years of sales, 15 years of dividends).
 * series: [{ year, value }], format: value => string
 */
export function yearBars({ title, subtitle = '', series = [], format = (v) => String(v), source = '', accent = 'navy' }) {
  const width = 720;
  const height = 320;
  const left = 28;
  const right = 28;
  const top = subtitle ? 96 : 76;
  const bottom = 62;
  const plotH = height - top - bottom;
  const n = series.length || 1;
  const gap = n > 10 ? 6 : 14;
  const barW = (width - left - right - gap * (n - 1)) / n;
  const max = Math.max(...series.map((row) => Math.max(row.value, 0)), 0) || 1;
  const fill = accent === 'gold' ? C.gold : C.navy;
  const labelEvery = n > 10 ? 2 : 1;

  const bars = series.map((row, i) => {
    const h = Math.max((Math.max(row.value, 0) / max) * plotH, row.value > 0 ? 2 : 0);
    const x = left + i * (barW + gap);
    const y = top + plotH - h;
    const r = Math.min(4, barW / 2, h / 2);
    const isLast = i === n - 1;
    const isFirst = i === 0;
    return `<g>
      <path d="M${x},${top + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${top + plotH} Z" fill="${fill}" opacity="${isLast ? 1 : 0.78}"><title>${esc(`${row.year}: ${format(row.value)}`)}</title></path>
      ${(isLast || isFirst) ? `<text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-family="${FONT_SANS}" font-size="13" font-weight="600" fill="${C.ink}">${esc(format(row.value))}</text>` : ''}
      ${i % labelEvery === 0 || isLast ? `<text x="${x + barW / 2}" y="${top + plotH + 20}" text-anchor="middle" font-family="${FONT_SANS}" font-size="12" fill="${C.ink2}">${row.year}</text>` : ''}
    </g>`;
  }).join('\n');

  return wrap(`
  <text x="28" y="42" font-family="${FONT_SERIF}" font-size="24" font-weight="700" fill="${C.ink}">${esc(title)}</text>
  ${subtitle ? `<text x="28" y="66" font-family="${FONT_SANS}" font-size="14" fill="${C.ink2}">${esc(subtitle)}</text>` : ''}
  <line x1="${left}" y1="${top + plotH}" x2="${width - right}" y2="${top + plotH}" stroke="${C.line}" stroke-width="1"/>
  ${bars}
  ${footer(width, height, source)}`, { width, height, title, desc: series.map((r) => `${r.year}: ${format(r.value)}`).join(', ') });
}

/** Five-line report card with symbol + word ratings. ratings from reportCardService. */
export function reportCard({ title, subtitle = '', ratings = [], source = '' }) {
  const width = 720;
  const rowH = 64;
  const top = 92;
  const height = top + ratings.length * rowH + 50;

  const rows = ratings.map((rating, i) => {
    const y = top + i * rowH;
    const colour = C[rating.grade] || C.none;
    const word = GRADE_TEXT[rating.grade] || '';
    return `<g>
      <rect x="28" y="${y}" width="${width - 56}" height="${rowH - 10}" rx="12" fill="#ffffff" stroke="${C.line}"/>
      <rect x="40" y="${y + 12}" width="96" height="30" rx="15" fill="${colour}"/>
      <text x="88" y="${y + 32}" text-anchor="middle" font-family="${FONT_SANS}" font-size="14" font-weight="700" fill="#ffffff">${GRADE_ICON[rating.grade] || ''} ${esc(word)}</text>
      <text x="152" y="${y + 23}" font-family="${FONT_SANS}" font-size="15" font-weight="700" fill="${C.ink}">${esc(rating.label)}</text>
      <text x="152" y="${y + 42}" font-family="${FONT_SANS}" font-size="13" fill="${C.ink2}">${esc(rating.plain)}</text>
    </g>`;
  }).join('\n');

  return wrap(`
  <text x="28" y="42" font-family="${FONT_SERIF}" font-size="24" font-weight="700" fill="${C.ink}">${esc(title)}</text>
  <text x="28" y="66" font-family="${FONT_SANS}" font-size="14" fill="${C.ink2}">${esc(subtitle)}</text>
  ${rows}
  ${footer(width, height, source)}`, { width, height, title, desc: ratings.map((r) => `${r.label} ${GRADE_TEXT[r.grade]}: ${r.plain}`).join('. ') });
}

/** Economy tiles: big number, plain label, direction vs previous. */
export function economyTiles({ title, figures = [], source = '' }) {
  const width = 720;
  const cols = figures.length > 3 ? 3 : figures.length || 1;
  const rowsN = Math.ceil(figures.length / cols);
  const tileW = (width - 56 - (cols - 1) * 14) / cols;
  const tileH = 112;
  const top = 68;
  const height = top + rowsN * (tileH + 14) + 40;

  const tiles = figures.map((fig, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 28 + col * (tileW + 14);
    const y = top + row * (tileH + 14);
    const diff = fig.previous === null || fig.previous === undefined ? null : fig.value - fig.previous;
    const arrow = diff === null || Math.abs(diff) < 0.005 ? '● no change' : diff > 0 ? `▲ up from ${fig.previous}${fig.unit}` : `▼ down from ${fig.previous}${fig.unit}`;
    return `<g>
      <rect x="${x}" y="${y}" width="${tileW}" height="${tileH}" rx="12" fill="#ffffff" stroke="${C.line}"/>
      <text x="${x + 16}" y="${y + 26}" font-family="${FONT_SANS}" font-size="13" fill="${C.ink2}">${esc(fig.label)}</text>
      <text x="${x + 16}" y="${y + 66}" font-family="${FONT_SERIF}" font-size="34" font-weight="700" fill="${C.ink}">${esc(`${fig.value}${fig.unit}`)}</text>
      <text x="${x + 16}" y="${y + 94}" font-family="${FONT_SANS}" font-size="12" fill="${C.ink2}">${esc(arrow)}</text>
    </g>`;
  }).join('\n');

  return wrap(`
  <text x="28" y="42" font-family="${FONT_SERIF}" font-size="24" font-weight="700" fill="${C.ink}">${esc(title)}</text>
  ${tiles}
  ${footer(width, height, source)}`, { width, height, title, desc: figures.map((f) => `${f.label}: ${f.value}${f.unit}`).join(', ') });
}

/* ════════════════════════════════════════════════════════════════════════
   HTML versions — used inside pages so they reflow on phones. The SVG
   versions above are for sharing/downloading as images.
   (Styles: "Infographics" section in public/styles.css)
   ════════════════════════════════════════════════════════════════════════ */

function figureWrap(inner, { title, subtitle, source }) {
  return `<figure class="ig">
    <figcaption><h3>${esc(title)}</h3>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</figcaption>
    ${inner}
    <div class="ig-foot"><span>${esc(source)}</span><span class="ig-brand">Dr MoneyWise</span></div>
  </figure>`;
}

export function rankingBarsHtml({ title, subtitle = '', rows = [], accent = 'navy', source = '' }) {
  const max = Math.max(...rows.map((row) => row.value), 0) || 1;
  const list = rows.map((row, i) => `
      <li>
        <span class="ig-rank-label"><strong>${i + 1}. ${esc(row.label)}</strong>${row.sublabel ? `<small>${esc(row.sublabel)}</small>` : ''}</span>
        <span class="ig-track"><span class="ig-fill${accent === 'gold' ? ' gold' : ''}" style="width:${((row.value / max) * 100).toFixed(1)}%"></span></span>
        <span class="ig-value">${esc(row.display)}</span>
      </li>`).join('');
  return figureWrap(`<ol class="ig-rank">${list}</ol>`, { title, subtitle, source });
}

export function yearBarsHtml({ title, subtitle = '', series = [], format = (v) => String(v), source = '', accent = 'navy' }) {
  const max = Math.max(...series.map((row) => Math.max(row.value, 0)), 0) || 1;
  const n = series.length;
  const step = Math.ceil(n / 7);
  const cols = series.map((row, i) => {
    const pct = Math.max((Math.max(row.value, 0) / max) * 100, row.value > 0 ? 1 : 0);
    const show = i === 0 || i === n - 1;
    const yearLabel = i === n - 1 || (i % step === 0 && n - 1 - i >= step) ? row.year : '';
    return `<div class="ig-col${i === n - 1 ? ' latest' : ''}" title="${esc(`${row.year}: ${format(row.value)}`)}">
        <span class="ig-col-bar${accent === 'gold' ? ' gold' : ''}" style="height:${pct.toFixed(1)}%">${show ? `<span class="ig-col-val">${esc(format(row.value))}</span>` : ''}</span>
        <span class="ig-col-year">${yearLabel}</span>
      </div>`;
  }).join('');
  const table = `<table class="sr-only"><caption>${esc(title)}</caption>${series.map((row) => `<tr><th>${row.year}</th><td>${esc(format(row.value))}</td></tr>`).join('')}</table>`;
  return figureWrap(`<div class="ig-years" aria-hidden="true">${cols}</div>${table}`, { title, subtitle, source });
}

export function reportCardHtml({ title, subtitle = '', ratings = [], source = '' }) {
  const items = ratings.map((rating) => `
      <li>
        <span class="ig-grade ${esc(rating.grade)}">${GRADE_ICON[rating.grade] || ''} ${esc(GRADE_TEXT[rating.grade] || '')}</span>
        <span><strong>${esc(rating.label)}</strong><br/><span class="ig-plain">${esc(rating.plain)}</span></span>
      </li>`).join('');
  return figureWrap(`<ul class="ig-card">${items}</ul>`, { title, subtitle, source });
}

export function economyTilesHtml({ title, figures = [], source = '' }) {
  const fmt = (fig, v) => `${Number(v).toFixed(fig.kind === 'yoy' ? 1 : 2)}${fig.unit}`;
  const tiles = figures.map((fig) => {
    const diff = fig.previous === null || fig.previous === undefined ? null : fig.value - fig.previous;
    const move = diff === null || fmt(fig, fig.value) === fmt(fig, fig.previous) ? '● No change' : diff > 0 ? `▲ Up from ${fmt(fig, fig.previous)}` : `▼ Down from ${fmt(fig, fig.previous)}`;
    return `<div class="ig-tile"><span>${esc(fig.label)}</span><strong>${esc(fmt(fig, fig.value))}</strong><small>${esc(move)}</small></div>`;
  }).join('');
  return figureWrap(`<div class="ig-tiles">${tiles}</div>`, { title, subtitle: '', source });
}
