/* ════════════════════════════════════════════════════════════════════════
   Membership page (runs in the browser):
   • tabs: Your plan / Your profile / Plans & prices (signed-in readers)
   • "Your plan": status, renewal or end date, Manage my plan
   • "Your profile": optional questions, saved to the account
   • plan buttons start Stripe checkout (with coupon)
   • after Stripe: confirms the payment and shows a green or red message
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  let token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  /** kind: 'ok' (green, bold), 'bad' (red, bold) or '' (plain) */
  const msg = (text, kind = '') => {
    const m = $('mbMessage');
    if (!m) return;
    m.textContent = text || '';
    m.className = `mb-message${kind ? ` ${kind}` : ''}`;
  };
  const api = async (url, body, method = 'POST') => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-session-token': token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}).`);
    return data;
  };
  const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const PLAN_NAMES = { free: 'Free', regular: 'Plus', premium: 'Pro' };
  let me = null;
  let coupon = '';
  let via = ''; let promo = '';

  /* ── Tabs ── */
  function showTab(name) {
    document.querySelectorAll('.mb-tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    document.querySelectorAll('.mb-pane').forEach((p) => { p.hidden = p.dataset.pane !== name; });
    try { sessionStorage.setItem('dmw-mb-tab', name); } catch (e) { /* ignore */ }
  }
  document.querySelectorAll('.mb-tabs [data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

  /* ── Your plan ── */
  function renderMyPlan() {
    const box = $('myPlan');
    if (!box || !me) return;
    if (me.role === 'admin') {
      box.innerHTML = '<div><h2>You are signed in as admin</h2><p>Admin has full access. To test payments, sign in with a member account in a private window.</p></div>';
      return;
    }
    const plan = me.plan || 'free';
    const paid = plan !== 'free';
    let status;
    if (!paid) status = 'You are on the free plan. See <a href="#" data-goto="plans">Plans &amp; prices</a> for the deeper look on every company.';
    else if (me.planStatus === 'cancelling') status = `<strong>Cancelled.</strong> Your membership ends on <strong>${esc(day(me.planRenewsAt)) || 'the last day of your billing period'}</strong>. You keep full access until then and will not be charged again.`;
    else if (me.planStatus === 'trialing') status = `<strong>Free trial.</strong> Everything in ${esc(PLAN_NAMES[plan] || plan)} is unlocked. Your first payment is on <strong>${esc(day(me.trialEndsAt || me.planRenewsAt)) || 'the day the trial ends'}</strong>. Cancel before then in “Manage my plan” and you pay nothing.`;
    else if (me.planStatus === 'past_due') status = '<strong>Your last payment did not go through.</strong> Please update your card in "Manage my plan" to keep your membership.';
    else status = `<strong>Active.</strong> ${me.planRenewsAt ? `Renews on <strong>${esc(day(me.planRenewsAt))}</strong> (${me.billingCycle === 'annual' ? 'yearly' : 'monthly'}).` : 'Renews automatically.'}`;
    box.innerHTML = `
      <div>
        <h2>${esc(PLAN_NAMES[plan] || plan)}</h2>
        <p>${status}</p>
      </div>
      ${me.hasBillingAccount ? `<button type="button" class="mb-btn gold" id="mbManage">${paid ? 'Manage my plan' : 'Billing history'}</button>` : ''}`;
    $('mbManage')?.addEventListener('click', async () => {
      msg('Opening your billing page…');
      try { location.href = (await api('/api/billing/portal', {})).url; } catch (err) { msg(err.message, 'bad'); }
    });
    box.querySelector('[data-goto]')?.addEventListener('click', (e) => { e.preventDefault(); showTab('plans'); });

    document.querySelectorAll('[data-plan-card]').forEach((card) => {
      const actions = card.querySelector('[data-plan-actions]');
      if (!actions) return;
      if (card.dataset.planCard === plan) {
        card.classList.add('current');
        actions.innerHTML = '<span class="mb-current">Your current plan</span>';
      } else if (paid && card.dataset.planCard !== 'free' && me.planStatus !== 'cancelling') {
        actions.innerHTML = '<span class="mb-muted">To switch, cancel your current plan first, then choose this one when it ends.</span>';
      } else if (card.dataset.planCard === 'free') {
        actions.innerHTML = '';
      }
    });
  }

  /* ── Your emails ── */
  var EMAILS = [
    ['welcome', 'Getting-started emails', 'Five short emails in your first ten days, each showing one useful part of the site.', 'free'],
    ['newsletter', 'Saturday newsletter', 'Every Saturday morning: the week’s company news, charts and lessons. Pro members get an extra section with their own portfolio and companies.', 'free'],
    ['dividends', 'Dividend alerts', 'When a company on your watchlist raises, cuts, starts or stops its dividend.', 'regular'],
    ['charts', 'Chart alerts', 'When a chart sign appears on a company in your watchlist or portfolio: golden or death cross, RSI above 70 or below 30, a new 52-week high or low.', 'premium'],
    ['funds', 'Big-fund alerts', 'When a famous fund buys or sells a company on your watchlist (each quarter).', 'premium'],
    ['report', 'Monthly research report', 'On the 1st of each month: the month in figures, with a link to the full report.', 'premium'],
  ];
  function renderEmails() {
    const box = $('myEmails');
    if (!box || !me) return;
    const level = { free: 0, regular: 1, premium: 2 };
    const mine = me.role === 'admin' ? 2 : (level[me.plan] || 0);
    const prefs = me.emailPrefs || {};
    box.innerHTML = `<h2>Your emails</h2><p class="mb-lead">Sent to ${esc(me.email || 'your email')}. Every email also has a one-click unsubscribe link.</p>
      <div class="mb-email-list">${EMAILS.map(([id, name, about, need]) => {
        const allowed = mine >= level[need];
        const on = allowed && prefs[id] !== false;
        return `<label class="mb-email${allowed ? '' : ' locked'}"><input type="checkbox" data-email="${id}" ${on ? 'checked' : ''} ${allowed ? '' : 'disabled'}><span><div><strong>${esc(name)}</strong>${allowed ? '' : ` <em>${need === 'premium' ? 'Pro' : 'Plus and Pro'}</em>`}</div><small>${esc(about)}</small></span></label>`;
      }).join('')}</div>
      ${(me.watchlist || []).length ? '' : '<p class="mb-small" style="text-align:left">Tip: alerts are about the companies on your watchlist. <a href="/#tools">Add some companies</a>.</p>'}
      <span class="mb-saved" role="status" aria-live="polite"></span>`;
    box.hidden = false;
    box.querySelectorAll('[data-email]').forEach((input) => input.addEventListener('change', async () => {
      const saved = box.querySelector('.mb-saved');
      const body = {};
      box.querySelectorAll('[data-email]:not([disabled])').forEach((x) => { body[x.dataset.email] = x.checked; });
      saved.textContent = 'Saving…'; saved.className = 'mb-saved';
      try { me = (await api('/api/member/email-prefs', body)).user || me; saved.textContent = '✓ Saved'; saved.className = 'mb-saved ok'; } catch (err) { saved.textContent = err.message; saved.className = 'mb-saved bad'; }
    }));
  }

  /* ── Your profile ── */
  function fillProfile() {
    const form = $('profileForm');
    if (!form || !me) return;
    const p = me.profile || {};
    form.querySelector('[name=name]').value = me.name || '';
    for (const el of form.querySelectorAll('select')) el.value = p[el.name] || '';
    const multi = { goals: p.goals || [], interests: p.interests || me.interests || [], regions: p.regions || me.regions || [] };
    for (const box of form.querySelectorAll('input[type=checkbox]')) box.checked = (multi[box.name] || []).includes(box.value);
    // "Other" → show a typing box
    const others = [...form.querySelectorAll('[data-other-for]')];
    const otherPicked = (name) => {
      const sel = form.querySelector(`select[name=${name}]`);
      if (sel) return sel.value === 'other';
      return Boolean(form.querySelector(`input[name=${name}][value=other]:checked`));
    };
    const syncOthers = (focusName) => {
      for (const box of others) {
        const show = otherPicked(box.dataset.otherFor);
        box.hidden = !show;
        if (show && focusName === box.dataset.otherFor) box.focus();
      }
    };
    for (const box of others) box.value = p[`${box.dataset.otherFor}Other`] || '';
    syncOthers();
    form.addEventListener('change', (e) => { if (e.target.name && !e.target.name.endsWith('Other')) syncOthers(e.target.name); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saved = form.querySelector('.mb-saved');
      const data = { name: form.querySelector('[name=name]').value };
      for (const el of form.querySelectorAll('select')) data[el.name] = el.value;
      for (const name of ['goals', 'interests', 'regions']) data[name] = [...form.querySelectorAll(`input[name=${name}]:checked`)].map((b) => b.value);
      for (const box of others) data[box.name] = box.hidden ? '' : box.value.trim();
      saved.textContent = 'Saving…';
      saved.className = 'mb-saved';
      try {
        me = (await api('/api/member/about-me', data)).user || me;
        saved.textContent = '✓ Saved. Thank you!';
        saved.className = 'mb-saved ok';
      } catch (err) { saved.textContent = err.message; saved.className = 'mb-saved bad'; }
    });
  }

  /* ── Start ── */
  async function load() {
    const params = new URLSearchParams(location.search);
    const outcome = params.get('checkout');
    if (token) {
      try { me = (await api('/api/billing/status', null, 'GET')).user || null; } catch (e) { me = null; }
    }
    if (outcome === 'success' && params.get('session_id') && me) {
      msg('Confirming your payment…');
      try {
        const r = await api('/api/billing/confirm', { sessionId: params.get('session_id') });
        if (r.user) me = r.user;
        if (r.upgraded) msg(r.user && r.user.planStatus === 'trialing' ? `Your free trial has started. Everything in Pro is unlocked. You can cancel any time before ${new Date(r.user.trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} and pay nothing.` : `Payment accepted. Thank you! You're now on ${PLAN_NAMES[r.planId] || r.planId} and everything it includes is unlocked.`, 'ok');
        else msg(r.message || 'Your payment is processing. Your plan will update shortly.');
      } catch (err) { msg(`${err.message} If you were charged, your plan will update within a few minutes.`, 'bad'); }
    } else if (outcome === 'cancelled') {
      msg('Checkout was cancelled. You have not been charged.', 'bad');
    } else if (params.get('from') === 'portal') {
      msg('Your plan details are up to date.', 'ok');
    }
    // Arrived from the offer pop-up: remember it and fill in the code
    let src = params.get('src') || '';
    let savedCode = '';
    if (!params.get('coupon')) {
      try { const o = JSON.parse(localStorage.getItem('dmw-offer') || 'null'); if (o && o.until >= new Date().toISOString().slice(0, 10)) { savedCode = o.code; src = o.src; } } catch (e) { /* ignore */ }
    }
    if (/^popup-[a-f0-9]{8}$/.test(src)) { via = 'popup'; promo = src.slice(6); }
    const offerCode = params.get('coupon') || savedCode;
    if (offerCode && $('mbCoupon')) { $('mbCoupon').value = offerCode.toUpperCase().replace(/[^A-Z0-9]/g, ''); setTimeout(() => $('mbCouponBtn')?.click(), 50); }
    if (outcome || params.get('from') || params.get('coupon')) history.replaceState({}, '', '/membership' + (location.hash || ''));
    // A member who has had the free trial already doesn't see the trial wording
    if (me && me.trialUsed) document.querySelectorAll('[data-trial-note],[data-trial-word]').forEach((el) => el.remove());

    if (me) {
      document.querySelector('.mb-tabs').hidden = false;
      renderMyPlan();
      renderEmails();
      fillProfile();
      let tab = 'plan';
      try { tab = sessionStorage.getItem('dmw-mb-tab') || 'plan'; } catch (e) { /* ignore */ }
      if (location.hash === '#profile') tab = 'profile';
      if (location.hash === '#plans') tab = 'plans';
      showTab(tab);
    }
  }

  /* ── Buy buttons ── */
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-plan-id]');
    if (!btn) return;
    if (!me) { msg('Please create a free account or sign in first, then come back to choose a plan.', 'bad'); setTimeout(() => { location.href = '/#join'; }, 1200); return; }
    if (me.role === 'admin') { msg('You are signed in as admin. Use a member account to subscribe.', 'bad'); return; }
    btn.disabled = true;
    msg('Opening secure checkout…');
    try {
      location.href = (await api('/api/billing/checkout', { planId: btn.dataset.planId, billingCycle: btn.dataset.cycle, couponCode: coupon, via, promo })).url;
    } catch (err) { msg(err.message, 'bad'); btn.disabled = false; }
  });

  /* ── Coupon ── */
  $('mbCouponBtn')?.addEventListener('click', async () => {
    const code = ($('mbCoupon')?.value || '').trim().toUpperCase();
    document.querySelectorAll('[data-coupon-note]').forEach((n) => { n.textContent = ''; });
    if (!code) { coupon = ''; msg(''); return; }
    try {
      const results = await Promise.all(['regular', 'premium'].map((planId) => api('/api/site/coupons/validate', { code, planId }).then((r) => [planId, r])));
      let any = false;
      for (const [planId, r] of results) {
        if (r.valid) {
          any = true;
          const note = document.querySelector(`[data-coupon-note="${planId}"]`);
          if (note) note.textContent = `With ${code}: $${Number(r.adjustedMonthly).toFixed(2)}/month or $${Number(r.adjustedAnnual).toFixed(2)}/year${r.duration === 'once' ? ' for your first payment' : ''}`;
        }
      }
      coupon = any ? code : '';
      msg(any ? `Coupon ${code} applied. It will be used at checkout.` : 'That coupon code is not valid.', any ? 'ok' : 'bad');
    } catch (err) { msg(err.message, 'bad'); }
  });

  load();
}());
