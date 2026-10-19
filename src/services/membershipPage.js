/* ════════════════════════════════════════════════════════════════════════
   /membership — three simple tabs:
     Your plan     current plan, status, dates, Manage my plan
     Your profile  optional questions (country, interests, level…) that
                   help us pitch the site's vocabulary and depth
                   (choosing "other" opens a small typing box)
     Plans         the three plans (short), coupon, a few questions
   Signed-out visitors see Plans only. Filled in by public/membership.js.
   ════════════════════════════════════════════════════════════════════════ */

import { getPlanCatalog, INTEREST_OPTIONS, REGION_OPTIONS } from '../config.js';
import { PROFILE_OPTIONS, OTHER_TEXT_MAX } from '../data/profileOptions.js';
import { buildHeadTags, pageShell } from './seoService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

// A small typing box that appears only when "other" is picked
function otherBox(name, placeholder) {
  return `<input class="mb-other" type="text" name="${name}Other" maxlength="${OTHER_TEXT_MAX}" placeholder="${esc(placeholder)}" data-other-for="${name}" hidden>`;
}

function select(name, label, options, hint = '', other = '') {
  return `<div class="mb-field"><label>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}
            <select name="${name}"><option value="">Choose…</option>${options.map(([id, text]) => `<option value="${esc(id)}">${esc(text)}</option>`).join('')}</select></label>
            ${other ? otherBox(name, other) : ''}
          </div>`;
}

function chips(name, label, options, hint = '', other = '') {
  return `<fieldset class="mb-field mb-chips"><legend>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</legend>
            <div>${options.map(([id, text]) => `<label class="mb-chip"><input type="checkbox" name="${name}" value="${esc(id)}"><span>${esc(text)}</span></label>`).join('')}</div>
            ${other ? otherBox(name, other) : ''}
          </fieldset>`;
}

export function renderMembershipPage(origin) {
  const plans = getPlanCatalog();
  const head = buildHeadTags({
    title: 'Membership: plans and prices | Dr MoneyWise',
    description: 'Start free. Members get the deeper look on every company: what the big funds are doing, "what if" growth scenarios and 10 years of results.',
    canonical: `${origin}/membership`,
  });

  const cards = plans.map((plan) => {
    const features = plan.features || [];
    const top = features.slice(0, 3);
    const more = features.slice(3);
    return `
          <article class="mb-card${plan.highlight ? ' highlight' : ''}" data-plan-card="${esc(plan.id)}">
            ${plan.highlight ? '<span class="mb-flag">Most popular</span>' : ''}
            <h3>${esc(plan.name)}</h3>
            <p class="mb-price"><strong>${esc(plan.priceLabel)}</strong> <span>${esc(plan.billingLabel)}</span></p>
            <p class="mb-coupon-note" data-coupon-note="${esc(plan.id)}"></p>
            <ul>${top.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
            ${more.length ? `<details class="mb-more"><summary>See everything included</summary><ul>${more.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></details>` : ''}
            <div class="mb-actions" data-plan-actions="${esc(plan.id)}">
              ${plan.id === 'free'
                ? '<a class="mb-btn plain" href="/#join">Create a free account</a>'
                : (plan.billingOptions || []).map((o) => `<button type="button" class="mb-btn${plan.highlight ? ' gold' : ' navy'}" data-plan-id="${esc(plan.id)}" data-cycle="${o.id.includes('annual') ? 'annual' : 'monthly'}">${esc(o.label)} ${esc(o.priceText || '')}</button>`).join('')}
            </div>
          </article>`;
  }).join('');

  const faq = [
    ['Can I cancel at any time?', 'Yes. Press "Manage my plan" and choose Cancel. You keep everything until the end of the period you paid for and are not charged again.'],
    ['Is my payment safe?', 'Payments are handled by Stripe. We never see or store your card number.'],
    ['Do you offer refunds?', 'Payments are not refundable for partial periods, except where the law requires. If something went wrong with a charge, email us within 14 days. See our <a href="/terms">Terms</a>.'],
  ];

  const profileForm = `
        <form id="profileForm" class="mb-profile" novalidate>
          <p class="mb-lead">All questions are optional. Your answers help us choose the right level of words and detail for our explainers. They are never shown to anyone or sold. See our <a href="/privacy">privacy policy</a>.</p>
          <div class="mb-grid2">
            <div class="mb-field"><label>Your name<input name="name" maxlength="80" autocomplete="name"></label></div>
            ${select('country', 'Country you live in', PROFILE_OPTIONS.country, '', 'Type your country')}
            ${select('ageRange', 'Age', PROFILE_OPTIONS.ageRange)}
            ${select('profession', 'What you do', PROFILE_OPTIONS.profession, '', 'Type what you do')}
          </div>
          <h3 class="mb-h3">About your investing</h3>
          <div class="mb-grid2">
            ${select('knowledge', 'How much do you know about investing?', PROFILE_OPTIONS.knowledge)}
            ${select('experience', 'How long have you been investing?', PROFILE_OPTIONS.experience)}
            ${select('investAmount', 'Roughly how much do you invest, or plan to?', PROFILE_OPTIONS.investAmount, 'A rough range is fine')}
          </div>
          ${chips('goals', 'Your goals', PROFILE_OPTIONS.goals, 'Pick any', 'Tell us your goal')}
          ${chips('interests', 'Topics you care about', INTEREST_OPTIONS.map((o) => [o.id, o.label]), 'Pick any')}
          ${chips('regions', 'Markets you follow', REGION_OPTIONS.map((o) => [o.id, o.label]), 'Pick any')}
          <div class="mb-form-actions"><button class="mb-btn gold" type="submit">Save my profile</button><span class="mb-saved" role="status" aria-live="polite"></span></div>
        </form>`;

  const body = `
      <section class="mb-hero">
        <h1>Membership</h1>
        <p>Start free. Members get the deeper look on every company.</p>
      </section>

      <p id="mbMessage" class="mb-message" role="status" aria-live="polite"></p>

      <nav class="mb-tabs" role="tablist" aria-label="Membership" hidden>
        <button role="tab" type="button" data-tab="plan" aria-selected="true">Your plan</button>
        <button role="tab" type="button" data-tab="profile" aria-selected="false">Your profile</button>
        <button role="tab" type="button" data-tab="plans" aria-selected="false">Plans &amp; prices</button>
      </nav>

      <section class="mb-pane" data-pane="plan" hidden>
        <div id="myPlan" class="mb-myplan"></div>
      </section>

      <section class="mb-pane" data-pane="profile" hidden>
        ${profileForm}
      </section>

      <section class="mb-pane" data-pane="plans">
        <div class="mb-grid">${cards}
        </div>
        <div class="mb-under">
          <div class="mb-coupon">
            <label for="mbCoupon">Coupon code</label>
            <input id="mbCoupon" type="text" placeholder="e.g. WELCOME20" autocomplete="off" />
            <button type="button" id="mbCouponBtn">Apply</button>
          </div>
          <p class="mb-small">Prices in US dollars. Renews until you cancel. Secure payment by Stripe.</p>
        </div>
        <div class="mb-faq">
          ${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}
        </div>
      </section>
      <script src="/membership.js" defer></script>`;
  return pageShell({ head, body, active: 'membership' });
}
