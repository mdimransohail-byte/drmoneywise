/* ════════════════════════════════════════════════════════════════════════
   GROWTH — where members come from, and the offer pop-up.
   ───────────────────────────────────────────────────────────────────────
   1. Where members came from: public/track.js remembers how a visitor
      first arrived (an advert link with utm_… tags, Google, Instagram, a
      newsletter, the pop-up…). It is sent with the sign-up and saved on
      the member as joinedFrom. Trials and upgrades are counted against it
      in Admin → Analytics → "How members joined".
   2. The offer pop-up (Admin → Offers): a picture with a discount for an
      occasion (Ramadan, Diwali, New Year…), shown on the homepage two
      seconds after it opens, to visitors who aren't Premium yet. It links
      to /membership with the coupon filled in. Saving the offer also saves
      the coupon, ending the day after the offer ends.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { readStore, updateStore } from './storeService.js';

const PROMO_DIR = path.join(process.cwd(), 'data', 'promo');

/* ── 1. Sources ──────────────────────────────────────────────────── */
const RULES = [
  [/google\./u, 'Google search'], [/bing\.|duckduckgo|yahoo\.|ecosia|brave/u, 'Other search engines'],
  [/facebook|fb\.|instagram|threads\.net/u, 'Facebook and Instagram'], [/youtube|youtu\.be/u, 'YouTube'],
  [/linkedin|lnkd\.in/u, 'LinkedIn'], [/(^|\.)x\.com|twitter|t\.co$/u, 'X (Twitter)'], [/reddit/u, 'Reddit'],
  [/whatsapp|wa\.me/u, 'WhatsApp'], [/tiktok/u, 'TikTok'], [/quora/u, 'Quora'], [/pinterest/u, 'Pinterest'],
  [/mail\.|outlook|gmail|resend|newsletter|beehiiv|substack/u, 'Email and newsletters'],
];
const SOURCE_WORDS = { google: 'Google', meta: 'Facebook and Instagram', facebook: 'Facebook and Instagram', instagram: 'Facebook and Instagram', fb: 'Facebook and Instagram', ig: 'Facebook and Instagram', youtube: 'YouTube', linkedin: 'LinkedIn', x: 'X (Twitter)', twitter: 'X (Twitter)', reddit: 'Reddit', whatsapp: 'WhatsApp', tiktok: 'TikTok', newsletter: 'Email and newsletters', email: 'Email and newsletters', quora: 'Quora' };
const clip = (v, n = 80) => String(v ?? '').replace(/[<>"\r\n]/gu, '').trim().slice(0, n);

/** Turns what the browser remembered into a tidy record. */
export function cleanSource(raw) {
  if (!raw || typeof raw !== 'object') return { label: 'Direct (typed the address)', at: new Date().toISOString() };
  const utmSource = clip(raw.utm_source, 40).toLowerCase();
  const medium = clip(raw.utm_medium, 40).toLowerCase();
  const campaign = clip(raw.utm_campaign, 60);
  let referrer = '';
  try { referrer = raw.referrer ? new URL(String(raw.referrer)).hostname.replace(/^www\./u, '') : ''; } catch { referrer = ''; }
  let label;
  if (raw.via === 'popup') label = 'Offer pop-up';
  else if (utmSource) {
    const base = SOURCE_WORDS[utmSource] || utmSource.replace(/^./u, (m) => m.toUpperCase());
    label = /cpc|paid|ads?$|ppc|display/u.test(medium) ? `${base} adverts` : base;
  } else if (referrer) label = (RULES.find(([re]) => re.test(referrer)) || [null, `Other websites (${referrer})`])[1];
  else label = 'Direct (typed the address)';
  return { label: clip(label, 60), source: utmSource, medium, campaign, referrer: clip(referrer, 60), landing: clip(raw.landing, 120), at: new Date().toISOString() };
}

/** Admin → Analytics: sign-ups, trials and paid members by where they came from. */
export async function joinStats() {
  const store = await readStore();
  const users = (store.users || []).filter((u) => u.role !== 'admin');
  const byId = new Map(users.map((u) => [u.id, u]));
  const since = (days) => Date.now() - days * 86400000;
  const label = (u) => u?.joinedFrom?.label || 'Before tracking began';
  const periods = { d30: since(30), d90: since(90), all: 0 };
  const out = {};
  for (const [key, from] of Object.entries(periods)) {
    const rows = {};
    const row = (l) => (rows[l] = rows[l] || { label: l, signups: 0, trials: 0, paid: 0, campaigns: {} });
    for (const u of users) {
      if (new Date(u.createdAt || 0).getTime() < from) continue;
      const r = row(label(u)); r.signups += 1;
      if (u.joinedFrom?.campaign) r.campaigns[u.joinedFrom.campaign] = (r.campaigns[u.joinedFrom.campaign] || 0) + 1;
    }
    for (const e of store.events || []) {
      if (!['trial', 'upgrade'].includes(e.type) || new Date(e.at).getTime() < from) continue;
      const r = row(e.via === 'popup' ? 'Offer pop-up' : label(byId.get(e.userId)));
      if (e.type === 'trial') r.trials += 1; else r.paid += 1;
    }
    out[key] = Object.values(rows).map((r) => ({ ...r, campaigns: Object.entries(r.campaigns).sort((a, b) => b[1] - a[1]).slice(0, 4) }))
      .sort((a, b) => b.paid - a.paid || b.trials - a.trials || b.signups - a.signups);
  }
  const trialing = users.filter((u) => u.planStatus === 'trialing').length;
  const trialsAll = (store.events || []).filter((e) => e.type === 'trial').length;
  const fromTrial = (store.events || []).filter((e) => e.type === 'upgrade' && e.fromTrial).length;
  return { periods: out, trials: { now: trialing, started: trialsAll, converted: fromTrial } };
}

/* ── 2. Offer pop-up ─────────────────────────────────────────────── */
export const OCCASIONS = {
  ramadan: { name: 'Ramadan', headline: 'Ramadan offer', colours: ['#0b3d2e', '#1baf7a', '#f7d07c'], motif: 'crescent' },
  eid: { name: 'Eid', headline: 'Eid Mubarak offer', colours: ['#0b3d2e', '#1baf7a', '#f7d07c'], motif: 'crescent' },
  diwali: { name: 'Diwali', headline: 'Diwali offer', colours: ['#4a1020', '#e8730c', '#f7d07c'], motif: 'lamps' },
  newyear: { name: 'New Year', headline: 'New Year, new money plan', colours: ['#0a1128', '#6250d6', '#f7d07c'], motif: 'stars' },
  blackfriday: { name: 'Black Friday', headline: 'Black Friday offer', colours: ['#0a1128', '#e5566f', '#f7d07c'], motif: 'tag' },
  founding: { name: 'Founding members', headline: 'Founding member offer', colours: ['#0a1128', '#2a78d6', '#f7d07c'], motif: 'crown' },
  nationalday: { name: 'UAE National Day', headline: 'National Day offer', colours: ['#0a1128', '#1baf7a', '#f7d07c'], motif: 'stars' },
  summer: { name: 'Summer', headline: 'Summer offer', colours: ['#0a3d62', '#0fa3b1', '#f7d07c'], motif: 'sun' },
  custom: { name: 'Special offer', headline: 'Special offer', colours: ['#0a1128', '#5b2a9e', '#f7d07c'], motif: 'crown' },
};

function cleanPromo(raw = {}) {
  const occasion = OCCASIONS[raw.occasion] ? raw.occasion : 'custom';
  const percent = Math.max(5, Math.min(80, Math.round(Number(raw.percent) || 20)));
  const code = String(raw.code || `${occasion.toUpperCase().slice(0, 10)}${percent}`).toUpperCase().replace(/[^A-Z0-9]/gu, '').slice(0, 20);
  const day = (v) => (/^\d{4}-\d{2}-\d{2}$/u.test(String(v || '')) ? String(v) : '');
  return {
    on: Boolean(raw.on),
    occasion,
    headline: clip(raw.headline || OCCASIONS[occasion].headline, 70),
    text: clip(raw.text || `Get ${percent}% off Premium: every lesson and PDF workbook, the full Health Check, portfolio check and chart alerts.`, 220),
    button: clip(raw.button || `Claim ${percent}% off`, 30),
    percent, code,
    duration: raw.duration === 'forever' ? 'forever' : 'once',
    startAt: day(raw.startAt) || new Date().toISOString().slice(0, 10),
    endAt: day(raw.endAt) || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    image: /^\/promo-images\/[\w.-]+$/u.test(String(raw.image || '')) ? raw.image : '',
    delay: Math.max(0, Math.min(30, Number(raw.delay ?? 2))),
  };
}

export async function getPromoAdmin() {
  const store = await readStore();
  const p = store.settings?.promo || null;
  const stats = store.settings?.promoStats?.[p?.id] || { views: 0, clicks: 0 };
  const upgrades = (store.events || []).filter((e) => (e.type === 'trial' || e.type === 'upgrade') && e.via === 'popup' && p?.id && e.promo === p.id).length;
  return { promo: p, stats: { ...stats, upgrades }, occasions: Object.fromEntries(Object.entries(OCCASIONS).map(([k, v]) => [k, v.name])) };
}

/** Saves the offer and its coupon (ends the day after the offer ends). */
export async function savePromo(raw) {
  const p = cleanPromo(raw);
  let saved = null;
  await updateStore((s) => {
    s.settings = s.settings || {};
    const old = s.settings.promo;
    const id = old && old.code === p.code && old.occasion === p.occasion ? old.id : crypto.randomBytes(4).toString('hex');
    saved = s.settings.promo = { ...p, id, updatedAt: new Date().toISOString() };
    s.coupons = s.coupons || [];
    const expiresAt = new Date(`${p.endAt}T23:59:59Z`).getTime() + 86400000;
    let c = s.coupons.find((x) => x.code === p.code);
    if (!c) { c = { id: `coupon-${crypto.randomBytes(4).toString('hex')}`, code: p.code, createdAt: new Date().toISOString() }; s.coupons.push(c); }
    Object.assign(c, { discountPercent: p.percent, planScope: 'premium', active: p.on, duration: p.duration, expiresAt: new Date(expiresAt).toISOString(), source: 'offer pop-up' });
    return s;
  });
  return saved;
}

/** The offer to show this visitor, or null. */
export async function activePromo(user) {
  const store = await readStore();
  const p = store.settings?.promo;
  if (!p?.on) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (today < p.startAt || today > p.endAt) return null;
  if (user && (user.role === 'admin' || user.plan === 'premium')) return null;
  return { id: p.id, headline: p.headline, text: p.text, button: p.button, percent: p.percent, code: p.code, image: p.image, delay: p.delay, endAt: p.endAt, occasion: OCCASIONS[p.occasion]?.name || 'Offer' };
}

export async function promoEvent(id, type) {
  if (!['view', 'click'].includes(type) || !/^[a-f0-9]{8}$/u.test(String(id || ''))) return;
  await updateStore((s) => {
    s.settings = s.settings || {};
    const all = s.settings.promoStats = s.settings.promoStats || {};
    const x = all[id] = all[id] || { views: 0, clicks: 0 };
    x[type === 'view' ? 'views' : 'clicks'] += 1;
    return s;
  });
}

/* Pictures: made here (an occasion design in our colours) or uploaded
   (for example one downloaded from Social studio). Kept in data/promo. */
const x = (t) => String(t ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
function motifSvg(m, gold, accent) {
  if (m === 'crescent') return `<circle cx="930" cy="170" r="95" fill="${gold}"/><circle cx="965" cy="140" r="88" fill="var(--bg)"/>
    ${[[800, 90], [1040, 300], [860, 330], [700, 200]].map(([cx, cy], i) => `<circle cx="${cx}" cy="${cy}" r="${6 + (i % 2) * 4}" fill="${gold}"/>`).join('')}
    <path d="M1040 40v90M1040 130l-22 26h44z" stroke="${gold}" stroke-width="5" fill="${gold}"/><rect x="1018" y="156" width="44" height="58" rx="10" fill="none" stroke="${gold}" stroke-width="5"/><circle cx="1040" cy="186" r="9" fill="${accent}"/>`;
  if (m === 'lamps') return [[760, 300], [900, 250], [1040, 300]].map(([cx, cy]) => `<path d="M${cx - 55} ${cy} q55 60 110 0 z" fill="${gold}"/><path d="M${cx} ${cy - 10} c-18 -30 0 -60 0 -80 c0 20 18 50 0 80z" fill="${accent}"/>`).join('')
    + [[720, 120], [850, 80], [1000, 110], [1100, 190]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="7" fill="${gold}"/>`).join('');
  if (m === 'tag') return `<g transform="rotate(-18 930 200)"><path d="M800 120h220l70 80-70 80H800z" fill="${accent}"/><circle cx="1030" cy="200" r="14" fill="var(--bg)"/><text x="900" y="222" font-family="Lato" font-weight="900" font-size="64" fill="#fff" text-anchor="middle">SALE</text></g>`;
  if (m === 'sun') return `<circle cx="940" cy="190" r="90" fill="${gold}"/>${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<line x1="${940 + Math.cos(a) * 110}" y1="${190 + Math.sin(a) * 110}" x2="${940 + Math.cos(a) * 150}" y2="${190 + Math.sin(a) * 150}" stroke="${gold}" stroke-width="10" stroke-linecap="round"/>`; }).join('')}`;
  if (m === 'stars') return [[760, 110, 1.4], [900, 220, 2], [1060, 120, 1.2], [1000, 320, 1], [820, 330, 0.9]].map(([cx, cy, s]) => `<path transform="translate(${cx} ${cy}) scale(${s})" d="M0-40 11-12 41-12 17 6 26 36 0 18-26 36-17 6-41-12-11-12z" fill="${gold}"/>`).join('')
    + `<circle cx="1100" cy="240" r="10" fill="${accent}"/><circle cx="720" cy="250" r="8" fill="${accent}"/>`;
  return `<path d="M780 290l40-150 75 80 65-130 65 130 75-80 40 150z" fill="${gold}"/><rect x="780" y="300" width="360" height="30" rx="10" fill="${gold}"/>`;
}

export async function makePromoImage(raw) {
  const p = cleanPromo(raw);
  const o = OCCASIONS[p.occasion];
  const [bg, accent, gold] = o.colours;
  const until = new Date(`${p.endAt}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" style="--bg:${bg}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${accent}" stop-opacity="0.55"/></linearGradient></defs>
  <rect width="1200" height="800" fill="${bg}"/><rect width="1200" height="800" fill="url(#g)"/>
  <rect x="0" y="0" width="1200" height="14" fill="${gold}"/><rect x="0" y="786" width="1200" height="14" fill="${gold}"/>
  ${motifSvg(o.motif, gold, accent).replace(/var\(--bg\)/gu, bg)}
  <text x="70" y="120" font-family="Libre Baskerville" font-weight="700" font-size="40" fill="${gold}">Dr MoneyWise</text>
  <text x="70" y="200" font-family="Lato" font-weight="900" font-size="30" fill="#ffffff" letter-spacing="4">${x(o.name.toUpperCase())}</text>
  <text x="66" y="430" font-family="Lato" font-weight="900" font-size="230" fill="${gold}">${p.percent}%</text>
  <text x="70" y="510" font-family="Libre Baskerville" font-weight="700" font-size="56" fill="#ffffff">off Premium</text>
  <text x="70" y="585" font-family="Lato" font-size="30" fill="#e8ecf8">Every lesson and PDF workbook · Health Check in full</text>
  <text x="70" y="625" font-family="Lato" font-size="30" fill="#e8ecf8">Portfolio check · Chart alerts · No adverts</text>
  <rect x="70" y="672" width="520" height="76" rx="38" fill="${gold}"/>
  <text x="330" y="722" font-family="Lato" font-weight="900" font-size="32" fill="${bg}" text-anchor="middle">Code ${x(p.code)} · until ${x(until)}</text>
</svg>`;
  const { svgToPng } = await import('./socialCardService.js');
  return savePromoFile(svgToPng(svg), 'png');
}

export async function savePromoFile(buf, ext) {
  if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) throw Object.assign(new Error('Please use a PNG, JPG or WebP picture.'), { status: 400 });
  if (buf.length < 500 || buf.length > 4 * 1024 * 1024) throw Object.assign(new Error('The picture must be under 4 MB.'), { status: 400 });
  await fs.mkdir(PROMO_DIR, { recursive: true });
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${ext === 'jpeg' ? 'jpg' : ext}`;
  await fs.writeFile(path.join(PROMO_DIR, name), buf);
  // Keep only the 12 newest pictures
  const files = (await fs.readdir(PROMO_DIR)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - 12))) await fs.rm(path.join(PROMO_DIR, f), { force: true }).catch(() => {});
  return `/promo-images/${name}`;
}

export async function readPromoImage(name) {
  if (!/^[\w-]+\.(png|jpg|webp)$/u.test(name)) return null;
  const buf = await fs.readFile(path.join(PROMO_DIR, name)).catch(() => null);
  return buf ? { buf, type: name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg' } : null;
}
