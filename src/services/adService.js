/* ════════════════════════════════════════════════════════════════════════
   ADS & PARTNER LINKS — spaces kept ready on the site, all OFF by default.
   Turn each one on in Admin → Ads & partners. Nothing shows (and no space
   is left empty) while a space is off.
   ───────────────────────────────────────────────────────────────────────
   Spaces:
     top-banner    wide banner under the menu bar (every page)
     in-content    a box in the middle of longer pages (property, companies,
                   explainers)
     partner-box   a "Partner offer" card at the end of longer pages
     bottom-strip  a thin scrolling strip of links at the bottom of every
                   page (readers can close it)
   Kinds:
     banner  an image with a link
     text    a short card: title, line of text, button (good for affiliates)
     scroll  several short text links that scroll slowly (bottom strip)
     code    pasted code from an ad network (e.g. Google AdSense)
   Every ad is labelled "Advertisement" or "Partner offer". Affiliate links
   also say we may earn a commission, and carry rel="sponsored".
   Option: hide all ads from paying members.
   Saved in data/ads.json (Railway volume).
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'data', 'ads.json');

export const AD_SLOTS = [
  { id: 'top-banner', label: 'Top banner', where: 'Under the menu bar of every page', kinds: ['banner', 'text', 'code'], size: 'Best image size: 970 × 120 (phones show it scaled down)' },
  { id: 'in-content', label: 'Middle of page', where: 'Inside longer pages: property, company report cards, explainers', kinds: ['banner', 'text', 'code'], size: 'Best image size: 728 × 90 or 300 × 250' },
  { id: 'partner-box', label: 'Partner offer box', where: 'At the end of longer pages', kinds: ['text', 'banner', 'code'], size: 'Best image size: 600 × 300' },
  { id: 'bottom-strip', label: 'Bottom scrolling strip', where: 'Fixed at the bottom of every page; readers can close it', kinds: ['scroll', 'text'], size: 'Short links, up to 8' },
];

const DEFAULTS = { hideForMembers: true, slots: {} };
let cache = load();

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { return { ...DEFAULTS, slots: {} }; }
}

export function getAdSettings() {
  return cache;
}

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const httpsUrl = (v) => (/^https:\/\/[^\s<>"']+$/u.test(String(v || '').trim()) ? String(v).trim().slice(0, 600) : '');
const text = (v, max) => String(v ?? '').replace(/[<>]/gu, '').trim().slice(0, max);

/** Admin save: checks every field, keeps only what each kind needs. */
export async function saveAdSettings(payload) {
  const next = { hideForMembers: payload?.hideForMembers !== false, slots: {} };
  for (const slot of AD_SLOTS) {
    const s = payload?.slots?.[slot.id] || {};
    const kind = slot.kinds.includes(s.kind) ? s.kind : slot.kinds[0];
    const clean = {
      enabled: Boolean(s.enabled),
      kind,
      affiliate: Boolean(s.affiliate),
      imageUrl: httpsUrl(s.imageUrl),
      linkUrl: httpsUrl(s.linkUrl),
      alt: text(s.alt, 140),
      title: text(s.title, 80),
      body: text(s.body, 200),
      button: text(s.button, 30),
      code: String(s.code || '').slice(0, 8000),
      items: (Array.isArray(s.items) ? s.items : []).map((it) => ({ text: text(it?.text, 90), linkUrl: httpsUrl(it?.linkUrl) })).filter((it) => it.text && it.linkUrl).slice(0, 8),
    };
    if (clean.enabled) {
      const problem = kind === 'banner' && (!clean.imageUrl || !clean.linkUrl) ? 'a banner needs an https image link and an https click-through link'
        : kind === 'text' && (!clean.title || !clean.linkUrl) ? 'a text card needs a title and an https link'
          : kind === 'scroll' && !clean.items.length ? 'a scrolling strip needs at least one text + https link'
            : kind === 'code' && !clean.code.trim() ? 'paste the code from the ad network'
              : '';
      if (problem) throw new Error(`${slot.label}: ${problem}.`);
    }
    next.slots[slot.id] = clean;
  }
  await fsp.mkdir(path.dirname(FILE), { recursive: true });
  await fsp.writeFile(`${FILE}.tmp`, JSON.stringify(next, null, 2), 'utf8');
  await fsp.rename(`${FILE}.tmp`, FILE);
  cache = next;
  return next;
}

/** The HTML for one space ('' when it is off). Used by the server pages. */
export function adSlot(id) {
  const s = cache.slots?.[id];
  if (!s?.enabled) return '';
  const rel = s.affiliate ? 'sponsored noopener' : 'sponsored noopener nofollow';
  const label = s.affiliate ? 'Partner offer' : 'Advertisement';
  const note = s.affiliate ? '<span class="ad-note">We may earn a commission if you buy through this link, at no extra cost to you.</span>' : '';
  const attrs = `class="ad-slot ad-${esc(id)} ad-kind-${esc(s.kind)}" data-ad-slot="${esc(id)}" data-hide-members="${cache.hideForMembers ? '1' : '0'}"`;
  if (s.kind === 'banner') {
    return `<aside ${attrs} aria-label="${label}"><span class="ad-label">${label}</span><a href="${esc(s.linkUrl)}" target="_blank" rel="${rel}"><img src="${esc(s.imageUrl)}" alt="${esc(s.alt || label)}" loading="lazy"></a>${note}</aside>`;
  }
  if (s.kind === 'text') {
    if (id === 'bottom-strip') {
      return `<aside ${attrs} aria-label="${label}"><span class="ad-label">${label}</span><a href="${esc(s.linkUrl)}" target="_blank" rel="${rel}"><strong>${esc(s.title)}</strong> ${esc(s.body)}</a><button type="button" class="ad-close" aria-label="Close" onclick="this.parentNode.remove();try{sessionStorage.setItem('dmw-strip-closed','1')}catch(e){}">×</button></aside>`;
    }
    return `<aside ${attrs} aria-label="${label}"><span class="ad-label">${label}</span><div class="ad-text"><strong>${esc(s.title)}</strong>${s.body ? `<p>${esc(s.body)}</p>` : ''}</div><a class="ad-btn" href="${esc(s.linkUrl)}" target="_blank" rel="${rel}">${esc(s.button || 'Find out more')}</a>${note}</aside>`;
  }
  if (s.kind === 'scroll') {
    const links = s.items.map((it) => `<a href="${esc(it.linkUrl)}" target="_blank" rel="${rel}">${esc(it.text)}</a>`).join('<span aria-hidden="true">•</span>');
    return `<aside ${attrs} aria-label="${label}"><span class="ad-label">${label}</span><div class="ad-scroll"><div class="ad-scroll-track">${links}<span aria-hidden="true">•</span>${links.replace(/<a /gu, '<a tabindex="-1" aria-hidden="true" ')}</div></div><button type="button" class="ad-close" aria-label="Close" onclick="this.parentNode.remove();try{sessionStorage.setItem('dmw-strip-closed','1')}catch(e){}">×</button></aside>`;
  }
  if (s.kind === 'code') {
    // Ad-network code, pasted by the admin only
    return `<aside ${attrs} aria-label="${label}"><span class="ad-label">${label}</span><div class="ad-code">${s.code}</div></aside>`;
  }
  return '';
}

/** For static pages (homepage, explainers): the spaces that are on, as HTML. */
export function publicAdSlots() {
  const out = {};
  for (const slot of AD_SLOTS) {
    const html = adSlot(slot.id);
    if (html) out[slot.id] = html;
  }
  return { hideForMembers: cache.hideForMembers, slots: out };
}

/** Small script added to every page: hides ads for paying members if asked,
    remembers a closed bottom strip, and fills spaces on static pages. */
export const AD_SCRIPT = '<script src="/ads.js" defer></script>';
