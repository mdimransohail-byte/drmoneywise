/* ════════════════════════════════════════════════════════════════════════
   SOCIAL STUDIO — branded pictures for social media (Admin → Social studio)
   ───────────────────────────────────────────────────────────────────────
   Paste a link to any page on the site (an explainer, a company, results,
   a Shariah list, a report…) or to a picture, and get JPEG images in the
   usual social sizes, each with the Dr MoneyWise name, the page address,
   the website and the email, plus a ready-made caption.
     · Site links: the words and figures come from the site's own data.
     · Picture links: the picture is framed with our name and details.
       Only use pictures you have the right to post (your own, Pexels…).
   Drawing: an SVG layout → @resvg/resvg-js (with the fonts in
   assets/fonts, SIL Open Font License) → JPEG with jpeg-js.
   Files are kept for 30 days in data/social/.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import opentype from 'opentype.js';
import jpeg from 'jpeg-js';
import { Resvg } from '@resvg/resvg-js';

import { readStore } from './storeService.js';

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');
const OUT_DIR = path.join(process.cwd(), 'data', 'social');
const FONT_FILES = ['Lato-Regular.ttf', 'Lato-Bold.ttf', 'Lato-Black.ttf', 'LibreBaskerville-Bold.ttf'].map((f) => path.join(FONT_DIR, f));

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 × 1080 (Instagram, Facebook, LinkedIn)' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 × 1350 (Instagram, Facebook feed)' },
  story: { w: 1080, h: 1920, label: 'Story 1080 × 1920 (Stories, Reels and Shorts covers)' },
  landscape: { w: 1200, h: 675, label: 'Landscape 1200 × 675 (X, LinkedIn, YouTube community)' },
};
const C = { navy: '#0a1128', navy2: '#1a2a6e', gold: '#c9a227', gold2: '#f7d07c', cream: '#fbf7ef', ink: '#0a1128', grey: '#c9d0e6' };
const TILE_COLOURS = ['#2a78d6', '#1baf7a', '#eb6834', '#eda100', '#6250d6', '#e34948'];

/* ── Fonts and text measuring ─────────────────────────────────────── */
let fonts = null;
async function loadFonts() {
  if (fonts) return fonts;
  const load = async (f) => opentype.parse((await fs.readFile(path.join(FONT_DIR, f))).buffer.slice(0));
  fonts = { regular: await load('Lato-Regular.ttf'), bold: await load('Lato-Bold.ttf'), black: await load('Lato-Black.ttf'), serif: await load('LibreBaskerville-Bold.ttf') };
  return fonts;
}
const FAMILY = { regular: 'Lato', bold: 'Lato', black: 'Lato', serif: 'Libre Baskerville' };
const WEIGHT = { regular: 400, bold: 700, black: 900, serif: 700 };
const width = (font, text, size) => font.getAdvanceWidth(String(text), size);

function wrap(font, text, size, maxW, maxLines) {
  const words = String(text || '').replace(/\s+/gu, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (width(font, test, size) <= maxW || !line) line = test;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (last.length > 1 && width(font, `${last}…`, size) > maxW) last = last.replace(/\s*\S+$/u, '') || last.slice(0, -1);
    cut[maxLines - 1] = `${last}…`;
    return { lines: cut, cut: true };
  }
  return { lines, cut: false };
}
/** Biggest size (from max down to min) where the text fits in maxLines. */
function fit(font, text, maxSize, minSize, maxW, maxLines) {
  for (let s = maxSize; s >= minSize; s -= 2) {
    const r = wrap(font, text, s, maxW, maxLines);
    // A single long word (like a web address) can't wrap: it must also fit the width
    if (!r.cut && r.lines.every((l) => width(font, l, s) <= maxW)) return { size: s, lines: r.lines };
  }
  return { size: minSize, lines: wrap(font, text, minSize, maxW, maxLines).lines };
}
const x = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
function textLines(lines, { x0, y0, size, lh = 1.22, kind = 'regular', fill = '#fff', anchor = 'start' }) {
  return lines.map((l, i) => `<text x="${x0}" y="${Math.round(y0 + size + i * size * lh)}" font-family="${FAMILY[kind]}" font-weight="${WEIGHT[kind]}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${x(l)}</text>`).join('');
}

/* ── Pictures ─────────────────────────────────────────────────────── */
async function fetchImage(url) {
  if (!/^https:\/\//iu.test(String(url || ''))) return null;
  const r = await fetch(url, { headers: { 'User-Agent': 'Dr MoneyWise social studio' }, signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!r?.ok) return null;
  const type = String(r.headers.get('content-type') || '');
  if (!/^image\/(jpeg|jpg|png|webp)/iu.test(type)) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024) return null;
  return { data: `data:${type.split(';')[0]};base64,${buf.toString('base64')}`, type };
}

/* ── What a link is about ─────────────────────────────────────────── */
async function site() {
  const s = (await readStore()).settings || {};
  const domain = String(s.siteDomain || 'drmoneywise.com').replace(/^https?:\/\//u, '').replace(/\/$/u, '');
  return { domain, email: s.supportEmail || `hello@${domain}`, name: s.siteName || 'Dr MoneyWise' };
}
const cut = (t, n) => (String(t || '').length > n ? `${String(t).slice(0, n).replace(/\s+\S*$/u, '')}…` : String(t || ''));
const money = (v) => { const a = Math.abs(v); return `${v < 0 ? '−' : ''}$${a >= 1e12 ? `${(a / 1e12).toFixed(2)} trillion` : a >= 1e9 ? `${(a / 1e9).toFixed(1)} billion` : a >= 1e6 ? `${(a / 1e6).toFixed(0)} million` : Math.round(a).toLocaleString('en-GB')}`; };

/** Reads a link and returns what to put on the picture. */
export async function contentFor(rawUrl, { origin = '' } = {}) {
  let u;
  try { u = new URL(String(rawUrl || '').trim(), origin || 'https://drmoneywise.com'); } catch { throw Object.assign(new Error('That doesn’t look like a link.'), { status: 400 }); }
  const s = await site();
  const own = !rawUrl.startsWith('http') || u.hostname.replace(/^www\./u, '') === s.domain || /railway\.app$|localhost$/u.test(u.hostname) || (origin && u.origin === new URL(origin).origin);
  const p = u.pathname.replace(/\/$/u, '') || '/';
  const shortLink = `${s.domain}${p === '/' ? '' : p}`;

  if (!own) {
    const img = await fetchImage(u.href);
    if (!img) throw Object.assign(new Error('Only links to pages on our own site, or direct links to a JPEG, PNG or WebP picture, can be used.'), { status: 400 });
    return { kind: 'picture', badge: '', title: '', image: img.data, link: s.domain, site: s };
  }

  const store = await readStore();
  let m;
  if ((m = p.match(/^\/learn\/([a-z0-9-]+)$/u)) && m[1] !== 'path') {
    const a = (store.articles || []).find((y) => y.slug === m[1] && y.status === 'published');
    if (!a) throw Object.assign(new Error('Explainer not found (or not published yet).'), { status: 404 });
    const pts = (a.takeaways || []).map((t) => (typeof t === 'string' ? t : t.text || t.point || '')).filter(Boolean);
    const info = (a.infographic?.items || []).filter((i) => i.label && i.value).slice(0, 4).map((i) => ({ label: i.label, value: i.value }));
    const secs = (a.bodySections || []).map((b) => cut(String(b.body || '').split(/(?<=[.!?])\s/u)[0], 140)).filter(Boolean);
    return {
      kind: 'explainer', badge: a.accessTier === 'premium' ? 'Deeper explainer' : 'Explained simply',
      title: a.headline, sub: a.summary || a.plainEnglish || '', stats: info, points: (pts.length ? pts : secs).slice(0, 4),
      photo: a.heroImage?.url || null, link: shortLink, site: s, tags: ['#PersonalFinance', '#MoneyTips', '#LearnToInvest'],
      gamma: { headline: a.headline, infographic: a.infographic },
    };
  }
  if (p === '/results') {
    const { readResults } = await import('./resultsService.js');
    const items = readResults().items || [];
    const id = (u.hash || '').replace(/^#r-/u, '') || u.searchParams.get('id');
    const r = (id && items.find((y) => y.id === id)) || items.find((y) => y.simple);
    if (!r) throw Object.assign(new Error('No explained results found yet.'), { status: 404 });
    return {
      kind: 'results', badge: 'Company results', title: `${r.name}: ${r.headline}`, sub: cut(r.simple, 260),
      stats: (r.numbers || []).slice(0, 4).map((n) => ({ label: n.label, value: n.value, note: n.change || '' })),
      points: [], photo: null, link: `${s.domain}/results`, site: s, tags: ['#Earnings', `#${r.ticker}`, '#Stocks'], ticker: r.ticker,
    };
  }
  if ((m = p.match(/^\/stock\/([A-Za-z0-9.-]+)$/u))) {
    const t = m[1].toUpperCase();
    const { readCompanies } = await import('./dataEngine.js');
    const { buildReportCard } = await import('./reportCardService.js');
    const c = (await readCompanies()).companies?.[t];
    if (!c) throw Object.assign(new Error('We don’t have figures for that company yet.'), { status: 404 });
    const d = c.derived || {};
    const stats = [
      c.revenue?.at(-1)?.value ? { label: 'Yearly sales', value: money(c.revenue.at(-1).value) } : null,
      d.revenueGrowth != null ? { label: 'Sales growth', value: `${d.revenueGrowth >= 0 ? '+' : ''}${(d.revenueGrowth * 100).toFixed(1)}%` } : null,
      d.profitMargin != null ? { label: 'Profit kept per $1', value: `${Math.round(d.profitMargin * 100)}¢` } : null,
      d.yearsOfDividendRaises ? { label: 'Dividend raises', value: `${d.yearsOfDividendRaises} years` } : null,
    ].filter(Boolean);
    const grades = buildReportCard(c).slice(0, 4).map((g) => g.plain);
    const { getPhoto, industryQuery } = await import('./imageService.js');
    const photo = await getPhoto(`industry:${industryQuery(c.industry)}`, industryQuery(c.industry)).catch(() => null);
    return { kind: 'company', badge: 'Company report card', title: `${String(c.displayName || c.name).replace(/\s*\/[A-Za-z]{2,3}\/?\s*$/u, '')} (${t})`, sub: '', stats, points: grades, photo: photo?.url || null, link: shortLink, site: s, tags: [`#${t}`, '#Stocks', '#Investing'], ticker: t };
  }
  if ((m = p.match(/^\/shariah(?:\/([a-z-]+))?$/u))) {
    const { shariahTable } = await import('./shariahService.js');
    const { SHARIAH_MARKETS, METHODS } = await import('../data/shariahData.js');
    const mk = SHARIAH_MARKETS.find((y) => y.id === m[1]);
    const rows = (await shariahTable()).rows.filter((r) => !mk || r.market === mk.id);
    const stats = rows.length ? METHODS.slice(0, 4).map((me) => ({ label: `Pass ${me.short}`, value: String(rows.filter((r) => r.results[me.id].result === 'pass').length), note: `of ${rows.length}` })) : [];
    return { kind: 'shariah', badge: 'Shariah-compliant investing', title: mk ? `${mk.name}: which companies are Shariah-compliant?` : 'Is it halal? How Shariah stock checks work', sub: mk?.intro || 'Five standards, side by side: AAOIFI, Dow Jones, S&P, MSCI and FTSE.', stats, points: [], photo: null, link: shortLink, site: s, tags: ['#HalalInvesting', '#IslamicFinance', '#Shariah'] };
  }
  if ((m = p.match(/^\/reports\/(\d{4}-\d{2})$/u))) {
    const { readReport } = await import('./reportService.js');
    const r = await readReport(m[1]);
    if (!r) throw Object.assign(new Error('Report not found.'), { status: 404 });
    return { kind: 'report', badge: 'Monthly research report', title: r.text.headline, sub: cut((r.text.summary || [])[0], 260), stats: [], points: (r.text.watch || []).slice(0, 3), photo: null, link: shortLink, site: s, tags: ['#Markets', '#Economy', '#Investing'] };
  }
  // Any other page: its title and description
  // Read the page from this server itself (works before the domain is live)
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  const html = await fetch(new URL(p + u.search, base), { signal: AbortSignal.timeout(15000) }).then((r) => (r.ok ? r.text() : '')).catch(() => '');
  const meta = (name) => (html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`, 'iu')) || [])[1] || '';
  const title = meta('og:title') || (html.match(/<title>([^<]*)<\/title>/iu) || [])[1] || '';
  if (!title) throw Object.assign(new Error('Couldn’t read that page.'), { status: 404 });
  const dec = (t) => t.replace(/&amp;/gu, '&').replace(/&#39;|&rsquo;/gu, '’').replace(/&quot;/gu, '"');
  return { kind: 'page', badge: 'Dr MoneyWise', title: dec(title.replace(/\s*\|\s*Dr MoneyWise\s*$/u, '')), sub: cut(dec(meta('description')), 240), stats: [], points: [], photo: meta('og:image') || null, link: shortLink, site: s, tags: ['#PersonalFinance', '#Investing'] };
}

/* ── Drawing ──────────────────────────────────────────────────────── */
// The same footer on every picture: name and tagline on the left, website
// and email on the right. Short, fixed wording, so it always fits neatly
// (the full page link goes in the caption, where people can tap it).
function footer(W, H, s, link, f) {
  const fh = Math.round(H * (H > W ? 0.085 : 0.11));
  const y = H - fh;
  const big = Math.round(Math.min(40, fh * 0.34));
  const small = Math.round(Math.min(24, fh * 0.2));
  const gap = Math.round(small * 0.55);
  const top = y + (fh - (big + gap + small)) / 2 - 2;
  const right = `${s.email}  ·  Education only, not advice`;
  return `<rect x="0" y="${y}" width="${W}" height="${fh}" fill="${C.navy}"/>
    <rect x="0" y="${y}" width="${W}" height="6" fill="${C.gold}"/>
    ${textLines([s.name], { x0: 48, y0: top - 4, size: big, kind: 'serif', fill: C.gold })}
    ${textLines(['Money, explained simply'], { x0: 48, y0: top + big + gap, size: small, fill: C.grey })}
    ${textLines([s.domain], { x0: W - 48, y0: top - 4, size: big, kind: 'black', fill: C.gold2, anchor: 'end' })}
    ${textLines([right], { x0: W - 48, y0: top + big + gap, size: small, fill: C.grey, anchor: 'end' })}`;
}

async function drawCard(content, sizeKey, { style = 'auto', photoData = null } = {}) {
  const f = await loadFonts();
  const { w: W, h: H } = SIZES[sizeKey];
  const pad = 56;
  const tall = H / W;
  const wide = W > H;
  const story = tall >= 1.7;
  const s = content.site;
  const fh = Math.round(H * (H > W ? 0.085 : 0.11));
  const usePhoto = photoData && style !== 'brand';
  let bg = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.navy2}"/></linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1128" stop-opacity="0.55"/><stop offset="0.45" stop-color="#0a1128" stop-opacity="0.82"/><stop offset="1" stop-color="#0a1128" stop-opacity="0.96"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>`;
  if (usePhoto) bg += `<image href="${photoData}" x="0" y="0" width="${W}" height="${H - fh}" preserveAspectRatio="xMidYMid slice"/><rect width="${W}" height="${H - fh}" fill="url(#shade)"/>`;
  else bg += `<circle cx="${W - 60}" cy="80" r="${Math.round(W * 0.28)}" fill="${C.gold}" opacity="0.08"/><circle cx="60" cy="${H - fh - 40}" r="${Math.round(W * 0.2)}" fill="#2a78d6" opacity="0.10"/>`;

  // Header: name and badge
  let head = textLines([s.name], { x0: pad, y0: pad - 6, size: 40, kind: 'serif', fill: C.gold });
  if (content.badge) {
    const bs = 24; const bw = width(f.black, content.badge.toUpperCase(), bs) + 40;
    head += `<rect x="${W - pad - bw}" y="${pad}" width="${bw}" height="46" rx="23" fill="${C.gold}"/>${textLines([content.badge.toUpperCase()], { x0: W - pad - bw / 2, y0: pad + 7, size: bs, kind: 'black', fill: C.navy, anchor: 'middle' })}`;
  }
  const top = pad + 90;
  const bottom = H - fh - pad;
  const maxW = W - pad * 2;
  const stats = content.stats || [];
  const points = content.points || [];

  // Blocks, each { h, draw(y) }; drawn top to bottom, then centred in the space
  const blocks = [];
  const t = fit(f.serif, content.title, story ? 92 : tall > 1.1 ? 76 : wide ? 56 : 68, 34, maxW, story ? 5 : wide ? 2 : 4);
  const th = Math.round(t.lines.length * t.size * 1.18);
  blocks.push({ h: th + 26 + 8 + 30, draw: (y) => textLines(t.lines, { x0: pad, y0: y, size: t.size, kind: 'serif', fill: '#fff', lh: 1.18 }) + `<rect x="${pad}" y="${y + th + 26}" width="120" height="8" rx="4" fill="${C.gold}"/>` });
  let used = blocks[0].h;
  const room = () => bottom - top - used;

  if (content.sub) {
    const sub = fit(f.regular, content.sub, story ? 44 : 34, 24, maxW, wide ? 2 : story ? 6 : stats.length || points.length ? 3 : 6);
    const h = Math.round(sub.lines.length * sub.size * 1.35) + 28;
    if (room() > h) { blocks.push({ h, draw: (y) => textLines(sub.lines, { x0: pad, y0: y, size: sub.size, fill: '#e8ecf8', lh: 1.35 }) }); used += h; }
  }
  if (stats.length) {
    const perRow = wide ? Math.min(4, stats.length) : stats.length > 2 ? 2 : stats.length;
    const rows = Math.min(wide ? 1 : 2, Math.ceil(stats.length / perRow));
    const gap = 18; const tw = (maxW - gap * (perRow - 1)) / perRow; const tH = wide ? 120 : story ? 190 : 150;
    const h = rows * (tH + gap) + 12;
    if (room() > h) {
      blocks.push({ h, draw: (y) => stats.slice(0, perRow * rows).map((st, i) => {
        const tx = pad + (i % perRow) * (tw + gap); const ty = y + Math.floor(i / perRow) * (tH + gap);
        const c = TILE_COLOURS[i % TILE_COLOURS.length];
        const val = fit(f.black, st.value, wide ? 40 : story ? 64 : 52, 24, tw - 40, 1);
        const ls = story ? 26 : 22;
        return `<rect x="${tx}" y="${ty}" width="${tw}" height="${tH}" rx="20" fill="#ffffff" fill-opacity="0.96"/><rect x="${tx}" y="${ty}" width="${tw}" height="10" rx="5" fill="${c}"/>`
          + textLines(val.lines, { x0: tx + 22, y0: ty + 24, size: val.size, kind: 'black', fill: c })
          + textLines(wrap(f.bold, st.label + (st.note ? ` · ${st.note}` : ''), ls, tw - 40, 2).lines, { x0: tx + 22, y0: ty + 34 + val.size, size: ls, kind: 'bold', fill: '#4a5170', lh: 1.2 });
      }).join('') });
      used += h;
    }
  }
  if (points.length) {
    const ps = story ? 40 : wide ? 26 : 30;
    const items = [];
    for (const pt of points) {
      const lines = wrap(f.regular, pt, ps, maxW - 50, 2).lines;
      const h = Math.round(lines.length * ps * 1.3) + 18;
      if (room() < h) break;
      items.push({ lines, h }); used += h;
    }
    if (items.length) {
      const total = items.reduce((a, i) => a + i.h, 0);
      blocks.push({ h: total, draw: (y) => { let yy = y; return items.map((it, i) => { const out = `<circle cx="${pad + 14}" cy="${yy + ps * 0.72}" r="${story ? 14 : 12}" fill="${TILE_COLOURS[i % TILE_COLOURS.length]}"/>` + textLines(it.lines, { x0: pad + 46, y0: yy, size: ps, fill: '#fff', lh: 1.3 }); yy += it.h; return out; }).join(''); } });
    }
  }
  // Centre the content in the space between the header and the footer
  const total = blocks.reduce((a, b) => a + b.h, 0);
  let y = top + Math.max(0, Math.round((bottom - top - total) / (wide ? 2 : 2.4)));
  let body = '';
  for (const b of blocks) { body += b.draw(y); y += b.h; }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}${head}${body}${footer(W, H, s, content.link, f)}</svg>`;
}

/** A picture framed with our name, website and email. */
async function drawFramed(content, sizeKey, { title = '' } = {}) {
  const f = await loadFonts();
  const { w: W, h: H } = SIZES[sizeKey];
  const s = content.site;
  const fh = Math.round(H * (H > W ? 0.085 : 0.11));
  let top = 0;
  // Behind the picture: the same picture, enlarged and blurred, so there are no plain bands
  let svg = `<defs><filter id="blur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="40"/></filter></defs>
    <rect width="${W}" height="${H}" fill="${C.navy}"/>
    <image href="${content.image}" x="-60" y="-60" width="${W + 120}" height="${H - fh + 120}" preserveAspectRatio="xMidYMid slice" filter="url(#blur)" opacity="0.85"/>
    <rect width="${W}" height="${H - fh}" fill="#0a1128" opacity="0.35"/>`;
  if (title) {
    const t = fit(f.serif, title, W > H ? 44 : 56, 30, W - 112, 2);
    top = Math.round(t.lines.length * t.size * 1.2) + 70;
    svg += textLines(t.lines, { x0: 56, y0: 34, size: t.size, kind: 'serif', fill: '#fff', lh: 1.2 });
  }
  svg += `<image href="${content.image}" x="20" y="${top + 16}" width="${W - 40}" height="${H - fh - top - 32}" preserveAspectRatio="xMidYMid meet"/>`;
  svg += footer(W, H, s, content.link, f);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg>`;
}

function toJpeg(svg) {
  const r = new Resvg(svg, { font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Lato' }, fitTo: { mode: 'original' } });
  const img = r.render();
  return jpeg.encode({ data: img.pixels, width: img.width, height: img.height }, 90).data;
}

function captionFor(c) {
  if (c.kind === 'picture') return `More plain-English money guides at ${c.site.domain}\n\n#PersonalFinance #Investing`;
  const lines = [c.title];
  if (c.sub) lines.push('', cut(c.sub, 220));
  if (c.stats?.length) lines.push('', ...c.stats.slice(0, 4).map((s) => `• ${s.label}: ${s.value}${s.note ? ` (${s.note})` : ''}`));
  lines.push('', `Read more: https://${c.link}`, '', 'For education only, not financial advice.', '', [...(c.tags || []), '#DrMoneyWise'].join(' '));
  return lines.join('\n');
}

/** Makes the pictures and caption for one link. */
export async function makeCards({ url, sizes = ['square'], style = 'auto', title = '', sub = '', origin = '' }) {
  const content = await contentFor(url, { origin });
  if (title) content.title = String(title).slice(0, 200);
  if (sub) content.sub = String(sub).slice(0, 400);
  let photoData = null;
  if (content.photo && style !== 'brand') photoData = (await fetchImage(content.photo))?.data || null;
  await fs.mkdir(OUT_DIR, { recursive: true });
  const id = `${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(4).toString('hex')}`;
  const out = [];
  for (const key of sizes.filter((k) => SIZES[k]).slice(0, 4)) {
    const svg = content.kind === 'picture' ? await drawFramed(content, key, { title }) : await drawCard(content, key, { style, photoData });
    const file = `${id}-${key}.jpg`;
    await fs.writeFile(path.join(OUT_DIR, file), toJpeg(svg));
    out.push({ size: key, file, w: SIZES[key].w, h: SIZES[key].h });
  }
  const caption = captionFor(content);
  await cleanOld();
  return { id, kind: content.kind, title: content.title, items: out, caption, canGamma: Boolean(content.gamma) };
}

/** Optional: a Gamma infographic for an explainer, framed with our details. */
const jobs = new Map();
export function startGamma({ url, sizes = ['square'], origin = '' }) {
  const id = crypto.randomBytes(5).toString('hex');
  jobs.set(id, { status: 'working', startedAt: Date.now() });
  (async () => {
    try {
      const content = await contentFor(url, { origin });
      if (!content.gamma) throw new Error('Infographics can be made for explainers only.');
      const { generateGammaInfographic, getMediaDir } = await import('./visualsService.js');
      const dims = { square: '1x1', portrait: '4x5', story: '9x16', landscape: '16x9' }[sizes[0]] || '1x1';
      const media = await generateGammaInfographic({ ...content.gamma, summary: content.sub, points: content.points || [], stats: content.stats || [], dimensions: dims });
      if (!media) throw new Error('No Gamma key saved in Admin → APIs.');
      const buf = await fs.readFile(path.join(getMediaDir(), path.basename(media)));
      const type = /\.png$/iu.test(media) ? 'image/png' : 'image/jpeg';
      const framed = { ...content, kind: 'picture', image: `data:${type};base64,${buf.toString('base64')}` };
      await fs.mkdir(OUT_DIR, { recursive: true });
      const base = `${new Date().toISOString().slice(0, 10)}-g${id}`;
      const items = [];
      for (const key of sizes.filter((k) => SIZES[k]).slice(0, 4)) {
        const file = `${base}-${key}.jpg`;
        await fs.writeFile(path.join(OUT_DIR, file), toJpeg(await drawFramed(framed, key, {})));
        items.push({ size: key, file, w: SIZES[key].w, h: SIZES[key].h });
      }
      jobs.set(id, { status: 'done', result: { id: base, kind: 'infographic', title: content.title, items, caption: captionFor(content) } });
    } catch (error) {
      jobs.set(id, { status: 'failed', error: error.message });
    }
  })();
  return { job: id };
}
export const gammaJob = (id) => jobs.get(id) || { status: 'missing' };

/** Two sample pictures for a Gamma theme (runs in the background). */
export function startThemePreview(themeId) {
  const id = crypto.randomBytes(5).toString('hex');
  jobs.set(id, { status: 'working' });
  import('./visualsService.js').then((v) => v.makeThemePreview(themeId))
    .then((urls) => jobs.set(id, { status: 'done', urls }))
    .catch((error) => jobs.set(id, { status: 'failed', error: error.message }));
  return { job: id };
}

export async function socialFile(name) {
  if (!/^[\w-]+\.jpg$/u.test(name)) return null;
  try { return await fs.readFile(path.join(OUT_DIR, name)); } catch { return null; }
}

export async function recentCards(limit = 24) {
  try {
    const files = (await fs.readdir(OUT_DIR)).filter((f) => f.endsWith('.jpg')).sort().reverse();
    return files.slice(0, limit);
  } catch { return []; }
}

async function cleanOld() {
  try {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    for (const f of await fs.readdir(OUT_DIR)) if (f.slice(0, 10) < cutoff) await fs.unlink(path.join(OUT_DIR, f)).catch(() => {});
  } catch { /* nothing to clean */ }
}

/* Shared with the video maker (videoService.js) */
export function svgToPng(svg) {
  return new Resvg(svg, { font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Lato' }, fitTo: { mode: 'original' } }).render().asPng();
}
export { loadFonts, fit, wrap, textLines, width, C as BRAND, TILE_COLOURS, fetchImage, x as escSvg, site as siteDetails, toJpeg };
