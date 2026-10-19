/* ════════════════════════════════════════════════════════════════════════
   /membership — plans, prices, and (for signed-in readers) "Your plan":
   current plan, status, renewal or end date, Manage my plan, upgrade.
   The personal part is filled in by public/membership.js.
   ════════════════════════════════════════════════════════════════════════ */

import { getPlanCatalog } from '../config.js';
import { buildHeadTags, pageShell } from './seoService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

export function renderMembershipPage(origin) {
  const plans = getPlanCatalog();
  const head = buildHeadTags({
    title: 'Membership: plans and prices | Dr MoneyWise',
    description: 'Start free. Members get the deeper look on every company: what the big funds are doing, "what if" growth scenarios and 10 years of results.',
    canonical: `${origin}/membership`,
  });
  const cards = plans.map((plan) => `
          <article class="mb-card${plan.highlight ? ' highlight' : ''}" data-plan-card="${esc(plan.id)}">
            ${plan.highlight ? '<span class="mb-flag">Most popular</span>' : ''}
            <p class="mb-short">${esc(plan.shortName || plan.name)}</p>
            <h2>${esc(plan.name)}</h2>
            <p class="mb-tagline">${esc(plan.tagline)}</p>
            <p class="mb-price"><strong>${esc(plan.priceLabel)}</strong> <span>${esc(plan.billingLabel)}</span></p>
            <p class="mb-coupon-note" data-coupon-note="${esc(plan.id)}"></p>
            <ul>${(plan.features || []).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
            <div class="mb-actions" data-plan-actions="${esc(plan.id)}">
              ${plan.id === 'free'
                ? '<a class="mb-btn plain" href="/#join">Create a free account</a>'
                : (plan.billingOptions || []).map((o) => `<button type="button" class="mb-btn${plan.highlight ? ' gold' : ' navy'}" data-plan-id="${esc(plan.id)}" data-cycle="${o.id.includes('annual') ? 'annual' : 'monthly'}">${esc(o.label)} ${esc(o.priceText || '')}</button>`).join('')}
            </div>
          </article>`).join('');
  const faq = [
    ['Can I cancel at any time?', 'Yes. Press "Manage my plan" and choose Cancel. You keep everything you paid for until the end of your current month or year, and you will not be charged again.'],
    ['Is my payment safe?', 'Payments are handled by Stripe, one of the world’s largest payment companies. We never see or store your card number.'],
    ['Can I switch between monthly and yearly?', 'Cancel your current plan in "Manage my plan", and once it ends, choose the new one here. Yearly plans cost less than 12 monthly payments.'],
    ['Do you offer refunds?', 'Payments are not refundable for partial periods, except where the law requires otherwise. If something went wrong with a charge, email us within 14 days. See our <a href="/terms">Terms</a>.'],
    ['Is this financial advice?', 'No. Dr MoneyWise explains money and markets in plain English so you can make your own decisions. See our <a href="/disclaimer">disclaimer</a>.'],
  ];
  const body = `
      <section class="mb-hero">
        <p class="mb-kicker">Membership</p>
        <h1>Understand money with confidence</h1>
        <p>Start free. Members get the deeper look on every company: what the big funds are doing, "what if" growth scenarios and 10 years of results.</p>
      </section>

      <section id="myPlan" class="mb-myplan" hidden aria-live="polite"></section>
      <p id="mbMessage" class="mb-message" role="status" aria-live="polite"></p>

      <section class="mb-plans">
        <div class="mb-coupon">
          <label for="mbCoupon">Have a coupon code?</label>
          <input id="mbCoupon" type="text" placeholder="e.g. WELCOME20" autocomplete="off" />
          <button type="button" id="mbCouponBtn">Apply</button>
        </div>
        <div class="mb-grid">${cards}
        </div>
        <p class="mb-small">Prices in US dollars. Plans renew automatically until you cancel. Secure payment by Stripe.</p>
      </section>

      <section class="mb-faq">
        <h2>Questions</h2>
        ${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}
      </section>
      <script src="/membership.js" defer></script>`;
  return pageShell({ head, body, active: 'membership' });
}
