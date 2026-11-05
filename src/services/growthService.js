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
      seconds after it opens, to visitors who aren't Pro yet. It links
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

/* ── Visitor's country, from their browser's time zone ───────────────
   Free, needs no outside service and keeps nothing: the browser says its
   time zone (for example Asia/Dubai) and we match it to a country. If the
   site is later put behind Cloudflare, its CF-IPCountry header is used. */
export const COUNTRIES = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', IE: 'Ireland', AU: 'Australia', NZ: 'New Zealand',
  AE: 'UAE', SA: 'Saudi Arabia', QA: 'Qatar', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman',
  IN: 'India', PK: 'Pakistan', BD: 'Bangladesh', SG: 'Singapore', MY: 'Malaysia', HK: 'Hong Kong', PH: 'Philippines',
  DE: 'Germany', NL: 'Netherlands', CH: 'Switzerland', FR: 'France', EG: 'Egypt', ZA: 'South Africa', NG: 'Nigeria',
};
const TZ = {
  'Europe/London': 'GB', 'Europe/Belfast': 'GB', 'Europe/Dublin': 'IE', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW',
  'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY', 'Asia/Hong_Kong': 'HK', 'Asia/Manila': 'PH', 'Europe/Berlin': 'DE', 'Europe/Amsterdam': 'NL', 'Europe/Zurich': 'CH',
  'Europe/Paris': 'FR', 'Africa/Cairo': 'EG', 'Africa/Johannesburg': 'ZA', 'Africa/Lagos': 'NG', 'Pacific/Auckland': 'NZ',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/St_Johns': 'CA', 'America/Regina': 'CA', 'America/Montreal': 'CA',
};
export function countryOf({ tz = '', header = '' } = {}) {
  const h = String(header || '').toUpperCase();
  if (/^[A-Z]{2}$/u.test(h) && h !== 'XX') return h;
  const z = String(tz || '');
  if (TZ[z]) return TZ[z];
  if (/^Australia\//u.test(z)) return 'AU';
  if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana|Kentucky|North_Dakota|Juneau|Sitka|Adak|Menominee|Nome)/u.test(z) || z === 'Pacific/Honolulu') return 'US';
  return '';
}

/* ── 2. Offer pop-up ─────────────────────────────────────────────── */
export const OCCASIONS = {
  ramadan: { name: 'Ramadan', headline: 'Ramadan offer', colours: ['#0b3d2e', '#1baf7a', '#f7d07c'], motif: 'crescent' },
  eid: { name: 'Eid', headline: 'Eid Mubarak offer', colours: ['#0b3d2e', '#1baf7a', '#f7d07c'], motif: 'crescent' },
  diwali: { name: 'Diwali', headline: 'Diwali offer', colours: ['#4a1020', '#e8730c', '#f7d07c'], motif: 'lamps' },
  newyear: { name: 'New Year', headline: 'New Year, new money plan', colours: ['#0a1128', '#6250d6', '#f7d07c'], motif: 'stars' },
  blackfriday: { name: 'Black Friday', headline: 'Black Friday offer', colours: ['#0a1128', '#e5566f', '#f7d07c'], motif: 'tag' },
  founding: { name: 'Founding members', headline: 'Founding member offer', colours: ['#0a1128', '#2a78d6', '#f7d07c'], motif: 'crown' },
  nationalday: { name: 'UAE National Day', headline: 'Eid Al Etihad offer', colours: ['#0a1128', '#1baf7a', '#f7d07c'], motif: 'stars' },
  summer: { name: 'Summer', headline: 'Summer offer', colours: ['#0a3d62', '#0fa3b1', '#f7d07c'], motif: 'sun' },
  custom: { name: 'Special offer', headline: 'Special offer', colours: ['#0a1128', '#5b2a9e', '#f7d07c'], motif: 'crown' },
};

function cleanPromo(raw = {}) {
  const occasion = OCCASIONS[raw.occasion] ? raw.occasion : 'custom';
  const percent = Math.max(5, Math.min(80, Math.round(Number(raw.percent) || 20)));
  const SHORT = { ramadan: 'RAMADAN', eid: 'EID', diwali: 'DIWALI', newyear: 'NEWYEAR', blackfriday: 'BLACKFRIDAY', founding: 'FOUNDER', nationalday: 'UAE', summer: 'SUMMER', custom: 'PRO' };
  const code = String(raw.code || `${SHORT[occasion] || 'PRO'}${percent}`).toUpperCase().replace(/[^A-Z0-9]/gu, '').slice(0, 20);
  const day = (v) => (/^\d{4}-\d{2}-\d{2}$/u.test(String(v || '')) ? String(v) : '');
  return {
    on: Boolean(raw.on),
    occasion,
    headline: clip(raw.headline || OCCASIONS[occasion].headline, 70),
    text: clip(raw.text || `Get ${percent}% off Pro: every lesson and PDF workbook, the full Health Check, portfolio check and chart alerts.`, 220),
    button: clip(raw.button || `Claim ${percent}% off`, 30),
    percent, code,
    duration: raw.duration === 'forever' ? 'forever' : 'once',
    startAt: day(raw.startAt) || new Date().toISOString().slice(0, 10),
    endAt: day(raw.endAt) || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    image: /^\/promo-images\/[\w.-]+$/u.test(String(raw.image || '')) ? raw.image : '',
    delay: Math.max(0, Math.min(30, Number(raw.delay ?? 2))),
    countries: (Array.isArray(raw.countries) ? raw.countries : []).map((c) => String(c).toUpperCase()).filter((c) => COUNTRIES[c]).slice(0, 40),
  };
}

export async function getPromoAdmin() {
  const store = await readStore();
  const p = store.settings?.promo || null;
  const stats = store.settings?.promoStats?.[p?.id] || { views: 0, clicks: 0 };
  const upgrades = (store.events || []).filter((e) => (e.type === 'trial' || e.type === 'upgrade') && e.via === 'popup' && p?.id && e.promo === p.id).length;
  return { promo: p, stats: { ...stats, upgrades }, countries: COUNTRIES, occasions: Object.fromEntries(Object.entries(OCCASIONS).map(([k, v]) => [k, v.name])) };
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
export async function activePromo(user, country = '') {
  const store = await readStore();
  const p = store.settings?.promo;
  if (!p?.on) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (today < p.startAt || today > p.endAt) return null;
  if (user && (user.role === 'admin' || user.plan === 'premium')) return null;
  // Only in the chosen countries (an empty list means everywhere)
  if ((p.countries || []).length && !p.countries.includes(country)) return null;
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

/* Pictures: made here (each occasion has its own design) or uploaded (for
   example one downloaded from Social studio). Kept in data/promo.
   Note: pictures of the UAE's leaders, or other real people, are not drawn
   here; in the UAE their images can't be used in advertising without
   official permission. National Day uses the flag and colours instead. */
const x = (t) => String(t ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
const star = (cx, cy, r, fill) => `<path transform="translate(${cx} ${cy}) scale(${r / 40})" d="M0-40 11-12 41-12 17 6 26 36 0 18-26 36-17 6-41-12-11-12z" fill="${fill}"/>`;

/* Each design: background art on the right, colours for the words on the left. */
const ART = {
  nationalday: () => ({
    bg: '#ffffff', ink: '#0a1128', big: '#00843d', sub: '#3a4256', pill: '#c8102e', pillInk: '#ffffff', tag: 'EID AL ETIHAD · UAE NATIONAL DAY', brand: '#00843d',
    art: `<rect width="1200" height="800" fill="#ffffff"/>
      <g transform="translate(790 0)"><rect x="0" y="0" width="110" height="800" fill="#c8102e"/>
        <rect x="110" y="0" width="300" height="267" fill="#00843d"/><rect x="110" y="267" width="300" height="266" fill="#f4f4f4"/><rect x="110" y="533" width="300" height="267" fill="#000000"/></g>
      <rect x="0" y="0" width="1200" height="12" fill="#c8102e"/><rect x="0" y="788" width="1200" height="12" fill="#00843d"/>`,
  }),
  ramadan: () => ({
    bg: '#0b3d2e', ink: '#ffffff', big: '#f7d07c', sub: '#d6efe4', pill: '#f7d07c', pillInk: '#0b3d2e', tag: 'RAMADAN KAREEM', brand: '#f7d07c',
    art: `<rect width="1200" height="800" fill="#0b3d2e"/><circle cx="1000" cy="380" r="420" fill="#13513d"/>
      ${[[760, 0, 210], [880, 0, 300], [1010, 0, 180], [1120, 0, 260]].map(([cx, , len]) => `<line x1="${cx}" y1="0" x2="${cx}" y2="${len}" stroke="#f7d07c" stroke-width="3"/><path d="M${cx - 30} ${len + 20} l30 -26 l30 26 v70 q-30 26 -60 0 z" fill="#f7d07c"/><rect x="${cx - 18}" y="${len + 30}" width="36" height="46" rx="8" fill="#e8a33d"/>`).join('')}
      <circle cx="930" cy="560" r="110" fill="#f7d07c"/><circle cx="975" cy="525" r="100" fill="#13513d"/>
      ${star(1080, 470, 18, '#f7d07c')}${star(800, 640, 12, '#f7d07c')}${star(1120, 690, 10, '#f7d07c')}`,
  }),
  eid: () => ({
    bg: '#0f4c5c', ink: '#ffffff', big: '#f7d07c', sub: '#d8eef2', pill: '#f7d07c', pillInk: '#0f4c5c', tag: 'EID MUBARAK', brand: '#f7d07c',
    art: `<rect width="1200" height="800" fill="#0f4c5c"/>
      ${Array.from({ length: 6 }, (_, i) => `<circle cx="${760 + (i % 3) * 170}" cy="${150 + Math.floor(i / 3) * 400}" r="120" fill="none" stroke="#1d6b7d" stroke-width="18"/>`).join('')}
      <circle cx="940" cy="400" r="170" fill="#f7d07c"/><circle cx="1010" cy="350" r="160" fill="#0f4c5c"/>
      ${star(1080, 520, 30, '#f7d07c')}${star(820, 200, 16, '#ffffff')}${star(1130, 180, 12, '#ffffff')}${star(760, 640, 14, '#f7d07c')}`,
  }),
  diwali: () => ({
    bg: '#3d0c1e', ink: '#ffffff', big: '#ffb347', sub: '#f5d9c9', pill: '#ffb347', pillInk: '#3d0c1e', tag: 'HAPPY DIWALI', brand: '#ffb347',
    art: `<rect width="1200" height="800" fill="#3d0c1e"/>
      <g transform="translate(960 330)">${Array.from({ length: 16 }, (_, i) => `<ellipse rx="34" ry="120" fill="${i % 2 ? '#e8730c' : '#c2185b'}" opacity=".85" transform="rotate(${i * 22.5}) translate(0 -110)"/>`).join('')}<circle r="90" fill="#ffb347"/><circle r="50" fill="#3d0c1e"/><circle r="22" fill="#ffd27a"/></g>
      ${[760, 880, 1000, 1120].map((cx) => `<path d="M${cx - 50} 690 q50 60 100 0 z" fill="#c25b0a"/><path d="M${cx} 680 c-20 -34 0 -66 0 -90 c0 24 20 56 0 90z" fill="#ffd27a"/>`).join('')}`,
  }),
  newyear: () => ({
    bg: '#0a1128', ink: '#ffffff', big: '#f7d07c', sub: '#cfd5f2', pill: '#f7d07c', pillInk: '#0a1128', tag: `HAPPY NEW YEAR ${new Date().getUTCMonth() >= 9 ? new Date().getUTCFullYear() + 1 : new Date().getUTCFullYear()}`, brand: '#f7d07c',
    art: `<rect width="1200" height="800" fill="#0a1128"/>
      ${[[880, 230, '#f7d07c', 150], [1080, 420, '#8a4fd8', 120], [820, 560, '#1baf7a', 100], [1110, 130, '#e5566f', 80]].map(([cx, cy, c, r]) => Array.from({ length: 18 }, (_, i) => { const a = (i * Math.PI) / 9; return `<line x1="${cx + Math.cos(a) * r * 0.25}" y1="${cy + Math.sin(a) * r * 0.25}" x2="${cx + Math.cos(a) * r}" y2="${cy + Math.sin(a) * r}" stroke="${c}" stroke-width="6" stroke-linecap="round"/><circle cx="${cx + Math.cos(a) * r * 1.08}" cy="${cy + Math.sin(a) * r * 1.08}" r="5" fill="${c}"/>`; }).join('')).join('')}`,
  }),
  blackfriday: () => ({
    bg: '#111111', ink: '#ffffff', big: '#ff3b5c', sub: '#d9d9d9', pill: '#ff3b5c', pillInk: '#ffffff', tag: 'BLACK FRIDAY', brand: '#f7d07c',
    art: `<rect width="1200" height="800" fill="#111111"/>
      ${Array.from({ length: 9 }, (_, i) => `<rect x="${640 + i * 80}" y="-100" width="36" height="1000" fill="#ff3b5c" opacity="${0.12 + (i % 3) * 0.08}" transform="rotate(20 ${640 + i * 80} 400)"/>`).join('')}
      <g transform="rotate(-14 950 400)"><path d="M800 300h260l90 100-90 100H800z" fill="#ff3b5c"/><circle cx="1070" cy="400" r="18" fill="#111"/><text x="930" y="425" font-family="Lato" font-weight="900" font-size="70" fill="#fff" text-anchor="middle">SALE</text></g>`,
  }),
  founding: () => ({
    bg: '#0a1128', ink: '#ffffff', big: '#f7d07c', sub: '#cfd5f2', pill: '#f7d07c', pillInk: '#0a1128', tag: 'FOUNDING MEMBERS', brand: '#f7d07c',
    art: `<rect width="1200" height="800" fill="#0a1128"/><circle cx="960" cy="400" r="260" fill="none" stroke="#c9a227" stroke-width="10"/><circle cx="960" cy="400" r="220" fill="#16204a"/>
      <path d="M840 470l30-130 60 60 30-100 30 100 60-60 30 130z" fill="#f7d07c"/><rect x="840" y="480" width="240" height="26" rx="8" fill="#f7d07c"/>
      <text x="960" y="580" font-family="Lato" font-weight="900" font-size="30" fill="#f7d07c" text-anchor="middle" letter-spacing="6">PRICE LOCKED</text>`,
  }),
  summer: () => ({
    bg: '#e8f6ff', ink: '#0a1128', big: '#0a6c9e', sub: '#2c3650', pill: '#0a6c9e', pillInk: '#ffffff', tag: 'SUMMER OFFER', brand: '#0a6c9e',
    art: `<rect width="1200" height="800" fill="#e8f6ff"/><circle cx="980" cy="240" r="120" fill="#ffc94a"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<line x1="${980 + Math.cos(a) * 140}" y1="${240 + Math.sin(a) * 140}" x2="${980 + Math.cos(a) * 190}" y2="${240 + Math.sin(a) * 190}" stroke="#ffc94a" stroke-width="12" stroke-linecap="round"/>`; }).join('')}
      <path d="M600 600 q75 -50 150 0 t150 0 t150 0 t150 0 v200 H600z" fill="#7cc6ec"/><path d="M600 660 q75 -50 150 0 t150 0 t150 0 t150 0 v140 H600z" fill="#0a6c9e"/>`,
  }),
  custom: () => ({
    bg: '#2a1050', ink: '#ffffff', big: '#f7d07c', sub: '#e1d4f7', pill: '#f7d07c', pillInk: '#2a1050', tag: 'SPECIAL OFFER', brand: '#f7d07c',
    art: `<rect width="1200" height="800" fill="#2a1050"/><circle cx="1000" cy="200" r="260" fill="#5b2a9e"/><circle cx="880" cy="640" r="180" fill="#8a4fd8" opacity=".6"/>`,
  }),
};
ART.eid_al_adha = ART.eid;

export async function makePromoImage(raw) {
  const p = cleanPromo(raw);
  const d = (ART[p.occasion] || ART.custom)();
  const { loadFonts, width } = await import('./socialCardService.js');
  const f = await loadFonts();
  const until = new Date(`${p.endAt}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  // The code pill is sized to its words, so nothing spills out
  const pillText = `Code ${p.code} · until ${until}`;
  let pillSize = 32;
  while (pillSize > 20 && width(f.black, pillText, pillSize) > 600) pillSize -= 1;
  const pillW = Math.ceil(width(f.black, pillText, pillSize)) + 64;
  const lines = ['Every lesson and PDF workbook · Health Check in full', 'Portfolio check · Chart alerts · No adverts'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  ${d.art}
  <g transform="translate(70 62) scale(0.8)"><circle cx="50" cy="50" r="50" fill="#c9a227"/><circle cx="50" cy="50" r="40" fill="none" stroke="#8a6a10" stroke-width="3"/><g fill="#0a1128"><rect x="26" y="58" width="11" height="16" rx="2"/><rect x="41" y="47" width="11" height="27" rx="2"/><rect x="56" y="36" width="11" height="38" rx="2"/></g><path d="M24 50 L44 36 L56 42 L74 26" fill="none" stroke="#0a1128" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M66 24 L78 22 L76 34 Z" fill="#0a1128"/></g>
  <text x="166" y="104" font-family="Libre Baskerville" font-weight="700" font-size="40" fill="${d.brand}">Dr MoneyWise</text>
  <text x="168" y="136" font-family="Lato" font-size="22" fill="${d.sub}">Become financially healthy, wealthy and wise.</text>
  <text x="70" y="192" font-family="Lato" font-weight="900" font-size="26" fill="${d.ink}" letter-spacing="4">${x(d.tag)}</text>
  <text x="62" y="410" font-family="Lato" font-weight="900" font-size="220" fill="${d.big}">${p.percent}%</text>
  <text x="70" y="490" font-family="Libre Baskerville" font-weight="700" font-size="56" fill="${d.ink}">off Pro</text>
  <text x="70" y="565" font-family="Lato" font-size="24" fill="${d.sub}">${x(lines[0])}</text>
  <text x="70" y="600" font-family="Lato" font-size="24" fill="${d.sub}">${x(lines[1])}</text>
  <rect x="70" y="650" width="${pillW}" height="80" rx="40" fill="${d.pill}"/>
  <text x="${70 + pillW / 2}" y="${690 + pillSize * 0.36}" font-family="Lato" font-weight="900" font-size="${pillSize}" fill="${d.pillInk}" text-anchor="middle">${x(pillText)}</text>
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
