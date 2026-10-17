/* ════════════════════════════════════════════════════════════════════════
   PHOTOS — free Pexels pictures for pages and explainers
   ───────────────────────────────────────────────────────────────────────
   - Page header photos (Top 10s, Today, Learn, each company by industry)
     are looked up once and saved in data/market/images.json, then reused
     for 30 days, so we stay far inside Pexels' free limits.
   - Explainers without a picture get one automatically (data engine job
     "Photos for explainers", daily, up to 15 at a time).
   Pexels photos are free to use; we credit the photographer under each one.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { readStore, updateStore } from './storeService.js';
import { searchPexelsImage } from './visualsService.js';

const FILE = path.join(process.cwd(), 'data', 'market', 'images.json');
const KEEP_DAYS = 30;

export const PAGE_PHOTO_QUERIES = {
  today: 'stock market trading screen',
  learn: 'person reading notebook finance',
  'top10-dividends': 'coins savings jar',
  'top10-etfs': 'basket of fruit market',
  'top10-crypto': 'bitcoin coin',
  'top10-hub': 'charts on desk',
  stocks: 'city skyline financial district',
};

/** SEC industry description → a photo search that suits it. */
const INDUSTRY_QUERIES = [
  [/beverage|bottl/iu, 'soft drink bottles'],
  [/pharma|biolog|medicin|drug/iu, 'medicine pills laboratory'],
  [/surgical|medical|dental|hospital|health/iu, 'hospital medical equipment'],
  [/insurance/iu, 'family home protection'],
  [/bank|savings institution|credit/iu, 'bank building'],
  [/invest|security brokers|asset/iu, 'financial charts office'],
  [/real estate|reit/iu, 'apartment buildings'],
  [/electric|utilit|gas/iu, 'power lines electricity'],
  [/petroleum|oil|crude/iu, 'oil refinery'],
  [/semiconductor|electronic comp/iu, 'computer chip circuit board'],
  [/software|prepackaged|computer programming|data processing|computer processing/iu, 'software developer laptop'],
  [/computer|communications equipment/iu, 'computer hardware'],
  [/telephone|telecom|radiotelephone|cable/iu, 'telecom tower'],
  [/retail|stores|variety|department/iu, 'shopping store aisle'],
  [/eating|restaurant/iu, 'restaurant food'],
  [/motor vehicle|auto/iu, 'electric car'],
  [/aircraft|aerospace|guided missile/iu, 'airplane'],
  [/railroad|trucking|freight|transport|air courier/iu, 'freight train'],
  [/food|grain|cereal|dairy|candy|confection/iu, 'grocery food'],
  [/perfume|cosmetic|soap|toilet/iu, 'household products bathroom'],
  [/tobacco|cigarette/iu, 'farm field leaves'],
  [/chemical|plastic|paint/iu, 'chemical plant'],
  [/steel|metal/iu, 'steel factory'],
  [/machinery|construction|farm machinery|engines/iu, 'construction machinery'],
  [/paper|packag/iu, 'paper products'],
  [/advertis|business services|services-/iu, 'office team'],
];

export function industryQuery(industry = '') {
  const match = INDUSTRY_QUERIES.find(([pattern]) => pattern.test(industry));
  return match ? match[1] : 'business office';
}

async function readCache() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function writeCache(cache) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(`${FILE}.tmp`, JSON.stringify(cache), 'utf8');
  await fs.rename(`${FILE}.tmp`, FILE);
}

const inFlight = new Map();
const recentFailures = new Map(); // key -> time of last failed lookup (wait 1 hour before retrying)

/** A saved photo for this key, looking it up on Pexels the first time. Never throws. */
export async function getPhoto(key, query) {
  try {
    const cache = await readCache();
    const hit = cache[key];
    const fresh = hit && Date.now() - new Date(hit.fetchedAt).getTime() < KEEP_DAYS * 86400000;
    if (fresh) return hit.photo;
    if (!process.env.PEXELS_API_KEY) return hit?.photo || null;
    if (Date.now() - (recentFailures.get(key) || 0) < 3600000) return hit?.photo || null;
    if (inFlight.has(key)) return inFlight.get(key);

    const lookup = (async () => {
      const photo = await Promise.race([
        searchPexelsImage(query),
        new Promise((resolve) => setTimeout(() => resolve(undefined), 4000)),
      ]);
      if (photo === undefined) return hit?.photo || null; // slow — use old photo, try again next time
      const latest = await readCache();
      latest[key] = { photo: photo || null, query, fetchedAt: new Date().toISOString() };
      await writeCache(latest);
      return photo || null;
    })();
    inFlight.set(key, lookup);
    try {
      return await lookup;
    } finally {
      inFlight.delete(key);
    }
  } catch (error) {
    recentFailures.set(key, Date.now());
    console.error(`[images] Photo for "${key}" not available: ${error.message}`);
    return null;
  }
}

export function photoFigure(photo, alt, className = 'page-photo') {
  if (!photo?.url) return '';
  const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
  return `<figure class="${className}">
          <img src="${esc(photo.url)}" alt="${esc(alt)}" loading="lazy" />
          ${photo.photographer ? `<figcaption>Photo: <a href="${esc(photo.photographerUrl || photo.pexelsPageUrl || 'https://www.pexels.com')}" target="_blank" rel="noopener nofollow">${esc(photo.photographer)}</a> / Pexels</figcaption>` : ''}
        </figure>`;
}

/** Turns a headline into a short photo search: drops filler words. */
function queryFromHeadline(headline = '') {
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'what', 'why', 'how', 'your', 'you', 'it', 'its', 'with', 'this', 'that', 'they', 'them', 'explained', 'simply', 'understanding', 'matter', 'matters', 'can', 'do', 'does']);
  const words = String(headline).toLowerCase().replace(/[^a-z\s]/gu, ' ').split(/\s+/u).filter((w) => w.length > 2 && !stop.has(w));
  return words.slice(0, 3).join(' ') || 'money finance';
}

/** Data engine job: give every published explainer a photo. */
export async function attachMissingArticlePhotos({ limit = 15 } = {}) {
  if (!process.env.PEXELS_API_KEY) {
    return { ok: false, skipped: true, message: 'Skipped — no Pexels key saved in Admin' };
  }
  const store = await readStore();
  const missing = (store.articles || [])
    .filter((article) => article.status === 'published' && !article.heroImage?.url)
    .slice(0, limit);
  if (!missing.length) {
    return { ok: true, message: 'Every published explainer already has a photo' };
  }
  let added = 0;
  for (const article of missing) {
    try {
      const photo = await searchPexelsImage(queryFromHeadline(article.headline))
        || await searchPexelsImage('money finance');
      if (photo) {
        await updateStore((draft) => {
          const target = draft.articles.find((entry) => entry.id === article.id);
          if (target && !target.heroImage?.url) {
            target.heroImage = photo;
            target.updatedAt = new Date().toISOString();
          }
          return draft;
        });
        added += 1;
      }
    } catch (error) {
      console.error(`[images] "${article.headline}": ${error.message}`);
    }
  }
  return { ok: true, message: `Added photos to ${added} of ${missing.length} explainers` };
}
