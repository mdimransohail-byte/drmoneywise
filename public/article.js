const SESSION_KEY = 'drmoneywise-session';

const state = {
  token: '',
  user: null,
  bootstrap: null,
  article: null,
  slug: '',
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error(error);
    renderMessage(error.message || 'This article could not be loaded.');
  });
});

async function init() {
  cacheElements();
  bindEvents();

  state.slug = new URLSearchParams(window.location.search).get('slug') || '';
  if (!state.slug) {
    renderMessage('No article was selected.');
    return;
  }

  const session = readJsonStorage(SESSION_KEY);
  state.token = session.token || '';

  await loadArticle();
  renderMemberBadge();
  renderArticle();
  await trackView();
}

function cacheElements() {
  elements.articleContainer = document.querySelector('#articleContainer');
  elements.articleMemberBadge = document.querySelector('#articleMemberBadge');
  elements.articleSignOutButton = document.querySelector('#articleSignOutButton');
}

function bindEvents() {
  elements.articleContainer.addEventListener('click', handleArticleClick);
  elements.articleSignOutButton.addEventListener('click', handleSignOut);
}

async function loadArticle() {
  const plan = new URLSearchParams(window.location.search).get('plan') || 'free';
  const bootstrapPromise = apiGet('/api/site/bootstrap', { allowGuest: true });
  const articlePromise = apiGet(`/api/site/article?slug=${encodeURIComponent(state.slug)}&plan=${encodeURIComponent(plan)}`, {
    allowGuest: true,
  });

  const [bootstrap, payload] = await Promise.all([bootstrapPromise, articlePromise]);
  state.bootstrap = bootstrap;
  state.user = payload.sessionUser || bootstrap.sessionUser || null;
  state.article = payload.article;

  if (!state.user && state.token) {
    window.localStorage.removeItem(SESSION_KEY);
    state.token = '';
  }
}

function renderMemberBadge() {
  const label = state.user
    ? `${getPlanLabel(state.user.plan)} member`
    : 'Guest reader';

  elements.articleMemberBadge.textContent = label;
  elements.articleSignOutButton.classList.toggle('hidden', !state.user);
}

function renderArticle() {
  if (!state.article) {
    renderMessage('This article is not available.');
    return;
  }

  const article = state.article;
  const accessTag = article.accessTier === 'free' ? 'Free' : article.accessTier === 'regular' ? 'Regular' : 'Premium';
  const saved = Boolean(state.user?.savedArticleSlugs?.includes(article.slug));

  elements.articleContainer.innerHTML = `
    <header class="article-header">
      <div class="feature-story-meta">
        <div class="chip-row">
          <span class="tag gold">${escapeHtml(accessTag)}</span>
          <span class="tag">${escapeHtml(getLookupLabel(state.bootstrap.regions, article.region))}</span>
          <span class="tag">${escapeHtml(getLookupLabel(state.bootstrap.interests, article.interest))}</span>
          <span class="tag">${escapeHtml(article.contentType === 'learning' ? 'Learning Point' : 'News')}</span>
        </div>
        <span class="subtle-chip">${escapeHtml(article.readingTime || '4 min read')}</span>
      </div>
      <h1 class="article-title">${escapeHtml(article.headline)}</h1>
      <div class="article-meta">
        <span>${escapeHtml(article.source || 'Dr MoneyWise')}</span>
        <span>${formatDate(article.publishAt)}</span>
      </div>
      <p>${escapeHtml(article.summary)}</p>
      <div class="button-row">
        ${
          article.sourceUrl
            ? `<a class="button secondary" href="${escapeAttribute(article.sourceUrl)}" target="_blank" rel="noopener">Open original source</a>`
            : ''
        }
        ${
          state.user
            ? `<button class="button primary" type="button" data-save-article="${article.slug}">${saved ? 'Saved to account' : 'Save to account'}</button>`
            : `<a class="button primary" href="/">Sign in to save</a>`
        }
      </div>
    </header>

    ${renderHeroImage(article)}

    <div class="article-body-stack">
      ${renderBriefRow(article)}
      ${renderArticleBody(article)}
      ${renderInfographic(article)}
      ${article.accessible ? '' : renderLockedPanel(article)}
    </div>
  `;
}

/**
 * Key takeaways + jargon, side by side, right under the header — a quick
 * "brief" the reader can scan before committing to the full article below.
 */
/**
 * Pexels photo attached via Admin → AI Writer. Optional — articles without
 * one just skip straight to the brief row, no broken-image gap.
 */
function renderHeroImage(article) {
  if (!article.heroImage?.url) {
    return '';
  }

  return `
    <figure class="article-hero-image">
      <img src="${escapeAttribute(article.heroImage.url)}" alt="${escapeAttribute(article.headline)}" loading="lazy" />
      ${
        article.heroImage.photographer
          ? `<figcaption>Photo by <a href="${escapeAttribute(article.heroImage.photographerUrl || article.heroImage.pexelsPageUrl || '#')}" target="_blank" rel="noopener">${escapeHtml(article.heroImage.photographer)}</a> on Pexels</figcaption>`
          : ''
      }
    </figure>
  `;
}

function renderBriefRow(article) {
  const takeaways = article.visibleTakeaways || [];
  const jargon = article.visibleJargon || [];

  if (!takeaways.length && !jargon.length) {
    return '';
  }

  return `
    <div class="article-brief-row">
      ${
        takeaways.length
          ? `
            <section class="article-block">
              <h3>Key takeaways</h3>
              <ul>${takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            </section>
          `
          : ''
      }
      ${
        jargon.length
          ? `
            <section class="article-block">
              <h3>Jargon made simple</h3>
              <ul>
                ${jargon
                  .map((item) => `<li><strong>${escapeHtml(item.term)}:</strong> ${escapeHtml(item.meaning)}</li>`)
                  .join('')}
              </ul>
            </section>
          `
          : ''
      }
    </div>
  `;
}

/**
 * The article itself as one continuous block — all bodySections flow
 * together under their own subheadings, not as separate boxed cards.
 * "Everyday example" lives here as the third section; it is NOT repeated
 * elsewhere on the page.
 */
function renderArticleBody(article) {
  const sections = article.visibleSections || [];

  if (!sections.length) {
    return `
      <div class="article-body">
        <h3>No content available yet</h3>
        <p>This article body has not been filled in yet.</p>
      </div>
    `;
  }

  return `
    <div class="article-body">
      ${sections
        .map((section) => {
          // "Everyday example" reads as a natural continuation of the
          // article rather than its own labeled section — no heading,
          // just the paragraph, right after "Why this matters."
          if (section.heading === 'Everyday example') {
            return `<p>${escapeHtml(section.body || '')}</p>`;
          }
          return `
            <h3>${escapeHtml(section.heading || 'Section')}</h3>
            <p>${escapeHtml(section.body || '')}</p>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderInfographic(article) {
  // A Gamma-generated infographic image takes priority over the plain
  // data-card version — no point showing both for the same content.
  if (article.infographicImageUrl) {
    return `
      <section class="article-block">
        <h3>${escapeHtml(article.infographic?.title || 'Quick breakdown')}</h3>
        <img class="article-infographic-image" src="${escapeAttribute(article.infographicImageUrl)}" alt="${escapeAttribute(article.infographic?.title || 'Infographic')}" loading="lazy" />
      </section>
    `;
  }

  const items = article.infographic?.items || [];
  if (!items.length) {
    return '';
  }

  return `
    <section class="article-block">
      <h3>${escapeHtml(article.infographic?.title || 'Quick breakdown')}</h3>
      <div class="visual-grid">
        ${items
          .map(
            (item) => `
              <div class="visual-item">
                <strong>${escapeHtml(item.label)}</strong>
                <div>${escapeHtml(item.value)}</div>
                <div class="helper-note">${escapeHtml(item.context)}</div>
              </div>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

/** Only rendered when the article is actually locked — no more duplicate
 * "why readers keep this saved" panel for articles the reader can already
 * read in full. */
function renderLockedPanel(article) {
  const plans = (state.bootstrap?.plans || []).filter((plan) => plan.id !== 'free');
  return `
    <section class="article-block">
      <h3>Continue with a paid plan</h3>
      <p>${escapeHtml(article.lockedMessage || 'Upgrade to continue reading the full article.')}</p>
      <div class="pricing-options">
        ${plans
          .map((plan) => {
            const primaryOption = plan.billingOptions?.[0];
            return `
              <a
                class="button ${plan.id === 'regular' ? 'secondary' : 'primary'}"
                href="${escapeAttribute(primaryOption?.checkoutUrl || '/#membership')}"
                ${primaryOption?.checkoutUrl ? 'target="_blank" rel="noopener"' : ''}
              >
                ${escapeHtml(plan.name)}
              </a>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function renderMessage(message) {
  elements.articleContainer.innerHTML = `
    <section class="article-block">
      <h3>Article unavailable</h3>
      <p>${escapeHtml(message)}</p>
    </section>
  `;
}

async function handleArticleClick(event) {
  const button = event.target.closest('[data-save-article]');
  if (!button || !state.user) {
    return;
  }

  const response = await apiPost('/api/member/saved-articles', {
    slug: button.dataset.saveArticle,
  });

  state.user.savedArticleSlugs = response.savedArticleSlugs;
  renderArticle();
}

async function handleSignOut() {
  try {
    await apiPost('/api/auth/logout', {});
  } catch (error) {
    console.error(error);
  }

  window.localStorage.removeItem(SESSION_KEY);
  state.token = '';
  state.user = null;
  renderMemberBadge();
  await loadArticle();
  renderArticle();
}

async function apiGet(url, options = {}) {
  return requestJson(url, {
    method: 'GET',
    allowGuest: options.allowGuest,
  });
}

async function apiPost(url, body, options = {}) {
  return requestJson(url, {
    method: 'POST',
    body,
    allowGuest: options.allowGuest,
  });
}

async function requestJson(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (state.token) {
    headers['x-session-token'] = state.token;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}

async function trackView() {
  try {
    await apiPost(
      '/api/site/track',
      {
        type: 'page_view',
        path: `/article/${state.slug}`,
        articleSlug: state.slug,
        value: 1,
      },
      { allowGuest: true },
    );
  } catch (error) {
    console.error(error);
  }
}

function readJsonStorage(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function getLookupLabel(collection, id) {
  return collection?.find((item) => item.id === id)?.label || id || 'General';
}

function getPlanLabel(planId) {
  return state.bootstrap?.plans?.find((plan) => plan.id === planId)?.shortName || 'Free';
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/gu, '&#96;');
}
