/* ════════════════════════════════════════════════════════════════════════
   SEO — pages Google can read, clean addresses, sitemap and robots.txt
   ───────────────────────────────────────────────────────────────────────
   - /learn            list of every published explainer (built on the server)
   - /learn/<slug>     one explainer, with its text already in the page
   - /sitemap.xml      every public page, for Google and Bing
   - /robots.txt       says whether search engines may visit
   - Old /article.html?slug=x links redirect to /learn/x

   SEARCH ENGINES ARE HIDDEN UNTIL LAUNCH. Admin → APIs & More has a
   "Search engines" switch that saves SEARCH_VISIBLE=yes|no to data/.env.
   While hidden, robots.txt blocks everything and every page carries a
   "noindex" header, so nothing half-built ends up on Google.
   ════════════════════════════════════════════════════════════════════════ */

import { readStore } from './storeService.js';
import { AD_SCRIPT, adSlot } from './adService.js';
import { getArticleBySlug, publishDueArticles } from './articleService.js';
import { INFO_PAGES, LEGAL_UPDATED } from '../data/legalPages.js';
import { getDividendTop10, getEtfTop10 } from './top10Service.js';

const TOPIC_LABELS = {
  equities: 'Stocks',
  etfs: 'ETFs',
  'fixed-income': 'Bonds',
  commodities: 'Gold & oil',
  fx: 'Money',
  crypto: 'Crypto',
  retirement: 'Retire',
  income: 'Income',
};

const FONT_LINKS = `
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,600;7..72,700&family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />`;

/** Forum on/off (Admin → Forum). Off by default until there are enough members. */
export function isForumEnabled() {
  return String(process.env.FORUM_ENABLED || '').toLowerCase() === 'yes';
}

/** Removes the Forum menu link from a page when the forum is switched off. */
export function stripForumLinks(html) {
  return isForumEnabled() ? html : html.replace(/\s*<a href="\/forum"[^>]*>Forum<\/a>/gu, '');
}

export function isSearchVisible() {
  return String(process.env.SEARCH_VISIBLE || '').toLowerCase() === 'yes';
}

/** The public web address, e.g. https://drmoneywise.com. Falls back to the
 *  address the visitor used (e.g. the Railway link) when no domain is set. */
export function getSiteOrigin(request) {
  const domain = String(process.env.SITE_DOMAIN || '').trim().replace(/^https?:\/\//u, '').replace(/\/+$/u, '');
  if (domain && isSearchVisible()) {
    return `https://${domain}`;
  }
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost';
  const proto = request.headers['x-forwarded-proto'] || (String(host).startsWith('localhost') ? 'http' : 'https');
  return `${String(proto).split(',')[0]}://${String(host).split(',')[0]}`;
}

/** Headers added to every response: "noindex" while hidden, always for admin/API. */
export function robotsHeaderFor(pathname) {
  if (!isSearchVisible() || pathname.startsWith('/admin') || pathname.startsWith('/api/')) {
    return { 'X-Robots-Tag': 'noindex, nofollow' };
  }
  return {};
}

export function buildRobotsTxt(origin) {
  if (!isSearchVisible()) {
    return 'User-agent: *\nDisallow: /\n';
  }
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin.html',
    'Disallow: /api/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

/** Published explainers, newest first. */
export async function getPublishedLearningArticles() {
  await publishDueArticles();
  const store = await readStore();
  const now = Date.now();
  return (store.articles || [])
    .filter((article) => article.status === 'published' && article.slug && new Date(article.publishAt || 0).getTime() <= now)
    .filter((article) => (article.contentType || 'learning') === 'learning')
    .sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());
}

export async function buildSitemapXml(origin) {
  const articles = await getPublishedLearningArticles();
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${origin}/`, lastmod: today, priority: '1.0' },
    { loc: `${origin}/learn`, lastmod: today, priority: '0.8' },
    { loc: `${origin}/top-10`, lastmod: today, priority: '0.8' },
    { loc: `${origin}/top-10/dividend-stocks`, lastmod: today, priority: '0.8' },
    { loc: `${origin}/top-10/etfs`, lastmod: today, priority: '0.8' },
    { loc: `${origin}/top-10/crypto`, lastmod: today, priority: '0.8' },
    { loc: `${origin}/today`, lastmod: today, priority: '0.9' },
    { loc: `${origin}/stocks`, lastmod: today, priority: '0.7' },
    ...Object.keys(INFO_PAGES).map((slug) => ({ loc: `${origin}/${slug}`, lastmod: today, priority: '0.3' })),
    ...articles.map((article) => ({
      loc: `${origin}/learn/${encodeURIComponent(article.slug)}`,
      lastmod: String(article.updatedAt || article.publishAt || today).slice(0, 10),
      priority: '0.6',
    })),
  ];
  if (isForumEnabled()) try {
    const { forumSitemapEntries } = await import('./forumService.js');
    urls.push({ loc: `${origin}/forum`, lastmod: today, priority: '0.7' }, ...(await import('../data/forumConfig.js')).FORUM_SECTIONS.map((sec) => ({ loc: `${origin}/forum/${sec.id}`, lastmod: today, priority: '0.6' })), ...(await forumSitemapEntries(origin)));
  } catch (error) {
    console.error('[seo] Forum left out of sitemap:', error.message);
  }
  urls.push({ loc: `${origin}/results`, lastmod: today, priority: '0.8' });
  urls.push({ loc: `${origin}/screener`, lastmod: today, priority: '0.7' });
  try {
    const { marketsSitemapEntries } = await import('./marketsPages.js');
    urls.push(...marketsSitemapEntries(origin));
  } catch (error) {
    console.error('[seo] Markets pages left out of sitemap:', error.message);
  }
  try {
    const { propertySitemapEntries } = await import('./propertyPages.js');
    urls.push(...propertySitemapEntries(origin));
  } catch (error) {
    console.error('[seo] Property pages left out of sitemap:', error.message);
  }
  try {
    const { toolsSitemapEntries } = await import('./toolsPages.js');
    urls.push(...toolsSitemapEntries(origin));
  } catch (error) {
    console.error('[seo] Calculators and glossary left out of sitemap:', error.message);
  }
  try {
    const { stockSitemapEntries } = await import('./stockPages.js');
    urls.push(...(await stockSitemapEntries(origin)));
  } catch (error) {
    console.error('[seo] Company pages left out of sitemap:', error.message);
  }
  const body = urls
    .map((url) => `  <url><loc>${escapeXml(url.loc)}</loc><lastmod>${url.lastmod}</lastmod><priority>${url.priority}</priority></url>`)
    .join('\n');
  console.log(`[seo] sitemap built with ${urls.length} pages (search engines ${isSearchVisible() ? 'allowed' : 'hidden'})`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/* ── Page head: title, description, canonical, social preview ───────── */
export function buildHeadTags({ title, description, canonical, image, jsonLd, type = 'website' }) {
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeAttr(description)}" />`,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="Dr MoneyWise" />`,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
  ];
  if (image) {
    tags.push(`<meta property="og:image" content="${escapeAttr(image)}" />`);
  }
  if (!isSearchVisible()) {
    tags.push('<meta name="robots" content="noindex, nofollow" />');
  }
  if (jsonLd) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</gu, '\\u003c')}</script>`);
  }
  return tags.join('\n    ');
}

/** Replaces a static page's <title> and description with full head tags. */
function injectHead(html, headTags) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/u, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>/u, '')
    .replace('</head>', () => `    ${headTags}\n  </head>`);
}

/* ── Homepage: head tags + latest explainers already in the page ────── */
/* Without a paid news plan, the homepage shows TradingView's licensed news
   widget instead of API headlines, and the "News by topic" block is hidden. */
async function injectNewsWidget(html) {
  const { newsFeedMode } = await import('./newsService.js');
  if (newsFeedMode() !== 'widget') return html;
  const { newsWidget } = await import('./marketPages.js');
  let out = html.replace(/<div class="news">[\s\S]*?<div id="briefBoard" class="story-list"><\/div>\s*<\/div>/u, () => `<div class="news-widget">${newsWidget(520)}</div>
          <div hidden><a id="briefFeatured" href="#"></a><div id="briefBoard"></div></div>`);
  out = out.replace('<span id="feedState" class="subtle-chip">Loading</span>', () => '<span id="feedState" class="subtle-chip" hidden>Live</span>');
  out = out.replace('<section id="topics" class="block">', () => '<section id="topics" class="block" hidden>');
  out = out.replace('<p>The biggest money news, linked to the original source.</p>', () => '<p>The biggest money news right now, from TradingView’s news feed.</p>');
  return out;
}

export async function renderHomePage(template, origin) {
  const articles = (await getPublishedLearningArticles()).slice(0, 10);
  const head = buildHeadTags({
    title: 'Dr MoneyWise — Money and investing, explained simply',
    description: 'Market news, stocks, ETFs and money ideas explained in plain English for everyday investors.',
    canonical: `${origin}/`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Dr MoneyWise',
      url: `${origin}/`,
    },
  });
  let html = stripForumLinks(injectHead(template, head));
  html = await injectTopTenPanels(html);
  html = await injectPulse(html);
  html = await injectNewsWidget(html);
  if (articles.length) {
    const listHtml = `<div id="learningPoints" class="explain">${articles.map(renderExplainItem).join('')}</div>`;
    html = html.replace('<div id="learningPoints" class="explain"></div>', () => listHtml);
  }
  return html;
}

function renderExplainItem(article) {
  const free = (article.accessTier || 'free') === 'free';
  const badge = article.heroImage?.url
    ? `<img src="${escapeAttr(article.heroImage.url)}" alt="" loading="lazy" />`
    : escapeHtml(TOPIC_LABELS[article.interest] || 'Money');
  return `
        <a class="explain-item" href="/learn/${encodeURIComponent(article.slug)}">
          <span class="topic">${badge}</span>
          <div>
            <h3>${escapeHtml(article.headline)}</h3>
            ${free ? `<p>${escapeHtml(article.summary || '')}</p>` : '<p class="lock-label">Members</p>'}
          </div>
        </a>`;
}

/* ── /learn: every explainer, grouped newest first ──────────────────── */
export async function renderLearnIndex(origin) {
  const articles = await getPublishedLearningArticles();
  const head = buildHeadTags({
    title: 'Learn — money ideas explained simply | Dr MoneyWise',
    description: 'Plain-English explainers on saving, investing, stocks, ETFs, crypto and the economy, with everyday examples.',
    canonical: `${origin}/learn`,
  });
  const list = articles.length
    ? `<div class="explain">${articles.map(renderExplainItem).join('')}</div>`
    : '<p class="empty-note">New explainers are on their way. Check back soon.</p>';
  const { getPhoto, photoFigure, PAGE_PHOTO_QUERIES } = await import('./imageService.js');
  const photo = await getPhoto('page:learn', PAGE_PHOTO_QUERIES.learn);
  const body = `
      <section class="block">
        ${photoFigure(photo, 'Reading and learning about money', 'page-photo wide')}
        <div class="block-head">
          <div><h1 style="font-size:36px;margin:0">Explained simply</h1><p>Money ideas in everyday words, with real-life examples. ${articles.length} explainer${articles.length === 1 ? '' : 's'} so far.</p></div>
        </div>
        ${list}
      </section>`;
  return pageShell({ head, body, active: 'learn' });
}

/* ── /learn/<slug>: one explainer with its text in the page ─────────── */
export async function renderArticlePage(template, slug, origin) {
  const stored = (await getPublishedLearningArticles()).find((article) => article.slug === slug);
  if (!stored) {
    return null;
  }
  const article = await getArticleBySlug({ slug, plan: 'free' });
  const canonical = `${origin}/learn/${encodeURIComponent(slug)}`;
  const description = (article.summary || article.headline || '').slice(0, 160);
  const head = buildHeadTags({
    title: `${article.headline} | Dr MoneyWise`,
    description,
    canonical,
    image: article.heroImage?.url || '',
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.headline,
      description,
      datePublished: article.publishAt,
      dateModified: article.updatedAt || article.publishAt,
      author: { '@type': 'Organization', name: 'Dr MoneyWise Team' },
      publisher: { '@type': 'Organization', name: 'Dr MoneyWise' },
      mainEntityOfPage: canonical,
      ...(article.heroImage?.url ? { image: [article.heroImage.url] } : {}),
      isAccessibleForFree: article.accessible,
    },
  });

  const sections = (article.visibleSections || [])
    .map((section) =>
      section.heading === 'Everyday example'
        ? `<p>${escapeHtml(section.body || '')}</p>`
        : `<h2 style="font-size:24px;margin:28px 0 8px">${escapeHtml(section.heading || '')}</h2><p>${escapeHtml(section.body || '')}</p>`,
    )
    .join('');
  const prerendered = `
          <header class="article-header">
            <h1 class="article-title">${escapeHtml(article.headline)}</h1>
            <div class="article-meta"><span>Dr MoneyWise Team</span><span>${formatDate(article.publishAt)}</span></div>
            <p>${escapeHtml(article.summary || '')}</p>
          </header>
          ${article.heroImage?.url ? `<figure class="article-hero-image"><img src="${escapeAttr(article.heroImage.url)}" alt="${escapeAttr(article.headline)}" />${article.heroImage.photographer ? `<figcaption>Photo by ${escapeHtml(article.heroImage.photographer)} on Pexels</figcaption>` : ''}</figure>` : ''}
          <div class="article-body-stack"><div class="article-body">${sections}</div></div>`;

  const articleHtml = `<article id="articleContainer" class="article-layout" data-slug="${escapeAttr(slug)}">${prerendered}
        </article>`;
  const html = stripForumLinks(injectHead(template, head)).replace(
    /<article id="articleContainer" class="article-layout">[\s\S]*?<\/article>/u,
    () => articleHtml,
  );

  return html;
}

/* ── About, Contact, Disclaimer, Privacy, Terms ─────────────────────── */
export function isInfoPage(slug) {
  return Object.prototype.hasOwnProperty.call(INFO_PAGES, slug);
}

export function renderInfoPage(slug, origin) {
  const page = INFO_PAGES[slug];
  const head = buildHeadTags({
    title: `${page.title} | Dr MoneyWise`,
    description: page.description,
    canonical: `${origin}/${slug}`,
  });
  const showDate = ['disclaimer', 'privacy', 'terms'].includes(slug);
  const sections = page.sections
    .map((section) => `
          <h2 style="font-size:24px;margin:30px 0 8px">${escapeHtml(section.heading)}</h2>
          ${section.paragraphs.map((text) => `<p>${linkEmails(escapeHtml(text))}</p>`).join('\n          ')}`)
    .join('');
  const body = `
      <section class="block">
        <div class="article-layout" style="max-width:820px;margin:0 auto">
          <h1 class="article-title">${escapeHtml(page.title)}</h1>
          ${showDate ? `<p class="helper-note">Last updated ${escapeHtml(LEGAL_UPDATED)}</p>` : ''}
          <p style="font-size:19px;color:var(--ink-2)">${linkEmails(escapeHtml(page.intro))}</p>
          <div class="article-body">${sections}
          </div>
        </div>
      </section>`;
  return pageShell({ head, body, active: '' });
}

function linkEmails(html) {
  return html.replace(/([a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,})/giu, '<a href="mailto:$1">$1</a>');
}

/* ── Homepage "Markets today" box: real economy figures ─────────────── */
async function injectPulse(html) {
  try {
    const { renderHomePulse } = await import('./marketPages.js');
    const pulse = await renderHomePulse();
    if (!pulse) return html;
    return html.replace(
      /(<div id="marketPulse" class="pulse" aria-label="Markets today">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/u,
      (match, open, close) => `${open}\n            ${pulse}\n          ${close}`,
    );
  } catch (error) {
    console.error('[home] Markets box could not be filled:', error.message);
    return html;
  }
}

/* ── Homepage Top 10 panels, filled from the saved lists ─────────────── */
async function injectTopTenPanels(html) {
  try {
    const [div, etf] = await Promise.all([getDividendTop10(), getEtfTop10()]);
    const bars = (rows, valueOf, displayOf, labelOf) => {
      const max = Math.max(...rows.map(valueOf), 0) || 1;
      return `<ul class="bars">${rows.map((row) => `<li><span class="t">${escapeHtml(labelOf(row))}</span><span class="track"><span class="fill" style="width:${((valueOf(row) / max) * 100).toFixed(0)}%"></span></span><span class="v">${escapeHtml(displayOf(row))}</span></li>`).join('')}</ul>`;
    };
    const top4 = div.rows.slice(0, 4);
    const dividendPanel = top4.length ? `
            <article class="ten">
              <h3>Dividend stocks</h3>
              <p class="rule">Raised their payout ${div.rows[0] ? '10+' : ''} years in a row, ranked by ${div.rankedBy === 'yield' ? 'yield' : 'years of raises'}.</p>
              ${div.rankedBy === 'yield'
                ? bars(top4, (r) => r.yield, (r) => `${(r.yield * 100).toFixed(1)}%`, (r) => r.ticker)
                : bars(top4, (r) => r.years, (r) => `${r.years} yrs`, (r) => r.ticker)}
              <p class="meaning">${div.rankedBy === 'yield' && top4[0]
                ? `${(top4[0].yield * 100).toFixed(1)}% means about <strong>$${top4[0].incomePer1000} a year</strong> for every $1,000 invested.`
                : 'Companies that have kept raising what they pay shareholders, year after year.'}</p>
              <a class="go" href="/top-10/dividend-stocks">See all 10</a>
            </article>` : `
            <article class="ten">
              <h3>Dividend stocks</h3>
              <p class="rule">Companies that raised their payout 10+ years in a row, ranked by yield.</p>
              <p class="meaning">First list coming soon.</p>
            </article>`;
    const etfTop = etf.rows.slice(0, 4);
    const etfPanel = `
            <article class="ten">
              <h3>ETFs for beginners</h3>
              <p class="rule">Simple, broad funds, ranked by lowest yearly fee.</p>
              ${bars(etfTop, (r) => r.feePer1000, (r) => `$${r.feePer1000.toFixed(2)}`, (r) => r.ticker)}
              <p class="meaning">Fee per year for every $1,000 invested. Lower keeps more in your pocket.</p>
              <a class="go" href="/top-10/etfs">See all 10</a>
            </article>`;
    return html.replace(
      /(<div id="topTenPanels" class="tens">)[\s\S]*?(<article class="ten crypto">)/u,
      (match, open, close) => `${open}${dividendPanel}${etfPanel}\n            ${close}`,
    );
  } catch (error) {
    console.error('[top10] Homepage panels could not be filled:', error.message);
    return html;
  }
}

/* ── 404 page ────────────────────────────────────────────────────────── */
export function renderNotFound() {
  const head = '<title>Page not found | Dr MoneyWise</title>\n    <meta name="robots" content="noindex" />';
  const body = `
      <section class="block">
        <h1 style="font-size:36px;margin:0 0 8px">We couldn't find that page</h1>
        <p class="helper-note">It may have moved. Try the <a href="/">homepage</a> or browse <a href="/learn">all explainers</a>.</p>
      </section>`;
  return pageShell({ head, body, active: '' });
}

/* ── Shared header + footer for server-built pages ──────────────────── */
export function pageShell({ head, body, active }) {
  const nav = [
    ['today', '/today', 'Today'],
    ['learn', '/learn', 'Learn'],
    ['top10', '/top-10', 'Top 10s'],
    ['markets', '/markets', 'Markets'],
    ['property', '/property', 'Property'],
    ['tools', '/tools', 'Tools'],
    ...(isForumEnabled() ? [['forum', '/forum', 'Forum']] : []),
    ['membership', '/membership', 'Membership'],
  ];
  const links = nav
    .map(([id, href, label]) => `<a href="${href}"${id === active ? ' aria-current="page"' : ''}>${label}</a>`)
    .join('\n          ');
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${head}${FONT_LINKS}
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <div class="wrap bar">
        <a class="brand" href="/">Dr MoneyWise</a>
        <nav class="main-nav" aria-label="Main">
          ${links}
        </nav>
        <div class="header-actions">
          <a class="pill-gold" href="/#join">Sign in</a>
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobileNav" onclick="var n=document.getElementById('mobileNav');var o=n.classList.toggle('open');this.setAttribute('aria-expanded',o);this.textContent=o?'Close':'Menu';">Menu</button>
        </div>
      </div>
      <nav id="mobileNav" class="mobile-nav" aria-label="Main">
        ${links}
      </nav>
    </header>
    <div id="resultsStrip" class="rs-strip" hidden></div>
    <main>
      <div class="wrap">${adSlot('top-banner')}${body}
      </div>
    </main>
    <footer class="site-footer">
      <div class="wrap">
        <div class="foot-grid">
          <a class="brand" href="/">Dr MoneyWise</a>
          <div class="foot-links">
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/disclaimer">Disclaimer</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
        <p class="disclaimer">Dr MoneyWise is for education only and is not financial advice. Investing involves risk, including losing money. Prices may be delayed. Talk to a licensed adviser before making decisions.</p>
        <p class="foot-credits">Data from official sources: US SEC filings, US Bureau of Labor Statistics, New York Fed, US Treasury, Freddie Mac, the World Bank, the BIS, the OECD and HM Land Registry. Charts, prices and news by <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow">TradingView</a>. Photos from <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a>. <a href="https://logo.dev" target="_blank" rel="noopener">Logos provided by Logo.dev</a>.</p>
      </div>
    </footer>
    ${adSlot('bottom-strip')}
    ${AD_SCRIPT}
    <script src="/results.js" defer></script>
  </body>
</html>
`;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatDate(value) {
  const date = new Date(value || Date.now());
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeXml(value) {
  return escapeHtml(value);
}
