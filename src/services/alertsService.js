/* ════════════════════════════════════════════════════════════════════════
   MEMBER EMAILS — sent with Resend (the same service as the health email).
   ───────────────────────────────────────────────────────────────────────
     Dividend alerts   Regular + Premium   a company on your watchlist raises,
                                           cuts, starts or stops its dividend
     Weekly email      Regular + Premium   Saturday morning (Dubai time): your
                                           watchlist's week, the week's biggest
                                           results, the economy, new explainers
     Big-fund alerts   Premium             a famous fund bought or sold a company
                                           on your watchlist (each quarter)
   Members switch each one on or off on Membership → Your plan, or with the
   one-click unsubscribe link at the bottom of every email.
   Needs in Admin → APIs & More (or Railway variables):
     RESEND_API_KEY     your Resend key
     ALERTS_EMAIL_FROM  e.g. "Dr MoneyWise <alerts@drmoneywise.com>" — the
                        domain must be verified in Resend, otherwise Resend only
                        delivers to your own address
     BUSINESS_ADDRESS   optional, shown at the bottom of every email
   Each email is sent once (a log is kept in data/market/alerts-sent.json).
   ════════════════════════════════════════════════════════════════════════ */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { canAccess } from '../config.js';
import { readStore, updateStore } from './storeService.js';
import { readDividends, readResults } from './resultsService.js';

const DIR = path.join(process.cwd(), 'data', 'market');
const LOG = path.join(DIR, 'alerts-sent.json');
const SECRET_FILE = path.join(process.cwd(), 'data', '.alerts-secret');

export const EMAIL_KINDS = {
  dividends: { label: 'Dividend alerts', plan: 'regular', about: 'When a company on your watchlist raises, cuts, starts or stops its dividend.' },
  weekly: { label: 'Weekly email', plan: 'regular', about: 'Saturday morning: your watchlist’s week, the biggest results and the economy.' },
  funds: { label: 'Big-fund alerts', plan: 'premium', about: 'When a famous fund buys or sells a company on your watchlist (each quarter).' },
  report: { label: 'Monthly research report', plan: 'premium', about: 'On the 1st of each month: the month in figures, with a link to the full report.' },
  newsletter: { label: 'Newsletter', plan: 'free', about: 'About once a week: our best explainers, the biggest results and new research. Easy to stop at any time.' },
};

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

/* ── Small helpers ────────────────────────────────────────────────── */
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; } }
async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(`${file}.tmp`, JSON.stringify(data), 'utf8');
  await fs.rename(`${file}.tmp`, file);
}
async function secret() {
  try { return (await fs.readFile(SECRET_FILE, 'utf8')).trim(); } catch {
    const s = crypto.randomBytes(32).toString('hex');
    await fs.mkdir(path.dirname(SECRET_FILE), { recursive: true });
    await fs.writeFile(SECRET_FILE, s, 'utf8');
    return s;
  }
}
const sign = (s, userId, kind) => crypto.createHmac('sha256', s).update(`${userId}:${kind}`).digest('hex').slice(0, 32);

async function siteUrl() {
  // Before launch your own domain doesn't point at the site yet, so email links use
  // Railway's own address until search engines are switched on (launch day).
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN || '';
  const live = String(process.env.SEARCH_VISIBLE || '').toLowerCase() === 'yes';
  const domain = (!live && railway) ? railway : (await readStore()).settings?.siteDomain || process.env.SITE_DOMAIN || railway || '';
  return domain ? (domain.startsWith('http') ? domain : `https://${domain}`).replace(/\/$/u, '') : '';
}

/** Which emails a member gets (default: everything their plan includes). */
export function emailPrefsFor(user) {
  const prefs = user?.emailPrefs || {};
  const out = {};
  for (const [kind, info] of Object.entries(EMAIL_KINDS)) {
    const allowed = user?.role === 'admin' || canAccess(user?.plan || 'free', info.plan);
    out[kind] = { allowed, on: allowed && prefs[kind] !== false };
  }
  return out;
}

export async function saveEmailPrefs(userId, payload) {
  await updateStore((store) => {
    const u = store.users.find((x) => x.id === userId);
    if (!u) throw new Error('Member not found.');
    u.emailPrefs = { ...(u.emailPrefs || {}) };
    for (const kind of Object.keys(EMAIL_KINDS)) if (typeof payload?.[kind] === 'boolean') u.emailPrefs[kind] = payload[kind];
    return store;
  });
}

/** One-click unsubscribe from a link in an email. */
export async function unsubscribe(userId, kind, token) {
  if (!EMAIL_KINDS[kind] && kind !== 'all') return false;
  const s = await secret();
  if (!token || token !== sign(s, userId, kind)) return false;
  await updateStore((store) => {
    const u = store.users.find((x) => x.id === userId);
    if (!u) return store;
    u.emailPrefs = { ...(u.emailPrefs || {}) };
    for (const k of kind === 'all' ? Object.keys(EMAIL_KINDS) : [kind]) u.emailPrefs[k] = false;
    return store;
  });
  return true;
}

/* ── Sending ──────────────────────────────────────────────────────── */
export async function sendEmail({ to, subject, html, unsubscribeUrl = '' }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: true, message: 'No Resend key saved' };
  const from = process.env.ALERTS_EMAIL_FROM || process.env.HEALTH_EMAIL_FROM || 'Dr MoneyWise <onboarding@resend.dev>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, ...(unsubscribeUrl ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, message: `Resend said ${response.status}: ${body.message || body.name || 'unknown error'}` };
  return { ok: true };
}

function layout({ title, intro, sections, site, user, kind, token }) {
  const unsub = site ? `${site}/email/unsubscribe?u=${encodeURIComponent(user.id)}&k=${kind}&t=${token}` : '';
  const address = process.env.BUSINESS_ADDRESS ? `<br>${esc(process.env.BUSINESS_ADDRESS)}` : '';
  return {
    unsub,
    html: `<div style="background:#f1e8d6;padding:20px 0;font-family:Arial,Helvetica,sans-serif;color:#0a1128">
  <div style="max-width:620px;margin:0 auto;background:#fbf7ef;border-radius:14px;overflow:hidden;border:1px solid #d9ccb2">
    <div style="background:#0a1128;padding:16px 22px"><a href="${esc(site || '#')}" style="color:#c9a227;font:700 22px Georgia,serif;text-decoration:none">Dr MoneyWise</a></div>
    <div style="padding:20px 22px">
      <h1 style="font:700 22px Georgia,serif;margin:0 0 8px">${esc(title)}</h1>
      <p style="margin:0 0 16px;color:#4a5170">${intro}</p>
      ${sections.join('')}
    </div>
    <div style="padding:14px 22px;background:#f3ead6;font-size:12px;color:#4a5170">
      For education only, not financial advice. You get this because you are a Dr MoneyWise member${user.name ? ` (${esc(user.name)})` : ''}.
      ${site ? `<a href="${esc(site)}/membership" style="color:#1a2a9e">Change your emails</a>${unsub ? ` · <a href="${esc(unsub)}" style="color:#1a2a9e">Unsubscribe from these</a>` : ''}` : ''}${address}
    </div>
  </div></div>`,
  };
}
const section = (heading, inner) => `<div style="margin:0 0 18px"><h2 style="font:700 17px Georgia,serif;margin:0 0 8px;border-bottom:2px solid #c9a227;padding-bottom:4px">${esc(heading)}</h2>${inner}</div>`;
const line = (html) => `<p style="margin:0 0 8px;line-height:1.5">${html}</p>`;

/* ── Who gets what ────────────────────────────────────────────────── */
async function members() {
  const store = await readStore();
  return (store.users || []).filter((u) => u.email && u.status !== 'disabled');
}

const DIV_WORDS = { raised: 'raised its dividend', cut: 'cut its dividend', kept: 'kept its dividend the same', started: 'started paying a dividend', stopped: 'stopped its dividend', special: 'announced a one-off special dividend' };

/** Hourly: dividend alerts, big-fund alerts, and on Saturdays the weekly email. */
export async function runAlerts({ forceWeeklyTo = '', testUser = null } = {}) {
  if (!process.env.RESEND_API_KEY) return { ok: false, skipped: true, message: 'Skipped — no Resend key saved (member emails are off)' };
  const log = await readJson(LOG, {});
  const s = await secret();
  const site = await siteUrl();
  const users = testUser ? [testUser] : await members();
  let sent = 0; const failures = [];
  const mark = (key) => { log[key] = new Date().toISOString(); };
  const send = async (user, kind, subject, title, intro, sections) => {
    const token = sign(s, user.id, kind);
    const { html, unsub } = layout({ title, intro, sections, site, user, kind, token });
    const r = await sendEmail({ to: user.email, subject, html, unsubscribeUrl: unsub });
    if (r.ok) sent += 1; else failures.push(`${user.email}: ${r.message}`);
    return r.ok;
  };

  // 1. Dividend alerts (announcements from the last 3 days only)
  const testOnly = Boolean(forceWeeklyTo);
  const recentDivs = readDividends().filter((d) => Date.now() - new Date(`${d.filed}T00:00:00Z`).getTime() < 3 * 86400000 && d.action !== 'kept');
  for (const user of testOnly ? [] : users) {
    if (!emailPrefsFor(user).dividends.on) continue;
    const watch = new Set((user.watchlist || []).map((t) => String(t).toUpperCase()));
    const mine = recentDivs.filter((d) => watch.has(d.ticker) && !log[`div:${user.id}:${d.id}`]);
    if (!mine.length) continue;
    const items = mine.map((d) => line(`<strong><a href="${esc(site)}/stock/${esc(d.ticker)}" style="color:#0a1128">${esc(d.name)} (${esc(d.ticker)})</a></strong> ${esc(DIV_WORDS[d.action] || 'announced a dividend')}${d.amount ? `: <strong>${esc(d.amount)}</strong>` : ''}${d.previous ? ` (was ${esc(d.previous)})` : ''}. ${esc(d.summary || '')} <a href="${esc(d.url)}" style="color:#1a2a9e">Company announcement</a>`)).join('');
    const ok = await send(user, 'dividends', mine.length === 1 ? `${mine[0].ticker} ${DIV_WORDS[mine[0].action] || 'dividend news'}` : `Dividend news for ${mine.length} companies on your watchlist`,
      'Dividend news from your watchlist', 'A company you follow has announced a change to the cash it pays shareholders.', [section('What was announced', items)]);
    if (ok) for (const d of mine) mark(`div:${user.id}:${d.id}`);
  }

  // 2. Big-fund alerts (Premium), once per quarter per member
  const funds = await readJson(path.join(DIR, 'funds.json'), null);
  const period = funds?.funds?.map((f) => f.period).sort().at(-1);
  if (period && !testOnly) {
    for (const user of users) {
      if (!emailPrefsFor(user).funds.on || log[`funds:${user.id}:${period}`]) continue;
      const rows = [];
      for (const t of (user.watchlist || []).map((x) => String(x).toUpperCase())) {
        for (const p of funds.positions?.[t] || []) if (p.period === period && ['new', 'added', 'reduced', 'sold'].includes(p.change)) rows.push({ t, ...p });
      }
      if (!rows.length) { mark(`funds:${user.id}:${period}`); continue; }
      const words = { new: 'bought (new holding)', added: 'bought more', reduced: 'sold some', sold: 'sold all of its' };
      const items = rows.slice(0, 25).map((r) => line(`<strong>${esc(r.fund)}</strong> (${esc(r.manager)}) ${words[r.change]} <a href="${esc(site)}/stock/${esc(r.t)}" style="color:#0a1128"><strong>${esc(r.t)}</strong></a>.`)).join('');
      const ok = await send(user, 'funds', `Big funds traded ${rows.length === 1 ? rows[0].t : `${new Set(rows.map((r) => r.t)).size} of your companies`}`,
        'What the big funds did with your companies', `From the funds’ official reports for the quarter to ${esc(period)}. They are filed up to 45 days after the quarter ends, so they show what the funds held then.`, [section('Changes this quarter', items)]);
      if (ok) mark(`funds:${user.id}:${period}`);
    }
  }

  // 2b. Monthly research report (Premium), once per finished report
  if (!testOnly) {
    const { listReports } = await import('./reportService.js');
    const latest = (await listReports()).find((r) => !r.partial);
    if (latest && Date.now() - new Date(latest.createdAt).getTime() < 5 * 86400000) {
      for (const user of users) {
        if (!emailPrefsFor(user).report.on || log[`report:${user.id}:${latest.id}`]) continue;
        const ok = await send(user, 'report', `Your ${latest.month} research report`, `${latest.month}: ${latest.text.headline}`, 'The month in figures, explained simply.',
          [section('Executive summary', latest.text.summary.slice(0, 2).map((p) => line(esc(p))).join('') + line(`<a href="${esc(site)}/reports/${esc(latest.id)}" style="color:#1a2a9e;font-weight:700">Read the full report, with charts</a>`))]);
        if (ok) mark(`report:${user.id}:${latest.id}`);
      }
    }
  }

  // 3. Weekly email: Saturdays from 07:00 Dubai time (03:00 UTC)
  const now = new Date();
  const week = `${now.getUTCFullYear()}-${Math.ceil((((now - new Date(Date.UTC(now.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7)}`;
  const isSaturday = now.getUTCDay() === 6 && now.getUTCHours() >= 3;
  if (isSaturday || forceWeeklyTo) {
    const content = await weeklyContent(site);
    for (const user of users) {
      if (forceWeeklyTo && user.email !== forceWeeklyTo) continue;
      if (!forceWeeklyTo && (!emailPrefsFor(user).weekly.on || log[`weekly:${user.id}:${week}`])) continue;
      const sections = await weeklySections(user, content, site);
      const ok = await send(user, 'weekly', `Your week in money${user.name ? `, ${user.name.split(' ')[0]}` : ''}`, 'Your week in money', 'The week’s money news that matters to you, in plain English.', sections);
      if (ok && !forceWeeklyTo) mark(`weekly:${user.id}:${week}`);
    }
    // Premium idea lists: remember this week's matches so next week can say what's new
    if (!forceWeeklyTo && !testUser) {
      const { ideasFor, rememberMatches } = await import('./ideasService.js');
      for (const user of users) {
        if (!(user.ideas || []).length || !canAccess(user.plan || 'free', 'premium') || log[`ideas:${user.id}:${week}`]) continue;
        try { await rememberMatches(user.id, await ideasFor(user)); mark(`ideas:${user.id}:${week}`); } catch (error) { console.error(`[alerts] idea lists for ${user.email}: ${error.message}`); }
      }
    }
  }

  await writeJson(LOG, Object.fromEntries(Object.entries(log).filter(([, at]) => Date.now() - new Date(at).getTime() < 200 * 86400000)));
  if (failures.length) console.error(`[alerts] ${failures.length} emails failed: ${failures.slice(0, 3).join('; ')}`);
  return { ok: !failures.length || sent > 0, message: `${sent} emails sent${failures.length ? `; ${failures.length} failed (${failures[0]})` : ''}` };
}

/* ── Weekly email content ─────────────────────────────────────────── */
async function weeklyContent(site) {
  const { readEconomy } = await import('./dataEngine.js');
  const econ = (await readEconomy()).figures || {};
  const week = (readResults().items || []).filter((r) => Date.now() - new Date(`${r.filed}T00:00:00Z`).getTime() < 7 * 86400000 && r.simple);
  const store = await readStore();
  const explainers = (store.articles || []).filter((a) => a.status === 'published' && (a.contentType || 'learning') === 'learning')
    .sort((a, b) => String(b.publishAt).localeCompare(String(a.publishAt))).slice(0, 2);
  return { econ, week, explainers, site };
}

async function weeklySections(user, c, site) {
  const { readNews } = await import('./newsLinksService.js');
  const out = [];
  const watch = (user.watchlist || []).map((t) => String(t).toUpperCase()).slice(0, 10);
  if (watch.length) {
    const rows = [];
    for (const t of watch) {
      const res = c.week.find((r) => r.ticker === t);
      const div = readDividends().find((d) => d.ticker === t && Date.now() - new Date(`${d.filed}T00:00:00Z`).getTime() < 7 * 86400000);
      const news = (await readNews('stock', t))?.items?.slice(0, 2) || [];
      if (!res && !div && !news.length) continue;
      rows.push(`<div style="margin:0 0 12px"><a href="${esc(site)}/stock/${esc(t)}" style="color:#0a1128;font-weight:700">${esc(t)}</a>
        ${res ? line(`<strong>Results:</strong> ${esc(res.headline)}. ${esc(res.simple)}`) : ''}
        ${div ? line(`<strong>Dividend:</strong> ${esc(DIV_WORDS[div.action] || 'dividend news')}${div.amount ? ` (${esc(div.amount)})` : ''}.`) : ''}
        ${news.map((n) => line(`<a href="${esc(n.url)}" style="color:#1a2a9e">${esc(n.title)}</a> <span style="color:#4a5170">(${esc(n.domain)})</span>`)).join('')}</div>`);
    }
    out.push(section('Your watchlist this week', rows.length ? rows.join('') : line('A quiet week for the companies you follow: no results, dividend news or major headlines.')));
  } else {
    out.push(section('Your watchlist', line(`Add companies to your watchlist and this email will tell you what happened to them each week. <a href="${esc(site)}/#tools" style="color:#1a2a9e">Set up your watchlist</a>`)));
  }
  if ((user.ideas || []).length && canAccess(user.plan || 'free', 'premium')) {
    const { ideasFor } = await import('./ideasService.js');
    const lists = await ideasFor(user).catch(() => []);
    if (lists.length) {
      out.push(section('Ideas that match your rules', lists.map((i) => {
        const fresh = i.rows.filter((r) => i.newTickers.includes(r.ticker)).slice(0, 6);
        return `<div style="margin:0 0 12px"><strong>${esc(i.name)}</strong> <span style="color:#4a5170">(${esc(i.words || 'all companies')})</span>
          ${line(`<strong>${i.count}</strong> compan${i.count === 1 ? 'y matches' : 'ies match'} today${i.newTickers.length ? `, <strong>${i.newTickers.length} new</strong> this week` : ''}.`)}
          ${fresh.map((r) => line(`New: <a href="${esc(site)}/stock/${esc(r.ticker)}" style="color:#0a1128;font-weight:700">${esc(r.name)} (${esc(r.ticker)})</a>, score ${r.score ?? '–'}`)).join('')}</div>`;
      }).join('') + line(`<a href="${esc(site)}/ideas" style="color:#1a2a9e">See all your idea lists</a>. These companies match the rules you chose; they are not recommendations.`)));
    }
  }
  if (c.week.length) {
    out.push(section('The week’s biggest results', c.week.slice(0, 4).map((r) => line(`<strong><a href="${esc(site)}/stock/${esc(r.ticker)}" style="color:#0a1128">${esc(r.name)}</a>:</strong> ${esc(r.headline)}.`)).join('') + line(`<a href="${esc(site)}/results" style="color:#1a2a9e">All results, explained</a>`)));
  }
  const e = c.econ;
  const econLines = [
    e.inflation && `Prices are <strong>${e.inflation.value}%</strong> higher than a year ago (US inflation).`,
    e.interestRate && `The US central bank’s interest rate is <strong>${e.interestRate.value}%</strong>.`,
    e.mortgageRate && `A 30-year US mortgage costs <strong>${e.mortgageRate.value}%</strong> a year.`,
    e.tenYearYield && `The US government pays <strong>${e.tenYearYield.value}%</strong> to borrow for 10 years.`,
  ].filter(Boolean);
  if (econLines.length) out.push(section('The economy in numbers', econLines.map(line).join('') + line(`<a href="${esc(site)}/today" style="color:#1a2a9e">Markets today</a>`)));
  if (c.explainers.length) out.push(section('New to read', c.explainers.map((a) => line(`<a href="${esc(site)}/learn/${esc(a.slug)}" style="color:#1a2a9e;font-weight:700">${esc(a.headline)}</a>`)).join('')));
  return out;
}

/** Admin → Health → "Send me a test weekly email". */
export async function sendTestWeekly(adminUser) {
  const to = process.env.HEALTH_EMAIL_TO || adminUser?.email;
  if (!to) return { ok: false, message: 'Save your email address in "Daily health email" first.' };
  // The admin login is not a stored member, so a test member is used: your
  // watchlist if you have one, otherwise a few large companies as examples.
  const stored = (await members()).find((u) => u.email === adminUser?.email);
  const testUser = { id: adminUser?.id || 'admin', email: to, name: adminUser?.name || 'Admin', role: 'admin', plan: 'premium', watchlist: stored?.watchlist?.length ? stored.watchlist : ['AAPL', 'MSFT', 'KO', 'JPM'] };
  const r = await runAlerts({ forceWeeklyTo: to, testUser });
  return { ...r, message: r.ok && !r.message.startsWith('0') ? `Test weekly email sent to ${to}` : r.message };
}

/** Ask Dr MoneyWise: tells the member their question has been answered. */
export async function sendAskAnswer(q) {
  if (!q.email) return { ok: false, message: 'No email address' };
  const site = await siteUrl();
  const { html } = layout({
    title: 'Your question has been answered',
    intro: 'Thank you for asking Dr MoneyWise. Here is our answer.',
    sections: [
      section('You asked', line(esc(q.question))),
      section('Our answer', String(q.answer).split(/\n{2,}/u).map((p) => line(esc(p).replace(/\n/gu, '<br>'))).join('')),
      line(`<a href="${esc(site)}/ask" style="color:#1a2a9e;font-weight:700">See all your questions</a>. This is general information to help you learn, not personal financial advice.`),
    ],
    site, user: { id: q.userId, name: q.name }, kind: '', token: '',
  });
  return sendEmail({ to: q.email, subject: 'Your Dr MoneyWise question has been answered', html: html.replace(/ · <a href="[^"]*email\/unsubscribe[^"]*"[^>]*>Unsubscribe from these<\/a>/u, '') });
}

/* Shared with the newsletter (newsletterService.js) */
export { layout, section, line, sign, secret, siteUrl, esc };
