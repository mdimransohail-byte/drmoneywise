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
import { LEVELS, levelEmblem, levelNames, levelOf } from '../data/learnLevels.js';
import { paragraphsHtml } from './learnVisuals.js';

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
    { loc: `${origin}/today`, lastmod: today, priority: '0.6' },
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
  urls.push({ loc: `${origin}/newsletter`, lastmod: today, priority: '0.5' });
  urls.push({ loc: `${origin}/insiders`, lastmod: today, priority: '0.6' });
  try {
    const { reportSitemapEntries } = await import('./reportPages.js');
    urls.push(...(await reportSitemapEntries(origin)), { loc: `${origin}/learn/path`, lastmod: today, priority: '0.7' }, { loc: `${origin}/learn/beginners`, lastmod: today, priority: '0.8' }, { loc: `${origin}/learn/intermediate`, lastmod: today, priority: '0.8' }, { loc: `${origin}/learn/advanced`, lastmod: today, priority: '0.7' }, { loc: `${origin}/health-check`, lastmod: today, priority: '0.8' }, { loc: `${origin}/guides`, lastmod: today, priority: '0.8' }, { loc: `${origin}/property/cities`, lastmod: today, priority: '0.8' }, ...(await import('./topicHubPages.js')).hubSitemapEntries(origin));
  } catch (error) {
    console.error('[seo] Reports left out of sitemap:', error.message);
  }
  try {
    const { worldSitemapEntries } = await import('./worldPages.js');
    urls.push(...worldSitemapEntries(origin));
    const { shariahSitemapEntries } = await import('./shariahPages.js');
    urls.push(...shariahSitemapEntries(origin, today));
  } catch (error) {
    console.error('[seo] Region pages left out of sitemap:', error.message);
  }
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
export function buildHeadTags({ title: rawTitle, description, canonical, image, jsonLd, type = 'website' }) {
  // Search results show about 60 characters: drop the brand from long titles
  const title = String(rawTitle || '').length > 65 ? String(rawTitle).replace(/ \| Dr MoneyWise$/u, '') : String(rawTitle || '');
  // Search engines show about 155 characters: cut at a word, not mid-word
  const desc = (() => {
    const d = String(description || '').replace(/\s+/gu, ' ').trim();
    if (d.length <= 158) return d;
    const cut = d.slice(0, 155);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 120)).replace(/[,;:.\s]+$/u, '')}…`;
  })();
  let site = '';
  try { site = new URL(canonical).origin; } catch { site = ''; }
  const img = image || (site ? `${site}/og-default.png` : '');
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeAttr(desc)}" />`,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="Dr MoneyWise" />`,
    '<meta property="og:locale" content="en_GB" />',
    `<meta property="og:title" content="${escapeAttr(title.replace(/ \| Dr MoneyWise$/u, ''))}" />`,
    `<meta property="og:description" content="${escapeAttr(desc)}" />`,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary_large_image'}" />`,
    `<meta name="twitter:title" content="${escapeAttr(title.replace(/ \| Dr MoneyWise$/u, ''))}" />`,
    `<meta name="twitter:description" content="${escapeAttr(desc)}" />`,
  ];
  if (img) {
    tags.push(`<meta property="og:image" content="${escapeAttr(img)}" />`);
    if (!image) tags.push('<meta property="og:image:width" content="1200" />', '<meta property="og:image:height" content="630" />');
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
    title: 'Dr MoneyWise — Money and Investing simplified',
    description: 'Money and investing simplified: free courses from the basics up, a health score for every company, live market heat maps, calculators and guides for everyday investors.',
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
  const guides = `
          <div class="home-guides">${[
            ['/learn/beginners', '#1baf7a', '✦', 'Young Guns', 'Free course for beginners'],
            ['/learn/intermediate', '#2a78d6', '⛨', 'Knights', 'Free course, next level'],
            ['/health-check', '#e5566f', '❤', 'Health Check', 'Every company scored'],
            ['/personal-finance', '#0f8a76', '◈', 'Personal finance', 'Budget, save, clear debt'],
            ['/retirement', '#6250d6', '◷', 'Retirement', 'How much you need'],
            ['/child-education', '#e8a33d', '✎', 'Child’s education', 'Costs and how to save'],
            ['/insurance', '#8a4fd8', '☂', 'Insurance', 'The cover that matters'],
            ['/currencies', '#0fa3b1', '¤', 'Currencies', 'Today’s rates explained'],
            ['/commodities', '#b8891a', '⛏', 'Commodities', 'Gold, oil and trading'],
            ['/shariah', '#127a5d', '☪', 'Shariah investing', 'Halal stocks and funds'],
          ].map(([href, c, ico, name, sub]) => `<a href="${href}" style="--c:${c}"><span class="hg-ico" aria-hidden="true">${ico}</span><b>${name}</b><span>${sub}</span></a>`).join('')}</div>`;
  const listHtml = `<div id="learningPoints" class="explain">${articles.map(renderExplainItem).join('')}</div>`;
  html = html.replace('<div id="learningPoints" class="explain"></div>', () => listHtml);
  html = html.replace('<!-- GUIDES -->', () => guides);
  return html;
}

function renderExplainItem(article, names = null) {
  const free = (article.accessTier || 'free') === 'free';
  const lv = names ? levelOf(article) : '';
  const badge = article.heroImage?.url
    ? `<img src="${escapeAttr(article.heroImage.url)}" alt="" loading="lazy" />`
    : escapeHtml(TOPIC_LABELS[article.interest] || 'Money');
  return `
        <a class="explain-item" href="/learn/${encodeURIComponent(article.slug)}">
          <span class="topic">${badge}</span>
          <div>
            ${lv ? `<span class="lvl-mini" style="--c:${LEVELS[lv].colour}">${escapeHtml(names[lv])}</span>` : ''}
            <h3>${escapeHtml(article.headline)}</h3>
            ${free ? `<p>${escapeHtml(article.summary || '')}</p>` : '<p class="lock-label">Members</p>'}
          </div>
        </a>`;
}

/* ── /learn: every explainer, grouped newest first ──────────────────── */
export async function renderLearnIndex(origin) {
  const articles = await getPublishedLearningArticles();
  const head = buildHeadTags({
    title: 'Learn investing and money, week by week: free courses | Dr MoneyWise',
    description: 'Free plain-English money courses: Young Guns for beginners, Knights for mid-level investors, plus Lords for confident investors. Inflation, saving, shares, ETFs, dividends and more.',
    canonical: `${origin}/learn`,
  });
  const everyday = articles;
  const names = await levelNames();
  const { levelChooserHtml } = await import('./learnLevelPages.js');
  const chooser = await levelChooserHtml();
  const list = everyday.length
    ? `<h2 class="lvp-h">Latest lessons</h2><div class="explain">${everyday.map((a) => renderExplainItem(a, names)).join('')}</div>`
    : '<p class="empty-note">New explainers are on their way. Check back soon.</p>';
  const { getPhoto, photoFigure, PAGE_PHOTO_QUERIES } = await import('./imageService.js');
  const photo = await getPhoto('page:learn', PAGE_PHOTO_QUERIES.learn);
  const body = `
      <section class="block">
        ${photoFigure(photo, 'Reading and learning about money', 'page-photo wide')}
        <div class="block-head">
          <div><h1 style="font-size:36px;margin:0">Explained simply</h1><p>Money ideas in everyday words, with worked examples, infographics and a quick check at the end. ${articles.length} lesson${articles.length === 1 ? '' : 's'} so far, free for ${escapeHtml(names.beginner)} and ${escapeHtml(names.intermediate)}, with ${escapeHtml(names.lords)} lessons for Premium members.</p></div>
        </div>
        ${chooser}
        ${list}
        <a class="lp-banner ak-banner" href="/ask"><span class="pf-badge">Members</span><strong>Ask Dr MoneyWise</strong><span>Send us your money question and our team answers in plain English. Read other readers’ answers too.</span><em>Ask a question →</em></a>
        <a class="lp-banner sh-banner" href="/shariah"><span class="pf-badge free">Free</span><strong>Shariah-compliant investing</strong><span>How Islamic screening works, the five main standards side by side, and Shariah funds and ETFs.</span><em>Read the guide →</em></a>
        <a class="lp-banner" href="/learn/path"><span class="pf-badge free">Free</span><strong>Your learning path</strong><span>Short steps from your first savings to running a portfolio. Tick them off as you go.</span><em>Start the path →</em></a>
        ${(await import('./newsletterPage.js')).newsletterSignupBox('learn')}
      </section>
      <script src="/newsletter.js" defer></script>
      <script src="/learnprogress.js" defer></script>`;
  return pageShell({ head, body, active: 'learn' });
}

/* ── Level chip, and the "keep going" block under every explainer ───── */
export function levelChip(level, names, lesson = null) {
  const L = LEVELS[level] || LEVELS.beginner;
  return `<a class="lvl-chip" href="/learn/${L.slug}${lesson ? `#week-${lesson.week}` : ''}" style="--c:${L.colour}">${levelEmblem(level, 22)}<span>${escapeHtml(names[level] || L.defaultName)}</span><em>${lesson ? `Week ${lesson.week} · Lesson ${lesson.n}` : escapeHtml(L.who)}</em></a>`;
}

async function articleExtras(current, level, names) {
  const all = await getPublishedLearningArticles();
  const { COURSE, courseArticleMap, lessonForArticle } = await import('../data/learnCourse.js');
  const L = LEVELS[level] || LEVELS.beginner;
  const same = all.filter((a) => levelOf(a) === level);
  const map = courseArticleMap(same);
  const lesson = lessonForArticle(current);
  // The next lesson in the course at this level that has been published
  let nextLesson = null;
  if (lesson) {
    const flat = (COURSE[level] || []).flatMap((w) => w.lessons.map((l) => ({ ...l, week: w.week })));
    const i = flat.findIndex((l) => l.id === lesson.id);
    const n = flat.slice(i + 1).find((l) => map.has(l.id));
    if (n) nextLesson = { ...n, article: map.get(n.id) };
  }
  const more = same.filter((a) => a.slug !== current.slug && a.slug !== nextLesson?.article.slug).slice(0, 3);
  const order = ['beginner', 'intermediate', 'lords'];
  const up = LEVELS[order[order.indexOf(level) + 1]] || null;
  const crown = '<svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#0a1128"/></svg>';
  const card = (a) => `<a class="ax-card" href="/learn/${escapeAttr(a.slug)}">${a.heroImage?.url ? `<img src="${escapeAttr(a.heroImage.url)}" alt="" loading="lazy">` : `<span class="ax-ph" style="--c:${L.colour}">${levelEmblem(level, 34)}</span>`}<strong>${escapeHtml(a.headline)}</strong><em>${escapeHtml(a.readingTime || '5 min read')}</em></a>`;
  const { newsletterSignupBox } = await import('./newsletterPage.js');
  return `<section class="ax-wrap">
          ${nextLesson ? `<a class="ax-next" href="/learn/${escapeAttr(nextLesson.article.slug)}" style="--c:${L.colour}"><span>Next lesson · Week ${nextLesson.week}</span><strong>${escapeHtml(nextLesson.article.headline)}</strong><em>→</em></a>` : ''}
          ${more.length ? `<div class="ax-head" style="--c:${L.colour}">${levelEmblem(level, 30)}<h2>More for ${escapeHtml(names[level])}</h2><a href="/learn/${L.slug}">See the whole course →</a></div><div class="ax-cards">${more.map(card).join('')}</div>` : ''}
          <div class="ax-row">
            ${up && !up.premium ? `<a class="ax-promo" href="/learn/${up.slug}" style="--c:${up.colour}">${levelEmblem(up.id, 44)}<span><b>Ready for the next level?</b>Join the ${escapeHtml(names[up.id])}: ratios, the economy and the habits of steady investors. Free.</span></a>` : ''}
            ${level === 'lords' ? `<a class="ax-promo prem" href="/membership"><span class="ax-crown" aria-hidden="true">${crown}</span><span><b>Premium: $19.99 a month or $179 a year</b>Every ${escapeHtml(names.lords)} lesson, the Financial Health Check in full, the portfolio check and no adverts.</span></a>`
              : `<a class="ax-promo prem" href="/learn/advanced"><span class="ax-crown" aria-hidden="true">${crown}</span><span><b>Join the ${escapeHtml(names.lords)}</b>Premium lessons that go deeper: valuing a company, the economy’s warning lights and advanced portfolio craft.</span></a>`}
          </div>
          ${newsletterSignupBox('article')}
        </section>
        <script src="/newsletter.js" defer></script>`;
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

  const names = await levelNames();
  const level = article.level || levelOf(article);
  const sections = (article.visibleSections || [])
    .map((section) => `<h2 class="ab-h">${escapeHtml(section.heading || '')}</h2>${paragraphsHtml(section.body)}`)
    .join('');
  const jargon = (article.visibleJargon || []).length
    ? `<section class="article-block"><h3>Money words in this lesson</h3><ul>${article.visibleJargon.map((j) => `<li><strong>${escapeHtml(j.term)}:</strong> ${escapeHtml(j.meaning)}</li>`).join('')}</ul></section>` : '';
  const takeaways = (article.visibleTakeaways || []).length
    ? `<section class="article-block ab-take"><h3>Key takeaways</h3><ul>${article.visibleTakeaways.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul></section>` : '';
  const prerendered = `
          <header class="article-header">
            ${levelChip(level, names, (await import('../data/learnCourse.js')).lessonForArticle(stored))}
            <h1 class="article-title">${escapeHtml(article.headline)}</h1>
            <div class="article-meta"><span>Dr MoneyWise Team</span><span>${formatDate(article.publishAt)}</span><span>${escapeHtml(article.readingTime || '')}</span></div>
            <p>${escapeHtml(article.summary || '')}</p>
          </header>
          ${article.heroImage?.url ? `<figure class="article-hero-image"><img src="${escapeAttr(article.heroImage.url)}" alt="${escapeAttr(article.headline)}" />${article.heroImage.photographer ? `<figcaption>Photo by ${escapeHtml(article.heroImage.photographer)} on Pexels</figcaption>` : ''}</figure>` : ''}
          <div class="article-body-stack">${takeaways}${article.visualHtml || ''}<div class="article-body">${sections}</div>${jargon}${article.quizHtml || ''}</div>`;

  const articleHtml = `<article id="articleContainer" class="article-layout" data-slug="${escapeAttr(slug)}">${prerendered}
        </article>
        ${await articleExtras(stored, level, names)}`;
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
      /(<div id="marketPulse" class="pulse hn-pulse" aria-label="Today's numbers">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/div>\s*<\/section>)/u,
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
    ['learn', '/learn', 'Learn'],
    ['guides', '/guides', 'Guides'],
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
          <a class="pill-gold" href="/#join" onclick="try{sessionStorage.setItem('dmw-back',location.pathname+location.search)}catch(e){}">Sign in</a>
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobileNav" onclick="var n=document.getElementById('mobileNav');var o=n.classList.toggle('open');this.setAttribute('aria-expanded',o);this.textContent=o?'Close':'Menu';">Menu</button>
        </div>
      </div>
      <nav id="mobileNav" class="mobile-nav" aria-label="Main">
        ${links}
      </nav>
    </header>
    <div id="resultsStrip" class="rs-strip" hidden></div>
    <div id="tickerBar" class="tk-bar" aria-label="Live prices"></div>
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
            <a href="/newsletter">Newsletter</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
        <nav class="foot-topics" aria-label="Guides"><a href="/learn/beginners">Young Guns course</a><a href="/learn/intermediate">Knights course</a><a href="/health-check">Financial Health Check</a><a href="/personal-finance">Personal finance</a><a href="/retirement">Retirement</a><a href="/child-education">Child’s education</a><a href="/insurance">Insurance</a><a href="/currencies">Currencies</a><a href="/commodities">Commodities</a><a href="/shariah">Shariah investing</a><a href="/tools">Calculators</a><a href="/glossary">Money words</a></nav>
        <p class="disclaimer">Dr MoneyWise is for education only and is not financial advice. Investing involves risk, including losing money. Prices may be delayed. Talk to a licensed adviser before making decisions.</p>
        <p class="foot-credits">Data from official sources: US SEC filings, US Bureau of Labor Statistics, New York Fed, US Treasury, Freddie Mac, the World Bank, the BIS, the OECD, HM Land Registry and the European Central Bank (exchange rates). Charts, prices and news by <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow">TradingView</a>. Photos from <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a>. <a href="https://logo.dev" target="_blank" rel="noopener">Logos provided by Logo.dev</a>.</p>
      </div>
    </footer>
    ${adSlot('bottom-strip')}
    ${AD_SCRIPT}
    <script src="/results.js" defer></script>
      <script src="/tickerbar.js" defer></script>
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
