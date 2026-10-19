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
  const PLAN_NAMES = { free: 'Free', regular: 'Paid Regular', premium: 'Paid Premium' };
  let me = null;
  let coupon = '';

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
        if (r.upgraded) msg(`Payment accepted. Thank you! You're now on ${PLAN_NAMES[r.planId] || r.planId} and everything it includes is unlocked.`, 'ok');
        else msg(r.message || 'Your payment is processing. Your plan will update shortly.');
      } catch (err) { msg(`${err.message} If you were charged, your plan will update within a few minutes.`, 'bad'); }
    } else if (outcome === 'cancelled') {
      msg('Checkout was cancelled. You have not been charged.', 'bad');
    } else if (params.get('from') === 'portal') {
      msg('Your plan details are up to date.', 'ok');
    }
    if (outcome || params.get('from')) history.replaceState({}, '', '/membership');

    if (me) {
      document.querySelector('.mb-tabs').hidden = false;
      renderMyPlan();
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
      location.href = (await api('/api/billing/checkout', { planId: btn.dataset.planId, billingCycle: btn.dataset.cycle, couponCode: coupon })).url;
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
          if (note) note.textContent = `With ${code}: $${Number(r.adjustedMonthly).toFixed(2)}/month or $${Number(r.adjustedAnnual).toFixed(2)}/year`;
        }
      }
      coupon = any ? code : '';
      msg(any ? `Coupon ${code} applied. It will be used at checkout.` : 'That coupon code is not valid.', any ? 'ok' : 'bad');
    } catch (err) { msg(err.message, 'bad'); }
  });

  load();
}());
