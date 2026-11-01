/* ════════════════════════════════════════════════════════════════════════
   WELCOME EMAILS — five short "getting started" emails for new members,
   and a reminder two days before a free trial ends.
   Checked every hour with the member emails (data engine job "alerts").
     Day 0   Welcome: your first three lessons
     Day 2   The bank versus prices: the savings calculator
     Day 4   How healthy are your companies? (Health Check, watchlist)
     Day 7   Find your corner: Shariah, dividends, retirement, property
     Day 10  Try Premium free for 7 days (members already paying get a
             "make the most of your plan" email instead)
   Only members who joined in the last 14 days get them (no backlog for
   older accounts), each email once. Members can turn them off in
   Membership → Your emails ("Getting-started emails"), and each email has
   a one-click unsubscribe link. Admin → Offers switches the series off.
   ════════════════════════════════════════════════════════════════════════ */

import { readStore, updateStore } from './storeService.js';
import { canAccess } from '../config.js';
import { layout, section, line, sign, secret, siteUrl, esc, sendEmail, emailPrefsFor } from './alertsService.js';

const DAY = 86400000;
const STEPS = [0, 2, 4, 7, 10];
const btn = (href, text) => `<p style="margin:10px 0 4px"><a href="${esc(href)}" style="display:inline-block;background:#c9a227;color:#0a1128;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:999px">${esc(text)}</a></p>`;
const a = (href, text) => `<a href="${esc(href)}" style="color:#1a2a9e;font-weight:700">${esc(text)}</a>`;

async function firstLessons(site) {
  try {
    const { COURSE, courseArticleMap } = await import('../data/learnCourse.js');
    const { getPublishedLearningArticles } = await import('./seoService.js');
    const map = courseArticleMap(await getPublishedLearningArticles());
    const out = [];
    for (const w of COURSE.beginner) for (const l of w.lessons) { const art = map.get(l.id); if (art && out.length < 3) out.push(art); }
    return out.map((x) => line(`• ${a(`${site}/learn/${x.slug}`, x.headline)}${x.readingTime ? ` <span style="color:#4a5170">(${esc(x.readingTime)})</span>` : ''}`)).join('');
  } catch { return ''; }
}

async function email(step, user, site, trialDays) {
  const first = String(user.name || '').split(' ')[0];
  const paid = user.plan && user.plan !== 'free';
  if (step === 0) {
    const lessons = await firstLessons(site);
    return {
      subject: `Welcome to Dr MoneyWise${first ? `, ${first}` : ''}`,
      title: 'Welcome: money and investing, simplified',
      intro: 'Thank you for joining. Over the next ten days we’ll send you four more short emails, each showing one useful part of the site. No jargon, and you can stop them at any time.',
      sections: [
        section('Start here: your first three lessons', `${lessons || line('Our free course starts from the very beginning: what a share is, saving versus investing, and why time matters more than timing.')}${btn(`${site}/learn/beginners`, 'Open the Young Guns course')}`),
        section('Every Saturday at 6am (Dubai time)', line('Our newsletter brings the week’s company news, a few clear charts and that week’s lessons, all in one email.')),
      ],
    };
  }
  if (step === 2) {
    return {
      subject: 'Is your bank quietly costing you money?',
      title: 'The bank versus prices',
      intro: 'If your savings earn 1% a year and prices rise 3%, your money buys about 2% less every year, even though the number in your account goes up.',
      sections: [
        section('See it with your own numbers', `${line('Our free calculator shows what your savings could grow to, and what they are really worth after rising prices. It takes a minute, and nothing you type leaves your device.')}${btn(`${site}/tools/savings-growth`, 'Try the savings calculator')}`),
        section('Then read', line(`${a(`${site}/learn/path`, 'The learning path')}: from your first savings to running a portfolio, in short steps.`)),
      ],
    };
  }
  if (step === 4) {
    return {
      subject: 'How healthy are the companies you own?',
      title: 'Check a company in one minute',
      intro: 'Every listed company on our site has a Financial Health Check: a simple score built from its own published figures (growth, profit, cash and debt), explained in plain words.',
      sections: [
        section('Try it on a company you know', `${line('Type any company into the search box, then open its Health Check.')}${btn(`${site}/health-check`, 'Open the Health Check')}`),
        section('Follow your companies', line(`Add companies to your ${a(`${site}/#tools`, 'watchlist')} and we’ll show their results, explained simply, as soon as they are published.`)),
      ],
    };
  }
  if (step === 7) {
    return {
      subject: 'Find your corner of investing',
      title: 'Find your corner',
      intro: 'Different people need different things from their money. Here are the guides readers use most.',
      sections: [
        section('Pick what fits you', [
          line(`• ${a(`${site}/shariah`, 'Shariah investing')}: companies and funds checked against five standards.`),
          line(`• ${a(`${site}/personal-finance`, 'Personal finance')}: budgets, emergency funds, debt and credit scores.`),
          line(`• ${a(`${site}/retirement`, 'Retirement')}: how much is enough, and how to get there.`),
          line(`• ${a(`${site}/property`, 'Property')}: home prices and rents in big cities.`),
          line(`• ${a(`${site}/top-10`, 'Top 10 lists')}: dividend payers, ETFs and more.`),
        ].join('')),
      ],
    };
  }
  // Day 10
  if (paid) {
    return {
      subject: 'Getting the most from your membership',
      title: 'Make the most of your plan',
      intro: 'Thank you for being a member. Three things members find most useful:',
      sections: [section('Worth a look', [
        line(`• ${a(`${site}/portfolio-health`, 'Portfolio health check')}: a score and heat map for every holding.`),
        line(`• ${a(`${site}/learn/advanced`, 'The Lords course')}: deeper lessons, each with a printable PDF workbook.`),
        line(`• ${a(`${site}/membership`, 'Your emails')}: choose the alerts you want.`),
      ].join(''))],
    };
  }
  return {
    subject: trialDays ? `Try Premium free for ${trialDays} days` : 'What Premium adds',
    title: trialDays ? `Premium, free for ${trialDays} days` : 'What Premium adds',
    intro: trialDays ? `See everything for ${trialDays} days, free. If it isn’t for you, cancel before the trial ends and you pay nothing. We’ll email you two days before.` : 'Premium is for readers who want to go deeper.',
    sections: [
      section('What you get', [
        line('• Every Lords lesson, including the Intensive, each with a printable PDF workbook'),
        line('• The full Financial Health Check and your portfolio health check'),
        line('• Chart alerts on your own companies, big-fund and insider moves'),
        line('• A market review every two weeks, and your own Premium section in the Saturday newsletter'),
        line('• No adverts'),
      ].join('') + btn(`${site}/membership#plans`, trialDays ? `Start my free ${trialDays}-day trial` : 'See Premium')),
      line('<span style="color:#4a5170">$19.99 a month or $179 a year after the trial. Cancel any time.</span>'),
    ],
  };
}

async function sendOne(user, kind, mail, site, s) {
  const { html, unsub } = layout({ title: mail.title, intro: esc(mail.intro), sections: mail.sections, site, user, kind, token: sign(s, user.id, kind) });
  return sendEmail({ to: user.email, subject: mail.subject, html, unsubscribeUrl: unsub });
}

export async function runWelcomeEmails() {
  if (!process.env.RESEND_API_KEY) return { sent: 0, message: 'no Resend key' };
  const store = await readStore();
  const settings = store.settings || {};
  const trialDays = Number(settings.premiumTrialDays ?? 7);
  const site = await siteUrl();
  const s = await secret();
  let sent = 0; let reminders = 0;
  const done = []; // [userId, field, value]
  for (const user of (store.users || []).filter((u) => u.email && u.role !== 'admin' && u.status !== 'disabled')) {
    const age = Date.now() - new Date(user.createdAt || 0).getTime();
    // 1. Getting-started series
    if (settings.welcomeEmails !== false && age < 14 * DAY && emailPrefsFor(user).welcome?.on) {
      const had = user.welcomeSent || [];
      const step = STEPS.find((d) => age >= d * DAY && age < (d + 3) * DAY && !had.includes(d));
      if (step !== undefined && sent < 80) {
        const mail = await email(step, user, site, user.trialUsed || canAccess(user.plan || 'free', 'premium') ? 0 : trialDays);
        const r = await sendOne(user, 'welcome', mail, site, s).catch((e) => ({ ok: false, message: e.message }));
        if (r.ok) { sent += 1; done.push([user.id, 'welcomeSent', [...had, step]]); } else console.error(`[welcome] ${user.email}: ${r.message}`);
      }
    }
    // 2. Trial ending in 2 days
    if (user.planStatus === 'trialing' && user.trialEndsAt && !user.trialReminded) {
      const left = new Date(user.trialEndsAt).getTime() - Date.now();
      if (left > 0 && left < 2.2 * DAY) {
        const when = new Date(user.trialEndsAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
        const mail = {
          subject: `Your free trial ends on ${when}`,
          title: 'Your free trial ends soon',
          intro: `Your Premium trial ends on ${when}. After that your plan continues and your first payment is taken, unless you cancel before then.`,
          sections: [
            section('Keep it', line('Nothing to do: everything stays unlocked.')),
            section('Not for you?', `${line('Cancel in a few clicks and you won’t pay anything.')}${btn(`${site}/membership`, 'Manage my plan')}`),
          ],
        };
        const { html } = layout({ title: mail.title, intro: esc(mail.intro), sections: mail.sections, site, user, kind: '', token: '' });
        const r = await sendEmail({ to: user.email, subject: mail.subject, html: html.replace(/ · <a href="[^"]*email\/unsubscribe[^"]*"[^>]*>Unsubscribe from these<\/a>/u, '') }).catch((e) => ({ ok: false, message: e.message }));
        if (r.ok) { reminders += 1; done.push([user.id, 'trialReminded', true]); }
      }
    }
  }
  if (done.length) {
    await updateStore((st) => {
      for (const [id, field, value] of done) { const u = st.users.find((x) => x.id === id); if (u) u[field] = value; }
      return st;
    });
  }
  return { sent, reminders, message: `${sent} welcome email${sent === 1 ? '' : 's'}, ${reminders} trial reminder${reminders === 1 ? '' : 's'}` };
}
