const SESSION_KEY = 'drmoneywise-session';
const GUEST_KEY = 'drmoneywise-guest';

const state = {
  token: '',
  user: null,
  bootstrap: null,
  home: null,
  authMode: 'signup',
  selectedRegion: 'global',
  selectedInterests: [],
  guestWatchlist: [],
  guestPortfolio: [],
  couponResults: {},
  couponCode: '',
  watchlistQuotes: null,
  portfolioQuotes: null,
  liveHeadlines: null,
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error(error);
    setFeedState(error.message || 'Something went wrong while loading the site.');
  });
});

async function init() {
  cacheElements();
  restoreLocalState();
  bindEvents();
  setupRevealObserver();
  await loadBootstrap();
  await refreshHome();
  await refreshLiveHeadlines();
  await refreshPortfolioReview();
  renderAll();
  await refreshMarketDataQuotes();
  await trackView('/', 'page_view');
  window.setInterval(() => refreshHome({ quiet: true }), 300000);
  window.setInterval(() => refreshLiveHeadlines(), 6 * 60 * 60 * 1000);
}

function cacheElements() {
  elements.memberBadge = document.querySelector('#memberBadge');
  elements.signOutButton = document.querySelector('#signOutButton');
  elements.accountState = document.querySelector('#accountState');
  elements.signupForm = document.querySelector('#signupForm');
  elements.signinForm = document.querySelector('#signinForm');
  elements.toggleAuthModeButton = document.querySelector('#toggleAuthModeButton');
  elements.toggleSignupModeButton = document.querySelector('#toggleSignupModeButton');
  elements.authMessage = document.querySelector('#authMessage');
  elements.nameInput = document.querySelector('#nameInput');
  elements.emailInput = document.querySelector('#emailInput');
  elements.passwordInput = document.querySelector('#passwordInput');
  elements.loginEmailInput = document.querySelector('#loginEmailInput');
  elements.loginPasswordInput = document.querySelector('#loginPasswordInput');
  elements.regionSelect = document.querySelector('#regionSelect');
  elements.interestPicker = document.querySelector('#interestPicker');
  elements.interestRegionSelect = document.querySelector('#interestRegionSelect');
  elements.interestFilterChips = document.querySelector('#interestFilterChips');
  elements.refreshHomeButton = document.querySelector('#refreshHomeButton');
  elements.summaryStrip = document.querySelector('#summaryStrip');
  elements.feedState = document.querySelector('#feedState');
  elements.briefBoard = document.querySelector('#briefBoard');
  elements.feedAreas = document.querySelector('#feedAreas');
  elements.learningPoints = document.querySelector('#learningPoints');
  elements.watchlistForm = document.querySelector('#watchlistForm');
  elements.watchlistTickerInput = document.querySelector('#watchlistTickerInput');
  elements.watchlistList = document.querySelector('#watchlistList');
  elements.watchlistQuotaNotice = document.querySelector('#watchlistQuotaNotice');
  elements.portfolioForm = document.querySelector('#portfolioForm');
  elements.portfolioTickerInput = document.querySelector('#portfolioTickerInput');
  elements.portfolioNameInput = document.querySelector('#portfolioNameInput');
  elements.portfolioWeightInput = document.querySelector('#portfolioWeightInput');
  elements.portfolioCostInput = document.querySelector('#portfolioCostInput');
  elements.portfolioList = document.querySelector('#portfolioList');
  elements.portfolioQuotaNotice = document.querySelector('#portfolioQuotaNotice');
  elements.portfolioReview = document.querySelector('#portfolioReview');
  elements.refreshReviewButton = document.querySelector('#refreshReviewButton');
  elements.couponInput = document.querySelector('#couponInput');
  elements.applyCouponButton = document.querySelector('#applyCouponButton');
  elements.couponMessage = document.querySelector('#couponMessage');
  elements.pricingCards = document.querySelector('#pricingCards');
}

function bindEvents() {
  elements.signupForm.addEventListener('submit', handleSignUp);
  elements.signinForm.addEventListener('submit', handleSignIn);
  elements.toggleAuthModeButton.addEventListener('click', () => setAuthMode('signin'));
  elements.toggleSignupModeButton.addEventListener('click', () => setAuthMode('signup'));
  elements.signOutButton.addEventListener('click', handleSignOut);
  elements.regionSelect.addEventListener('change', async () => {
    state.selectedRegion = elements.regionSelect.value;
    syncRegionControls();
    persistLocalState();
    await savePreferencesIfSignedIn();
    await refreshHome();
  });
  elements.interestRegionSelect.addEventListener('change', async () => {
    state.selectedRegion = elements.interestRegionSelect.value;
    syncRegionControls();
    persistLocalState();
    await savePreferencesIfSignedIn();
    await refreshHome();
  });
  elements.interestPicker.addEventListener('click', handleInterestToggle);
  elements.interestFilterChips.addEventListener('click', handleInterestToggle);
  elements.refreshHomeButton.addEventListener('click', async () => {
    await refreshHome();
    await refreshPortfolioReview();
  });
  elements.watchlistForm.addEventListener('submit', handleAddWatchlist);
  elements.watchlistList.addEventListener('click', handleRemoveWatchlist);
  elements.portfolioForm.addEventListener('submit', handleAddPortfolioHolding);
  elements.portfolioList.addEventListener('click', handleRemovePortfolioHolding);
  elements.refreshReviewButton.addEventListener('click', refreshPortfolioReview);
  elements.applyCouponButton.addEventListener('click', applyCoupon);
  elements.pricingCards.addEventListener('click', handlePricingClick);
  elements.feedAreas.addEventListener('click', handleSaveArticleClick);
  elements.learningPoints.addEventListener('click', handleSaveArticleClick);
}

async function loadBootstrap() {
  const session = readSessionState();
  state.token = session.token || '';

  const bootstrap = await apiGet('/api/site/bootstrap', { allowGuest: true });
  state.bootstrap = bootstrap;
  state.user = bootstrap.sessionUser || null;

  if (!state.user && state.token) {
    clearSessionState();
    state.token = '';
  }

  const fallbackInterests = (state.bootstrap.interests || []).slice(0, 3).map((interest) => interest.id);
  state.selectedRegion = state.user?.region || state.selectedRegion || state.bootstrap.regions?.[0]?.id || 'global';
  state.selectedInterests = normalizeInterests(state.user?.interests || state.selectedInterests, fallbackInterests);

  if (state.user) {
    await syncGuestStateIntoMember();
  }

  populateRegionSelects();
  renderInterestChoices();
  syncRegionControls();
  setAuthMode(state.user ? 'signed-in' : state.authMode);
}

async function refreshHome({ quiet = false } = {}) {
  if (!quiet) {
    setFeedState('Refreshing');
    renderLoadingBoards();
  }

  const params = new URLSearchParams({
    region: state.selectedRegion,
    interests: state.selectedInterests.join(','),
    plan: state.user?.plan || 'free',
  });

  state.home = await apiGet(`/api/site/home?${params.toString()}`, { allowGuest: true });
  setFeedState('Live');
  renderAll();
}

async function refreshPortfolioReview() {
  if (!state.user) {
    elements.portfolioReview.innerHTML = `
      <div class="review-column">
        <h3>Sign in to save and review</h3>
        <p>Create a free account to save your watchlist and portfolio. Regular and Premium members unlock the full review.</p>
      </div>
    `;
    return;
  }

  try {
    const review = await apiGet('/api/member/portfolio-review');
    renderPortfolioReview(review);
  } catch (error) {
    elements.portfolioReview.innerHTML = `
      <div class="review-column">
        <h3>Review unavailable</h3>
        <p>${escapeHtml(error.message || 'Please try again.')}</p>
      </div>
    `;
  }
}

function renderAll() {
  renderAccountState();
  renderSummaryStrip();
  renderBriefBoard();
  renderAreas();
  renderLearningPoints();
  renderWatchlist();
  renderPortfolio();
  renderPricingCards();
}

function renderAccountState() {
  const planName = getPlanLabel(state.user?.plan || 'free');
  elements.memberBadge.textContent = state.user ? `${planName} member` : 'Guest reader';
  elements.accountState.textContent = state.user ? state.user.name : 'Guest';
  elements.signOutButton.classList.toggle('hidden', !state.user);

  if (state.user) {
    elements.signupForm.classList.add('hidden');
    elements.signinForm.classList.add('hidden');
    elements.authMessage.textContent = `${state.user.name}, your region, interests, watchlist, and portfolio save automatically.`;
    return;
  }

  const showSignup = state.authMode !== 'signin';
  elements.signupForm.classList.toggle('hidden', !showSignup);
  elements.signinForm.classList.toggle('hidden', showSignup);
  if (!elements.authMessage.textContent) {
    elements.authMessage.textContent = showSignup
      ? 'Create a free account to save your reading profile.'
      : 'Sign in to continue from your saved reading profile.';
  }
}

function renderInterestChoices() {
  const choices = (state.bootstrap.interests || [])
    .map((interest) => {
      const active = state.selectedInterests.includes(interest.id);
      return `
        <button
          class="choice-chip ${active ? 'active' : ''}"
          type="button"
          data-interest-id="${interest.id}"
          aria-pressed="${active ? 'true' : 'false'}"
        >
          ${interest.label}
        </button>
      `;
    })
    .join('');

  const filters = (state.bootstrap.interests || [])
    .map((interest) => {
      const active = state.selectedInterests.includes(interest.id);
      return `
        <button
          class="filter-chip ${active ? 'active' : ''}"
          type="button"
          data-interest-id="${interest.id}"
          aria-pressed="${active ? 'true' : 'false'}"
        >
          ${interest.label}
        </button>
      `;
    })
    .join('');

  elements.interestPicker.innerHTML = choices;
  elements.interestFilterChips.innerHTML = filters;
}

function populateRegionSelects() {
  const options = (state.bootstrap.regions || [])
    .map((region) => `<option value="${region.id}">${region.label}</option>`)
    .join('');

  elements.regionSelect.innerHTML = options;
  elements.interestRegionSelect.innerHTML = options;
}

function syncRegionControls() {
  elements.regionSelect.value = state.selectedRegion;
  elements.interestRegionSelect.value = state.selectedRegion;
}

function renderSummaryStrip() {
  const summaryStrip = state.home?.summaryStrip || [];
  if (!summaryStrip.length) {
    elements.summaryStrip.innerHTML = createEmptyCard('Fresh stories are loading for your selected region and interests.');
    return;
  }

  elements.summaryStrip.innerHTML = summaryStrip
    .map(
      (item) => `
        <div class="summary-chip">
          <strong>${escapeHtml(item.label)}</strong>
          <div>${item.articleCount} stories</div>
          <div class="helper-note">${escapeHtml(item.highlight)}</div>
        </div>
      `,
    )
    .join('');
}

/* ════════════════════════════════════════════════════════════════════════
   LIVE WIRE — scrolling headline ticker
   ───────────────────────────────────────────────────────────────────────
   Sourced from its own /api/site/live-headlines endpoint (raw Marketaux
   headlines, cached server-side for 6 hours) rather than the personalized
   region/interest feed — see refreshLiveHeadlines() below. Each headline
   links straight out to its original source. The list is duplicated so the
   CSS marquee animation (.ticker-track, see styles.css) loops seamlessly.
   ════════════════════════════════════════════════════════════════════════ */
async function refreshLiveHeadlines() {
  setFeedState('Refreshing');
  try {
    state.liveHeadlines = await apiGet('/api/site/live-headlines', { allowGuest: true });
    setFeedState('Live');
  } catch (error) {
    console.error(error);
    setFeedState('Unavailable');
  }
  renderBriefBoard();
}

function renderBriefBoard() {
  const items = state.liveHeadlines?.items || [];

  if (!items.length) {
    elements.briefBoard.innerHTML = createEmptyCard('Live headlines are loading — check back shortly.');
    elements.briefBoard.style.animation = 'none';
    return;
  }

  const renderTickerItem = (item) => `
    <a class="ticker-item" href="${escapeAttribute(item.url || '#')}" target="_blank" rel="noopener">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="ticker-meta">
        <span>${escapeHtml(item.source || 'Market feed')}</span>
        <span>·</span>
        <span>${formatDate(item.publishedAt)}</span>
      </div>
    </a>
  `;

  // Duplicate the list so the marquee (translateY 0 -> -50%) loops with no visible seam
  const doubled = [...items, ...items];
  elements.briefBoard.innerHTML = doubled.map(renderTickerItem).join('');

  // Scroll speed scales with content length so longer lists don't feel rushed
  const duration = Math.max(18, items.length * 4);
  elements.briefBoard.style.animationDuration = `${duration}s`;
}

function renderAreas() {
  const areas = state.home?.areas || [];
  if (!areas.length) {
    elements.feedAreas.innerHTML = createEmptyCard('No area panels are available for this selection.');
    return;
  }

  elements.feedAreas.innerHTML = areas
    .map(
      (area) => `
        <section class="area-panel">
          <h3>${escapeHtml(area.label)}</h3>
          <p>${escapeHtml(area.summary)}</p>
          <div class="stack-list">
            ${(area.articles || [])
              .map((article) =>
                renderStoryCard(article, {
                  description: article.preview || article.summary,
                  actionLabel: article.accessible ? 'Read' : 'Preview',
                }),
              )
              .join('')}
          </div>
        </section>
      `,
    )
    .join('');
}

function renderLearningPoints() {
  const learningPoints = state.home?.learningPoints || [];
  if (!learningPoints.length) {
    elements.learningPoints.innerHTML = createEmptyCard('Learning points are being prepared for this selection.');
    return;
  }

  elements.learningPoints.innerHTML = learningPoints
    .map((article) =>
      renderStoryCard(article, {
        description: article.preview || article.summary,
        actionLabel: article.accessible ? 'Open learning point' : 'Preview learning point',
      }),
    )
    .join('');
}

function renderWatchlist() {
  const watchlist = getCurrentWatchlist();
  if (!watchlist.length) {
    elements.watchlistList.innerHTML = '<span class="helper-note">No watchlist names yet. Add a ticker to get started.</span>';
    return;
  }

  const quotesByTicker = Object.fromEntries(
    (state.watchlistQuotes?.items || []).map((item) => [item.ticker, item]),
  );

  elements.watchlistList.innerHTML = watchlist
    .map((ticker) => {
      const quote = quotesByTicker[ticker];
      const priceLabel = quote?.price != null ? ` · $${formatMoney(quote.price)}` : '';

      return `
        <span class="choice-chip active" title="${escapeHtml(quote?.note || '')}">
          ${escapeHtml(ticker)}${priceLabel}
          <button class="button secondary mini-button" type="button" data-remove-watchlist="${ticker}">Remove</button>
        </span>
      `;
    })
    .join('');
}

/**
 * Fetch live prices for the current watchlist from Marketstack (via our
 * server) and re-render the chips with price data. Also updates the quota
 * notice so a warning shows up once Marketstack's monthly allowance is
 * running low or has run out.
 */
async function refreshWatchlistQuotes() {
  const tickers = getCurrentWatchlist();

  if (!tickers.length) {
    state.watchlistQuotes = null;
    renderWatchlist();
    renderQuotaNotice(elements.watchlistQuotaNotice, null);
    return;
  }

  try {
    state.watchlistQuotes = await apiPost('/api/member/watchlist/quotes', { tickers }, { allowGuest: true });
  } catch (error) {
    console.error(error);
    state.watchlistQuotes = null;
  }

  renderWatchlist();
  renderQuotaNotice(elements.watchlistQuotaNotice, state.watchlistQuotes?.quota);
}

function renderPortfolio() {
  const portfolio = getCurrentPortfolio();
  if (!portfolio.length) {
    elements.portfolioList.innerHTML = `
      <div class="list-row">
        <div>
          <strong>No holdings added yet</strong>
          <div class="helper-note">Add your holdings to build your saved portfolio.</div>
        </div>
      </div>
    `;
    return;
  }

  const quotesByTicker = Object.fromEntries(
    (state.portfolioQuotes?.holdings || []).map((item) => [item.ticker, item]),
  );

  elements.portfolioList.innerHTML = portfolio
    .map((holding) => {
      const quote = quotesByTicker[holding.ticker];
      const priceLine = quote?.price != null ? ` · $${formatMoney(quote.price)}${quote.note ? ` — ${escapeHtml(quote.note)}` : ''}` : '';

      return `
        <div class="list-row">
          <div>
            <strong>${escapeHtml(holding.ticker)}${holding.name ? ` · ${escapeHtml(holding.name)}` : ''}</strong>
            <div class="helper-note">${escapeHtml(holding.weight || 'Weight not set')} · Cost ${escapeHtml(holding.cost || 'n/a')}${priceLine}</div>
          </div>
          <button class="button secondary" type="button" data-remove-holding="${holding.id}">Remove</button>
        </div>
      `;
    })
    .join('');
}

/**
 * Fetch live prices for the current portfolio holdings from Marketstack (via
 * our server) and re-render with price data. Updates the quota notice too.
 */
async function refreshPortfolioQuotes() {
  const holdings = getCurrentPortfolio();

  if (!holdings.length) {
    state.portfolioQuotes = null;
    renderPortfolio();
    renderQuotaNotice(elements.portfolioQuotaNotice, null);
    return;
  }

  try {
    state.portfolioQuotes = await apiPost('/api/member/portfolio/quotes', { holdings }, { allowGuest: true });
  } catch (error) {
    console.error(error);
    state.portfolioQuotes = null;
  }

  renderPortfolio();
  renderQuotaNotice(elements.portfolioQuotaNotice, state.portfolioQuotes?.quota);
}

async function refreshMarketDataQuotes() {
  await Promise.all([refreshWatchlistQuotes(), refreshPortfolioQuotes()]);
}

/**
 * Shows/hides a quota-warning notice element based on the `quota` object
 * returned from the watchlist/portfolio quotes endpoints. Reuses the
 * existing `hidden` class already used throughout this file — no new CSS
 * needed.
 */
function renderQuotaNotice(element, quota) {
  if (!element) {
    return;
  }

  if (!quota || !quota.warningLevel) {
    element.classList.add('hidden');
    element.textContent = '';
    return;
  }

  element.classList.remove('hidden');
  element.textContent = quota.message || '';
}

function renderPortfolioReview(review) {
  if (!review) {
    elements.portfolioReview.innerHTML = createEmptyCard('Portfolio review is loading.');
    return;
  }

  if (!review.accessible) {
    elements.portfolioReview.innerHTML = `
      <div class="review-column">
        <h3>${escapeHtml(review.title)}</h3>
        <p>${escapeHtml(review.summary)}</p>
      </div>
    `;
    return;
  }

  elements.portfolioReview.innerHTML = `
    <div class="review-column">
      <h3>${escapeHtml(review.title)}</h3>
      <p>${escapeHtml(review.summary)}</p>
    </div>
    <div class="review-column">
      <h3>Strengths</h3>
      <ul>${(review.strengths || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
    <div class="review-column">
      <h3>Risks and next steps</h3>
      <ul>${[...(review.risks || []), ...(review.actions || [])].map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
  `;
}

function renderPricingCards() {
  const plans = state.bootstrap?.plans || [];
  elements.pricingCards.innerHTML = plans
    .map((plan) => {
      const coupon = state.couponResults[plan.id];
      const currentPlan = state.user?.plan === plan.id;
      const pricingNote =
        coupon?.valid && plan.id !== 'free'
          ? `<div class="pricing-note">With ${escapeHtml(coupon.code)}: $${formatMoney(coupon.adjustedMonthly)}/month or $${formatMoney(coupon.adjustedAnnual)}/year</div>`
          : '';

      return `
        <article class="pricing-card ${plan.highlight ? 'highlight' : ''}">
          <div class="feature-story-meta">
            <div>
              <span class="eyebrow">${escapeHtml(plan.shortName || plan.name)}</span>
              <h3>${escapeHtml(plan.name)}</h3>
            </div>
            ${currentPlan ? '<span class="tag gold">Current plan</span>' : ''}
          </div>
          <p>${escapeHtml(plan.tagline)}</p>
          <strong>${escapeHtml(plan.priceLabel)}</strong>
          <div class="helper-note">${escapeHtml(plan.billingLabel)}</div>
          ${pricingNote}
          <ul class="plain-list">${(plan.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul>
          <div class="pricing-options">
            ${(plan.billingOptions || [])
              .map((option) => {
                const buttonLabel = currentPlan && plan.id !== 'free' ? `${option.label} selected` : option.label;
                return `
                  <button
                    class="button ${plan.highlight ? 'primary' : 'secondary'}"
                    type="button"
                    data-plan-id="${plan.id}"
                    data-billing-cycle="${option.id.includes('annual') ? 'annual' : 'monthly'}"
                    data-checkout-url="${option.checkoutUrl || ''}"
                  >
                    ${escapeHtml(buttonLabel)}${option.priceText ? ` ${escapeHtml(option.priceText)}` : ''}
                  </button>
                `;
              })
              .join('')}
          </div>
        </article>
      `;
    })
    .join('');
}

function renderLoadingBoards() {
  const loadingCard = '<div class="story-card"><div class="skeleton line"></div><div class="skeleton card"></div></div>';
  elements.briefBoard.innerHTML = loadingCard;
  elements.feedAreas.innerHTML = loadingCard.repeat(3);
  elements.learningPoints.innerHTML = loadingCard.repeat(2);
}

function renderStoryCard(article, options = {}) {
  const description = options.description || article.summary || article.preview || '';
  const actionLabel = options.actionLabel || 'Read';
  const currentPlan = state.user?.plan || 'free';
  const saved = Boolean(state.user?.savedArticleSlugs?.includes(article.slug));
  const accessTag = article.accessTier === 'free' ? 'Free' : article.accessTier === 'regular' ? 'Regular' : 'Premium';
  const regionLabel = getLookupLabel(state.bootstrap.regions, article.region);
  const interestLabel = getLookupLabel(state.bootstrap.interests, article.interest);
  const saveButton = state.user
    ? `<button class="button secondary" type="button" data-save-article="${article.slug}">${saved ? 'Saved' : 'Save'}</button>`
    : '';

  return `
    <article class="${options.className || 'story-card'} ${article.accessible ? '' : 'locked'}">
      <div class="feature-story-meta">
        <div class="chip-row">
          <span class="tag">${escapeHtml(accessTag)}</span>
          <span class="tag">${escapeHtml(regionLabel)}</span>
          <span class="tag">${escapeHtml(interestLabel)}</span>
        </div>
        <span class="subtle-chip">${escapeHtml(article.readingTime || '4 min read')}</span>
      </div>
      <h3>${escapeHtml(article.headline)}</h3>
      <p>${escapeHtml(description)}</p>
      ${
        options.includeSource
          ? `<div class="helper-note">${escapeHtml(article.source || 'Dr MoneyWise')} · ${formatDate(article.publishAt)}</div>`
          : ''
      }
      <div class="button-row">
        <a class="button primary" href="/article.html?slug=${encodeURIComponent(article.slug)}&plan=${encodeURIComponent(currentPlan)}">${escapeHtml(actionLabel)}</a>
        ${saveButton}
      </div>
    </article>
  `;
}

async function handleSignUp(event) {
  event.preventDefault();
  setAuthMessage('Creating your account...');

  try {
    const payload = {
      name: elements.nameInput.value.trim(),
      email: elements.emailInput.value.trim(),
      password: elements.passwordInput.value.trim(),
      region: state.selectedRegion,
      interests: state.selectedInterests,
      plan: 'free',
      billingCycle: 'monthly',
    };

    const session = await apiPost('/api/auth/signup', payload, { allowGuest: true });
    await finishAuth(session, 'Your free account is ready.');
  } catch (error) {
    setAuthMessage(error.message || 'Could not create your account.');
  }
}

async function handleSignIn(event) {
  event.preventDefault();
  setAuthMessage('Signing you in...');

  try {
    const session = await apiPost(
      '/api/auth/login',
      {
        email: elements.loginEmailInput.value.trim(),
        password: elements.loginPasswordInput.value.trim(),
      },
      { allowGuest: true },
    );

    if (session.user?.role === 'admin') {
      setAuthMessage('Admin account detected. Use the Admin link above to manage the site.');
    }

    await finishAuth(session, `Welcome back, ${session.user?.name || 'member'}.`);
  } catch (error) {
    setAuthMessage(error.message || 'Could not sign you in.');
  }
}

async function handleSignOut() {
  try {
    await apiPost('/api/auth/logout', {});
  } catch (error) {
    console.error(error);
  }

  clearSessionState();
  state.token = '';
  state.user = null;
  setAuthMode('signup');
  setAuthMessage('You are signed out.');
  await loadBootstrap();
  await refreshHome();
  await refreshPortfolioReview();
  renderAll();
  await refreshMarketDataQuotes();
}

async function finishAuth(session, message) {
  state.token = session.token;
  state.user = session.user;
  writeSessionState(session.token, session.expiresAt);
  await syncGuestStateIntoMember();
  state.selectedRegion = state.user.region || state.selectedRegion;
  state.selectedInterests = normalizeInterests(
    state.user.interests,
    (state.bootstrap.interests || []).slice(0, 3).map((interest) => interest.id),
  );
  setAuthMode('signed-in');
  setAuthMessage(message);
  persistLocalState();
  renderInterestChoices();
  syncRegionControls();
  await refreshHome();
  await refreshPortfolioReview();
  renderAll();
  await refreshMarketDataQuotes();
}

async function handleInterestToggle(event) {
  const button = event.target.closest('[data-interest-id]');
  if (!button) {
    return;
  }

  const interestId = button.dataset.interestId;
  const exists = state.selectedInterests.includes(interestId);
  if (exists && state.selectedInterests.length === 1) {
    setAuthMessage('Keep at least one interest selected.');
    return;
  }

  state.selectedInterests = exists
    ? state.selectedInterests.filter((interest) => interest !== interestId)
    : [...state.selectedInterests, interestId];

  renderInterestChoices();
  persistLocalState();
  await savePreferencesIfSignedIn();
  await refreshHome();
}

async function handleAddWatchlist(event) {
  event.preventDefault();
  const ticker = elements.watchlistTickerInput.value.trim().toUpperCase();
  if (!ticker) {
    return;
  }

  if (state.user) {
    const nextWatchlist = [...new Set([...getCurrentWatchlist(), ticker])].slice(0, 20);
    const response = await apiPost('/api/member/watchlist', { tickers: nextWatchlist });
    state.user.watchlist = response.watchlist;
  } else {
    state.guestWatchlist = [...new Set([...state.guestWatchlist, ticker])].slice(0, 20);
    persistLocalState();
    setAuthMessage('Ticker saved locally. Create a free account to keep it permanently.');
  }

  elements.watchlistTickerInput.value = '';
  await refreshWatchlistQuotes();
}

async function handleRemoveWatchlist(event) {
  const button = event.target.closest('[data-remove-watchlist]');
  if (!button) {
    return;
  }

  const ticker = button.dataset.removeWatchlist;
  if (state.user) {
    const nextWatchlist = getCurrentWatchlist().filter((entry) => entry !== ticker);
    const response = await apiPost('/api/member/watchlist', { tickers: nextWatchlist });
    state.user.watchlist = response.watchlist;
  } else {
    state.guestWatchlist = state.guestWatchlist.filter((entry) => entry !== ticker);
    persistLocalState();
  }

  await refreshWatchlistQuotes();
}

async function handleAddPortfolioHolding(event) {
  event.preventDefault();
  const holding = {
    id: cryptoId(),
    ticker: elements.portfolioTickerInput.value.trim().toUpperCase(),
    name: elements.portfolioNameInput.value.trim(),
    weight: elements.portfolioWeightInput.value.trim(),
    cost: elements.portfolioCostInput.value.trim(),
  };

  if (!holding.ticker) {
    return;
  }

  if (state.user) {
    const response = await apiPost('/api/member/portfolio', {
      holdings: [...getCurrentPortfolio(), holding],
    });
    state.user.portfolio = response.portfolio;
  } else {
    state.guestPortfolio = [...state.guestPortfolio, holding].slice(0, 20);
    persistLocalState();
    setAuthMessage('Holding saved locally. Sign in to keep it with your account.');
  }

  elements.portfolioForm.reset();
  await refreshPortfolioQuotes();
  await refreshPortfolioReview();
}

async function handleRemovePortfolioHolding(event) {
  const button = event.target.closest('[data-remove-holding]');
  if (!button) {
    return;
  }

  const holdingId = button.dataset.removeHolding;
  if (state.user) {
    const nextPortfolio = getCurrentPortfolio().filter((holding) => holding.id !== holdingId);
    const response = await apiPost('/api/member/portfolio', { holdings: nextPortfolio });
    state.user.portfolio = response.portfolio;
  } else {
    state.guestPortfolio = state.guestPortfolio.filter((holding) => holding.id !== holdingId);
    persistLocalState();
  }

  await refreshPortfolioQuotes();
  await refreshPortfolioReview();
}

async function handlePricingClick(event) {
  const button = event.target.closest('[data-plan-id]');
  if (!button) {
    return;
  }

  const planId = button.dataset.planId;
  const billingCycle = button.dataset.billingCycle || 'monthly';
  const checkoutUrl = button.dataset.checkoutUrl || '';

  if (planId === 'free') {
    document.querySelector('.onboarding-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setAuthMode(state.user ? 'signed-in' : 'signup');
    setAuthMessage(state.user ? 'Your free account is active.' : 'Create your free account to get started.');
    return;
  }

  if (checkoutUrl) {
    window.open(checkoutUrl, '_blank', 'noopener');
    elements.couponMessage.textContent = `Checkout opened for ${getPlanLabel(planId)} (${billingCycle}).`;
    return;
  }

  elements.couponMessage.textContent = `Add your Stripe checkout link for ${getPlanLabel(planId)} in the admin page before going live.`;
}

async function handleSaveArticleClick(event) {
  const button = event.target.closest('[data-save-article]');
  if (!button) {
    return;
  }

  event.preventDefault();

  if (!state.user) {
    setAuthMode('signin');
    setAuthMessage('Sign in to save articles to your account.');
    document.querySelector('.onboarding-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const response = await apiPost('/api/member/saved-articles', {
    slug: button.dataset.saveArticle,
  });

  state.user.savedArticleSlugs = response.savedArticleSlugs;
  renderAreas();
  renderLearningPoints();
}

async function applyCoupon() {
  const code = elements.couponInput.value.trim().toUpperCase();
  if (!code) {
    elements.couponMessage.textContent = 'Enter a coupon code first.';
    return;
  }

  const plans = ['regular', 'premium'];
  const results = await Promise.all(plans.map((planId) => apiPost('/api/site/coupons/validate', { code, planId }, { allowGuest: true })));

  state.couponCode = code;
  state.couponResults = {
    regular: results[0],
    premium: results[1],
  };

  if (results.some((result) => result.valid)) {
    elements.couponMessage.textContent = `Coupon ${code} applied where eligible.`;
  } else {
    elements.couponMessage.textContent = 'That coupon code is not active or not valid for these plans.';
  }

  renderPricingCards();
}

async function savePreferencesIfSignedIn() {
  if (!state.user) {
    return;
  }

  const user = await apiPost('/api/member/preferences', {
    name: state.user.name,
    region: state.selectedRegion,
    interests: state.selectedInterests,
  });

  state.user = user;
}

async function syncGuestStateIntoMember() {
  if (!state.user) {
    return;
  }

  const mergedWatchlist = [...new Set([...(state.user.watchlist || []), ...state.guestWatchlist])].slice(0, 20);
  if (mergedWatchlist.length !== (state.user.watchlist || []).length) {
    const watchlistResponse = await apiPost('/api/member/watchlist', { tickers: mergedWatchlist });
    state.user.watchlist = watchlistResponse.watchlist;
  }

  if (!(state.user.portfolio || []).length && state.guestPortfolio.length) {
    const portfolioResponse = await apiPost('/api/member/portfolio', { holdings: state.guestPortfolio });
    state.user.portfolio = portfolioResponse.portfolio;
  }

  state.guestWatchlist = [];
  state.guestPortfolio = [];
  persistLocalState();
}

function restoreLocalState() {
  const guest = readJsonStorage(GUEST_KEY);
  state.selectedRegion = guest.selectedRegion || state.selectedRegion;
  state.selectedInterests = Array.isArray(guest.selectedInterests) ? guest.selectedInterests : state.selectedInterests;
  state.guestWatchlist = Array.isArray(guest.guestWatchlist) ? guest.guestWatchlist : [];
  state.guestPortfolio = Array.isArray(guest.guestPortfolio) ? guest.guestPortfolio : [];
  state.authMode = guest.authMode || 'signup';
}

function persistLocalState() {
  writeJsonStorage(GUEST_KEY, {
    selectedRegion: state.selectedRegion,
    selectedInterests: state.selectedInterests,
    guestWatchlist: state.guestWatchlist,
    guestPortfolio: state.guestPortfolio,
    authMode: state.authMode,
  });
}

function readSessionState() {
  return readJsonStorage(SESSION_KEY);
}

function writeSessionState(token, expiresAt) {
  writeJsonStorage(SESSION_KEY, { token, expiresAt });
}

function clearSessionState() {
  window.localStorage.removeItem(SESSION_KEY);
}

function setAuthMode(mode) {
  state.authMode = mode;
  renderAccountState();
  persistLocalState();
}

function setAuthMessage(message) {
  elements.authMessage.textContent = message;
}

function setFeedState(message) {
  elements.feedState.textContent = message;
}

function getCurrentWatchlist() {
  return state.user ? state.user.watchlist || [] : state.guestWatchlist;
}

function getCurrentPortfolio() {
  return state.user ? state.user.portfolio || [] : state.guestPortfolio;
}

function normalizeInterests(interests, fallback) {
  const cleaned = Array.isArray(interests) ? interests.filter(Boolean) : [];
  return cleaned.length ? cleaned : fallback;
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
    if (!options.allowGuest || response.status !== 500) {
      throw new Error(payload.error || 'Request failed.');
    }
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}

async function trackView(path, type, value = 1, articleSlug = '') {
  try {
    await apiPost(
      '/api/site/track',
      {
        type,
        path,
        value,
        articleSlug,
      },
      { allowGuest: true },
    );
  } catch (error) {
    console.error(error);
  }
}

function createEmptyCard(message) {
  return `
    <div class="list-row">
      <div class="helper-note">${escapeHtml(message)}</div>
    </div>
  `;
}

function readJsonStorage(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function writeJsonStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getLookupLabel(collection, id) {
  return collection?.find((item) => item.id === id)?.label || id || 'General';
}

function getPlanLabel(planId) {
  return state.bootstrap?.plans?.find((plan) => plan.id === planId)?.shortName || 'Free';
}

function formatDate(value) {
  if (!value) {
    return 'Today';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
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

function cryptoId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `holding-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setupRevealObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1 },
  );

  document.querySelectorAll('[data-reveal]').forEach((node) => observer.observe(node));
}
