/* ════════════════════════════════════════════════════════════════════════
   /newsletter — sign-up form and the archive of past issues
   /newsletter/<id> — one issue on the website
   /newsletter/confirm and /newsletter/unsubscribe — the email links
   Also: newsletterSignupBox() for the homepage and other pages.
   ════════════════════════════════════════════════════════════════════════ */

import { publicIssues, newsletterHtml } from './newsletterService.js';
import { buildHeadTags, pageShell } from './seoService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const COLOURS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#6250d6', '#e34948'];

export function newsletterSignupBox(where = 'page') {
  return `<form class="nl-box" data-nl-form data-source="${esc(where)}">
          <div class="nl-text"><span class="nl-icon" aria-hidden="true">✉</span><div><strong>Get the free weekly newsletter</strong><span>Our best plain-English explainers, the biggest company results and new research. About once a week, easy to stop.</span></div></div>
          <div class="nl-fields"><label class="sr-only" for="nl-${esc(where)}">Your email</label><input id="nl-${esc(where)}" type="email" name="email" required maxlength="160" placeholder="Your email address" autocomplete="email"><button class="pf-btn gold" type="submit">Sign me up</button></div>
          <p class="nl-msg" aria-live="polite"></p>
        </form>`;
}

export async function renderNewsletterPage(origin) {
  const issues = await publicIssues();
  const head = buildHeadTags({
    title: 'Free weekly money newsletter | Dr MoneyWise',
    description: 'Sign up for the free Dr MoneyWise newsletter: plain-English explainers, the biggest company results and new research, about once a week.',
    canonical: `${origin}/newsletter`,
  });
  const body = `
      <section class="block nl-page">
        <div class="ak-hero"><div><span class="pf-badge free">Free</span><h1>The Dr MoneyWise newsletter</h1><p>About once a week we send our best plain-English explainers, the biggest company results and what’s new on the site. It’s free, and every email has a one-click unsubscribe link.</p></div><div class="ak-mark" aria-hidden="true">✉</div></div>
        ${newsletterSignupBox('newsletter-page')}
        <div class="nl-promise">
          <div style="--c:#2a78d6"><b>1</b><span>email about once a week</span></div>
          <div style="--c:#1baf7a"><b>0</b><span>adverts sold on your address: we never share it</span></div>
          <div style="--c:#eb6834"><b>1 click</b><span>to stop at any time</span></div>
        </div>
        <h2>Past issues</h2>
        ${issues.length ? `<div class="nl-archive">${issues.map((x, i) => `<a class="nl-issue" href="/newsletter/${esc(x.id)}" style="--c:${COLOURS[i % COLOURS.length]}"><small>${esc(x.dateLabel || '')}</small><strong>${esc(x.subject)}</strong><span>${esc((x.items || []).map((it) => it.heading).filter(Boolean).slice(0, 3).join(' · '))}</span></a>`).join('')}</div>`
          : '<div class="pf-panel"><p>The first issue goes out soon after launch. Sign up above and it will come straight to your inbox; past issues will also be listed here.</p></div>'}
        <p class="note-box">Members can switch the newsletter on or off on their <a href="/membership">Membership page</a>. Read how we look after your details in our <a href="/privacy">privacy policy</a>.</p>
      </section>
      <script src="/newsletter.js" defer></script>`;
  return pageShell({ head, body, active: 'learn' });
}

export async function renderNewsletterIssue(origin, id) {
  const issue = (await publicIssues()).find((x) => x.id === id);
  if (!issue) return null;
  const head = buildHeadTags({ title: `${issue.subject} | Dr MoneyWise newsletter`, description: issue.preheader || 'An issue of the Dr MoneyWise newsletter.', canonical: `${origin}/newsletter/${id}` });
  // The email's own design, shown inside the page
  const inner = newsletterHtml(issue, { site: origin }).replace(/^[\s\S]*?<body[^>]*>/u, '').replace(/<\/body>[\s\S]*$/u, '');
  const body = `
      <section class="block nl-page">
        <p class="nl-back"><a href="/newsletter">← All newsletters</a></p>
        <div class="nl-web">${inner}</div>
        ${newsletterSignupBox('issue')}
      </section>
      <script src="/newsletter.js" defer></script>`;
  return pageShell({ head, body, active: 'learn' });
}

export function renderNewsletterMessage(origin, { title, text, ok = true }) {
  const head = buildHeadTags({ title: `${title} | Dr MoneyWise`, description: text, canonical: `${origin}/newsletter` });
  return pageShell({ head, active: 'learn', body: `<section class="block" style="max-width:640px;margin:40px auto"><h1>${ok ? '✅ ' : ''}${esc(title)}</h1><p class="lede-dark">${esc(text)}</p><p><a class="pill-gold" href="/newsletter">Newsletter page</a> <a class="pill-gold" href="/learn">Start learning</a></p></section>` });
}
