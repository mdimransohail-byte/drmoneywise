/* ════════════════════════════════════════════════════════════════════════
   Membership page (runs in the browser):
   • shows "Your plan" (plan, status, renewal/end date, Manage my plan)
   • starts Stripe checkout from the plan buttons (with coupon)
   • after returning from Stripe, confirms the payment and refreshes
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  let token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  const $ = (id) => document.getElementById(id);
  const msg = (text) => { const m = $('mbMessage'); if (m) m.textContent = text || ''; };
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  function renderMyPlan() {
    const box = $('myPlan');
    if (!box) return;
    box.hidden = false;
    if (!me) {
      box.innerHTML = `<div><h2>Your plan</h2><p>Sign in to see or manage your membership.</p></div><a class="mb-btn navy" href="/#join">Sign in or create a free account</a>`;
      return;
    }
    if (me.role === 'admin') {
      box.innerHTML = '<div><h2>Your plan</h2><p>You are signed in as admin (full access). To test payments, sign in with a member account in a private window.</p></div>';
      return;
    }
    const plan = me.plan || 'free';
    const paid = plan !== 'free';
    let status = '';
    if (!paid) status = 'You are on the free plan. Upgrade below for the deeper look on every company.';
    else if (me.planStatus === 'cancelling') status = `<strong>Cancelled.</strong> Your membership ends on <strong>${esc(day(me.planRenewsAt)) || 'the last day of your billing period'}</strong>. You keep full access until then and will not be charged again.`;
    else if (me.planStatus === 'past_due') status = '<strong>Your last payment did not go through.</strong> Please update your card in "Manage my plan" to keep your membership.';
    else status = `<strong>Active.</strong> ${me.planRenewsAt ? `Renews on <strong>${esc(day(me.planRenewsAt))}</strong>${me.billingCycle ? ` (${me.billingCycle === 'annual' ? 'yearly' : 'monthly'})` : ''}.` : 'Renews automatically.'}`;
    box.innerHTML = `
      <div>
        <h2>Your plan: ${esc(PLAN_NAMES[plan] || plan)}</h2>
        <p>${status}</p>
      </div>
      ${me.hasBillingAccount ? '<button type="button" class="mb-btn navy" id="mbManage">Manage my plan</button>' : ''}`;
    $('mbManage')?.addEventListener('click', async () => {
      msg('Opening your billing page…');
      try { location.href = (await api('/api/billing/portal', {})).url; } catch (err) { msg(err.message); }
    });
    // Mark the current plan card and hide its buy buttons
    document.querySelectorAll('[data-plan-card]').forEach((card) => {
      const current = card.dataset.planCard === plan;
      card.classList.toggle('current', current);
      if (current) {
        const actions = card.querySelector('[data-plan-actions]');
        if (actions) actions.innerHTML = '<span class="mb-current">Your current plan</span>';
      } else if (paid && card.dataset.planCard !== 'free' && me.planStatus !== 'cancelling') {
        const actions = card.querySelector('[data-plan-actions]');
        if (actions) actions.innerHTML = '<span class="mb-muted">To switch, cancel your current plan first, then choose this one when it ends.</span>';
      }
    });
  }

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
        msg(r.upgraded ? `Thank you! You're now on ${PLAN_NAMES[r.planId] || r.planId}. Everything it includes is unlocked.` : r.message || 'Your payment is processing. Your plan will update shortly.');
      } catch (err) { msg(`${err.message} If you were charged, your plan will update within a few minutes.`); }
    } else if (outcome === 'cancelled') {
      msg('Checkout was cancelled. You have not been charged.');
    } else if (params.get('from') === 'portal') {
      msg('Your plan details are up to date.');
    }
    if (outcome || params.get('from')) history.replaceState({}, '', '/membership');
    renderMyPlan();
  }

  // Buy buttons
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-plan-id]');
    if (!btn) return;
    if (!me) { msg('Please create a free account or sign in first, then come back to choose a plan.'); location.href = '/#join'; return; }
    if (me.role === 'admin') { msg('You are signed in as admin. Use a member account to subscribe.'); return; }
    btn.disabled = true;
    msg('Opening secure checkout…');
    try {
      location.href = (await api('/api/billing/checkout', { planId: btn.dataset.planId, billingCycle: btn.dataset.cycle, couponCode: coupon })).url;
    } catch (err) { msg(err.message); btn.disabled = false; }
  });

  // Coupon
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
      msg(any ? `Coupon ${code} applied. It will be used at checkout.` : 'That coupon code is not valid.');
    } catch (err) { msg(err.message); }
  });

  load();
}());
