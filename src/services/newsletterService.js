/* ════════════════════════════════════════════════════════════════════════
   NEWSLETTER — written in Admin → Newsletter, sent to many people at once
   ───────────────────────────────────────────────────────────────────────
   Who gets it:
     · members, unless they switched "Newsletter" off (Membership page or
       the unsubscribe link in any newsletter)
     · newsletter-only subscribers who signed up on the site and clicked
       the confirmation link in their email (double opt-in)
   Sending: Resend's batch service, 100 emails per request, each with its
   own unsubscribe link. A daily limit (Admin → Newsletter, default 90, to
   fit Resend's free plan of 100 a day alongside the member alerts) spreads
   a big send over several days; the data engine carries on every hour
   until everyone has it. Each issue also gets a web page at
   /newsletter/<id>.
   Saved in the main store: store.subscribers, store.newsletters.
   ════════════════════════════════════════════════════════════════════════ */

import crypto from 'node:crypto';

import { canAccess } from '../config.js';
import { readStore, updateStore } from './storeService.js';
import { esc, secret, sign, siteUrl, sendEmail } from './alertsService.js';

export const AUDIENCES = {
  everyone: 'Everyone (members and newsletter subscribers)',
  members: 'All members (Free, Regular and Premium)',
  free: 'Free members and newsletter subscribers',
  paid: 'Paying members (Regular and Premium)',
  premium: 'Premium members only',
  subscribers: 'Newsletter subscribers only (not members)',
};
const DEFAULT_DAILY = 90;
const BATCH = 100;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/iu;
const clean = (t, max) => String(t ?? '').replace(/\r/gu, '').trim().slice(0, max);

/* ── The email itself ─────────────────────────────────────────────── */
const para = (t) => String(t).split(/\n{2,}/u).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p style="margin:0 0 12px;line-height:1.6">${esc(p).replace(/\n/gu, '<br>').replace(/(https?:\/\/[^\s<]+)/gu, '<a href="$1" style="color:#1a2a9e">$1</a>')}</p>`).join('');

export function newsletterHtml(issue, { site = '', unsubscribeUrl = '', webUrl = '', name = '', why = '' } = {}) {
  const items = (issue.items || []).filter((x) => x.heading || x.text || x.url);
  const colours = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#6250d6', '#e34948'];
  const address = process.env.BUSINESS_ADDRESS ? `<br>${esc(process.env.BUSINESS_ADDRESS)}` : '';
  return `<!doctype html><html><body style="margin:0;background:#f1e8d6">
<div style="display:none;max-height:0;overflow:hidden">${esc(issue.preheader || '')}</div>
<div style="background:#f1e8d6;padding:20px 0;font-family:Arial,Helvetica,sans-serif;color:#0a1128">
  <div style="max-width:620px;margin:0 auto;background:#fbf7ef;border-radius:14px;overflow:hidden;border:1px solid #d9ccb2">
    <div style="background:#0a1128;padding:16px 22px"><a href="${esc(site || '#')}" style="color:#c9a227;font:700 22px Georgia,serif;text-decoration:none">Dr MoneyWise</a>
      <span style="float:right;color:#c9d0e6;font-size:12px;line-height:28px">${esc(issue.dateLabel || '')}</span></div>
    <div style="padding:22px">
      <h1 style="font:700 24px Georgia,serif;margin:0 0 12px">${esc(issue.subject || '')}</h1>
      ${name ? `<p style="margin:0 0 12px">Hello ${esc(name)},</p>` : ''}
      ${para(issue.intro || '')}
      ${items.map((x, i) => `
      <div style="border-left:5px solid ${colours[i % colours.length]};background:#fff;border-radius:10px;padding:14px 16px;margin:0 0 14px">
        ${x.heading ? `<h2 style="font:700 18px Georgia,serif;margin:0 0 8px">${esc(x.heading)}</h2>` : ''}
        ${para(x.text || '')}
        ${x.url ? `<p style="margin:0"><a href="${esc(x.url.startsWith('/') ? `${site}${x.url}` : x.url)}" style="display:inline-block;background:#c9a227;color:#0a1128;font-weight:700;text-decoration:none;padding:8px 14px;border-radius:999px">${esc(x.button || 'Read more')}</a></p>` : ''}
      </div>`).join('')}
      ${issue.closing ? para(issue.closing) : ''}
    </div>
    <div style="padding:14px 22px;background:#f3ead6;font-size:12px;color:#4a5170;line-height:1.5">
      For education only, not financial advice. ${esc(why || 'You get this because you joined Dr MoneyWise or signed up for our newsletter.')}
      ${webUrl ? `<a href="${esc(webUrl)}" style="color:#1a2a9e">Read it on the website</a> · ` : ''}${unsubscribeUrl ? `<a href="${esc(unsubscribeUrl)}" style="color:#1a2a9e">Unsubscribe</a>` : ''}${address}
    </div>
  </div></div></body></html>`;
}

/* ── Subscribers (people who aren't members) ──────────────────────── */
const ipHits = new Map();
export async function subscribe(rawEmail, { ip = '', source = 'site', admin = false } = {}) {
  const email = String(rawEmail || '').trim().toLowerCase().slice(0, 160);
  if (!EMAIL_RE.test(email)) throw Object.assign(new Error('Please check your email address.'), { status: 400 });
  const now = Date.now();
  if (!admin) {
    const hits = (ipHits.get(ip) || []).filter((t) => now - t < 3600000);
    if (hits.length >= 5) throw Object.assign(new Error('Too many sign-ups from here. Please try again later.'), { status: 429 });
    ipHits.set(ip, [...hits, now]);
  }
  let sub = null; let resend = false;
  await updateStore((s) => {
    s.subscribers = s.subscribers || [];
    sub = s.subscribers.find((x) => x.email === email);
    if (!sub) {
      sub = { id: crypto.randomUUID(), email, status: 'pending', token: crypto.randomBytes(18).toString('hex'), source, createdAt: new Date().toISOString(), confirmedAt: null };
      s.subscribers.push(sub);
      resend = true;
    } else if (sub.status !== 'active') {
      // Unsubscribed or never confirmed: they must confirm again
      sub.status = 'pending'; resend = true;
    }
    return s;
  });
  if (sub.status === 'active') return { ok: true, already: true };
  if (resend) {
    const site = await siteUrl();
    const link = `${site}/newsletter/confirm?t=${sub.token}`;
    const html = newsletterHtml({ subject: 'Please confirm your newsletter sign-up', intro: `${admin ? 'You’ve been invited to the Dr MoneyWise newsletter' : 'Thanks for signing up to the Dr MoneyWise newsletter'}: our best plain-English explainers, the biggest company results and new research, about once a week.\n\nPlease confirm by clicking the button below. If you don’t want it, ignore this email and you won't hear from us.`, items: [{ heading: '', text: '', url: link, button: 'Yes, send me the newsletter' }] }, { site, why: 'You get this because your address was entered for the Dr MoneyWise newsletter. Nothing more will be sent unless you confirm.' });
    const r = await sendEmail({ to: email, subject: 'Please confirm your Dr MoneyWise newsletter sign-up', html });
    if (!r.ok) console.error(`[newsletter] confirmation email to ${email} failed: ${r.message}`);
  }
  return { ok: true };
}

export async function confirmSubscriber(token) {
  let ok = false;
  await updateStore((s) => {
    const sub = (s.subscribers || []).find((x) => x.token === token);
    if (sub && sub.status !== 'unsubscribed') { sub.status = 'active'; sub.confirmedAt = sub.confirmedAt || new Date().toISOString(); ok = true; }
    return s;
  });
  return ok;
}

export async function unsubscribeSubscriber(token) {
  let ok = false;
  await updateStore((s) => {
    const sub = (s.subscribers || []).find((x) => x.token === token);
    if (sub) { sub.status = 'unsubscribed'; sub.unsubscribedAt = new Date().toISOString(); ok = true; }
    return s;
  });
  return ok;
}

/* ── Audiences ────────────────────────────────────────────────────── */
function memberWants(u) {
  if (!u.email || u.status === 'disabled' || u.role === 'admin') return false;
  return (u.emailPrefs || {}).newsletter !== false;
}
export function recipientsFor(store, audience) {
  const members = (store.users || []).filter(memberWants);
  const paid = (u) => canAccess(u.plan || 'free', 'regular');
  const prem = (u) => canAccess(u.plan || 'free', 'premium');
  const subs = (store.subscribers || []).filter((x) => x.status === 'active').map((x) => ({ kind: 'subscriber', id: x.id, email: x.email, token: x.token }));
  const mem = (list) => list.map((u) => ({ kind: 'member', id: u.id, email: u.email, name: String(u.name || '').split(' ')[0] }));
  let out = [];
  if (audience === 'members') out = mem(members);
  else if (audience === 'paid') out = mem(members.filter(paid));
  else if (audience === 'premium') out = mem(members.filter(prem));
  else if (audience === 'free') out = [...mem(members.filter((u) => !paid(u))), ...subs];
  else if (audience === 'subscribers') out = subs;
  else out = [...mem(members), ...subs];
  const seen = new Set();
  return out.filter((r) => { const e = r.email.toLowerCase(); if (seen.has(e)) return false; seen.add(e); return true; });
}

export async function newsletterStats() {
  const store = await readStore();
  const counts = Object.fromEntries(Object.keys(AUDIENCES).map((a) => [a, recipientsFor(store, a).length]));
  const subs = store.subscribers || [];
  return {
    counts,
    subscribers: { active: subs.filter((x) => x.status === 'active').length, pending: subs.filter((x) => x.status === 'pending').length, unsubscribed: subs.filter((x) => x.status === 'unsubscribed').length },
    membersOptedOut: (store.users || []).filter((u) => u.email && u.role !== 'admin' && (u.emailPrefs || {}).newsletter === false).length,
    dailyLimit: store.settings?.newsletterDailyLimit || DEFAULT_DAILY,
    sentToday: sentToday(store),
    emailReady: Boolean(process.env.RESEND_API_KEY) && /@/u.test(process.env.ALERTS_EMAIL_FROM || ''),
  };
}

/* ── Issues ───────────────────────────────────────────────────────── */
function cleanIssue(raw = {}) {
  return {
    subject: clean(raw.subject, 140),
    preheader: clean(raw.preheader, 160),
    intro: clean(raw.intro, 4000),
    closing: clean(raw.closing, 2000),
    audience: AUDIENCES[raw.audience] ? raw.audience : 'everyone',
    items: (Array.isArray(raw.items) ? raw.items : []).slice(0, 10).map((x) => ({
      heading: clean(x.heading, 160), text: clean(x.text, 2000),
      url: /^https?:\/\/|^\//u.test(String(x.url || '')) ? clean(x.url, 400) : '', button: clean(x.button, 40),
    })).filter((x) => x.heading || x.text || x.url),
  };
}

export async function listIssues() {
  const store = await readStore();
  return (store.newsletters || []).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(({ recipients, ...rest }) => ({ ...rest, total: (recipients || []).length || rest.total || 0 }));
}

export async function saveIssue(id, raw) {
  const data = cleanIssue(raw);
  let saved = null;
  await updateStore((s) => {
    s.newsletters = s.newsletters || [];
    let issue = id ? s.newsletters.find((x) => x.id === id) : null;
    if (issue && issue.status !== 'draft') throw Object.assign(new Error('This newsletter is sending or sent, so it can’t be changed.'), { status: 400 });
    if (!issue) { issue = { id: crypto.randomUUID().slice(0, 8), status: 'draft', createdAt: new Date().toISOString() }; s.newsletters.push(issue); }
    Object.assign(issue, data, { updatedAt: new Date().toISOString() });
    saved = { ...issue };
    return s;
  });
  return saved;
}

export async function deleteIssue(id) {
  await updateStore((s) => { s.newsletters = (s.newsletters || []).filter((x) => !(x.id === id && x.status === 'draft')); return s; });
}

/** A first draft built from what the site published in the last week. */
export async function draftFromSite() {
  const site = await siteUrl();
  const { getPublishedLearningArticles } = await import('./seoService.js');
  const { latestResults } = await import('./resultsService.js');
  const { biggestTickers } = await import('./resultsPages.js');
  const { listReports } = await import('./reportService.js');
  const week = Date.now() - 8 * 86400000;
  const explainers = (await getPublishedLearningArticles()).filter((a) => new Date(a.publishAt).getTime() > week && !(a.tags || []).includes('deeper')).slice(0, 3);
  const big = await biggestTickers();
  const results = latestResults(300, 8).filter((r) => r.simple && big.has(r.ticker)).slice(0, 3);
  const report = (await listReports())[0];
  const items = [
    ...explainers.map((a) => ({ heading: a.headline, text: a.summary || '', url: `${site}/learn/${a.slug}`, button: 'Read the explainer' })),
    ...(results.length ? [{ heading: 'This week’s biggest results, in plain English', text: results.map((r) => `${r.name}: ${r.headline}.`).join('\n'), url: `${site}/results`, button: 'See all results' }] : []),
    ...(report ? [{ heading: `Research report: ${report.text.headline}`, text: String((report.text.summary || [])[0] || ''), url: `${site}/reports/${report.id}`, button: 'Read the report (Premium)' }] : []),
    { heading: 'Learning something new this week?', text: 'Our free learning path takes you from your first savings to running a portfolio, in short steps.', url: `${site}/learn/path`, button: 'Start the learning path' },
  ];
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return {
    subject: `Your week in money: ${date}`,
    preheader: explainers[0]?.headline || 'The week’s money news, explained simply',
    intro: 'Here’s what we explained this week, in plain English, plus the biggest company results and what’s new on the site.',
    closing: 'Have a good week,\nThe Dr MoneyWise team',
    audience: 'everyone',
    items,
  };
}

/* ── Sending ──────────────────────────────────────────────────────── */
const todayKey = () => new Date().toISOString().slice(0, 10);
function sentToday(store) { return (store.newsletterLog || {})[todayKey()] || 0; }

async function linksFor(r, site, issueId) {
  const s = await secret();
  return {
    unsubscribeUrl: r.kind === 'member' ? `${site}/email/unsubscribe?u=${encodeURIComponent(r.id)}&k=newsletter&t=${sign(s, r.id, 'newsletter')}` : `${site}/newsletter/unsubscribe?t=${r.token}`,
    webUrl: `${site}/newsletter/${issueId}`,
  };
}

export async function sendTest(id, to) {
  const store = await readStore();
  const issue = (store.newsletters || []).find((x) => x.id === id);
  if (!issue) throw Object.assign(new Error('Newsletter not found.'), { status: 404 });
  const site = await siteUrl();
  const html = newsletterHtml({ ...issue, dateLabel: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }, { site, webUrl: `${site}/newsletter/${issue.id}`, unsubscribeUrl: `${site}/newsletter` });
  return sendEmail({ to, subject: `[Test] ${issue.subject}`, html });
}

/** Starts sending: takes a snapshot of who should get it, then sends in batches. */
export async function startSend(id) {
  let started = null;
  await updateStore((s) => {
    const issue = (s.newsletters || []).find((x) => x.id === id);
    if (!issue) throw Object.assign(new Error('Newsletter not found.'), { status: 404 });
    if (issue.status !== 'draft') throw Object.assign(new Error('This newsletter is already sending or sent.'), { status: 400 });
    if (!issue.subject || !(issue.items || []).length && !issue.intro) throw Object.assign(new Error('Add a subject and some content first.'), { status: 400 });
    const recipients = recipientsFor(s, issue.audience);
    if (!recipients.length) throw Object.assign(new Error('Nobody is in this audience yet.'), { status: 400 });
    Object.assign(issue, { status: 'sending', recipients, total: recipients.length, sent: 0, failed: 0, startedAt: new Date().toISOString(), dateLabel: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) });
    started = { total: recipients.length };
    return s;
  });
  const progress = await continueSending();
  return { ...started, ...progress };
}

/** Called by Admin and by the data engine every hour. */
export async function continueSending() {
  const store = await readStore();
  const issue = (store.newsletters || []).find((x) => x.status === 'sending');
  if (!issue) return { ok: true, message: 'Nothing waiting to send' };
  if (!process.env.RESEND_API_KEY) return { ok: false, message: 'No Resend key saved: the newsletter can’t be sent' };
  const limit = store.settings?.newsletterDailyLimit || DEFAULT_DAILY;
  let room = Math.max(0, limit - sentToday(store));
  if (!room) return { ok: true, message: `Daily limit of ${limit} reached; carries on tomorrow (${issue.sent} of ${issue.total} sent)` };
  const site = await siteUrl();
  const from = process.env.ALERTS_EMAIL_FROM || process.env.HEALTH_EMAIL_FROM || 'Dr MoneyWise <onboarding@resend.dev>';
  let sent = issue.sent || 0; let failed = issue.failed || 0; let stopped = '';
  while (room > 0 && sent + failed < issue.recipients.length) {
    const chunk = issue.recipients.slice(sent + failed, sent + failed + Math.min(BATCH, room));
    const emails = [];
    for (const r of chunk) {
      const links = await linksFor(r, site, issue.id);
      emails.push({
        from, to: [r.email], subject: issue.subject,
        html: newsletterHtml(issue, { site, name: r.name || '', ...links }),
        headers: { 'List-Unsubscribe': `<${links.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      });
    }
    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(emails),
    }).catch((error) => ({ ok: false, status: 0, json: async () => ({ message: error.message }) }));
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      stopped = `Resend said ${response.status}: ${body.message || body.name || 'error'}`;
      if (response.status === 422) failed += chunk.length; // bad addresses in this batch: skip them
      break;
    }
    sent += chunk.length; room -= chunk.length;
    await updateStore((s) => { s.newsletterLog = { ...(s.newsletterLog || {}), [todayKey()]: (s.newsletterLog?.[todayKey()] || 0) + chunk.length }; return s; });
  }
  const done = sent + failed >= issue.recipients.length;
  await updateStore((s) => {
    const it = (s.newsletters || []).find((x) => x.id === issue.id);
    if (it) { it.sent = sent; it.failed = failed; it.lastError = stopped || null; if (done) { it.status = 'sent'; it.sentAt = new Date().toISOString(); } }
    return s;
  });
  const message = done ? `Newsletter "${issue.subject}" sent to ${sent} people${failed ? ` (${failed} failed)` : ''}` : `${sent} of ${issue.total} sent${stopped ? `; paused: ${stopped}` : '; continues later (daily limit)'}`;
  console.log(`[newsletter] ${message}`);
  return { ok: !stopped || sent > 0, message, sent, total: issue.total, done };
}

export async function cancelSend(id) {
  await updateStore((s) => {
    const it = (s.newsletters || []).find((x) => x.id === id);
    if (it && it.status === 'sending') { it.status = 'stopped'; it.stoppedAt = new Date().toISOString(); }
    return s;
  });
}

export async function saveDailyLimit(n) {
  const v = Math.max(1, Math.min(100000, Math.round(Number(n) || DEFAULT_DAILY)));
  await updateStore((s) => { s.settings = { ...(s.settings || {}), newsletterDailyLimit: v }; return s; });
  return v;
}

/** Sent issues for the public archive at /newsletter. */
export async function publicIssues() {
  const store = await readStore();
  return (store.newsletters || []).filter((x) => x.status === 'sent').sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)))
    .map(({ recipients, ...rest }) => rest);
}

export async function subscribersCsv() {
  const store = await readStore();
  const rows = [['email', 'status', 'signed up', 'confirmed', 'source'], ...(store.subscribers || []).map((x) => [x.email, x.status, x.createdAt, x.confirmedAt || '', x.source || ''])];
  return rows.map((r) => r.map((v) => `"${String(v).replace(/"/gu, '""')}"`).join(',')).join('\n');
}

/* ── Admin: add people by hand ────────────────────────────────────── */
function emailList(text) {
  const all = String(text || '').toLowerCase().split(/[\s,;]+/u).map((x) => x.replace(/^<|>$/gu, '').trim()).filter(Boolean);
  const good = [...new Set(all.filter((e) => EMAIL_RE.test(e) && e.length <= 160))];
  const bad = all.filter((e) => !EMAIL_RE.test(e));
  if (good.length > 50) throw Object.assign(new Error('Please add up to 50 addresses at a time.'), { status: 400 });
  if (!good.length) throw Object.assign(new Error('No valid email addresses found.'), { status: 400 });
  return { good, bad };
}
async function countSent(n) {
  await updateStore((s) => { s.newsletterLog = { ...(s.newsletterLog || {}), [todayKey()]: (s.newsletterLog?.[todayKey()] || 0) + n }; return s; });
}

/** Sends one newsletter (draft or already sent) to a few addresses, once. They are not added to the list. */
export async function sendOnce(id, text) {
  const { good, bad } = emailList(text);
  const store = await readStore();
  const issue = (store.newsletters || []).find((x) => x.id === id);
  if (!issue) throw Object.assign(new Error('Save the newsletter first.'), { status: 404 });
  if (!issue.subject) throw Object.assign(new Error('Add a subject line first.'), { status: 400 });
  const site = await siteUrl();
  const html = newsletterHtml({ ...issue, dateLabel: issue.dateLabel || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }, { site, webUrl: issue.status === 'sent' ? `${site}/newsletter/${issue.id}` : '', unsubscribeUrl: `${site}/newsletter` });
  const failed = [];
  for (const to of good) {
    const r = await sendEmail({ to, subject: issue.subject, html });
    if (!r.ok) failed.push(`${to} (${r.message})`);
  }
  await countSent(good.length - failed.length);
  return { ok: !failed.length, sent: good.length - failed.length, failed, skipped: bad };
}

/** Adds people to the newsletter list: "invite" asks them to confirm; "gift" adds them now and tells them, with an unsubscribe link. */
export async function addSubscribers(text, mode = 'invite') {
  const { good, bad } = emailList(text);
  const site = await siteUrl();
  const out = { added: 0, invited: 0, already: 0, members: 0, failed: [], skipped: bad };
  const store = await readStore();
  const memberEmails = new Set((store.users || []).map((u) => String(u.email || '').toLowerCase()));
  for (const email of good) {
    if (memberEmails.has(email)) { out.members += 1; continue; }
    if (mode !== 'gift') {
      const r = await subscribe(email, { source: 'admin-invite', admin: true }).catch((e) => ({ error: e.message }));
      if (r.error) out.failed.push(`${email} (${r.error})`); else if (r.already) out.already += 1; else out.invited += 1;
      continue;
    }
    let sub = null; let isNew = false;
    await updateStore((s) => {
      s.subscribers = s.subscribers || [];
      sub = s.subscribers.find((x) => x.email === email);
      if (sub?.status === 'active') return s;
      if (!sub) { sub = { id: crypto.randomUUID(), email, token: crypto.randomBytes(18).toString('hex'), createdAt: new Date().toISOString() }; s.subscribers.push(sub); }
      Object.assign(sub, { status: 'active', source: 'admin-gift', confirmedAt: new Date().toISOString() });
      isNew = true;
      return s;
    });
    if (!isNew) { out.already += 1; continue; }
    out.added += 1;
    const html = newsletterHtml({
      subject: 'A free subscription to the Dr MoneyWise newsletter',
      intro: 'Someone thought you’d enjoy the Dr MoneyWise newsletter, so you now get it for free: our best plain-English explainers on saving and investing, the biggest company results and new research, about once a week.\n\nIf you’d rather not get it, use the unsubscribe link at the bottom of this email and you won’t hear from us again.',
      items: [{ heading: '', text: '', url: `${site}/newsletter`, button: 'See past issues' }],
    }, { site, unsubscribeUrl: `${site}/newsletter/unsubscribe?t=${sub.token}` });
    const r = await sendEmail({ to: email, subject: 'You’ve been given the Dr MoneyWise newsletter', html, unsubscribeUrl: `${site}/newsletter/unsubscribe?t=${sub.token}` });
    if (!r.ok) out.failed.push(`${email} (welcome email: ${r.message})`);
  }
  return out;
}
