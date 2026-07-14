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
import { deleteArticleById, discoverArticleCandidates, generateLearningPointDraft, getAdminArticles, getArticleBySlug, getHomeExperience, saveAdminArticle } from './src/services/articleService.js';
import { ensureAdminUser, getSessionUser, requireAdminUser, signInMember, signOutSession, signUpMember } from './src/services/authService.js';
import { trackEvent } from './src/services/analyticsService.js';
import { getLiveHeadlines } from './src/services/newsService.js';
import { saveMemberPortfolio, saveMemberPreferences, saveMemberWatchlist, toggleSavedArticle, getMemberProfile, getPortfolioReview, getMembersForAdmin } from './src/services/memberService.js';
import { ensureStore } from './src/services/storeService.js';
import { getWatchlistSnapshot } from './src/services/watchlistService.js';
import { getPortfolioSnapshot } from './src/services/portfolioService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

await ensureStore();
await ensureAdminUser();

export const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host}`);
    const token = getSessionToken(request);
    const sessionUser = await getSessionUser(token);

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

    if (requestUrl.pathname.startsWith('/api/')) {
      return sendJson(response, 404, {
        error: 'API route not found. Restart the website after uploading the latest server files.',
      });
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
});

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
    return sendJson(response, 404, {
      error: 'File not found',
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