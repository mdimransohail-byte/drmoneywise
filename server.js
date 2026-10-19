import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import {
  APP_NAME,
  INTEREST_OPTIONS,
  PORT,
  REGION_OPTIONS,
  SITE_DOMAIN,
  SUPPORT_EMAIL,
  canAccess,
  getPlanCatalog,
} from './src/config.js';
import {
  getAdminDashboard,
  createCoupon,
  getBusinessSettingsForAdmin,
  listCoupons,
  saveAdminSettings,
  saveBusinessSettingsForAdmin,
  toggleCouponStatus,
  updateMemberPlan,
  validateCoupon,
} from './src/services/adminService.js';
import { attachGammaInfographic, attachPexelsImage, autoGenerateTrendingLearningPoint, deleteArticleById, discoverArticleCandidates, generateLearningPointDraft, getAdminArticles, getArticleBySlug, getHomeExperience, saveAdminArticle } from './src/services/articleService.js';
import { getMediaDir } from './src/services/visualsService.js';
import { ensureAdminUser, getSessionUser, requireAdminUser, signInMember, signOutSession, signUpMember } from './src/services/authService.js';
import { trackEvent } from './src/services/analyticsService.js';
import { getInterestHeadlines, getLiveHeadlines } from './src/services/newsService.js';
import { saveMemberPortfolio, saveMemberPreferences, saveMemberWatchlist, toggleSavedArticle, getMemberProfile, getPortfolioReview, getMembersForAdmin } from './src/services/memberService.js';
import { ensureStore } from './src/services/storeService.js';
import { getWatchlistSnapshot } from './src/services/watchlistService.js';
import { getPortfolioSnapshot } from './src/services/portfolioService.js';
import { getDataStatus, runJob, startDataEngine } from './src/services/dataEngine.js';
import { renderInfographicPreview } from './src/services/previewService.js';
import { renderDividendTop10, renderEtfTop10, renderTop10Hub } from './src/services/top10Pages.js';
import { renderCryptoTop10, renderToday } from './src/services/marketPages.js';
import { findCompanyPath, renderStockPage, renderStocksIndex, stockDetailsFor } from './src/services/stockPages.js';
import { getHealthReport, sendHealthEmail } from './src/services/healthService.js';
import { renderForumHome, renderForumNew, renderForumRules, renderForumSearch, renderForumSection, renderForumThread } from './src/services/forumPages.js';
import { addReply, addStarterThreads, adminAction, createThread, editPost, getModerationQueue, reportPost } from './src/services/forumService.js';
import { renderCalculator, renderGlossaryIndex, renderGlossaryTerm, renderToolsHub } from './src/services/toolsPages.js';
import {
  confirmCheckoutSession,
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
} from './src/services/billingService.js';
import {
  buildRobotsTxt,
  buildSitemapXml,
  getSiteOrigin,
  isForumEnabled,
  renderArticlePage,
  renderHomePage,
  renderLearnIndex,
  renderInfoPage,
  isInfoPage,
  renderNotFound,
  robotsHeaderFor,
} from './src/services/seoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

await ensureStore();
await ensureAdminUser();

export const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host}`);

    // Search-engine header ("noindex" until launch, always on admin/API)
    // is added to every response this request sends.
    const robotsHeaders = robotsHeaderFor(requestUrl.pathname);
    const originalWriteHead = response.writeHead.bind(response);
    response.writeHead = (statusCode, headers = {}) => originalWriteHead(statusCode, { ...headers, ...robotsHeaders });

    // ── Public pages built on the server (readable by Google) ──────────
    if (request.method === 'GET' && !requestUrl.pathname.startsWith('/api/')) {
      const handled = await handlePublicPage(requestUrl, request, response);
      if (handled) {
        return;
      }
    }
    // ── Stripe webhook: needs the untouched request body ───────────────
    if (requestUrl.pathname === '/api/stripe/webhook' && request.method === 'POST') {
      const rawBody = await readRawBody(request);
      const result = await handleWebhook(rawBody, request.headers['stripe-signature']);
      return sendJson(response, result.status, { received: result.ok });
    }

    const token = getSessionToken(request);
    const sessionUser = await getSessionUser(token);

    // ── Payments ────────────────────────────────────────────────────────
    if (requestUrl.pathname === '/api/billing/checkout' && request.method === 'POST') {
      if (!sessionUser) {
        return sendJson(response, 401, { error: 'Please create a free account or sign in first.' });
      }
      const body = await parseJsonBody(request);
      return sendJson(response, 200, await createCheckoutSession({
        user: sessionUser,
        planId: String(body.planId || ''),
        cycle: body.billingCycle,
        couponCode: body.couponCode,
        origin: getSiteOrigin(request),
      }));
    }

    if (requestUrl.pathname === '/api/billing/confirm' && request.method === 'POST') {
      const body = await parseJsonBody(request);
      const result = await confirmCheckoutSession({ user: sessionUser, sessionId: body.sessionId });
      return sendJson(response, 200, { ...result, user: await getSessionUser(token) });
    }

    if (requestUrl.pathname === '/api/billing/portal' && request.method === 'POST') {
      return sendJson(response, 200, await createPortalSession({ user: sessionUser, origin: getSiteOrigin(request) }));
    }

    if (requestUrl.pathname === '/api/site/bootstrap' && request.method === 'GET') {
      return sendJson(response, 200, {
        appName: APP_NAME,
        domain: SITE_DOMAIN,
        supportEmail: SUPPORT_EMAIL,
        plans: getPlanCatalog(),
        regions: REGION_OPTIONS,
        interests: INTEREST_OPTIONS,
        sessionUser,
      });
    }

    if (requestUrl.pathname === '/api/site/live-headlines' && request.method === 'GET') {
      return sendJson(response, 200, await getLiveHeadlines());
    }

    if (requestUrl.pathname === '/api/site/interest-headlines' && request.method === 'GET') {
      const interestId = requestUrl.searchParams.get('interest') || 'equities';
      const regions = parseCsv(requestUrl.searchParams.get('regions'));
      return sendJson(response, 200, await getInterestHeadlines(interestId, regions));
    }

    if (requestUrl.pathname === '/api/site/home' && request.method === 'GET') {
      const regionsParam = parseCsv(requestUrl.searchParams.get('regions'));
      const regions = regionsParam.length
        ? regionsParam
        : sessionUser?.regions?.length
          ? sessionUser.regions
          : ['global'];
      const interests = parseCsv(requestUrl.searchParams.get('interests')) || sessionUser?.interests || [];
      const plan = sessionUser?.plan || requestUrl.searchParams.get('plan') || 'free';

      return sendJson(
        response,
        200,
        await getHomeExperience({
          regions,
          interests,
          plan,
        }),
      );
    }

    if (requestUrl.pathname === '/api/site/article' && request.method === 'GET') {
      const slug = requestUrl.searchParams.get('slug') || '';
      const plan = sessionUser?.plan || requestUrl.searchParams.get('plan') || 'free';
      const article = await getArticleBySlug({ slug, plan });
      if (!article) {
        return sendJson(response, 404, { error: 'Article not found.' });
      }

      return sendJson(response, 200, {
        article,
        sessionUser,
      });
    }

    if (requestUrl.pathname === '/api/site/coupons/validate' && request.method === 'POST') {
      const body = await parseJsonBody(request);
      return sendJson(response, 200, await validateCoupon(body.code, body.planId));
    }

    if (requestUrl.pathname === '/api/site/track' && request.method === 'POST') {
      const body = await parseJsonBody(request);
      await trackEvent({
        type: body.type || 'page_view',
        path: body.path || requestUrl.pathname,
        value: Number(body.value || 1),
        articleSlug: body.articleSlug || '',
        userId: sessionUser?.id || null,
      });
      return sendJson(response, 200, { ok: true });
    }

    if (requestUrl.pathname === '/api/auth/signup' && request.method === 'POST') {
      return sendJson(response, 200, await signUpMember(await parseJsonBody(request)));
    }

    if (requestUrl.pathname === '/api/auth/login' && request.method === 'POST') {
      return sendJson(response, 200, await signInMember(await parseJsonBody(request)));
    }

    if (requestUrl.pathname === '/api/auth/logout' && request.method === 'POST') {
      await signOutSession(token);
      return sendJson(response, 200, { ok: true });
    }

    if (requestUrl.pathname === '/api/auth/me' && request.method === 'GET') {
      return sendJson(response, 200, {
        user: sessionUser,
      });
    }

    if (requestUrl.pathname === '/api/member/profile' && request.method === 'GET') {
      return sendJson(response, 200, await getMemberProfile(token));
    }

    if (requestUrl.pathname === '/api/member/preferences' && request.method === 'POST') {
      return sendJson(response, 200, await saveMemberPreferences(token, await parseJsonBody(request)));
    }

    if (requestUrl.pathname === '/api/member/watchlist' && request.method === 'POST') {
      const body = await parseJsonBody(request);
      return sendJson(response, 200, {
        watchlist: await saveMemberWatchlist(token, body.tickers),
      });
    }

    if (requestUrl.pathname === '/api/member/watchlist/quotes' && request.method === 'POST') {
      const body = await parseJsonBody(request);
      return sendJson(response, 200, await getWatchlistSnapshot({ tickers: body.tickers || [] }));
    }

    if (requestUrl.pathname === '/api/member/portfolio' && request.method === 'POST') {
      const body = await parseJsonBody(request);
      return sendJson(response, 200, {
        portfolio: await saveMemberPortfolio(token, body.holdings),
      });
    }

    if (requestUrl.pathname === '/api/member/portfolio/quotes' && request.method === 'POST') {
      const body = await parseJsonBody(request);
      return sendJson(response, 200, await getPortfolioSnapshot({ holdings: body.holdings || [] }));
    }

    if (requestUrl.pathname === '/api/member/portfolio-review' && request.method === 'GET') {
      return sendJson(response, 200, await getPortfolioReview(token));
    }

    if (requestUrl.pathname === '/api/member/saved-articles' && request.method === 'POST') {
      const body = await parseJsonBody(request);
      return sendJson(response, 200, {
        savedArticleSlugs: await toggleSavedArticle(token, body.slug),
      });
    }

    if (requestUrl.pathname === '/api/admin/dashboard' && request.method === 'GET') {
      await requireAdminUser(token);
      return sendJson(response, 200, await getAdminDashboard());
    }

    if (requestUrl.pathname === '/api/admin/articles' && request.method === 'GET') {
      await requireAdminUser(token);
      return sendJson(response, 200, {
        articles: await getAdminArticles(),
      });
    }

    if (requestUrl.pathname === '/api/admin/articles' && request.method === 'POST') {
      await requireAdminUser(token);
      return sendJson(response, 200, await saveAdminArticle(await parseJsonBody(request)));
    }

    if (requestUrl.pathname === '/api/admin/articles' && request.method === 'DELETE') {
      await requireAdminUser(token);
      const id = requestUrl.searchParams.get('id') || '';
      await deleteArticleById(id);
      return sendJson(response, 200, { ok: true });
    }

    if (requestUrl.pathname === '/api/admin/learning/generate' && request.method === 'POST') {
      await requireAdminUser(token);
      return sendJson(response, 200, await generateLearningPointDraft(await parseJsonBody(request)));
    }

    if (requestUrl.pathname === '/api/admin/learning/generate-trending' && request.method === 'POST') {
      await requireAdminUser(token);
      const body = await parseJsonBody(request);
      const article = await autoGenerateTrendingLearningPoint({
        accessTier: body.accessTier || 'free',
        region: body.region || 'global',
      });
      if (!article) {
        return sendJson(response, 200, { ok: false, message: 'No trending topic available right now — try again in a bit.' });
      }
      return sendJson(response, 200, { ok: true, article });
    }

    if (requestUrl.pathname === '/api/admin/articles/discover' && request.method === 'POST') {
      await requireAdminUser(token);
      return sendJson(response, 200, await discoverArticleCandidates(await parseJsonBody(request)));
    }

    if (requestUrl.pathname === '/api/admin/users' && request.method === 'GET') {
      await requireAdminUser(token);
      return sendJson(response, 200, {
        users: await getMembersForAdmin(),
      });
    }

    if (requestUrl.pathname === '/api/admin/users/plan' && request.method === 'POST') {
      await requireAdminUser(token);
      return sendJson(response, 200, {
        user: await updateMemberPlan(await parseJsonBody(request)),
      });
    }

    if (requestUrl.pathname === '/api/admin/coupons' && request.method === 'GET') {
      await requireAdminUser(token);
      return sendJson(response, 200, {
        coupons: await listCoupons(),
      });
    }

    if (requestUrl.pathname === '/api/admin/coupons' && request.method === 'POST') {
      await requireAdminUser(token);
      return sendJson(response, 200, await createCoupon(await parseJsonBody(request)));
    }

    if (requestUrl.pathname === '/api/admin/coupons/toggle' && request.method === 'POST') {
      await requireAdminUser(token);
      const body = await parseJsonBody(request);
      return sendJson(response, 200, await toggleCouponStatus(body.id));
    }

    if (requestUrl.pathname === '/api/admin/settings' && request.method === 'POST') {
      await requireAdminUser(token);
      return sendJson(response, 200, await saveAdminSettings(await parseJsonBody(request)));
    }

    if (requestUrl.pathname === '/api/admin/business-settings' && request.method === 'GET') {
      await requireAdminUser(token);
      return sendJson(response, 200, await getBusinessSettingsForAdmin());
    }

    if (requestUrl.pathname === '/api/admin/business-settings' && request.method === 'POST') {
      await requireAdminUser(token);
      return sendJson(response, 200, await saveBusinessSettingsForAdmin(await parseJsonBody(request)));
    }

    if (requestUrl.pathname === '/api/admin/articles/visual/pexels' && request.method === 'POST') {
      await requireAdminUser(token);
      const body = await parseJsonBody(request);
      const article = await attachPexelsImage(body.articleId, body.query);
      return sendJson(response, 200, { article });
    }

    if (requestUrl.pathname === '/api/admin/articles/visual/gamma' && request.method === 'POST') {
      await requireAdminUser(token);
      const body = await parseJsonBody(request);
      const article = await attachGammaInfographic(body.articleId);
      return sendJson(response, 200, { article });
    }

    // ── Full backup download (admin only) ─────────────────────────────────
    // Bundles everything on the Railway volume (data/) into one JSON file:
    // site data, business settings and saved API keys.
    if (requestUrl.pathname === '/api/admin/backup' && request.method === 'GET') {
      await requireAdminUser(token);
      const dataDir = path.join(process.cwd(), 'data');
      const readOrNull = async (fileName) => {
        try {
          return await readFile(path.join(dataDir, fileName), 'utf8');
        } catch {
          return null;
        }
      };
      const storeRaw = await readOrNull('platform-store.json');
      const settingsRaw = await readOrNull('business-settings.json');
      const envRaw = await readOrNull('.env');
      let platformStore = null;
      let businessSettings = null;
      try { platformStore = storeRaw ? JSON.parse(storeRaw) : null; } catch { platformStore = storeRaw; }
      try { businessSettings = settingsRaw ? JSON.parse(settingsRaw) : null; } catch { businessSettings = settingsRaw; }
      console.log('[backup] Admin downloaded a full backup of data/');
      return sendJson(response, 200, {
        createdAt: new Date().toISOString(),
        site: APP_NAME,
        files: {
          'platform-store.json': platformStore,
          'business-settings.json': businessSettings,
          '.env': envRaw,
        },
      });
    }

    // ── Data engine (Admin → APIs & More → Data engine) ────────────────
    if (requestUrl.pathname === '/api/admin/data-status' && request.method === 'GET') {
      await requireAdminUser(token);
      return sendJson(response, 200, await getDataStatus());
    }

    if (requestUrl.pathname === '/api/admin/data-run' && request.method === 'POST') {
      await requireAdminUser(token);
      const body = await parseJsonBody(request);
      // Runs in the background — the company job takes a couple of minutes.
      runJob(String(body.job || ''), { manual: true }).catch((error) => console.error('[data] Run now failed:', error.message));
      return sendJson(response, 200, { started: true });
    }

    // ── Forum actions (public/forum.js) ─────────────────────────────────
    if (requestUrl.pathname.startsWith('/api/forum/') && !isForumEnabled()) {
      return sendJson(response, 404, { error: 'The forum is not open yet.' });
    }

    if (requestUrl.pathname.startsWith('/api/forum/') && request.method === 'POST') {
      const body = await parseJsonBody(request);
      let result = null;
      let m;
      if (requestUrl.pathname === '/api/forum/threads') result = await createThread(sessionUser, body);
      else if ((m = requestUrl.pathname.match(/^\/api\/forum\/threads\/([a-z0-9-]+)\/replies$/u))) result = await addReply(sessionUser, m[1], body);
      else if ((m = requestUrl.pathname.match(/^\/api\/forum\/posts\/([a-z0-9-]+)\/edit$/u))) result = await editPost(sessionUser, m[1], body);
      else if ((m = requestUrl.pathname.match(/^\/api\/forum\/posts\/([a-z0-9-]+)\/report$/u))) result = await reportPost(sessionUser, m[1], body.reason);
      if (result) return sendJson(response, result.error ? result.status || 400 : 200, result);
    }

    if (requestUrl.pathname === '/api/admin/forum/action' && request.method === 'POST') {
      const result = await adminAction(sessionUser, await parseJsonBody(request));
      return sendJson(response, result.error ? result.status || 400 : 200, result);
    }

    if (requestUrl.pathname === '/api/admin/forum/queue' && request.method === 'GET') {
      await requireAdminUser(token);
      return sendJson(response, 200, await getModerationQueue());
    }

    if (requestUrl.pathname === '/api/admin/forum/starters' && request.method === 'POST') {
      const result = await addStarterThreads(sessionUser);
      return sendJson(response, result.error ? result.status || 400 : 200, result);
    }

    // ── Members-only company numbers (company pages → public/members.js) ─
    if (requestUrl.pathname === '/api/stock/details' && request.method === 'GET') {
      const user = sessionUser;
      if (!user) return sendJson(response, 401, { error: 'Sign in to see full results.' });
      if (user.role !== 'admin' && !canAccess(user.plan || 'free', 'regular')) {
        return sendJson(response, 403, { error: 'Full results are for members.', plan: user.plan || 'free' });
      }
      const details = await stockDetailsFor(requestUrl.searchParams.get('ticker'));
      if (!details) return sendJson(response, 404, { error: 'Company not found.' });
      return sendJson(response, 200, details);
    }

    // ── Site health (Admin → Health) ───────────────────────────────────
    if (requestUrl.pathname === '/api/admin/health' && request.method === 'GET') {
      await requireAdminUser(token);
      return sendJson(response, 200, {
        ...(await getHealthReport()),
        email: { configured: Boolean(process.env.RESEND_API_KEY && process.env.HEALTH_EMAIL_TO), to: process.env.HEALTH_EMAIL_TO || '' },
      });
    }

    if (requestUrl.pathname === '/api/admin/health/email' && request.method === 'POST') {
      await requireAdminUser(token);
      const result = await sendHealthEmail();
      return sendJson(response, result.ok ? 200 : 400, result.ok ? result : { error: result.message });
    }

    if (requestUrl.pathname.startsWith('/api/')) {
      return sendJson(response, 404, {
        error: 'API route not found. Restart the website after uploading the latest server files.',
      });
    }

    if (requestUrl.pathname.startsWith('/media/') && request.method === 'GET') {
      return serveMediaFile(requestUrl.pathname, response);
    }

    if (request.method === 'GET') {
      return serveStatic(requestUrl.pathname, response);
    }

    return sendJson(response, 404, {
      error: 'Not found',
    });
  } catch (error) {
    return sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, () => {
  console.log(`${APP_NAME} is running at http://localhost:${PORT}`);
  startDataEngine();
});

/**
 * Clean page addresses + SEO files. Returns true when it sent a response.
 *   /                 homepage with head tags and latest explainers in the HTML
 *   /learn            all explainers
 *   /learn/<slug>     one explainer
 *   /article.html?slug=x  → permanent redirect to /learn/x
 *   /robots.txt, /sitemap.xml
 */
async function handlePublicPage(requestUrl, request, response) {
  const pathname = requestUrl.pathname.replace(/\/+$/u, '') || '/';
  const origin = getSiteOrigin(request);

  if (pathname === '/robots.txt') {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    response.end(buildRobotsTxt(origin));
    return true;
  }

  if (pathname === '/sitemap.xml') {
    response.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    response.end(await buildSitemapXml(origin));
    return true;
  }

  if ((pathname === '/article' || pathname === '/article.html') && requestUrl.searchParams.get('slug')) {
    response.writeHead(301, { Location: `/learn/${encodeURIComponent(requestUrl.searchParams.get('slug'))}` });
    response.end();
    return true;
  }

  if (pathname === '/' || pathname === '/index' || pathname === '/index.html') {
    const template = await readFile(path.join(publicDir, 'index.html'), 'utf8');
    return sendHtml(response, 200, await renderHomePage(template, origin));
  }

  if (isInfoPage(pathname.slice(1))) {
    return sendHtml(response, 200, renderInfoPage(pathname.slice(1), origin));
  }

  if (pathname === '/stocks') {
    const q = requestUrl.searchParams.get('q') || '';
    const direct = q ? await findCompanyPath(q) : null;
    if (direct) {
      response.writeHead(302, { Location: direct });
      response.end();
      return true;
    }
    return sendHtml(response, 200, await renderStocksIndex(origin, q));
  }

  const stockMatch = pathname.match(/^\/stock\/([A-Za-z0-9.\-]{1,10})$/u);
  if (stockMatch) {
    // Bonds / preference shares / warrants (e.g. F-PB) → the company's main page (F)
    const { mainTickerFor } = await import('./src/services/companyLookup.js');
    const main = await mainTickerFor(decodeURIComponent(stockMatch[1]));
    if (main) {
      response.writeHead(301, { Location: `/stock/${encodeURIComponent(main)}` });
      response.end();
      return true;
    }
    const page = await renderStockPage(origin, decodeURIComponent(stockMatch[1]));
    return sendHtml(response, page.status, page.html);
  }

  if (pathname === '/today') {
    return sendHtml(response, 200, await renderToday(origin));
  }

  if (pathname === '/top-10/crypto') {
    return sendHtml(response, 200, await renderCryptoTop10(origin));
  }

  if (pathname === '/top-10') {
    return sendHtml(response, 200, await renderTop10Hub(origin));
  }

  if (pathname === '/top-10/dividend-stocks') {
    return sendHtml(response, 200, await renderDividendTop10(origin));
  }

  if (pathname === '/top-10/etfs') {
    return sendHtml(response, 200, await renderEtfTop10(origin));
  }

  // ── Forum (hidden with a 404 while switched off in Admin → Forum) ──────
  if ((pathname === '/forum' || pathname.startsWith('/forum/')) && !isForumEnabled()) {
    return sendHtml(response, 404, renderNotFound());
  }
  if (pathname === '/forum') return sendHtml(response, 200, await renderForumHome(origin));
  if (pathname === '/forum/new') return sendHtml(response, 200, await renderForumNew(origin, requestUrl.searchParams));
  if (pathname === '/forum/rules') return sendHtml(response, 200, renderForumRules(origin));
  if (pathname === '/forum/search') return sendHtml(response, 200, await renderForumSearch(origin, String(requestUrl.searchParams.get('q') || '').slice(0, 100)));
  const forumThread = pathname.match(/^\/forum\/t\/([a-z0-9-]{6,20})(?:\/[a-z0-9-]*)?$/u);
  if (forumThread) {
    const html = await renderForumThread(origin, forumThread[1]);
    return sendHtml(response, html ? 200 : 404, html || renderNotFound());
  }
  const forumSection = pathname.match(/^\/forum\/([a-z-]{2,30})$/u);
  if (forumSection) {
    const html = await renderForumSection(origin, forumSection[1], requestUrl.searchParams);
    return sendHtml(response, html ? 200 : 404, html || renderNotFound());
  }

  if (pathname === '/tools') {
    return sendHtml(response, 200, await renderToolsHub(origin));
  }

  const toolMatch = pathname.match(/^\/tools\/([a-z-]{1,40})$/u);
  if (toolMatch) {
    const html = await renderCalculator(origin, toolMatch[1]);
    return sendHtml(response, html ? 200 : 404, html || renderNotFound());
  }

  if (pathname === '/glossary') {
    return sendHtml(response, 200, await renderGlossaryIndex(origin));
  }

  const glossMatch = pathname.match(/^\/glossary\/([a-z0-9-]{1,60})$/u);
  if (glossMatch) {
    const html = await renderGlossaryTerm(origin, glossMatch[1]);
    return sendHtml(response, html ? 200 : 404, html || renderNotFound());
  }

  if (pathname === '/preview/infographics') {
    return sendHtml(response, 200, await renderInfographicPreview(requestUrl.searchParams.get('ticker')));
  }

  if (pathname === '/learn') {
    return sendHtml(response, 200, await renderLearnIndex(origin));
  }

  const learnMatch = pathname.match(/^\/learn\/([^/]+)$/u);
  if (learnMatch) {
    const slug = decodeURIComponent(learnMatch[1]);
    const template = await readFile(path.join(publicDir, 'article.html'), 'utf8');
    const html = await renderArticlePage(template, slug, origin);
    return sendHtml(response, html ? 200 : 404, html || renderNotFound());
  }

  return false;
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  response.end(html);
  return true;
}

async function serveStatic(requestPath, response) {
  const mappedPath = normalizeStaticPath(requestPath);
  const filePath = path.join(publicDir, mappedPath);
  const normalized = path.normalize(filePath);

  if (!normalized.startsWith(publicDir)) {
    return sendJson(response, 403, { error: 'Forbidden' });
  }

  try {
    const contents = await readFile(normalized);
    const extension = path.extname(normalized).toLowerCase();
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': ['.html', '.js', '.css'].includes(extension) ? 'no-cache' : 'public, max-age=300',
    });
    response.end(contents);
  } catch {
    return sendHtml(response, 404, renderNotFound());
  }
}

// Serves generated images (Pexels-linked metadata doesn't need this — only
// Gamma's downloaded PNGs, which live on the persistent data/ volume, not
// in publicDir). Same path-traversal protection as serveStatic above.
async function serveMediaFile(requestPath, response) {
  const mediaDir = getMediaDir();
  const filename = requestPath.replace(/^\/media\//u, '');
  const normalized = path.normalize(path.join(mediaDir, filename));

  if (!normalized.startsWith(mediaDir)) {
    return sendJson(response, 403, { error: 'Forbidden' });
  }

  try {
    const contents = await readFile(normalized);
    const extension = path.extname(normalized).toLowerCase();
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      // Generated images are content-addressed (random filename per
      // generation) and never change once created, so cache forever.
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    response.end(contents);
  } catch {
    return sendJson(response, 404, {
      error: 'Image not found',
    });
  }
}

function normalizeStaticPath(requestPath) {
  const normalizedPath = requestPath.replace(/\/+$/u, '') || '/';

  if (normalizedPath === '/' || normalizedPath === '/index' || normalizedPath === '/index.html') {
    return 'index.html';
  }

  if (normalizedPath === '/article' || normalizedPath === '/article.html') {
    return 'article.html';
  }

  if (normalizedPath === '/admin' || normalizedPath === '/admin.html') {
    return 'admin.html';
  }

  return normalizedPath.replace(/^\/+/u, '');
}

async function readRawBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function parseJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function getSessionToken(request) {
  const headerToken = request.headers['x-session-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }

  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return '';
}

function parseCsv(rawValue) {
  if (!rawValue) {
    return [];
  }

  return String(rawValue)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}