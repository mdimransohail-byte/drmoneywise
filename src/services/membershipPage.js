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

/* ── What Premium gets you: visible, with a working example for each ── */
const PREMIUM_PERKS = [
  ['♛', '#c9a227', 'Lords lessons', 'Deeper lessons for confident investors: cash flow, valuation, what professionals watch.', '/learn/advanced', 'See the Lords lessons'],
  ['❤', '#e5566f', 'Financial Health Check in full', 'Every company scored, plus how it ranks against others in its industry.', '/health-check', 'See the health check'],
  ['◎', '#1baf7a', 'Portfolio health check', 'A score and heat map for each of your holdings and your whole portfolio.', '/portfolio-health', 'Try the example'],
  ['✉', '#2a78d6', 'Premium weekly newsletter', 'Your portfolio’s week, results and dividends coming up, in one email.', '/newsletter', 'See past issues'],
  ['☪', '#0fa3b1', 'Shariah ratios', 'Screening ratios for every company under all five standards.', '/shariah', 'Open Shariah investing'],
  ['◆', '#6250d6', 'Big-fund and insider moves', 'What famous funds and company bosses are buying and selling.', '/insiders', 'See insider trades'],
  ['▤', '#e8a33d', 'Monthly research report', 'The month in figures, with charts.', '/reports', 'Read a report'],
  ['⊘', '#4a5170', 'No adverts', 'A clean site, on every page.', '', ''],
];

export function premiumPerksHtml({ compact = false } = {}) {
  const perks = compact ? PREMIUM_PERKS.slice(0, 4) : PREMIUM_PERKS;
  return `<div class="pp-grid">${perks.map(([ico, c, t, d, href, link]) => `
          <div class="pp-tile" style="--c:${c}"><span class="pp-ico" aria-hidden="true">${ico}</span><strong>${esc(t)}</strong><span>${esc(d)}</span>${href ? `<a href="${href}">${esc(link)} →</a>` : ''}</div>`).join('')}
        </div>`;
}

/** "$179 a year works out at 49 cents a day: $60.88 less than paying monthly." */
function premiumValueLine(plans) {
  const p = plans.find((x) => x.id === 'premium');
  const num = (t) => Number(String(t || '').replace(/[^0-9.]/gu, ''));
  const m = num(p?.billingOptions?.find((o) => o.id.includes('monthly'))?.priceText);
  const y = num(p?.billingOptions?.find((o) => o.id.includes('annual'))?.priceText);
  if (!m || !y) return 'Everything on the site, with the tools confident investors use.';
  const save = m * 12 - y;
  return `Yearly Premium works out at ${Math.round((y / 365) * 100)} cents a day${save > 0 ? `: $${save.toFixed(2)} less than paying monthly` : ''}. Each benefit below links to a real example.`;
}

const COMPARE = [
  ['Plain-English lessons for Young Guns and Knights', 1, 1, 1],
  ['Company report cards and Financial Health Check score', 1, 1, 1],
  ['Calculators, glossary, Top 10 lists', 1, 1, 1],
  ['The deeper look on companies, ETFs and bonds', 0, 1, 1],
  ['Stock screener and watchlist review', 0, 1, 1],
  ['Chart Readers course and the full Chart check (technical analysis)', 0, 1, 1],
  ['Weekly members’ email and dividend alerts', 0, 1, 1],
  ['Lords lessons (deeper explainers)', 0, 0, 1],
  ['Health Check in full, with industry ranking', 0, 0, 1],
  ['Portfolio health check', 0, 0, 1],
  ['Premium weekly newsletter with your portfolio', 0, 0, 1],
  ['Shariah ratios, big-fund and insider moves', 0, 0, 1],
  ['Monthly research report', 0, 0, 1],
  ['No adverts', 0, 0, 1],
];

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
        <div id="myEmails" class="mb-emails" hidden></div>
      </section>

      <section class="mb-pane" data-pane="profile" hidden>
        ${profileForm}
      </section>

      <section class="mb-pane" data-pane="plans">
        <div class="mb-grid">${cards}
        </div>
        <div class="pp-box">
          <div class="pp-head"><span class="ax-crown big" aria-hidden="true"><svg viewBox="0 0 24 24" width="60%" height="60%"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#0a1128"/></svg></span>
            <div><h2>What Premium gets you</h2><p>${esc(premiumValueLine(plans))}</p></div></div>
          ${premiumPerksHtml()}
        </div>
        <div class="table-scroll"><table class="pp-table">
          <thead><tr><th>What’s included</th>${plans.map((p) => `<th${p.id === 'premium' ? ' class="pp-prem"' : ''}>${esc(p.shortName || p.name)}<small>${esc(p.priceLabel)}</small></th>`).join('')}</tr></thead>
          <tbody>${COMPARE.map(([t, ...v]) => `<tr><td>${esc(t)}</td>${v.map((x, i) => `<td class="${i === 2 ? 'pp-prem' : ''}">${x ? '<span class="pp-yes" aria-label="Included">✓</span>' : '<span class="pp-no" aria-label="Not included">–</span>'}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
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
