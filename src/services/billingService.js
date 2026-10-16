/* ════════════════════════════════════════════════════════════════════════
   PAYMENTS — Stripe Checkout + automatic plan upgrades/downgrades
   ───────────────────────────────────────────────────────────────────────
   How it works:
   1. A signed-in member clicks a paid plan → POST /api/billing/checkout.
      We create a Stripe Checkout page (prices come from businessSettings,
      so changing a price in Admin changes what Stripe charges) and send
      the member there.
   2. After paying, Stripe sends them back to /?checkout=success&session_id=…
      and the page calls POST /api/billing/confirm, which asks Stripe
      "was this really paid?" and upgrades the member straight away.
   3. Stripe also tells us about later changes by webhook
      (POST /api/stripe/webhook): renewals, cancellations, failed payments.
      A cancelled or unpaid subscription drops the member back to Free.
   4. Members manage or cancel their plan on Stripe's own billing page
      (POST /api/billing/portal).

   Keys (saved in Admin → APIs & More → Payments, stored in data/.env):
     STRIPE_SECRET_KEY      sk_test_… while testing, sk_live_… at launch
     STRIPE_WEBHOOK_SECRET  whsec_… from the webhook endpoint in Stripe

   No Stripe library is used — plain HTTPS calls to api.stripe.com, so
   package.json stays at one dependency.
   ════════════════════════════════════════════════════════════════════════ */

import crypto from 'node:crypto';

import { getPlanConfig } from '../config.js';
import { readStore, updateStore } from './storeService.js';

const STRIPE_API = 'https://api.stripe.com/v1';
const WEBHOOK_TOLERANCE_SECONDS = 300;

function getSecretKey() {
  return String(process.env.STRIPE_SECRET_KEY || '').trim();
}

function getWebhookSecret() {
  return String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
}

export function getBillingStatus() {
  const key = getSecretKey();
  return {
    configured: Boolean(key),
    mode: key.startsWith('sk_live_') ? 'live' : key.startsWith('sk_test_') ? 'test' : key ? 'unknown' : 'off',
    webhookConfigured: Boolean(getWebhookSecret()),
  };
}

/* ── Stripe API helper ──────────────────────────────────────────────── */
function encodeForm(params, prefix = '', out = []) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item !== null && typeof item === 'object') {
          encodeForm(item, `${name}[${index}]`, out);
        } else {
          out.push(`${encodeURIComponent(`${name}[${index}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === 'object') {
      encodeForm(value, name, out);
    } else {
      out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return out;
}

async function stripeRequest(method, apiPath, params = null) {
  const key = getSecretKey();
  if (!key) {
    console.log('[billing] Skipped Stripe call — no STRIPE_SECRET_KEY saved in Admin yet.');
    throw new Error('Payments are not set up yet. Please try again later.');
  }

  let url = `${STRIPE_API}${apiPath}`;
  const options = {
    method,
    headers: { Authorization: `Bearer ${key}` },
  };
  if (params && method === 'GET') {
    url += `?${encodeForm(params).join('&')}`;
  } else if (params) {
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = encodeForm(params).join('&');
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `HTTP ${response.status}`;
    console.error(`[billing] Stripe ${method} ${apiPath} failed: ${message}`);
    const error = new Error(message);
    error.status = response.status;
    error.stripeCode = data?.error?.code;
    throw error;
  }
  return data;
}

/* ── Prices come from the plan settings ─────────────────────────────── */
function priceFor(planId, cycle) {
  const plan = getPlanConfig(planId);
  if (!plan || plan.id !== planId || planId === 'free') {
    throw new Error('Please choose a paid plan.');
  }
  const option = (plan.billingOptions || []).find((entry) =>
    cycle === 'annual' ? entry.id.includes('annual') : !entry.id.includes('annual'),
  );
  const amount = Number(String(option?.priceText || plan.priceLabel || '').replace(/[^0-9.]/gu, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`No ${cycle} price is set for the ${plan.name} plan.`);
  }
  return { plan, amountCents: Math.round(amount * 100) };
}

/* ── Our coupons become Stripe coupons (created once, then reused) ──── */
async function ensureStripeCoupon(code, planId) {
  if (!code) return null;
  const store = await readStore();
  const coupon = (store.coupons || []).find(
    (entry) => entry.code === code && entry.active && (entry.planScope === 'all' || entry.planScope === planId),
  );
  if (!coupon) return null;

  const stripeId = `DMW-${coupon.code}-${coupon.discountPercent}`;
  try {
    await stripeRequest('GET', `/coupons/${encodeURIComponent(stripeId)}`);
  } catch (error) {
    if (error.status !== 404) throw error;
    await stripeRequest('POST', '/coupons', {
      id: stripeId,
      percent_off: coupon.discountPercent,
      duration: 'forever',
      name: `${coupon.code} (${coupon.discountPercent}% off)`,
    });
    console.log(`[billing] Created Stripe coupon ${stripeId}`);
  }
  return stripeId;
}

/* ── 1. Start checkout ──────────────────────────────────────────────── */
export async function createCheckoutSession({ user, planId, cycle, couponCode, origin }) {
  if (!user || user.role === 'admin') {
    throw new Error('Please sign in with a member account to subscribe.');
  }
  const billingCycle = cycle === 'annual' ? 'annual' : 'monthly';
  const { plan, amountCents } = priceFor(planId, billingCycle);

  const store = await readStore();
  const member = store.users.find((entry) => entry.id === user.id);
  if (member?.stripeSubscriptionId && member.plan !== 'free' && member.planStatus !== 'canceled') {
    throw new Error('You already have a paid plan. Use "Manage my plan" to change or cancel it.');
  }

  const stripeCouponId = await ensureStripeCoupon(String(couponCode || '').trim().toUpperCase(), planId);
  const metadata = { userId: user.id, planId, billingCycle };

  const params = {
    mode: 'subscription',
    success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}#membership`,
    cancel_url: `${origin}/?checkout=cancelled#membership`,
    client_reference_id: user.id,
    metadata,
    subscription_data: { metadata },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          recurring: { interval: billingCycle === 'annual' ? 'year' : 'month' },
          product_data: { name: `Dr MoneyWise ${plan.name}` },
        },
      },
    ],
  };
  if (member?.stripeCustomerId) {
    params.customer = member.stripeCustomerId;
  } else {
    params.customer_email = user.email;
  }
  if (stripeCouponId) {
    params.discounts = [{ coupon: stripeCouponId }];
  }

  const session = await stripeRequest('POST', '/checkout/sessions', params);
  console.log(`[billing] Checkout started for ${user.email}: ${planId} ${billingCycle}${stripeCouponId ? ` with ${stripeCouponId}` : ''}`);
  return { url: session.url };
}

/* ── 2. Confirm on return from Stripe ───────────────────────────────── */
export async function confirmCheckoutSession({ user, sessionId }) {
  if (!user) throw new Error('Please sign in first.');
  if (!/^cs_[A-Za-z0-9_]+$/u.test(String(sessionId || ''))) {
    throw new Error('That payment link is not valid.');
  }
  const session = await stripeRequest('GET', `/checkout/sessions/${sessionId}`);
  if (session.client_reference_id !== user.id) {
    throw new Error('This payment belongs to a different account.');
  }
  const paid = session.status === 'complete' && ['paid', 'no_payment_required'].includes(session.payment_status);
  if (!paid) {
    return { upgraded: false, message: 'Your payment is still processing. Your plan will update shortly.' };
  }
  await applyCheckoutToMember(session);
  return { upgraded: true, planId: session.metadata?.planId };
}

async function applyCheckoutToMember(session) {
  const userId = session.client_reference_id || session.metadata?.userId;
  const planId = session.metadata?.planId;
  const billingCycle = session.metadata?.billingCycle === 'annual' ? 'annual' : 'monthly';
  if (!userId || !planId) {
    console.error('[billing] Checkout session is missing member or plan details:', session.id);
    return;
  }
  await updateStore((store) => {
    const member = store.users.find((entry) => entry.id === userId);
    if (!member) {
      console.error(`[billing] Paid checkout for unknown member ${userId}`);
      return store;
    }
    const previousPlan = member.plan;
    member.plan = planId;
    member.billingCycle = billingCycle;
    member.planStatus = 'active';
    member.stripeCustomerId = session.customer || member.stripeCustomerId || '';
    member.stripeSubscriptionId = session.subscription || member.stripeSubscriptionId || '';
    member.updatedAt = new Date().toISOString();
    if (previousPlan !== planId) {
      store.events.push({
        id: crypto.randomUUID(),
        type: 'upgrade',
        path: '/billing/checkout',
        userId,
        value: 1,
        at: new Date().toISOString(),
      });
      console.log(`[billing] ${member.email} upgraded ${previousPlan} → ${planId} (${billingCycle})`);
    }
    return store;
  });
}

/* ── 3. Webhooks from Stripe ────────────────────────────────────────── */
export function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = getWebhookSecret();
  if (!secret) {
    console.log('[billing] Webhook ignored — no STRIPE_WEBHOOK_SECRET saved in Admin yet.');
    return false;
  }
  const parts = String(signatureHeader || '').split(',').map((part) => part.split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > WEBHOOK_TOLERANCE_SECONDS) {
    console.error(`[billing] Webhook timestamp too old (${age}s) — rejected.`);
    return false;
  }

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return signatures.some((signature) => {
    const candidate = Buffer.from(signature, 'hex');
    return candidate.length === expectedBuffer.length && crypto.timingSafeEqual(candidate, expectedBuffer);
  });
}

export async function handleWebhook(rawBody, signatureHeader) {
  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    console.error('[billing] Webhook signature check failed — event ignored. Check the webhook secret in Admin.');
    return { ok: false, status: 400 };
  }

  const event = JSON.parse(rawBody);

  // Stripe can send the same event twice — only act once.
  let alreadyProcessed = false;
  await updateStore((store) => {
    store.meta = store.meta || {};
    const seen = store.meta.processedStripeEvents || [];
    if (seen.includes(event.id)) {
      alreadyProcessed = true;
    } else {
      store.meta.processedStripeEvents = [...seen, event.id].slice(-300);
    }
    return store;
  });
  if (alreadyProcessed) {
    return { ok: true, status: 200 };
  }

  const object = event.data?.object || {};
  console.log(`[billing] Webhook received: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed':
      if (object.mode === 'subscription' && ['paid', 'no_payment_required'].includes(object.payment_status)) {
        await applyCheckoutToMember(object);
      }
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await applySubscriptionChange(object, event.type);
      break;
    case 'invoice.payment_failed':
      await markPaymentProblem(object);
      break;
    default:
      break;
  }
  return { ok: true, status: 200 };
}

async function applySubscriptionChange(subscription, eventType) {
  const ended = eventType === 'customer.subscription.deleted'
    || ['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status);
  const planId = subscription.metadata?.planId;
  const renewsAt = subscription.current_period_end
    || subscription.items?.data?.[0]?.current_period_end
    || null;

  await updateStore((store) => {
    const member = store.users.find(
      (entry) => entry.stripeSubscriptionId === subscription.id
        || (subscription.metadata?.userId && entry.id === subscription.metadata.userId),
    );
    if (!member) {
      console.error(`[billing] Subscription ${subscription.id} does not match any member.`);
      return store;
    }
    member.stripeSubscriptionId = subscription.id;
    member.stripeCustomerId = subscription.customer || member.stripeCustomerId;
    member.planRenewsAt = renewsAt ? new Date(renewsAt * 1000).toISOString() : member.planRenewsAt || null;
    member.updatedAt = new Date().toISOString();

    if (ended) {
      if (member.plan !== 'free') {
        console.log(`[billing] ${member.email} subscription ended — moved back to Free.`);
      }
      member.plan = 'free';
      member.planStatus = 'canceled';
      member.stripeSubscriptionId = '';
    } else {
      if (planId && ['active', 'trialing'].includes(subscription.status)) {
        member.plan = planId;
      }
      member.planStatus = subscription.cancel_at_period_end ? 'cancelling' : subscription.status === 'past_due' ? 'past_due' : 'active';
    }
    return store;
  });
}

async function markPaymentProblem(invoice) {
  await updateStore((store) => {
    const member = store.users.find((entry) => entry.stripeCustomerId && entry.stripeCustomerId === invoice.customer);
    if (member) {
      member.planStatus = 'past_due';
      member.updatedAt = new Date().toISOString();
      console.log(`[billing] Payment failed for ${member.email} — Stripe will retry; plan kept for now.`);
    }
    return store;
  });
}

/* ── 4. Manage / cancel on Stripe's billing page ────────────────────── */
export async function createPortalSession({ user, origin }) {
  if (!user) throw new Error('Please sign in first.');
  const store = await readStore();
  const member = store.users.find((entry) => entry.id === user.id);
  if (!member?.stripeCustomerId) {
    throw new Error('There is no paid plan on this account yet.');
  }
  try {
    const portal = await stripeRequest('POST', '/billing_portal/sessions', {
      customer: member.stripeCustomerId,
      return_url: `${origin}/#membership`,
    });
    return { url: portal.url };
  } catch (error) {
    if (/configuration/iu.test(error.message)) {
      console.error('[billing] Stripe customer portal is not switched on yet — open Stripe → Settings → Billing → Customer portal and press Save.');
      throw new Error('Plan management is being set up. Please email us to change your plan.');
    }
    throw error;
  }
}
