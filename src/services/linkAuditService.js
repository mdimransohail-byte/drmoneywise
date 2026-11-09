/* ════════════════════════════════════════════════════════════════════════
   LINKS: finding and preventing broken links.
     1. logNotFound      every page that answers "404 not found" is logged
                         with the page that linked to it (server.js)
     2. runLinkAudit     a weekly check of every internal link on the site
                         (data engine job "links"; "Run now" in Admin)
     3. missingLinks     before an article is published, its links to our
                         own pages are checked; if one is missing the
                         article stays a draft with the reason (articleService)
     4. old addresses    when an article's address changes, the old one is
                         kept and sends readers on to the new one (server.js)
   Admin → Health shows the results under "Links".
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

const marketDir = path.join(process.cwd(), 'data', 'market');
const NOTFOUND_FILE = path.join(marketDir, 'not-found.json');
const AUDIT_FILE = path.join(marketDir, 'link-audit.json');
const base = () => `http://127.0.0.1:${process.env.PORT || 3000}`;

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}
async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 1));
}

/* ── 1. 404 log ─────────────────────────────────────────────────────── */
const SKIP_404 = /^\/(api|media|promo-images|wp-|\.well-known)|\.(php|env|xml|map|ico|txt)$/iu;
let pending = null;
export function logNotFound(pathname, referer = '') {
  if (!pathname || SKIP_404.test(pathname)) return;
  const from = (() => { try { const u = new URL(referer); return u.pathname; } catch { return ''; } })();
  pending = pending || [];
  pending.push({ p: pathname.slice(0, 200), from: from.slice(0, 200), at: new Date().toISOString() });
  if (pending.length === 1) setTimeout(flushNotFound, 2000);
}
async function flushNotFound() {
  const items = pending || []; pending = null;
  const log = await readJson(NOTFOUND_FILE, { pages: {} });
  for (const it of items) {
    const e = log.pages[it.p] || { count: 0, from: [] };
    e.count += 1; e.last = it.at;
    if (it.from && !e.from.includes(it.from)) e.from = [it.from, ...e.from].slice(0, 5);
    log.pages[it.p] = e;
  }
  // Keep the 300 most recent
  const keep = Object.entries(log.pages).sort((a, b) => String(b[1].last).localeCompare(String(a[1].last))).slice(0, 300);
  await writeJson(NOTFOUND_FILE, { pages: Object.fromEntries(keep) }).catch(() => {});
}
export async function notFoundLog() {
  return Object.entries((await readJson(NOTFOUND_FILE, { pages: {} })).pages)
    .map(([p, e]) => ({ path: p, ...e })).sort((a, b) => String(b.last).localeCompare(String(a.last)));
}
export async function clearNotFound(p) {
  const log = await readJson(NOTFOUND_FILE, { pages: {} });
  if (p) delete log.pages[p]; else log.pages = {};
  await writeJson(NOTFOUND_FILE, log);
}

/* ── shared: does this page of ours exist? ─────────────────────────── */
async function statusOf(p) {
  try {
    const r = await fetch(base() + p, { redirect: 'manual', headers: { 'x-link-check': '1' } });
    await r.arrayBuffer().catch(() => {});
    return r.status;
  } catch { return 0; }
}
function internalLinks(html) {
  const out = new Set();
  for (const m of String(html).matchAll(/href="(\/[^"#?]*)/gu)) {
    const p = m[1].replace(/&amp;/gu, '&');
    if (p.startsWith('//') || /^\/(api|media|admin)/u.test(p) || /\.(pdf|png|jpg|jpeg|svg|css|js|xml|txt|mp4|webp)$/iu.test(p)) continue;
    out.add(p.replace(/\/+$/u, '') || '/');
  }
  return [...out];
}

/* ── 2. Weekly whole-site check ────────────────────────────────────── */
export async function runLinkAudit({ maxPages = 3000 } = {}) {
  const started = Date.now();
  const seen = new Map(); const linkedFrom = new Map();
  const queue = ['/'];
  try {
    const sm = await (await fetch(`${base()}/sitemap.xml`)).text();
    for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>/gu)) { try { queue.push(new URL(m[1]).pathname); } catch { /* skip */ } }
  } catch { /* sitemap not readable: start from the homepage */ }
  while (queue.length && seen.size < maxPages) {
    const p = queue.shift();
    if (seen.has(p)) continue;
    let status = 0; let html = '';
    try {
      const r = await fetch(base() + p, { redirect: 'manual', headers: { 'x-link-check': '1' } });
      status = r.status;
      html = (r.headers.get('content-type') || '').includes('text/html') ? await r.text() : '';
    } catch { status = 0; }
    seen.set(p, status);
    if (status !== 200) continue;
    for (const l of internalLinks(html)) {
      if (!linkedFrom.has(l)) linkedFrom.set(l, new Set());
      if (linkedFrom.get(l).size < 5) linkedFrom.get(l).add(p);
      if (!seen.has(l)) queue.push(l);
    }
  }
  const broken = [...seen].filter(([, s]) => s === 404 || s === 0 || s >= 500)
    .map(([p, s]) => ({ path: p, status: s || 'no answer', from: [...(linkedFrom.get(p) || [])] }));
  const result = { checkedAt: new Date().toISOString(), pages: seen.size, broken, seconds: Math.round((Date.now() - started) / 1000) };
  await writeJson(AUDIT_FILE, result);
  return { ok: broken.length === 0, message: `${seen.size} pages checked, ${broken.length} broken link${broken.length === 1 ? '' : 's'}${broken.length ? `: ${broken.slice(0, 5).map((b) => b.path).join(', ')}` : ''}` };
}
export const lastLinkAudit = () => readJson(AUDIT_FILE, null);

/* ── 3. Article check before publishing ────────────────────────────── */
export async function missingLinks(article) {
  const text = JSON.stringify([article.summary, article.plainEnglish, article.whyItMatters, article.everydayExample, article.bodySections, article.takeaways]);
  const paths = new Set();
  for (const m of text.matchAll(/(?:href=\\?"|\]\()(\/[a-z0-9][^\s"\\)#?]*)/giu)) paths.add(m[1].replace(/\/+$/u, ''));
  const missing = [];
  for (const p of paths) {
    if (/^\/(api|media)/u.test(p)) continue;
    const s = await statusOf(p);
    if (s === 404) missing.push(p);
  }
  return missing;
}
