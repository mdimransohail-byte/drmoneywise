const SESSION_KEY = 'drmoneywise-session';

const state = {
  token: '',
  bootstrap: null,
  dashboard: null,
  businessSettings: null,
  ownerEnvSettings: null,
  articles: [],
  users: [],
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error(error);
    showLogin(error.message || 'Admin page failed to load.');
  });
});

async function init() {
  cacheElements();
  bindEvents();
  await loadBootstrap();
  populateSelectors();
  prefillAdminEmail();

  const session = readJsonStorage(SESSION_KEY);
  state.token = session.token || '';

  if (!state.token) {
    showLogin();
    return;
  }

  try {
    await loadAdminData();
    showAdminPanel();
  } catch (error) {
    console.error(error);
    clearSession();
    showLogin('Sign in with your admin account to continue.');
  }
}

function cacheElements() {
  elements.adminLoginPanel = document.querySelector('#adminLoginPanel');
  elements.adminPanel = document.querySelector('#adminPanel');
  elements.adminLoginForm = document.querySelector('#adminLoginForm');
  elements.adminEmailInput = document.querySelector('#adminEmailInput');
  elements.adminPasswordInput = document.querySelector('#adminPasswordInput');
  elements.adminLoginMessage = document.querySelector('#adminLoginMessage');
  elements.adminSignOutButton = document.querySelector('#adminSignOutButton');
  elements.adminMetrics = document.querySelector('#adminMetrics');
  elements.timelineChart = document.querySelector('#timelineChart');
  elements.tierMixChart = document.querySelector('#tierMixChart');
  elements.articleStatusChart = document.querySelector('#articleStatusChart');
  elements.learningDraftForm = document.querySelector('#learningDraftForm');
  elements.topicInput = document.querySelector('#topicInput');
  elements.topicAccessSelect = document.querySelector('#topicAccessSelect');
  elements.topicRegionSelect = document.querySelector('#topicRegionSelect');
  elements.topicInterestSelect = document.querySelector('#topicInterestSelect');
  elements.topicPublishInput = document.querySelector('#topicPublishInput');
  elements.adminDraftMessage = document.querySelector('#adminDraftMessage');
  elements.couponForm = document.querySelector('#couponForm');
  elements.couponCodeInput = document.querySelector('#couponCodeInput');
  elements.couponPercentInput = document.querySelector('#couponPercentInput');
  elements.couponScopeSelect = document.querySelector('#couponScopeSelect');
  elements.adminCouponMessage = document.querySelector('#adminCouponMessage');
  elements.couponList = document.querySelector('#couponList');
  elements.settingsForm = document.querySelector('#settingsForm');
  elements.siteNameInput = document.querySelector('#siteNameInput');
  elements.siteDomainInput = document.querySelector('#siteDomainInput');
  elements.supportEmailInput = document.querySelector('#supportEmailInput');
  elements.openAiKeyInput = document.querySelector('#openAiKeyInput');
  elements.claudeKeyInput = document.querySelector('#claudeKeyInput');
  elements.marketauxKeyInput = document.querySelector('#marketauxKeyInput');
  elements.newsApiKeyInput = document.querySelector('#newsApiKeyInput');
  elements.finnhubKeyInput = document.querySelector('#finnhubKeyInput');
  elements.stripeRegularMonthlyInput = document.querySelector('#stripeRegularMonthlyInput');
  elements.stripeRegularAnnualInput = document.querySelector('#stripeRegularAnnualInput');
  elements.stripePremiumMonthlyInput = document.querySelector('#stripePremiumMonthlyInput');
  elements.stripePremiumAnnualInput = document.querySelector('#stripePremiumAnnualInput');
  elements.writerAModelInput = document.querySelector('#writerAModelInput');
  elements.writerBModelInput = document.querySelector('#writerBModelInput');
  elements.settingsMessage = document.querySelector('#settingsMessage');
  elements.businessSettingsForm = document.querySelector('#businessSettingsForm');
  elements.businessPlansEditor = document.querySelector('#businessPlansEditor');
  elements.newsPriorityEditor = document.querySelector('#newsPriorityEditor');
  elements.businessSettingsMessage = document.querySelector('#businessSettingsMessage');
  elements.reloadBusinessSettingsButton = document.querySelector('#reloadBusinessSettingsButton');
  elements.ownerOpenAiKeyInput = document.querySelector('#ownerOpenAiKeyInput');
  elements.ownerClaudeKeyInput = document.querySelector('#ownerClaudeKeyInput');
  elements.ownerMarketauxKeyInput = document.querySelector('#ownerMarketauxKeyInput');
  elements.ownerNewsApiKeyInput = document.querySelector('#ownerNewsApiKeyInput');
  elements.ownerFinnhubKeyInput = document.querySelector('#ownerFinnhubKeyInput');
  elements.ownerCheckoutFreeInput = document.querySelector('#ownerCheckoutFreeInput');
  elements.ownerStripeRegularMonthlyInput = document.querySelector('#ownerStripeRegularMonthlyInput');
  elements.ownerStripeRegularAnnualInput = document.querySelector('#ownerStripeRegularAnnualInput');
  elements.ownerStripePremiumMonthlyInput = document.querySelector('#ownerStripePremiumMonthlyInput');
  elements.ownerStripePremiumAnnualInput = document.querySelector('#ownerStripePremiumAnnualInput');
  elements.ownerMaxDiscountInput = document.querySelector('#ownerMaxDiscountInput');
  elements.ownerDefaultCouponScopeSelect = document.querySelector('#ownerDefaultCouponScopeSelect');
  elements.articleInventory = document.querySelector('#articleInventory');
  elements.memberInventory = document.querySelector('#memberInventory');
}

function bindEvents() {
  elements.adminLoginForm.addEventListener('submit', handleAdminLogin);
  elements.adminSignOutButton.addEventListener('click', handleAdminSignOut);
  elements.learningDraftForm.addEventListener('submit', handleCreateDraft);
  elements.couponForm.addEventListener('submit', handleCreateCoupon);
  elements.couponList.addEventListener('click', handleCouponActions);
  elements.settingsForm.addEventListener('submit', handleSaveSettings);
  elements.businessSettingsForm.addEventListener('submit', handleSaveBusinessSettings);
  elements.reloadBusinessSettingsButton.addEventListener('click', loadAndRenderBusinessSettings);
  elements.articleInventory.addEventListener('click', handleArticleActions);
  elements.memberInventory.addEventListener('click', handleMemberActions);
}

async function loadBootstrap() {
  state.bootstrap = await apiGet('/api/site/bootstrap', { allowGuest: true });
}

function populateSelectors() {
  const regionOptions = (state.bootstrap?.regions || [])
    .map((region) => `<option value="${region.id}">${region.label}</option>`)
    .join('');
  const interestOptions = (state.bootstrap?.interests || [])
    .map((interest) => `<option value="${interest.id}">${interest.label}</option>`)
    .join('');

  elements.topicRegionSelect.innerHTML = regionOptions;
  elements.topicInterestSelect.innerHTML = interestOptions;
}

function prefillAdminEmail() {
  elements.adminEmailInput.value = state.bootstrap?.supportEmail || 'hello@drmoneywise.com';
}

async function loadAdminData() {
  const [dashboard, articlesPayload, usersPayload] = await Promise.all([
    apiGet('/api/admin/dashboard'),
    apiGet('/api/admin/articles'),
    apiGet('/api/admin/users'),
  ]);

  const businessPayload = await apiGet('/api/admin/business-settings').catch((error) => ({
    businessSettings: null,
    envSettings: null,
    loadError: error.message || 'Owner Controls backend is not available yet.',
  }));

  state.dashboard = dashboard;
  state.businessSettings = businessPayload.businessSettings;
  state.ownerEnvSettings = businessPayload.envSettings;
  state.businessSettingsLoadError = businessPayload.loadError || '';
  state.articles = articlesPayload.articles || [];
  state.users = usersPayload.users || [];
  renderDashboard();
}

function renderDashboard() {
  renderMetrics();
  renderTimeline();
  renderBarList(elements.tierMixChart, state.dashboard?.tierMix || [], 'label', 'count');
  renderBarList(elements.articleStatusChart, state.dashboard?.articleStatuses || [], 'label', 'count');
  renderCoupons();
  renderSettings();
  renderBusinessSettings();
  renderArticleInventory();
  renderMemberInventory();
}

function renderMetrics() {
  const metrics = [
    ['Readers', state.dashboard?.metrics?.totalReaders || 0],
    ['Page views', state.dashboard?.metrics?.pageViews || 0],
    ['Signups', state.dashboard?.metrics?.signups || 0],
    ['Upgrades', state.dashboard?.metrics?.upgrades || 0],
    ['Revenue', `$${formatNumber(state.dashboard?.metrics?.revenue || 0)}`],
    ['Conversion', `${formatNumber(state.dashboard?.metrics?.conversionRate || 0)}%`],
    ['Published', state.dashboard?.metrics?.publishedArticles || 0],
    ['Scheduled', state.dashboard?.metrics?.scheduledArticles || 0],
  ];

  elements.adminMetrics.innerHTML = metrics
    .map(
      ([label, value]) => `
        <article class="metric-card-admin">
          <strong>${escapeHtml(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </article>
      `,
    )
    .join('');
}

function renderTimeline() {
  const timeline = state.dashboard?.timeline || [];
  if (!timeline.length) {
    elements.timelineChart.innerHTML = '<div class="list-row"><div class="helper-note">No timeline data yet.</div></div>';
    return;
  }

  const maxPageViews = Math.max(...timeline.map((item) => item.pageViews), 1);
  elements.timelineChart.innerHTML = timeline
    .map((item) => {
      const width = Math.max(8, Math.round((item.pageViews / maxPageViews) * 100));
      return `
        <div class="timeline-bar">
          <div class="timeline-track">
            <strong>${escapeHtml(formatShortDate(item.date))}</strong>
            <div>
              <div class="timeline-fill" style="width:${width}%"></div>
              <div class="helper-note">
                Views ${escapeHtml(item.pageViews)} · Signups ${escapeHtml(item.signups)} · Upgrades ${escapeHtml(item.upgrades)} · Revenue $${escapeHtml(item.revenue)}
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderBarList(container, items, labelKey, valueKey) {
  if (!items.length) {
    container.innerHTML = '<div class="list-row"><div class="helper-note">Nothing to show yet.</div></div>';
    return;
  }

  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);
  container.innerHTML = items
    .map((item) => {
      const value = Number(item[valueKey] || 0);
      const width = Math.max(10, Math.round((value / maxValue) * 100));
      return `
        <div class="list-row">
          <div>
            <strong>${escapeHtml(item[labelKey])}</strong>
            <div class="helper-note">${escapeHtml(value)}</div>
          </div>
          <div class="bar-swatch">
            <div class="timeline-fill" style="width:${width}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderCoupons() {
  const coupons = state.dashboard?.coupons || [];
  if (!coupons.length) {
    elements.couponList.innerHTML = '<div class="list-row"><div class="helper-note">No coupons yet.</div></div>';
    return;
  }

  elements.couponList.innerHTML = coupons
    .map(
      (coupon) => `
        <div class="list-row">
          <div>
            <strong>${escapeHtml(coupon.code)}</strong>
            <div class="helper-note">${escapeHtml(coupon.discountPercent)}% off · ${escapeHtml(coupon.planScope)}</div>
          </div>
          <button class="button secondary" type="button" data-toggle-coupon="${coupon.id}">
            ${coupon.active ? 'Disable' : 'Enable'}
          </button>
        </div>
      `,
    )
    .join('');
}

function renderSettings() {
  const settings = state.dashboard?.settings || {};
  elements.siteNameInput.value = settings.siteName || '';
  elements.siteDomainInput.value = settings.siteDomain || '';
  elements.supportEmailInput.value = settings.supportEmail || '';
  elements.openAiKeyInput.value = settings.openAiKey || '';
  elements.claudeKeyInput.value = settings.claudeKey || '';
  elements.marketauxKeyInput.value = settings.marketauxKey || '';
  elements.newsApiKeyInput.value = settings.newsApiKey || '';
  elements.finnhubKeyInput.value = settings.finnhubKey || '';
  elements.stripeRegularMonthlyInput.value = settings.stripeRegularMonthly || '';
  elements.stripeRegularAnnualInput.value = settings.stripeRegularAnnual || '';
  elements.stripePremiumMonthlyInput.value = settings.stripePremiumMonthly || '';
  elements.stripePremiumAnnualInput.value = settings.stripePremiumAnnual || '';
  elements.writerAModelInput.value = settings.writerAModel || '';
  elements.writerBModelInput.value = settings.writerBModel || '';
}

function renderBusinessSettings() {
  const settings = state.businessSettings || {};
  if (!settings.plans) {
    elements.businessPlansEditor.innerHTML = '<div class="list-row"><div class="helper-note">Owner Controls need the updated server files before this section can save.</div></div>';
    elements.newsPriorityEditor.innerHTML = '';
    elements.businessSettingsMessage.textContent =
      state.businessSettingsLoadError || 'Upload the updated server files, then restart the website.';
    return;
  }

  const plans = settings.plans || {};
  const env = state.ownerEnvSettings || {};
  const coupons = settings.coupons || {};

  elements.businessPlansEditor.innerHTML = Object.values(plans)
    .map((plan) => renderPlanEditor(plan))
    .join('');

  elements.ownerOpenAiKeyInput.value = env.OPENAI_API_KEY || '';
  elements.ownerClaudeKeyInput.value = env.CLAUDE_API_KEY || '';
  elements.ownerMarketauxKeyInput.value = env.MARKETAUX_API_KEY || '';
  elements.ownerNewsApiKeyInput.value = env.NEWSAPI_KEY || '';
  elements.ownerFinnhubKeyInput.value = env.FINNHUB_API_KEY || '';
  elements.ownerCheckoutFreeInput.value = env.CHECKOUT_FREE_URL || '';
  elements.ownerStripeRegularMonthlyInput.value = env.STRIPE_REGULAR_MONTHLY_URL || '';
  elements.ownerStripeRegularAnnualInput.value = env.STRIPE_REGULAR_ANNUAL_URL || '';
  elements.ownerStripePremiumMonthlyInput.value = env.STRIPE_PREMIUM_MONTHLY_URL || '';
  elements.ownerStripePremiumAnnualInput.value = env.STRIPE_PREMIUM_ANNUAL_URL || '';
  elements.ownerMaxDiscountInput.value = coupons.maxDiscountPercent || 100;
  elements.ownerDefaultCouponScopeSelect.value = coupons.defaultPlanScope || 'all';

  renderPriorityEditor(settings.newsPriority || {});
}

function renderPlanEditor(plan) {
  const monthlyOption = (plan.billingOptions || []).find((option) => option.id.includes('monthly')) || {};
  const annualOption = (plan.billingOptions || []).find((option) => option.id.includes('annual')) || {};

  return `
    <article class="owner-plan-card" data-owner-plan="${escapeHtml(plan.id)}">
      <div class="inventory-meta">
        <strong>${escapeHtml(plan.name)}</strong>
        <span class="subtle-chip">${escapeHtml(plan.id)}</span>
      </div>
      <div class="form-grid">
        <label>
          Display name
          <input data-plan-field="name" value="${escapeAttribute(plan.name)}" />
        </label>
        <label>
          Short name
          <input data-plan-field="shortName" value="${escapeAttribute(plan.shortName)}" />
        </label>
      </div>
      <div class="form-grid">
        <label>
          Main price label
          <input data-plan-field="priceLabel" value="${escapeAttribute(plan.priceLabel)}" placeholder="$10" />
        </label>
        <label>
          Billing label
          <input data-plan-field="billingLabel" value="${escapeAttribute(plan.billingLabel)}" placeholder="/month or $99/year" />
        </label>
      </div>
      <label>
        Tagline
        <input data-plan-field="tagline" value="${escapeAttribute(plan.tagline)}" />
      </label>
      <div class="form-grid">
        <label>
          Monthly button price
          <input data-plan-option="${escapeHtml(monthlyOption.id || '')}" data-option-field="priceText" value="${escapeAttribute(monthlyOption.priceText || '')}" />
        </label>
        <label>
          Yearly button price
          <input data-plan-option="${escapeHtml(annualOption.id || '')}" data-option-field="priceText" value="${escapeAttribute(annualOption.priceText || '')}" />
        </label>
      </div>
      <div class="form-grid">
        <label>
          Article limit
          <input data-plan-field="articleLimit" type="number" min="1" value="${escapeAttribute(plan.articleLimit)}" />
        </label>
        <label>
          Learning limit
          <input data-plan-field="learningLimit" type="number" min="0" value="${escapeAttribute(plan.learningLimit)}" />
        </label>
      </div>
      <label>
        Feature list
        <textarea data-plan-field="features">${escapeHtml((plan.features || []).join('\n'))}</textarea>
      </label>
    </article>
  `;
}

function renderPriorityEditor(priority) {
  const rows = [
    ['Urgency high', 'urgencyWeights', 'high'],
    ['Urgency medium', 'urgencyWeights', 'medium'],
    ['Stocks', 'assetWeights', 'equities'],
    ['Bonds', 'assetWeights', 'fixed-income'],
    ['Commodities', 'assetWeights', 'commodities'],
    ['Crypto', 'assetWeights', 'crypto'],
    ['Global', 'regionWeights', 'global'],
    ['MENA', 'regionWeights', 'mena'],
    ['India', 'regionWeights', 'india'],
    ['Free articles', 'accessTierWeights', 'free'],
    ['Regular articles', 'accessTierWeights', 'regular'],
    ['Premium articles', 'accessTierWeights', 'premium'],
    ['Dr MoneyWise Desk', 'sourceWeights', 'Dr MoneyWise Desk'],
    ['Marketaux', 'sourceWeights', 'Marketaux'],
    ['NewsAPI', 'sourceWeights', 'NewsAPI'],
    ['Freshness hours', 'freshnessHalfLifeHours', ''],
  ];

  elements.newsPriorityEditor.innerHTML = rows
    .map(([label, group, key]) => {
      const value = key ? priority[group]?.[key] : priority[group];
      return `
        <label>
          ${escapeHtml(label)}
          <input type="number" min="0" data-priority-group="${escapeHtml(group)}" data-priority-key="${escapeHtml(key)}" value="${escapeAttribute(value || 0)}" />
        </label>
      `;
    })
    .join('');
}

function renderArticleInventory() {
  if (!state.articles.length) {
    elements.articleInventory.innerHTML = '<div class="list-row"><div class="helper-note">No articles yet.</div></div>';
    return;
  }

  elements.articleInventory.innerHTML = state.articles
    .slice(0, 12)
    .map(
      (article) => `
        <article class="inventory-card">
          <div class="inventory-meta">
            <div class="chip-row">
              <span class="tag">${escapeHtml(article.contentType)}</span>
              <span class="tag">${escapeHtml(article.accessTier)}</span>
              <span class="tag">${escapeHtml(article.status)}</span>
            </div>
            <span class="subtle-chip">${escapeHtml(formatShortDateTime(article.publishAt))}</span>
          </div>
          <h3>${escapeHtml(article.headline)}</h3>
          <p>${escapeHtml(article.summary || article.plainEnglish || 'No summary yet.')}</p>
          <div class="button-row">
            ${
              article.status !== 'published'
                ? `<button class="button primary" type="button" data-publish-article="${article.id}">Publish now</button>`
                : ''
            }
            <a class="button secondary" href="/article.html?slug=${encodeURIComponent(article.slug)}" target="_blank" rel="noopener">View</a>
            <button class="button secondary" type="button" data-delete-article="${article.id}">Delete</button>
          </div>
        </article>
      `,
    )
    .join('');
}

function renderMemberInventory() {
  const members = state.users.filter((user) => user.role !== 'admin');
  if (!members.length) {
    elements.memberInventory.innerHTML = '<div class="list-row"><div class="helper-note">No members yet.</div></div>';
    return;
  }

  elements.memberInventory.innerHTML = members
    .slice(0, 12)
    .map(
      (user) => `
        <article class="inventory-card" data-member-card="${user.id}">
          <div class="inventory-meta">
            <strong>${escapeHtml(user.name)}</strong>
            <span class="subtle-chip">${escapeHtml(user.email)}</span>
          </div>
          <p>${escapeHtml(getLookupLabel(state.bootstrap.regions, user.region))} · ${escapeHtml((user.interests || []).map((interest) => getLookupLabel(state.bootstrap.interests, interest)).join(', '))}</p>
          <div class="form-grid">
            <label>
              Plan
              <select data-plan-select="${user.id}">
                ${renderPlanOptions(user.plan)}
              </select>
            </label>
            <label>
              Billing
              <select data-billing-select="${user.id}">
                <option value="monthly" ${user.billingCycle !== 'annual' ? 'selected' : ''}>Monthly</option>
                <option value="annual" ${user.billingCycle === 'annual' ? 'selected' : ''}>Annual</option>
              </select>
            </label>
          </div>
          <div class="button-row">
            <button class="button primary" type="button" data-save-plan="${user.id}">Save membership</button>
          </div>
        </article>
      `,
    )
    .join('');
}

async function handleAdminLogin(event) {
  event.preventDefault();

  try {
    const session = await apiPost(
      '/api/auth/login',
      {
        email: elements.adminEmailInput.value.trim(),
        password: elements.adminPasswordInput.value.trim(),
      },
      { allowGuest: true },
    );

    if (session.user?.role !== 'admin') {
      throw new Error('This account does not have admin access.');
    }

    state.token = session.token;
    writeJsonStorage(SESSION_KEY, { token: session.token, expiresAt: session.expiresAt });
    await loadAdminData();
    showAdminPanel();
  } catch (error) {
    showLogin(error.message || 'Could not sign in.');
  }
}

async function handleAdminSignOut() {
  try {
    await apiPost('/api/auth/logout', {});
  } catch (error) {
    console.error(error);
  }

  clearSession();
  showLogin('Signed out.');
}

async function handleCreateDraft(event) {
  event.preventDefault();
  elements.adminDraftMessage.textContent = 'Creating article...';

  try {
    const publishAt = elements.topicPublishInput.value ? new Date(elements.topicPublishInput.value).toISOString() : '';
    const status = getPublishingStatus(publishAt);

    await apiPost('/api/admin/learning/generate', {
      topic: elements.topicInput.value.trim(),
      accessTier: elements.topicAccessSelect.value,
      region: elements.topicRegionSelect.value,
      interest: elements.topicInterestSelect.value,
      publishAt: publishAt || new Date().toISOString(),
      status,
    });

    elements.learningDraftForm.reset();
    elements.adminDraftMessage.textContent =
      status === 'draft'
        ? 'Draft created.'
        : status === 'scheduled'
          ? 'Article scheduled.'
          : 'Article published.';
    await loadAdminData();
  } catch (error) {
    elements.adminDraftMessage.textContent = error.message || 'Could not create the article.';
  }
}

async function handleCreateCoupon(event) {
  event.preventDefault();

  try {
    await apiPost('/api/admin/coupons', {
      code: elements.couponCodeInput.value.trim(),
      discountPercent: Number(elements.couponPercentInput.value || 0),
      planScope: elements.couponScopeSelect.value,
    });

    elements.couponForm.reset();
    elements.adminCouponMessage.textContent = 'Coupon created.';
    await loadAdminData();
  } catch (error) {
    elements.adminCouponMessage.textContent = error.message || 'Could not create coupon.';
  }
}

async function handleCouponActions(event) {
  const button = event.target.closest('[data-toggle-coupon]');
  if (!button) {
    return;
  }

  await apiPost('/api/admin/coupons/toggle', {
    id: button.dataset.toggleCoupon,
  });
  await loadAdminData();
}

async function handleSaveSettings(event) {
  event.preventDefault();
  elements.settingsMessage.textContent = 'Saving settings...';

  try {
    const dashboard = await apiPost('/api/admin/settings', {
      siteName: elements.siteNameInput.value.trim(),
      siteDomain: elements.siteDomainInput.value.trim(),
      supportEmail: elements.supportEmailInput.value.trim(),
      openAiKey: elements.openAiKeyInput.value.trim(),
      claudeKey: elements.claudeKeyInput.value.trim(),
      marketauxKey: elements.marketauxKeyInput.value.trim(),
      newsApiKey: elements.newsApiKeyInput.value.trim(),
      finnhubKey: elements.finnhubKeyInput.value.trim(),
      stripeRegularMonthly: elements.stripeRegularMonthlyInput.value.trim(),
      stripeRegularAnnual: elements.stripeRegularAnnualInput.value.trim(),
      stripePremiumMonthly: elements.stripePremiumMonthlyInput.value.trim(),
      stripePremiumAnnual: elements.stripePremiumAnnualInput.value.trim(),
      writerAModel: elements.writerAModelInput.value.trim(),
      writerBModel: elements.writerBModelInput.value.trim(),
    });

    state.dashboard = dashboard;
    renderDashboard();
    elements.settingsMessage.textContent = 'Settings saved.';
  } catch (error) {
    elements.settingsMessage.textContent = error.message || 'Could not save settings.';
  }
}

async function loadAndRenderBusinessSettings() {
  elements.businessSettingsMessage.textContent = 'Reloading owner controls...';
  try {
    const payload = await apiGet('/api/admin/business-settings');
    state.businessSettings = payload.businessSettings;
    state.ownerEnvSettings = payload.envSettings;
    renderBusinessSettings();
    elements.businessSettingsMessage.textContent = 'Owner controls reloaded.';
  } catch (error) {
    elements.businessSettingsMessage.textContent = error.message || 'Could not reload owner controls.';
  }
}

async function handleSaveBusinessSettings(event) {
  event.preventDefault();
  elements.businessSettingsMessage.textContent = 'Saving owner controls...';

  try {
    const payload = await apiPost('/api/admin/business-settings', {
      businessSettings: collectBusinessSettings(),
      envSettings: collectOwnerEnvSettings(),
    });

    state.businessSettings = payload.businessSettings;
    state.ownerEnvSettings = payload.envSettings;
    await loadBootstrap();
    populateSelectors();
    renderBusinessSettings();
    elements.businessSettingsMessage.textContent = 'Owner controls saved. Refresh the public site to see changes.';
  } catch (error) {
    elements.businessSettingsMessage.textContent = error.message || 'Could not save owner controls.';
  }
}

function collectBusinessSettings() {
  const current = structuredClone(state.businessSettings || {});
  current.plans = current.plans || {};

  for (const card of elements.businessPlansEditor.querySelectorAll('[data-owner-plan]')) {
    const planId = card.dataset.ownerPlan;
    const plan = current.plans[planId] || { id: planId, billingOptions: [] };

    for (const input of card.querySelectorAll('[data-plan-field]')) {
      const field = input.dataset.planField;
      plan[field] = input.type === 'number' ? Number(input.value || 0) : input.value.trim();
      if (field === 'features') {
        plan[field] = input.value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
      }
    }

    for (const input of card.querySelectorAll('[data-plan-option]')) {
      const optionId = input.dataset.planOption;
      if (!optionId) {
        continue;
      }

      const option = (plan.billingOptions || []).find((entry) => entry.id === optionId);
      if (option) {
        option[input.dataset.optionField] = input.value.trim();
      }
    }

    current.plans[planId] = plan;
  }

  current.coupons = {
    ...(current.coupons || {}),
    maxDiscountPercent: Number(elements.ownerMaxDiscountInput.value || 100),
    defaultPlanScope: elements.ownerDefaultCouponScopeSelect.value,
  };

  current.newsPriority = collectPrioritySettings(current.newsPriority || {});
  return current;
}

function collectPrioritySettings(currentPriority) {
  const priority = structuredClone(currentPriority);

  for (const input of elements.newsPriorityEditor.querySelectorAll('[data-priority-group]')) {
    const group = input.dataset.priorityGroup;
    const key = input.dataset.priorityKey;
    const value = Number(input.value || 0);

    if (key) {
      priority[group] = priority[group] || {};
      priority[group][key] = value;
    } else {
      priority[group] = value;
    }
  }

  return priority;
}

function collectOwnerEnvSettings() {
  return {
    OPENAI_API_KEY: elements.ownerOpenAiKeyInput.value.trim(),
    CLAUDE_API_KEY: elements.ownerClaudeKeyInput.value.trim(),
    MARKETAUX_API_KEY: elements.ownerMarketauxKeyInput.value.trim(),
    NEWSAPI_KEY: elements.ownerNewsApiKeyInput.value.trim(),
    FINNHUB_API_KEY: elements.ownerFinnhubKeyInput.value.trim(),
    CHECKOUT_FREE_URL: elements.ownerCheckoutFreeInput.value.trim(),
    STRIPE_REGULAR_MONTHLY_URL: elements.ownerStripeRegularMonthlyInput.value.trim(),
    STRIPE_REGULAR_ANNUAL_URL: elements.ownerStripeRegularAnnualInput.value.trim(),
    STRIPE_PREMIUM_MONTHLY_URL: elements.ownerStripePremiumMonthlyInput.value.trim(),
    STRIPE_PREMIUM_ANNUAL_URL: elements.ownerStripePremiumAnnualInput.value.trim(),
  };
}

async function handleArticleActions(event) {
  const deleteButton = event.target.closest('[data-delete-article]');
  if (deleteButton) {
    await apiDelete(`/api/admin/articles?id=${encodeURIComponent(deleteButton.dataset.deleteArticle)}`);
    await loadAdminData();
    return;
  }

  const publishButton = event.target.closest('[data-publish-article]');
  if (publishButton) {
    const article = state.articles.find((item) => item.id === publishButton.dataset.publishArticle);
    if (!article) {
      return;
    }

    await apiPost('/api/admin/articles', {
      ...article,
      status: 'published',
      publishAt: new Date().toISOString(),
    });
    await loadAdminData();
  }
}

async function handleMemberActions(event) {
  const saveButton = event.target.closest('[data-save-plan]');
  if (!saveButton) {
    return;
  }

  const userId = saveButton.dataset.savePlan;
  const plan = document.querySelector(`[data-plan-select="${userId}"]`)?.value || 'free';
  const billingCycle = document.querySelector(`[data-billing-select="${userId}"]`)?.value || 'monthly';

  await apiPost('/api/admin/users/plan', {
    userId,
    plan,
    billingCycle,
  });
  await loadAdminData();
}

function showAdminPanel() {
  elements.adminLoginPanel.classList.add('hidden');
  elements.adminPanel.classList.remove('hidden');
  elements.adminSignOutButton.classList.remove('hidden');
  elements.adminLoginMessage.textContent = '';
}

function showLogin(message = '') {
  elements.adminLoginPanel.classList.remove('hidden');
  elements.adminPanel.classList.add('hidden');
  elements.adminSignOutButton.classList.add('hidden');
  elements.adminLoginMessage.textContent = message;
}

function clearSession() {
  state.token = '';
  window.localStorage.removeItem(SESSION_KEY);
}

function renderPlanOptions(selectedPlan) {
  return (state.bootstrap?.plans || [])
    .map((plan) => `<option value="${plan.id}" ${plan.id === selectedPlan ? 'selected' : ''}>${plan.name}</option>`)
    .join('');
}

function getPublishingStatus(publishAt) {
  if (!publishAt) {
    return 'draft';
  }

  return new Date(publishAt).getTime() > Date.now() ? 'scheduled' : 'published';
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

async function apiDelete(url) {
  return requestJson(url, {
    method: 'DELETE',
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

  const rawPayload = await response.text();
  let payload = {};
  if (rawPayload.trim()) {
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      throw new Error('The server replied with unreadable data. Refresh the page and try again.');
    }
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
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

function formatShortDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatShortDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
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
  return escapeHtml(value);
}
