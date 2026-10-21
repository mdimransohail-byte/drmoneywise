const SESSION_KEY = 'drmoneywise-session';
const GUEST_KEY = 'drmoneywise-guest';

const state = {
  token: '',
  user: null,
  bootstrap: null,
  home: null,
  authMode: 'signup',
  selectedRegions: ['global'],
  selectedInterests: [],
  guestWatchlist: [],
  guestPortfolio: [],
  couponResults: {},
  couponCode: '',
  watchlistQuotes: null,
  portfolioQuotes: null,
  liveHeadlines: null,
  interestHeadlines: {},
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
  await handleCheckoutReturn();
  await refreshHome();
  await refreshLiveHeadlines();
  await refreshInterestHeadlines();
  await refreshPortfolioReview();
  renderAll();
  goToSignIn();
  await refreshMarketDataQuotes();
  await trackView('/', 'page_view');
  window.setInterval(() => refreshHome({ quiet: true }), 300000);
  window.setInterval(() => refreshLiveHeadlines(), 6 * 60 * 60 * 1000);
  window.setInterval(() => refreshInterestHeadlines(), 24 * 60 * 60 * 1000);
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
  elements.regionPicker = document.querySelector('#regionPicker');
  elements.interestPicker = document.querySelector('#interestPicker');
  elements.regionFilterChips = document.querySelector('#regionFilterChips');
  elements.interestFilterChips = document.querySelector('#interestFilterChips');
  elements.regionPickerTrigger = document.querySelector('#regionPickerTrigger');
  elements.regionPickerLabel = document.querySelector('#regionPickerLabel');
  elements.interestPickerTrigger = document.querySelector('#interestPickerTrigger');
  elements.interestPickerLabel = document.querySelector('#interestPickerLabel');
  elements.refreshHomeButton = document.querySelector('#refreshHomeButton');
  elements.feedState = document.querySelector('#feedState');
  elements.briefFeatured = document.querySelector('#briefFeatured');
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
  elements.headerSignInButton = document.querySelector('#headerSignInButton');
  elements.menuToggle = document.querySelector('#menuToggle');
  elements.mobileNav = document.querySelector('#mobileNav');
  elements.headerSearchInput = document.querySelector('#headerSearchInput');
  elements.lookupForm = document.querySelector('#lookupForm');
  elements.lookupInput = document.querySelector('#lookupInput');
  elements.lookupMessage = document.querySelector('#lookupMessage');
}

function bindEvents() {
  bindHeaderEvents();
  elements.signupForm.addEventListener('submit', handleSignUp);
  elements.signinForm.addEventListener('submit', handleSignIn);
  elements.toggleAuthModeButton.addEventListener('click', () => setAuthMode('signin'));
  elements.toggleSignupModeButton.addEventListener('click', () => setAuthMode('signup'));
  elements.signOutButton.addEventListener('click', handleSignOut);
  elements.regionPicker.addEventListener('click', handleRegionToggle);
  elements.regionFilterChips.addEventListener('click', handleRegionToggle);
  elements.interestPicker.addEventListener('click', handleInterestToggle);
  elements.interestFilterChips.addEventListener('click', handleInterestToggle);

  elements.regionPickerTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    togglePickerPanel('region');
  });
  elements.interestPickerTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    togglePickerPanel('interest');
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.picker-dropdown')) {
      closeAllPickerPanels();
    }
  });
  elements.refreshHomeButton.addEventListener('click', async () => {
    await refreshHome();
    await refreshInterestHeadlines();
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
  state.selectedRegions = normalizeRegions(state.user?.regions || state.selectedRegions, [state.bootstrap.regions?.[0]?.id || 'global']);
  state.selectedInterests = normalizeInterests(state.user?.interests || state.selectedInterests, fallbackInterests);

  if (state.user) {
    await syncGuestStateIntoMember();
  }

  renderRegionChoices();
  renderInterestChoices();
  setAuthMode(state.user ? 'signed-in' : state.authMode);
}

async function refreshHome({ quiet = false } = {}) {
  if (!quiet) {
    setFeedState('Refreshing');
    renderLoadingBoards();
  }

  const params = new URLSearchParams({
    regions: state.selectedRegions.join(','),
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

/* Header: phone menu, Sign in shortcut, search box, company look-up. */
function bindHeaderEvents() {
  elements.menuToggle?.addEventListener('click', () => {
    const open = elements.mobileNav.classList.toggle('open');
    elements.menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    elements.menuToggle.textContent = open ? 'Close' : 'Menu';
  });
  elements.mobileNav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      elements.mobileNav.classList.remove('open');
      elements.menuToggle.setAttribute('aria-expanded', 'false');
      elements.menuToggle.textContent = 'Menu';
    }
  });
  elements.headerSignInButton?.addEventListener('click', () => setAuthMode('signin'));
  elements.headerSearchInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const query = elements.headerSearchInput.value.trim();
    window.location.href = query ? `/stocks?q=${encodeURIComponent(query)}` : '/stocks';
  });
}

function renderAll() {
  renderAccountState();
  renderBriefBoard();
  renderAreas();
  renderLearningPoints();
  renderWatchlist();
  renderPortfolio();
  renderPricingCards();
}

function renderAccountState() {
  const planName = getPlanLabel(state.user?.plan || 'free');
  elements.memberBadge.textContent = state.user ? `${planName} member` : '';
  elements.accountState.textContent = state.user ? state.user.name : 'Guest';
  elements.signOutButton.classList.toggle('hidden', !state.user);
  elements.headerSignInButton?.classList.toggle('hidden', Boolean(state.user));

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
  renderPickerLabels();
}

function renderRegionChoices() {
  const choices = (state.bootstrap.regions || [])
    .map((region) => {
      const active = state.selectedRegions.includes(region.id);
      return `
        <button
          class="choice-chip ${active ? 'active' : ''}"
          type="button"
          data-region-id="${region.id}"
          aria-pressed="${active ? 'true' : 'false'}"
        >
          ${region.label}
        </button>
      `;
    })
    .join('');

  const filters = (state.bootstrap.regions || [])
    .map((region) => {
      const active = state.selectedRegions.includes(region.id);
      return `
        <button
          class="filter-chip ${active ? 'active' : ''}"
          type="button"
          data-region-id="${region.id}"
          aria-pressed="${active ? 'true' : 'false'}"
        >
          ${region.label}
        </button>
      `;
    })
    .join('');

  elements.regionPicker.innerHTML = choices;
  elements.regionFilterChips.innerHTML = filters;
  renderPickerLabels();
}

/**
 * Compact dropdown behavior for the Explore-by-Interest picker. Clicking a
 * trigger opens its panel and closes the other one; clicking outside either
 * dropdown closes both. Selecting a chip inside an open panel doesn't close
 * it — see the click-outside listener in bindEvents(), which only fires for
 * clicks outside .picker-dropdown entirely.
 */
function togglePickerPanel(which) {
  const isRegionOpen = !elements.regionFilterChips.classList.contains('hidden');
  const isInterestOpen = !elements.interestFilterChips.classList.contains('hidden');

  closeAllPickerPanels();

  if (which === 'region' && !isRegionOpen) {
    elements.regionFilterChips.classList.remove('hidden');
    elements.regionPickerTrigger.classList.add('open');
  } else if (which === 'interest' && !isInterestOpen) {
    elements.interestFilterChips.classList.remove('hidden');
    elements.interestPickerTrigger.classList.add('open');
  }
}

function closeAllPickerPanels() {
  elements.regionFilterChips.classList.add('hidden');
  elements.interestFilterChips.classList.add('hidden');
  elements.regionPickerTrigger.classList.remove('open');
  elements.interestPickerTrigger.classList.remove('open');
}

function renderPickerLabels() {
  const regionLabels = state.selectedRegions.map(
    (id) => (state.bootstrap.regions || []).find((region) => region.id === id)?.label || id,
  );
  elements.regionPickerLabel.textContent = `Region: ${regionLabels.join(', ') || 'Global'}`;

  const interestLabels = state.selectedInterests.map(
    (id) => (state.bootstrap.interests || []).find((interest) => interest.id === id)?.label || id,
  );
  elements.interestPickerLabel.textContent = interestLabels.length
    ? `Interests: ${interestLabels.join(', ')}`
    : 'Interests';
}

/* ════════════════════════════════════════════════════════════════════════
   TOP STORY — magazine layout (featured headline + secondary list)
   ───────────────────────────────────────────────────────────────────────
   Sourced from its own /api/site/live-headlines endpoint (raw Marketaux
   headlines, cached server-side for 6 hours) rather than the personalized
   region/interest feed — see refreshLiveHeadlines() below. Each headline
   links straight out to its original source.
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
    elements.briefFeatured.innerHTML = '<h3>Top stories are loading</h3><span class="src">Check back in a moment.</span>';
    elements.briefFeatured.removeAttribute('href');
    elements.briefBoard.innerHTML = '';
    return;
  }

  const [featured, ...rest] = items;

  elements.briefFeatured.href = featured.url || '#';
  elements.briefFeatured.innerHTML = `
    <h3>${escapeHtml(featured.title)}</h3>
    <span class="src">${escapeHtml(featured.source || 'Market news')} · ${formatDate(featured.publishedAt)}</span>
  `;

  elements.briefBoard.innerHTML = rest
    .slice(0, 5)
    .map(
      (item) => `
        <a href="${escapeAttribute(item.url || '#')}" target="_blank" rel="noopener">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.source || 'Market news')} · ${formatDate(item.publishedAt)}</span>
        </a>
      `,
    )
    .join('');
}

/* ════════════════════════════════════════════════════════════════════════
   EXPLORE BY INTEREST — 5 raw trending headlines per selected interest
   ───────────────────────────────────────────────────────────────────────
   Sourced from /api/site/interest-headlines?interest=X (server-side
   trending ranking + 24h cache, see newsService.getInterestHeadlines()).
   Same "raw headline, links straight to source" shape as the Top Story
   board above, just scoped to one interest at a time — trending is the
   default search here too, so whatever's actually being covered heavily
   for that interest surfaces first.
   ════════════════════════════════════════════════════════════════════════ */
async function refreshInterestHeadlines() {
  const interests = state.selectedInterests.length
    ? state.selectedInterests
    : (state.bootstrap?.interests || []).slice(0, 3).map((interest) => interest.id);

  const regionsParam = encodeURIComponent(state.selectedRegions.join(','));

  try {
    const results = await Promise.all(
      interests.map((interestId) =>
        apiGet(`/api/site/interest-headlines?interest=${encodeURIComponent(interestId)}&regions=${regionsParam}`, { allowGuest: true }).catch((error) => {
          console.error(error);
          return { interest: interestId, items: [] };
        }),
      ),
    );

    state.interestHeadlines = Object.fromEntries(results.map((result) => [result.interest, result]));
  } catch (error) {
    console.error(error);
  }

  renderAreas();
}

function renderAreas() {
  const interests = state.selectedInterests.length
    ? state.selectedInterests
    : (state.bootstrap?.interests || []).slice(0, 3).map((interest) => interest.id);

  elements.feedAreas.innerHTML = interests
    .map((interestId) => {
      const label = getLookupLabel(state.bootstrap.interests, interestId);
      const items = state.interestHeadlines[interestId]?.items || [];

      const body = items.length
        ? `
          <div class="stack-list">
            ${items
              .map(
                (item) => `
                  <a class="news-list-item" href="${escapeAttribute(item.url || '#')}" target="_blank" rel="noopener">
                    <p class="news-list-headline">${escapeHtml(item.title)}</p>
                    <p class="news-list-meta">${escapeHtml(item.source || 'Market feed')} &middot; ${formatDate(item.publishedAt)}</p>
                  </a>
                `,
              )
              .join('')}
          </div>
        `
        : createEmptyCard('No trending headlines for this interest yet — check back soon.');

      return `
        <section class="area-panel">
          <h3>${escapeHtml(label)}</h3>
          <p>Trending in ${escapeHtml(label)} right now.</p>
          ${body}
        </section>
      `;
    })
    .join('');
}

const TOPIC_BADGES = {
  equities: 'Stocks',
  etfs: 'ETFs',
  'fixed-income': 'Bonds',
  commodities: 'Gold & oil',
  fx: 'Money',
  crypto: 'Crypto',
  retirement: 'Retire',
  income: 'Income',
};

function renderLearningPoints() {
  const learningPoints = state.home?.learningPoints || [];
  if (!learningPoints.length) {
    elements.learningPoints.innerHTML = createEmptyCard('New explainers are on their way. Check back soon.');
    return;
  }

  const currentPlan = state.user?.plan || 'free';
  elements.learningPoints.innerHTML = learningPoints
    .map((article) => {
      const badge = article.heroImage?.url
        ? `<img src="${escapeAttribute(article.heroImage.url)}" alt="" loading="lazy" />`
        : escapeHtml(TOPIC_BADGES[article.interest] || 'Money');
      const description = article.preview || article.summary || '';
      return `
        <a class="explain-item" href="/learn/${encodeURIComponent(article.slug)}">
          <span class="topic">${badge}</span>
          <div>
            <h3>${escapeHtml(article.headline)}</h3>
            ${article.accessible ? `<p>${escapeHtml(description)}</p>` : '<p class="lock-label">Members</p>'}
          </div>
        </a>
      `;
    })
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
          ${currentPlan && plan.id !== 'free' ? renderPlanStatusNote() : ''}
          <div class="pricing-options">
            ${currentPlan && plan.id !== 'free' && state.user?.hasBillingAccount
              ? '<button class="button primary" type="button" data-manage-plan="1">Manage my plan</button>'
              : (plan.billingOptions || [])
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
  const loading = '<div style="width:100%"><div class="skeleton line"></div><div class="skeleton line"></div></div>';
  elements.briefFeatured.innerHTML = '<h3>Loading top stories…</h3>';
  elements.briefBoard.innerHTML = loading;
  elements.feedAreas.innerHTML = `<div class="area-panel">${loading}</div>`.repeat(3);
  elements.learningPoints.innerHTML = loading;
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
      ${article.heroImage?.url ? `<img class="story-card-thumb" src="${escapeAttribute(article.heroImage.url)}" alt="" loading="lazy" />` : ''}
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
      regions: state.selectedRegions,
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
  await refreshInterestHeadlines();
  await refreshPortfolioReview();
  renderAll();
  await refreshMarketDataQuotes();
}

/* Arrived from "Sign in" on another page (/#join): open the sign-in form and
   scroll to it once the page above has finished loading (it grows as the
   results, lists and prices arrive, which pushed the form further down). */
function goToSignIn() {
  if (window.location.hash !== '#join') return;
  if (!state.user) setAuthMode('signin');
  const go = () => document.querySelector('#join')?.scrollIntoView({ block: 'start' });
  go();
  window.setTimeout(go, 600);
  window.setTimeout(go, 1800);
}

/* After signing in, go back to the page the member was on, if any. */
function goBackAfterSignIn() {
  let back = '';
  try { back = sessionStorage.getItem('dmw-back') || ''; sessionStorage.removeItem('dmw-back'); } catch { back = ''; }
  if (/^\/[^/]/u.test(back) && back !== '/') window.location.href = back;
}

async function finishAuth(session, message) {
  state.token = session.token;
  state.user = session.user;
  writeSessionState(session.token, session.expiresAt);
  await syncGuestStateIntoMember();
  state.selectedRegions = normalizeRegions(state.user.regions, state.selectedRegions);
  state.selectedInterests = normalizeInterests(
    state.user.interests,
    (state.bootstrap.interests || []).slice(0, 3).map((interest) => interest.id),
  );
  setAuthMode('signed-in');
  setAuthMessage(message);
  persistLocalState();
  renderRegionChoices();
  renderInterestChoices();
  await refreshHome();
  await refreshInterestHeadlines();
  await refreshPortfolioReview();
  renderAll();
  await refreshMarketDataQuotes();
  goBackAfterSignIn();
}

async function handleRegionToggle(event) {
  const button = event.target.closest('[data-region-id]');
  if (!button) {
    return;
  }

  const regionId = button.dataset.regionId;
  const exists = state.selectedRegions.includes(regionId);
  if (exists && state.selectedRegions.length === 1) {
    setAuthMessage('Keep at least one region selected.');
    return;
  }

  state.selectedRegions = exists
    ? state.selectedRegions.filter((region) => region !== regionId)
    : [...state.selectedRegions, regionId];

  renderRegionChoices();
  persistLocalState();
  await savePreferencesIfSignedIn();
  await refreshHome();
  await refreshInterestHeadlines();
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
  await refreshInterestHeadlines();
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
  const manageButton = event.target.closest('[data-manage-plan]');
  if (manageButton) {
    await openBillingPortal();
    return;
  }

  const button = event.target.closest('[data-plan-id]');
  if (!button) {
    return;
  }

  const planId = button.dataset.planId;
  const billingCycle = button.dataset.billingCycle || 'monthly';

  if (planId === 'free') {
    document.querySelector('#join')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setAuthMode(state.user ? 'signed-in' : 'signup');
    setAuthMessage(state.user ? 'Your free account is active.' : 'Create your free account to get started.');
    return;
  }

  if (!state.user) {
    document.querySelector('#join')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setAuthMode('signup');
    setAuthMessage(`Create a free account (or sign in) first, then choose ${getPlanLabel(planId)}.`);
    return;
  }

  if (state.user.role === 'admin') {
    elements.couponMessage.textContent = 'You are signed in as admin. Sign in with a member account to test payments.';
    return;
  }

  button.disabled = true;
  elements.couponMessage.textContent = 'Opening secure checkout…';
  try {
    const result = await apiPost('/api/billing/checkout', {
      planId,
      billingCycle,
      couponCode: state.couponCode || '',
    });
    window.location.href = result.url;
  } catch (error) {
    elements.couponMessage.textContent = error.message || 'Checkout could not start. Please try again.';
    button.disabled = false;
  }
}

async function openBillingPortal() {
  elements.couponMessage.textContent = 'Opening your billing page…';
  try {
    const result = await apiPost('/api/billing/portal', {});
    window.location.href = result.url;
  } catch (error) {
    elements.couponMessage.textContent = error.message || 'Your billing page could not open. Please try again.';
  }
}

/* After Stripe sends the member back: confirm the payment and refresh their plan. */
async function handleCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  const outcome = params.get('checkout');
  if (!outcome) {
    return;
  }
  window.history.replaceState({}, '', `${window.location.pathname}#membership`);

  if (outcome === 'cancelled') {
    elements.couponMessage.textContent = 'Checkout was cancelled. You have not been charged.';
    return;
  }

  const sessionId = params.get('session_id');
  if (outcome === 'success' && sessionId && state.user) {
    elements.couponMessage.textContent = 'Confirming your payment…';
    try {
      const result = await apiPost('/api/billing/confirm', { sessionId });
      if (result.user) {
        state.user = result.user;
      }
      elements.couponMessage.textContent = result.upgraded
        ? `Thank you! You're now on ${getPlanLabel(result.planId)}. Everything it includes is unlocked.`
        : result.message || 'Your payment is processing. Your plan will update shortly.';
    } catch (error) {
      elements.couponMessage.textContent = `${error.message || 'We could not confirm the payment yet.'} If you were charged, your plan will update within a few minutes.`;
    }
    window.setTimeout(() => document.querySelector('#membership')?.scrollIntoView({ block: 'start' }), 800);
  }
}

function renderPlanStatusNote() {
  const status = state.user?.planStatus;
  if (status === 'past_due') {
    return '<div class="pricing-note" style="color:var(--down)">Your last payment did not go through. Please update your card in "Manage my plan".</div>';
  }
  if (status === 'cancelling') {
    const ends = state.user?.planRenewsAt ? ` on ${formatDate(state.user.planRenewsAt)}` : ' at the end of this billing period';
    return `<div class="pricing-note">Your plan is cancelled and ends${escapeHtml(ends)}.</div>`;
  }
  return '';
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
    document.querySelector('#join')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    regions: state.selectedRegions,
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
  state.selectedRegions = Array.isArray(guest.selectedRegions) && guest.selectedRegions.length ? guest.selectedRegions : state.selectedRegions;
  state.selectedInterests = Array.isArray(guest.selectedInterests) ? guest.selectedInterests : state.selectedInterests;
  state.guestWatchlist = Array.isArray(guest.guestWatchlist) ? guest.guestWatchlist : [];
  state.guestPortfolio = Array.isArray(guest.guestPortfolio) ? guest.guestPortfolio : [];
  state.authMode = guest.authMode || 'signup';
}

function persistLocalState() {
  writeJsonStorage(GUEST_KEY, {
    selectedRegions: state.selectedRegions,
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

function normalizeRegions(regions, fallback) {
  const cleaned = Array.isArray(regions) ? regions.filter(Boolean) : [];
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
  return `<p class="empty-note">${escapeHtml(message)}</p>`;
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
