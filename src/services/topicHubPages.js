/* ════════════════════════════════════════════════════════════════════════
   TOPIC HUB PAGES — /personal-finance, /retirement, /child-education,
   /insurance, /currencies; plus hubSectionsHtml('commodities') added to
   the bottom of /commodities. Content in src/data/topicHubs.js.
   Every hub links lessons, calculators, companies (with health scores),
   money words, latest news and answers to common questions (with FAQ
   structured data so search engines can show them).
   ════════════════════════════════════════════════════════════════════════ */

import { HUBS, HUB_ORDER } from '../data/topicHubs.js';
import { courseArticleMap, lessonById } from '../data/learnCourse.js';
import { LEVELS, levelNames, levelOf } from '../data/learnLevels.js';
import { GLOSSARY, slugify } from '../data/glossary.js';
import { CALCULATORS, EXTRA_CALCS } from './toolsPages.js';
import { buildHeadTags, getPublishedLearningArticles, pageShell } from './seoService.js';
import { financialHealth, starsHtml } from './financialHealthService.js';
import { readCompanies } from './dataEngine.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const COLOURS = ['#1baf7a', '#2a78d6', '#e8a33d', '#6250d6', '#e5566f', '#0fa3b1'];
/** Columns that fill every row (no empty gaps): 4, 3, 5 or 2, else 3. */
export function gridCols(n, max = 4) {
  for (const c of [4, 3, 5, 2].filter((x) => x <= max)) if (n % c === 0) return c;
  return n < max ? n : 3;
}
const cols = (n, max) => ` style="--cols:${gridCols(n, max)}"`;

export function isHub(slug) { return HUB_ORDER.includes(slug); }

async function lessonsHtml(hub) {
  const all = await getPublishedLearningArticles();
  const names = await levelNames();
  const map = courseArticleMap(all);
  const picked = [];
  const seen = new Set();
  for (const id of hub.lessons) {
    const a = map.get(id);
    if (a && !seen.has(a.slug)) { picked.push(a); seen.add(a.slug); }
  }
  for (const a of all) {
    if (picked.length >= 9) break;
    if (!seen.has(a.slug) && hub.match.test(`${a.headline} ${a.trendingTopic || ''}`)) { picked.push(a); seen.add(a.slug); }
  }
  // Course lessons on this topic that are still being written
  const soon = hub.lessons.filter((id) => !map.has(id)).map(lessonById).filter(Boolean).slice(0, Math.max(0, 6 - picked.length));
  if (!picked.length && !soon.length) return '';
  const card = (a) => {
    const lv = levelOf(a); const L = LEVELS[lv];
    return `<a class="hb-lesson" href="/learn/${esc(a.slug)}" style="--c:${L.colour}">${a.heroImage?.url ? `<img src="${esc(a.heroImage.url)}" alt="" loading="lazy">` : '<span class="hb-ph"></span>'}<span class="lvl-mini" style="--c:${L.colour}">${esc(names[lv])}${L.premium ? ' · Premium' : ''}</span><strong>${esc(a.headline)}</strong><em>${esc(a.readingTime || '5 min read')}</em></a>`;
  };
  const soonCard = (l) => { const L = LEVELS[l.level]; return `<a class="hb-lesson soon" href="/learn/${L.slug}#week-${l.week}" style="--c:${L.colour}"><span class="hb-ph"></span><span class="lvl-mini" style="--c:${L.colour}">${esc(names[l.level])} · Week ${l.week}</span><strong>${esc(l.headline)}</strong><em>Coming soon</em></a>`; };
  return `<h2 class="lvp-h">Lessons on this</h2><div class="hb-lessons hb-grid"${cols(picked.length + soon.length, 5)}>${picked.map(card).join('')}${soon.map(soonCard).join('')}</div>`;
}

function calcsHtml(hub) {
  const all = { ...CALCULATORS, ...EXTRA_CALCS };
  const list = hub.calcs.filter((s) => all[s]);
  if (!list.length) return '';
  return `<h2 class="lvp-h">Calculators</h2><div class="hb-calcs hb-grid"${cols(list.length)}>${list.map((s, i) => `<a class="hb-calc" href="/tools/${s}" style="--c:${COLOURS[i % 6]}"><span class="hb-calc-ico" aria-hidden="true">▦</span><strong>${esc(all[s].title)}</strong><span>${esc(all[s].short)}</span><em>Open calculator →</em></a>`).join('')}</div>`;
}

async function companiesHtml(hub) {
  const { companies } = await readCompanies();
  const rows = hub.companies.tickers.map((t) => {
    const c = companies?.[t];
    const h = c ? financialHealth(c) : null;
    return `<a class="hb-co" href="/stock/${encodeURIComponent(t)}"><strong>${esc(c?.displayName || c?.name || t)}</strong><span class="pick-ticker">${esc(t)}</span>${h && h.score !== null ? `<span class="hb-co-score"><span class="fh-pill" style="--c:${h.band.colour}">${h.score}</span>${starsHtml(h.stars, 13)}</span>` : '<span class="hb-co-score muted">Open the report card</span>'}</a>`;
  }).join('');
  return `<h2 class="lvp-h">${esc(hub.companies.title)}</h2><p class="hb-note">${esc(hub.companies.note)} Scores are from our <a href="/health-check">Financial Health Check</a>; they describe each company’s finances and are not advice to buy or sell.</p><div class="hb-cos hb-grid"${cols(hub.companies.tickers.length)}>${rows}</div>`;
}

function wordsHtml(hub) {
  const byTerm = new Map(GLOSSARY.map((g) => [g.term, g]));
  const list = hub.words.map((w) => byTerm.get(w)).filter(Boolean);
  if (!list.length) return '';
  return `<h2 class="lvp-h">Money words</h2><div class="hb-words hb-grid"${cols(list.length, 5)}>${list.map((g) => `<a href="/glossary/${slugify(g.term)}"><strong>${esc(g.term)}</strong><span>${esc(g.plain)}</span></a>`).join('')}</div>`;
}

function faqHtml(hub) {
  return `<h2 class="lvp-h">Common questions</h2><div class="hb-faq">${hub.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
}

function ideasHtml(hub, title = 'The big ideas') {
  return `<h2 class="lvp-h">${esc(title)}</h2><div class="hb-ideas hb-grid"${cols(hub.ideas.length, 3)}>${hub.ideas.map(([t, d], i) => `<div class="hb-idea" style="--c:${COLOURS[i % 6]}"><span class="hb-n">${i + 1}</span><strong>${esc(t)}</strong><p>${esc(d)}</p></div>`).join('')}</div>`;
}

async function ratesHtml() {
  const { getFxRates, CURRENCY_WORDS } = await import('./fxService.js');
  const { iframeWidget } = await import('./marketPages.js');
  const fx = await getFxRates();
  const list = ['EUR', 'GBP', 'JPY', 'CHF', 'CNY', 'INR', 'AED', 'SAR', 'CAD', 'AUD', 'HKD', 'SGD', 'BRL', 'KRW', 'MXN', 'ZAR'].filter((k) => fx.usdPer?.[k]);
  const fmt = (v) => v.toLocaleString('en-GB', { maximumFractionDigits: v >= 100 ? 1 : v >= 10 ? 2 : 4 });
  const rows = list.map((k) => `<tr><td><strong>${k}</strong><small>${esc(CURRENCY_WORDS[k] || k)}</small></td><td>${fmt(1 / fx.usdPer[k])}</td><td>$${fmt(fx.usdPer[k])}</td><td>${fx.usdPer.GBP ? fmt(fx.usdPer.GBP / fx.usdPer[k]) : '—'}</td></tr>`).join('');
  return `<h2 class="lvp-h">Today’s rates</h2>
        <div class="hb-rates">
          <div class="table-scroll"><table class="hb-rate-table"><thead><tr><th>Currency</th><th>For $1 you get</th><th>One unit in $</th><th>For £1 you get</th></tr></thead><tbody>${rows}</tbody></table>
          <p class="calc-hint">European Central Bank reference rates${fx.date ? ` for ${esc(fx.date)}` : ''}, updated every working day; fixed (pegged) rates for the dirham, riyal and similar. Banks and exchange shops add a margin. <a href="/tools/currency-converter">Convert an amount →</a></p></div>
          <div class="pr-panel"><h3 style="margin:0 0 6px">Live: main currencies against each other</h3>${iframeWidget('embed-widget-forex-cross-rates.js', { width: '100%', height: '100%', currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'CNY'], isTransparent: false, colorTheme: 'light', locale: 'en' }, 380)}</div>
        </div>`;
}

export async function renderHub(slug, origin) {
  const hub = HUBS[slug];
  if (!hub || !isHub(slug)) return null;
  const { newsBlockHtml } = await import('./newsBlock.js');
  const { newsletterSignupBox } = await import('./newsletterPage.js');
  const head = buildHeadTags({
    title: `${hub.seoTitle} | Dr MoneyWise`,
    description: hub.description,
    canonical: `${origin}/${slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'FAQPage', mainEntity: hub.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` }, { '@type': 'ListItem', position: 2, name: hub.name, item: `${origin}/${slug}` }] },
      ],
    },
  });
  const others = HUB_ORDER.filter((s) => s !== slug).map((s) => `<a href="/${s}" style="--c:${HUBS[s].colour}"><span aria-hidden="true">${HUBS[s].icon}</span>${esc(HUBS[s].name)}</a>`).join('');
  const body = `
      <section class="block hb-page" style="--c:${hub.colour};--c2:${hub.colour2}">
        <p class="crumbs"><a href="/">Home</a> › ${esc(hub.name)}</p>
        <div class="hb-hero">
          <span class="hb-icon" aria-hidden="true">${hub.icon}</span>
          <div><span class="pf-badge free">Free guide</span><h1>${esc(hub.name)}</h1><p>${esc(hub.intro)}</p></div>
        </div>
        ${hub.steps?.length ? `<ol class="hb-steps hb-grid"${cols(hub.steps.length, 5)}>${hub.steps.map((s, i) => `<li style="--c:${COLOURS[i % 6]}"><span>${i + 1}</span>${esc(s)}</li>`).join('')}</ol>` : ''}
        ${hub.rates ? await ratesHtml() : ''}
        ${ideasHtml(hub)}
        ${await lessonsHtml(hub)}
        ${calcsHtml(hub)}
        ${await companiesHtml(hub)}
        ${wordsHtml(hub)}
        ${faqHtml(hub)}
        ${hub.news ? await newsBlockHtml('topic', hub.news, { title: `Latest news: ${hub.name.toLowerCase()}`, subject: hub.name, search: hub.name }) : ''}
        <h2 class="lvp-h">More guides</h2>
        <nav class="hb-others">${others}${hub.related.map(([href, label]) => `<a href="${href}" style="--c:#4a5170">${esc(label)}</a>`).join('')}</nav>
        ${newsletterSignupBox(`hub-${slug}`)}
        <p class="note-box">This guide explains how things generally work. It is not personal financial, tax or insurance advice; rules differ by country. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>
      <script src="/newsletter.js" defer></script>`;
  return pageShell({ head, body, active: '' });
}

/** Extra sections for the bottom of /commodities: trading explained, lessons, calculators, companies, words, questions. */
export async function hubSectionsHtml(slug) {
  const hub = HUBS[slug];
  if (!hub) return '';
  return `<div class="hb-page hb-inline" style="--c:${hub.colour};--c2:${hub.colour2}">
        ${ideasHtml(hub, `${hub.name}: how it works`)}
        ${await lessonsHtml(hub)}
        ${calcsHtml(hub)}
        ${await companiesHtml(hub)}
        ${wordsHtml(hub)}
        ${faqHtml(hub)}
      </div>`;
}

/** FAQ structured data for a hub section embedded in another page. */
export function hubFaqJsonLd(slug) {
  const hub = HUBS[slug];
  return hub ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: hub.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) } : null;
}

export function hubSitemapEntries(origin) {
  const today = new Date().toISOString().slice(0, 10);
  return HUB_ORDER.map((s) => ({ loc: `${origin}/${s}`, lastmod: today, priority: '0.8' }));
}
