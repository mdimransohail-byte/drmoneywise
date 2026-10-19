/* ════════════════════════════════════════════════════════════════════════
   SITE HEALTH — one list of checks, shown in Admin → Health and emailed
   once a day (if an email key is saved).

   Each check: { area, label, status: 'ok' | 'warn' | 'fail', detail }
   Email uses Resend (resend.com, free 3,000 emails/month):
     RESEND_API_KEY   — saved in Admin → Health
     HEALTH_EMAIL_TO  — where the daily report goes
     HEALTH_EMAIL_FROM — optional; default "Dr MoneyWise <onboarding@resend.dev>"
       (the default sender can only email the address you signed up to
        Resend with — fine for a report to yourself)
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs/promises';
import path from 'node:path';

import { getDataStatus } from './dataEngine.js';
import { readStore } from './storeService.js';
import { getQuotaStatus } from './marketstackClient.js';
import { checkArticle } from './qualityService.js';

const HOUR = 60 * 60 * 1000;
const startedAt = Date.now();

// How old each job's last success may be before we warn / fail.
const JOB_LIMITS = {
  economy: { warn: 30 * HOUR, fail: 72 * HOUR },
  companies: { warn: 8 * 24 * HOUR, fail: 15 * 24 * HOUR },
  prices: { warn: 30 * HOUR, fail: 72 * HOUR },
  top10: { warn: 30 * HOUR, fail: 72 * HOUR },
  photos: { warn: 30 * HOUR, fail: 7 * 24 * HOUR },
  learning: { warn: 12 * HOUR, fail: 48 * HOUR },
  funds: { warn: 8 * 24 * HOUR, fail: 15 * 24 * HOUR },
  health: { warn: 30 * HOUR, fail: 72 * HOUR },
};

function ago(iso) {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / 60000))} min ago`;
  if (ms < 48 * HOUR) return `${Math.round(ms / HOUR)} h ago`;
  return `${Math.round(ms / (24 * HOUR))} days ago`;
}

export async function getHealthReport() {
  const checks = [];
  const add = (area, label, status, detail) => checks.push({ area, label, status, detail });

  /* Data jobs */
  const data = await getDataStatus();
  const freePrices = data.marketstackPlan === 'free';
  for (const job of data.jobs) {
    if (job.name === 'health') continue;
    const limits = JOB_LIMITS[job.name] || { warn: 30 * HOUR, fail: 72 * HOUR };
    const age = job.lastSuccessAt ? Date.now() - new Date(job.lastSuccessAt).getTime() : Infinity;
    let status = age <= limits.warn ? 'ok' : age <= limits.fail ? 'warn' : 'fail';
    if (job.name === 'prices' && freePrices) status = 'ok'; // deliberately off on the free (non-commercial) plan
    if (job.running) status = 'ok';
    add('Data', job.label, status, `${job.running ? 'Running now. ' : ''}Last success ${ago(job.lastSuccessAt)}${job.lastResult && job.lastResult !== 'ok' ? `; last try ${job.lastResult}: ${job.lastMessage || ''}` : ''}`);
  }
  const c = data.counts;
  add('Data', 'Companies saved', c.companies >= c.universe * 0.9 ? 'ok' : c.companies ? 'warn' : 'fail', `${c.companies} of ${c.universe}`);
  add('Data', 'Economy figures', c.economyFigures >= 5 ? 'ok' : c.economyFigures ? 'warn' : 'fail', `${c.economyFigures} of 5`);

  /* Marketstack quota */
  try {
    const q = getQuotaStatus();
    const share = q.limit ? q.used / q.limit : 0;
    add('Data', 'Price calls this month', share < 0.8 ? 'ok' : share < 1 ? 'warn' : 'fail', `${q.used} of ${q.limit} used (${freePrices ? 'free plan' : 'paid plan'})`);
  } catch { /* quota tracking unavailable */ }

  /* Explainers */
  const store = await readStore();
  const learning = store.articles.filter((a) => a.contentType === 'learning');
  const activeIds = store.meta?.learningRotation?.activeIds || [];
  const active = activeIds.map((id) => store.articles.find((a) => a.id === id)).filter(Boolean);
  add('Content', 'Explainers on the homepage', active.length >= 10 ? 'ok' : active.length >= 5 ? 'warn' : 'fail', `${active.length} of 10`);
  const pool = learning.filter((a) => a.status === 'scheduled').length;
  add('Content', 'Explainers waiting for the next change', pool >= 3 ? 'ok' : 'warn', `${pool} ready${pool < 3 ? ' — new ones are written automatically every 6 hours' : ''}`);
  const held = learning.filter((a) => a.status === 'draft' && (a.qualityIssues || []).length);
  add('Content', 'Held for review (failed checks)', held.length ? 'warn' : 'ok', held.length ? `${held.length}: ${held.slice(0, 3).map((a) => `"${a.headline}" — ${a.qualityIssues[0]}`).join('; ')}` : 'None');
  const liveProblems = store.articles
    .filter((a) => a.status === 'published')
    .map((a) => ({ a, q: checkArticle(a) }))
    // Explainers: any mention of AI counts. News pieces may report on AI
    // companies, so for those only writing-tool names / machine phrases count.
    .filter(({ a, q }) => q.issues.some((i) => (a.contentType === 'learning' && /"AI"|A\.I\.|artificial/u.test(i)) || /writing tool|machine|how it was written|placeholder/u.test(i)));
  add('Content', 'Published pieces with banned words', liveProblems.length ? 'fail' : 'ok', liveProblems.length ? liveProblems.slice(0, 3).map(({ a, q }) => `"${a.headline}" — ${q.issues[0]}`).join('; ') : 'None');
  const latest = learning.filter((a) => a.source === 'trending-auto').sort((x, y) => String(y.createdAt || y.publishAt).localeCompare(String(x.createdAt || x.publishAt)))[0];
  add('Content', 'Last explainer written automatically', latest && Date.now() - new Date(latest.createdAt || latest.publishAt).getTime() < 5 * 24 * HOUR ? 'ok' : 'warn', latest ? `${ago(latest.createdAt || latest.publishAt)}: "${latest.headline}"` : 'none yet');

  /* Forum */
  try {
    const { forumStats } = await import('./forumService.js');
    const fs2 = await forumStats();
    add('Forum', 'Posts waiting for a moderator', fs2.pending === 0 ? 'ok' : fs2.pending < 10 ? 'warn' : 'fail', fs2.pending ? `${fs2.pending} waiting — Admin → Forum` : 'None');
    add('Forum', 'Forum size', 'ok', `${fs2.threads} questions, ${fs2.replies} replies`);
  } catch (error) {
    add('Forum', 'Forum', 'warn', `Could not read forum data: ${error.message}`);
  }

  /* Keys */
  const key = (name) => Boolean(process.env[name]);
  const writer = ['CLAUDE_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'PERPLEXITY_API_KEY'].filter(key);
  add('Keys', 'Writing service', writer.length ? 'ok' : 'fail', writer.length ? `${writer.length} key(s) saved` : 'No key saved: explainers cannot be written');
  const paidNews = String(process.env.NEWS_API_PLAN || '').toLowerCase() === 'paid';
  add('Licences', 'News', 'ok', paidNews
    ? `Paid news plan switched on (${[key('NEWSDATA_API_KEY') && 'NewsData', key('MARKETAUX_API_KEY') && 'Marketaux'].filter(Boolean).join(' + ') || 'no key saved!'})`
    : 'TradingView news widget (free, allowed with credit). News feeds stay off until a paid plan: set NEWS_API_PLAN=paid');
  add('Licences', 'Share prices', 'ok', freePrices
    ? 'Off: Marketstack free plan is non-commercial. Switches on with Basic ($9.99/mo) + MARKETSTACK_MONTHLY_LIMIT=10000'
    : 'Marketstack paid plan (commercial use allowed)');
  add('Licences', 'Economy figures', 'ok', 'Official sources with credits shown: BLS, New York Fed, US Treasury, Freddie Mac (not FRED, whose terms bar commercial use)');
  add('Keys', 'Photos (Pexels)', key('PEXELS_API_KEY') ? 'ok' : 'warn', key('PEXELS_API_KEY') ? 'Saved' : 'Not saved: pages show no photos');
  add('Keys', 'Company logos (Logo.dev)', key('LOGO_DEV_KEY') ? 'ok' : 'warn', key('LOGO_DEV_KEY') ? 'Saved' : 'Not saved: initials shown instead');
  add('Keys', 'Prices (Marketstack)', key('MARKETSTACK_API_KEY') ? 'ok' : 'warn', key('MARKETSTACK_API_KEY') ? 'Saved' : 'Not saved');
  const stripe = String(process.env.STRIPE_SECRET_KEY || '');
  add('Keys', 'Payments (Stripe)', stripe.startsWith('sk_live_') ? 'ok' : 'warn', stripe.startsWith('sk_live_') ? 'Live' : stripe.startsWith('sk_test_') ? 'Test mode (no real payments)' : 'Not set up yet');
  add('Keys', 'Daily health email', key('RESEND_API_KEY') && key('HEALTH_EMAIL_TO') ? 'ok' : 'warn', key('RESEND_API_KEY') && key('HEALTH_EMAIL_TO') ? `To ${process.env.HEALTH_EMAIL_TO}` : 'Not set up — add a Resend key and your email in Admin → Health');

  /* Site */
  try {
    const probe = path.join(process.cwd(), 'data', '.health-probe');
    await fs.writeFile(probe, String(Date.now()));
    await fs.unlink(probe);
    add('Site', 'Saved-data folder writable', 'ok', 'Yes');
  } catch (error) {
    add('Site', 'Saved-data folder writable', 'fail', error.message);
  }
  const visible = String(process.env.SEARCH_VISIBLE || '').toLowerCase() === 'yes';
  add('Site', 'Search engines', visible ? 'ok' : 'warn', visible ? 'Visible to Google and Bing' : 'Hidden (switch on at launch)');
  const mem = process.memoryUsage().rss / 1024 / 1024;
  add('Site', 'Server memory', mem < 400 ? 'ok' : mem < 700 ? 'warn' : 'fail', `${Math.round(mem)} MB, running ${ago(new Date(startedAt).toISOString()).replace(' ago', '')}`);

  const summary = { ok: 0, warn: 0, fail: 0 };
  checks.forEach((x) => { summary[x.status] += 1; });
  return {
    checkedAt: new Date().toISOString(),
    overall: summary.fail ? 'fail' : summary.warn ? 'warn' : 'ok',
    summary,
    checks,
  };
}

/* ── Email ─────────────────────────────────────────────────────────── */
const WORD = { ok: 'OK', warn: 'Check', fail: 'Problem' };
const COLOUR = { ok: '#23704a', warn: '#9a6b00', fail: '#b3261e' };
const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');

function emailHtml(report, siteUrl) {
  const order = { fail: 0, warn: 1, ok: 2 };
  const rows = [...report.checks].sort((a, b) => order[a.status] - order[b.status]).map((x) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e6dcc6;color:${COLOUR[x.status]};font-weight:700;white-space:nowrap">${WORD[x.status]}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e6dcc6"><strong>${esc(x.label)}</strong><br><span style="color:#555">${esc(x.detail)}</span></td>
    </tr>`).join('');
  return `<div style="font-family:Arial,sans-serif;max-width:640px;color:#0a1128">
    <h2 style="margin:0 0 6px">Dr MoneyWise daily health: ${WORD[report.overall]}</h2>
    <p style="margin:0 0 14px;color:#555">${report.summary.ok} OK · ${report.summary.warn} to check · ${report.summary.fail} problems · ${new Date(report.checkedAt).toUTCString()}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table>
    ${siteUrl ? `<p style="margin-top:16px"><a href="${esc(siteUrl)}/admin.html">Open Admin</a></p>` : ''}
  </div>`;
}

export async function sendHealthEmail({ report } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.HEALTH_EMAIL_TO;
  if (!apiKey || !to) {
    return { ok: false, skipped: true, message: 'Skipped — no email key or address saved in Admin → Health' };
  }
  const r = report || (await getHealthReport());
  const from = process.env.HEALTH_EMAIL_FROM || 'Dr MoneyWise <onboarding@resend.dev>';
  const domain = (await readStore()).settings?.siteDomain || '';
  const siteUrl = domain ? (domain.startsWith('http') ? domain : `https://${domain}`) : '';
  const subject = `Dr MoneyWise health: ${WORD[r.overall]} (${r.summary.fail} problems, ${r.summary.warn} to check)`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html: emailHtml(r, siteUrl) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, message: `Email not sent (${response.status}): ${body.message || body.name || 'unknown error'}` };
  }
  return { ok: true, message: `Report emailed to ${to} (${WORD[r.overall]}: ${r.summary.fail} problems, ${r.summary.warn} to check)` };
}
