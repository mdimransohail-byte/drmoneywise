/* ════════════════════════════════════════════════════════════════════════
   NEWS ARTICLES for Google News
     /results/<ticker>-results-<date>   one company's results, explained
                                        simply (only results we have
                                        written up; others stay a link)
     /sitemap-news.xml                  Google News sitemap: results and
                                        explainers from the last 2 days
   Each result page carries NewsArticle structured data, a dateline and the
   publisher. Apply in Google Publisher Center once the site is live.
   ════════════════════════════════════════════════════════════════════════ */

import { readResults } from './resultsService.js';
import { buildHeadTags, getPublishedLearningArticles, pageShell } from './seoService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const xml = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;').replace(/'/gu, '&apos;');
const day = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** URL path for a written-up result, or '' if it has no write-up. */
export function resultPath(r) {
  if (!r?.simple || !r.ticker || !r.filed) return '';
  return `/results/${r.ticker.toLowerCase()}-results-${r.filed}${r.dup ? `-${String(r.id).slice(-4)}` : ''}`;
}

function findResult(slug) {
  const m = String(slug).match(/^([a-z0-9-]{1,12}?)-results-(\d{4}-\d{2}-\d{2})(?:-([0-9a-z]{4}))?$/u);
  if (!m) return null;
  const items = (readResults().items || []).filter((r) => r.simple && r.ticker.toLowerCase() === m[1] && r.filed === m[2]);
  return m[3] ? items.find((r) => String(r.id).endsWith(m[3])) : items[0];
}

export async function renderResultArticle(origin, slug) {
  const r = findResult(slug);
  if (!r) return null;
  const url = `${origin}${resultPath(r)}`;
  const published = r.writtenAt || r.foundAt || `${r.filed}T12:00:00Z`;
  const head = buildHeadTags({
    title: `${r.headline} | Dr MoneyWise`,
    description: `${r.name} (${r.ticker}) results, ${day(r.filed)}: ${r.simple}`,
    canonical: url,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: String(r.headline).slice(0, 110),
      datePublished: published,
      dateModified: r.impactAt || published,
      description: r.simple,
      image: [`${origin}/og-default.png`],
      author: { '@type': 'Organization', name: 'Dr MoneyWise Team', url: `${origin}/about` },
      publisher: { '@type': 'Organization', name: 'Dr MoneyWise', logo: { '@type': 'ImageObject', url: `${origin}/apple-touch-icon.png` } },
      mainEntityOfPage: url,
      about: { '@type': 'Corporation', name: r.name, tickerSymbol: r.ticker },
      isBasedOn: r.url,
    },
  });
  const { resultCardHtml } = await import('./resultsPages.js');
  const { compareLinksHtml } = await import('./comparePages.js');
  const body = `
      <section class="block nx-page">
        <p class="crumbs"><a href="/results">Company results</a> › ${esc(r.name)}</p>
        <p class="nx-dateline">${esc(day(r.filed))} · Dr MoneyWise Team · Company results</p>
        <h1>${esc(r.headline)}</h1>
        ${resultCardHtml(r, { showCompany: true })}
        <div class="nx-more">
          <a href="/stock/${esc(r.ticker)}#healthCheck">${esc(r.name)}: Financial Health Check and report card →</a>
          ${compareLinksHtml(r.ticker)}
        </div>
        <p class="note-box">We explain what the company reported in its official filing. This is news and education, not advice to buy or sell.</p>
      </section>
      <script src="/results.js" defer></script>`;
  return pageShell({ head, body, active: 'markets' });
}

/** Google News sitemap: articles published in the last 2 days. */
export async function buildNewsSitemap(origin) {
  const since = Date.now() - 2 * 86400000;
  const results = (readResults().items || []).filter((r) => r.simple && new Date(r.writtenAt || r.foundAt).getTime() > since)
    .map((r) => ({ loc: `${origin}${resultPath(r)}`, date: r.writtenAt || r.foundAt, title: r.headline }));
  const lessons = (await getPublishedLearningArticles()).filter((a) => new Date(a.publishAt).getTime() > since && (a.accessTier || 'free') === 'free')
    .map((a) => ({ loc: `${origin}/learn/${encodeURIComponent(a.slug)}`, date: a.publishAt, title: a.headline }));
  const items = [...results, ...lessons].slice(0, 1000);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items.map((i) => `  <url><loc>${xml(i.loc)}</loc><news:news><news:publication><news:name>Dr MoneyWise</news:name><news:language>en</news:language></news:publication><news:publication_date>${xml(new Date(i.date).toISOString())}</news:publication_date><news:title>${xml(i.title)}</news:title></news:news></url>`).join('\n')}
</urlset>`;
}

/** Recent written-up results for the main sitemap. */
export function resultSitemapEntries(origin) {
  return (readResults().items || []).filter((r) => r.simple).slice(-500).map((r) => ({ loc: `${origin}${resultPath(r)}`, lastmod: r.filed, priority: '0.6' }));
}
