/* ════════════════════════════════════════════════════════════════════════
   FORUM PAGES (built on the server so Google can read the questions)
     /forum                       sections, latest, top contributors
     /forum/<section>             threads in one section (+ region, sort,
                                  company filter in Stocks)
     /forum/t/<id>/<slug>         one thread
     /forum/new                   ask a question
     /forum/search?q=             search
     /forum/rules                 forum rules
   Buttons that depend on who is signed in (reply, edit, report, admin
   tools) are switched on by public/forum.js.
   ════════════════════════════════════════════════════════════════════════ */

import { buildHeadTags, pageShell } from './seoService.js';
import { FORUM_LIMITS, FORUM_REGIONS, FORUM_SECTIONS, regionById, sectionById } from '../data/forumConfig.js';
import {
  discussedCompanies, forumStats, getThread, listThreads, searchForum, threadUrl, topContributors,
} from './forumService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const AVATAR_COLOURS = ['#1d4ed8', '#0f766e', '#a15c07', '#6d28d9', '#c2410c', '#15803d', '#be123c', '#0e7490'];
function avatar(name, role, size = 'md') {
  if (role === 'team') return `<span class="fa-avatar ${size} team" aria-hidden="true">DM</span>`;
  const initials = String(name || '?').split(/\s+/u).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `<span class="fa-avatar ${size}" style="background:${AVATAR_COLOURS[h % AVATAR_COLOURS.length]}" aria-hidden="true">${esc(initials)}</span>`;
}

function badge(role, plan) {
  if (role === 'team') return '<span class="fa-badge team">Dr MoneyWise Team</span>';
  if (plan === 'regular' || plan === 'premium') return '<span class="fa-badge member">Member</span>';
  return '';
}

function sectionStyle(section) {
  return section ? `style="--sec:${section.color};--sec-tint:${section.tint}"` : '';
}

function searchBox(value = '') {
  return `<form class="fa-search" method="get" action="/forum/search" role="search">
            <label class="sr-only" for="forumQ">Search the forum</label>
            <input id="forumQ" type="search" name="q" value="${esc(value)}" placeholder="Search questions, e.g. dividend tax or KO" />
            <button type="submit">Search</button>
          </form>`;
}

function threadRow(t, { showSection = false } = {}) {
  const section = sectionById(t.section);
  const region = regionById(t.region);
  return `
          <article class="fa-row" ${sectionStyle(section)}>
            <div class="fa-row-main">
              <a class="fa-row-title" href="${esc(t.url)}">${t.pinned ? '<span class="fa-pin" title="Pinned">📌</span> ' : ''}${esc(t.title)}</a>
              <p class="fa-row-meta">
                ${showSection && section ? `<a class="fa-chip sec" href="/forum/${section.id}">${esc(section.name)}</a>` : ''}
                ${t.ticker ? `<a class="fa-chip ticker" href="/forum/stocks?ticker=${encodeURIComponent(t.ticker)}">${esc(t.ticker)}</a>` : ''}
                ${region && region.id !== 'global' ? `<span class="fa-chip">${esc(region.name)}</span>` : ''}
                <span>${esc(t.authorName)}${t.authorRole === 'team' ? ' · Team' : ''}</span>
                <span>· ${ago(t.createdAt)}</span>
                ${t.answeredByTeam ? '<span class="fa-answered">✓ Answered by the team</span>' : ''}
              </p>
            </div>
            <div class="fa-row-stats">
              <span><strong>${t.replyCount}</strong> ${t.replyCount === 1 ? 'reply' : 'replies'}</span>
              <span><strong>${t.views}</strong> views</span>
              <span class="fa-last">${ago(t.lastActivityAt)}</span>
            </div>
          </article>`;
}

async function sidebar() {
  const [top, companies] = await Promise.all([topContributors(5), discussedCompanies(10)]);
  return `
        <aside class="fa-side">
          <div class="fa-card">
            <h3>Who can take part</h3>
            <ul class="fa-who">
              <li><strong>Everyone</strong> can read.</li>
              <li><strong>Free account:</strong> ask questions.</li>
              <li><strong>Members:</strong> reply, edit and join every conversation.</li>
            </ul>
            <a class="fa-btn gold" href="/forum/new">Ask a question</a>
          </div>
          <div class="fa-card">
            <h3>Top contributors</h3>
            ${top.length ? `<ol class="fa-top">${top.map((c) => `<li>${avatar(c.name, 'member', 'sm')}<span>${esc(c.name)}</span><small>${c.replies + c.threads} ${c.replies + c.threads === 1 ? 'post' : 'posts'}</small></li>`).join('')}</ol>`
              : '<p class="fa-muted">Be the first: helpful answers will show here.</p>'}
          </div>
          ${companies.length ? `<div class="fa-card">
            <h3>Companies being discussed</h3>
            <div class="fa-chips">${companies.map((c) => `<a class="fa-chip ticker" href="/forum/stocks?ticker=${encodeURIComponent(c.ticker)}">${esc(c.ticker)}</a>`).join('')}</div>
          </div>` : ''}
          <div class="fa-card fa-rules-mini">
            <h3>Forum rules in short</h3>
            <p>Be kind. No tips to buy or sell, no promises of returns, no links or contact details. Posts are checked by our moderators. <a href="/forum/rules">Full rules</a></p>
          </div>
        </aside>`;
}

const NOT_ADVICE = '<p class="fa-note">Forum posts are readers’ own views and experiences, not financial advice. Always do your own research. <a href="/disclaimer">Disclaimer</a></p>';

/* ── /forum ─────────────────────────────────────────────────────────── */
export async function renderForumHome(origin) {
  const [stats, latest] = await Promise.all([forumStats(), listThreads({ limit: 12 })]);
  const head = buildHeadTags({
    title: 'Community forum: money questions answered in plain English | Dr MoneyWise',
    description: 'Ask questions about stocks, ETFs, dividends, bonds, crypto, retirement and the economy, and learn from other everyday investors.',
    canonical: `${origin}/forum`,
  });
  const cards = FORUM_SECTIONS.map((s) => {
    const st = stats.bySection[s.id] || { threads: 0, replies: 0, latest: null };
    return `
          <a class="fa-section" href="/forum/${s.id}" ${sectionStyle(s)}>
            <span class="fa-section-icon" aria-hidden="true">${esc(s.icon)}</span>
            <span class="fa-section-body">
              <strong>${esc(s.name)}</strong>
              <span class="fa-section-plain">${esc(s.plain)}</span>
              <span class="fa-section-stats">${st.threads} ${st.threads === 1 ? 'thread' : 'threads'} · ${st.replies} replies${st.latest ? ` · latest ${ago(st.latest.lastActivityAt)}` : ''}</span>
            </span>
          </a>`;
  }).join('');
  const body = `
      <section class="fa-hero">
        <div>
          <p class="fa-kicker">Community forum</p>
          <h1>Ask, learn and share, in plain English</h1>
          <p>Questions about money, answered by everyday investors and our team. Organised by topic and region, and checked by our moderators.</p>
          ${searchBox()}
        </div>
        <div class="fa-hero-stats">
          <div><strong>${stats.threads}</strong><span>questions</span></div>
          <div><strong>${stats.replies}</strong><span>replies</span></div>
          <a class="fa-btn gold" href="/forum/new">Ask a question</a>
        </div>
      </section>
      <div class="fa-layout">
        <div class="fa-main">
          <h2 class="fa-h2">Choose a topic</h2>
          <div class="fa-sections">${cards}</div>
          <h2 class="fa-h2">Latest discussions</h2>
          <div class="fa-list">${latest.threads.map((t) => threadRow(t, { showSection: true })).join('') || '<p class="fa-empty">No questions yet. Be the first to ask!</p>'}</div>
          ${NOT_ADVICE}
        </div>
        ${await sidebar()}
      </div>
      <script src="/forum.js" defer></script>`;
  return pageShell({ head, body, active: 'forum' });
}

/* ── /forum/<section> ───────────────────────────────────────────────── */
export async function renderForumSection(origin, sectionId, params) {
  const section = sectionById(sectionId);
  if (!section) return null;
  const region = FORUM_REGIONS.some((r) => r.id === params.get('region')) ? params.get('region') : 'all';
  const sort = ['latest', 'popular', 'unanswered'].includes(params.get('sort')) ? params.get('sort') : 'latest';
  const ticker = section.id === 'stocks' && params.get('ticker') ? String(params.get('ticker')).toUpperCase().replace(/[^A-Z0-9-]/gu, '').slice(0, 10) : '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const perPage = 25;
  const { total, threads } = await listThreads({ section: section.id, region, ticker: ticker || undefined, sort, limit: perPage, offset: (page - 1) * perPage });
  const link = (over) => {
    const q = new URLSearchParams({ ...(region !== 'all' ? { region } : {}), ...(sort !== 'latest' ? { sort } : {}), ...(ticker ? { ticker } : {}), ...over });
    for (const [k, v] of [...q.entries()]) if (!v || v === 'all' || (k === 'sort' && v === 'latest') || (k === 'page' && v === '1')) q.delete(k);
    const s = q.toString();
    return `/forum/${section.id}${s ? `?${s.replace(/&/gu, '&amp;')}` : ''}`; // &amp; so "&region" isn't read as the ® sign
  };
  const head = buildHeadTags({
    title: `${section.name}${ticker ? ` — ${ticker}` : ''} | Dr MoneyWise forum`,
    description: `${section.plain} Questions and answers from everyday investors.`,
    canonical: `${origin}/forum/${section.id}${ticker ? `?ticker=${encodeURIComponent(ticker)}` : ''}`,
  });
  const companies = section.id === 'stocks' ? await discussedCompanies(14) : [];
  const pages = Math.ceil(total / perPage);
  const body = `
      <section class="fa-band" ${sectionStyle(section)}>
        <p class="fa-crumbs"><a href="/forum">Forum</a> › ${esc(section.name)}${ticker ? ` › ${esc(ticker)}` : ''}</p>
        <div class="fa-band-row">
          <div>
            <h1><span class="fa-band-icon" aria-hidden="true">${esc(section.icon)}</span> ${esc(section.name)}${ticker ? `: ${esc(ticker)}` : ''}</h1>
            <p>${esc(section.plain)}</p>
          </div>
          <a class="fa-btn light" href="/forum/new?section=${section.id}${ticker ? `&amp;ticker=${encodeURIComponent(ticker)}` : ''}">Ask a question</a>
        </div>
      </section>
      <div class="fa-layout">
        <div class="fa-main" ${sectionStyle(section)}>
          ${section.id === 'stocks' ? `
          <div class="fa-company">
            <form method="get" action="/forum/stocks" class="fa-company-form">
              <label for="tickerQ">Company discussions</label>
              <input id="tickerQ" name="ticker" value="${esc(ticker)}" placeholder="Ticker, e.g. AAPL" maxlength="10" />
              <button type="submit">Show</button>
              ${ticker ? `<a href="/forum/stocks">All stock threads</a> · <a href="/stock/${encodeURIComponent(ticker)}">${esc(ticker)} report card</a>` : ''}
            </form>
            ${companies.length ? `<div class="fa-chips">${companies.map((c) => `<a class="fa-chip ticker${c.ticker === ticker ? ' on' : ''}" href="${link({ ticker: c.ticker, page: '1' })}">${esc(c.ticker)}</a>`).join('')}</div>` : ''}
          </div>` : ''}
          <div class="fa-filters">
            <div class="fa-tabs" role="tablist" aria-label="Sort">
              ${[['latest', 'Latest'], ['popular', 'Popular'], ['unanswered', 'Unanswered']].map(([id, label]) => `<a role="tab" aria-selected="${sort === id}" class="${sort === id ? 'on' : ''}" href="${link({ sort: id, page: '1' })}">${label}</a>`).join('')}
            </div>
            <div class="fa-regions">
              ${[{ id: 'all', name: 'All regions' }, ...FORUM_REGIONS].map((r) => `<a class="fa-chip${region === r.id ? ' on' : ''}" href="${link({ region: r.id, page: '1' })}">${esc(r.name)}</a>`).join('')}
            </div>
          </div>
          <div class="fa-list">${threads.map((t) => threadRow(t)).join('') || `<p class="fa-empty">No questions here yet. <a href="/forum/new?section=${section.id}${ticker ? `&amp;ticker=${encodeURIComponent(ticker)}` : ''}">Ask the first one</a>.</p>`}</div>
          ${pages > 1 ? `<nav class="fa-pages">${page > 1 ? `<a href="${link({ page: String(page - 1) })}">← Newer</a>` : '<span></span>'}<span>Page ${page} of ${pages}</span>${page < pages ? `<a href="${link({ page: String(page + 1) })}">Older →</a>` : '<span></span>'}</nav>` : ''}
          ${NOT_ADVICE}
        </div>
        ${await sidebar()}
      </div>
      <script src="/forum.js" defer></script>`;
  return pageShell({ head, body, active: 'forum' });
}

/* ── /forum/t/<id>/<slug> ───────────────────────────────────────────── */
function postCard(p, { isThread, threadId }) {
  const removed = p.status === 'removed';
  return `
          <article class="fa-post${p.authorRole === 'team' ? ' team' : ''}" id="post-${esc(p.id)}" data-post-id="${esc(p.id)}" data-author-id="${esc(p.authorId)}" data-thread-id="${esc(threadId)}" data-is-thread="${isThread ? '1' : ''}" data-status="${esc(p.status)}" data-pinned="${p.pinned ? '1' : ''}" data-locked="${p.locked ? '1' : ''}">
            <header>
              ${avatar(p.authorName, p.authorRole)}
              <div>
                <strong>${esc(p.authorName)}</strong> ${badge(p.authorRole, p.authorPlan)}
                <span class="fa-when">${ago(p.createdAt)}${p.editedAt ? ' · edited' : ''}</span>
              </div>
            </header>
            <div class="fa-body" data-body>${removed ? '<p class="fa-muted">This post was removed by the moderators.</p>' : p.body.split(/\n{2,}/u).map((para) => `<p>${esc(para).replace(/\n/gu, '<br>')}</p>`).join('')}</div>
            <footer class="fa-actions" data-actions></footer>
          </article>`;
}

export async function renderForumThread(origin, id) {
  const t = await getThread(id, { countView: true });
  if (!t || t.status === 'removed') return null;
  if (t.status === 'pending') {
    // Held questions are not shown to the public until a moderator approves them.
    const head = buildHeadTags({ title: 'Waiting for a moderator | Dr MoneyWise forum', description: 'This question is being checked.', canonical: `${origin}/forum` });
    return pageShell({ head: `${head}\n    <meta name="robots" content="noindex" />`, body: `
      <div class="fa-main fa-rules"><h1 class="fa-thread-title">Waiting for a moderator</h1>
      <p>This question is being checked by our moderators and will appear here once approved. <a href="/forum">Back to the forum</a></p></div>`, active: 'forum' });
  }
  const section = sectionById(t.section);
  const region = regionById(t.region);
  const replies = t.replies.filter((r) => r.status === 'visible' || r.status === 'removed');
  const head = buildHeadTags({
    title: `${t.title} | Dr MoneyWise forum`,
    description: t.body.slice(0, 155),
    canonical: `${origin}${threadUrl(t)}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'DiscussionForumPosting',
      headline: t.title,
      text: t.body.slice(0, 500),
      datePublished: t.createdAt,
      author: { '@type': t.authorRole === 'team' ? 'Organization' : 'Person', name: t.authorName },
      interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: replies.filter((r) => r.status === 'visible').length },
      url: `${origin}${threadUrl(t)}`,
    },
  });
  const pendingNote = '';
  const body = `
      <section class="fa-band slim" ${sectionStyle(section)}>
        <p class="fa-crumbs"><a href="/forum">Forum</a> › <a href="/forum/${section.id}">${esc(section.name)}</a>${t.ticker ? ` › <a href="/forum/stocks?ticker=${encodeURIComponent(t.ticker)}">${esc(t.ticker)}</a>` : ''}</p>
      </section>
      <div class="fa-layout">
        <div class="fa-main" ${sectionStyle(section)}>
          ${pendingNote}
          <h1 class="fa-thread-title">${esc(t.title)}</h1>
          <p class="fa-row-meta fa-thread-meta">
            <a class="fa-chip sec" href="/forum/${section.id}">${esc(section.name)}</a>
            ${t.ticker ? `<a class="fa-chip ticker" href="/stock/${encodeURIComponent(t.ticker)}">${esc(t.ticker)} report card</a>` : ''}
            ${region ? `<span class="fa-chip">${esc(region.name)}</span>` : ''}
            <span>${t.views || 0} views</span>
            ${t.locked ? '<span class="fa-chip">Closed</span>' : ''}
          </p>
          ${postCard(t, { isThread: true, threadId: t.id })}
          <h2 class="fa-h2">${replies.filter((r) => r.status === 'visible').length} ${replies.length === 1 ? 'reply' : 'replies'}</h2>
          <div class="fa-replies">${replies.map((r) => postCard(r, { isThread: false, threadId: t.id })).join('') || '<p class="fa-empty">No replies yet.</p>'}</div>
          <div id="replyBox" class="fa-reply-box" data-thread-id="${esc(t.id)}" data-locked="${t.locked ? '1' : ''}">
            <p class="fa-muted">Loading…</p>
          </div>
          ${NOT_ADVICE}
        </div>
        ${await sidebar()}
      </div>
      <script src="/forum.js" defer></script>`;
  return pageShell({ head, body, active: 'forum' });
}

/* ── /forum/new ─────────────────────────────────────────────────────── */
export async function renderForumNew(origin, params) {
  const pre = sectionById(params.get('section'))?.id || '';
  const ticker = String(params.get('ticker') || '').toUpperCase().replace(/[^A-Z0-9-]/gu, '').slice(0, 10);
  const head = buildHeadTags({ title: 'Ask a question | Dr MoneyWise forum', description: 'Ask the community a question about money and investing.', canonical: `${origin}/forum/new` });
  const body = `
      <section class="fa-band slim" style="--sec:#0a1128;--sec-tint:#ece9e1">
        <p class="fa-crumbs"><a href="/forum">Forum</a> › Ask a question</p>
      </section>
      <div class="fa-layout">
        <div class="fa-main">
          <h1 class="fa-thread-title">Ask a question</h1>
          <p class="fa-muted">Anyone with a free account can ask. Members can reply. Questions are checked by our moderators before they appear, usually within seconds.</p>
          <form id="newThreadForm" class="fa-form" novalidate>
            <div class="fa-grid2">
              <label>Topic
                <select name="section" required>
                  <option value="">Choose a topic…</option>
                  ${FORUM_SECTIONS.map((s) => `<option value="${s.id}"${s.id === pre ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}
                </select>
              </label>
              <label>Region
                <select name="region">${FORUM_REGIONS.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>
              </label>
            </div>
            <label class="fa-ticker-field"${pre === 'stocks' ? '' : ' hidden'}>Company ticker (optional, for questions about one company)
              <input name="ticker" value="${esc(ticker)}" placeholder="e.g. KO or AAPL" maxlength="10" />
            </label>
            <label>Your question in one line
              <input name="title" required minlength="${FORUM_LIMITS.titleMin}" maxlength="${FORUM_LIMITS.titleMax}" placeholder="e.g. Is a 7% dividend yield too good to be true?" />
            </label>
            <label>More detail
              <textarea name="body" rows="8" required minlength="${FORUM_LIMITS.bodyMin}" maxlength="${FORUM_LIMITS.bodyMax}" placeholder="Give a little background so others can help. Please don’t share personal details, links or contact information."></textarea>
            </label>
            <p class="fa-form-msg" role="status" aria-live="polite"></p>
            <div class="fa-form-actions"><button class="fa-btn gold" type="submit">Post question</button> <a href="/forum/rules">Forum rules</a></div>
          </form>
          <div id="signInNeeded" class="fa-card" hidden>
            <h3>Sign in to ask</h3>
            <p>Create a free account (it takes a minute) or sign in, then come back to this page.</p>
            <a class="fa-btn gold" href="/#join">Sign in or create a free account</a>
          </div>
        </div>
        ${await sidebar()}
      </div>
      <script src="/forum.js" defer></script>`;
  return pageShell({ head: `${head}\n    <meta name="robots" content="noindex" />`, body, active: 'forum' });
}

/* ── /forum/search ──────────────────────────────────────────────────── */
export async function renderForumSearch(origin, q) {
  const results = await searchForum(q);
  const head = buildHeadTags({ title: `Search: ${q} | Dr MoneyWise forum`, description: 'Search the forum', canonical: `${origin}/forum` });
  const body = `
      <section class="fa-band slim" style="--sec:#0a1128;--sec-tint:#ece9e1">
        <p class="fa-crumbs"><a href="/forum">Forum</a> › Search</p>
      </section>
      <div class="fa-layout">
        <div class="fa-main">
          <h1 class="fa-thread-title">Search the forum</h1>
          ${searchBox(q)}
          <p class="fa-muted">${q ? `${results.length} ${results.length === 1 ? 'result' : 'results'} for “${esc(q)}”` : 'Type a word or a ticker.'}</p>
          <div class="fa-list">${results.map((t) => threadRow(t, { showSection: true })).join('') || (q ? `<p class="fa-empty">Nothing found. <a href="/forum/new">Ask it as a new question</a>.</p>` : '')}</div>
        </div>
        ${await sidebar()}
      </div>`;
  return pageShell({ head: `${head}\n    <meta name="robots" content="noindex" />`, body, active: 'forum' });
}

/* ── /forum/rules ───────────────────────────────────────────────────── */
export function renderForumRules(origin) {
  const head = buildHeadTags({ title: 'Forum rules | Dr MoneyWise', description: 'How our community forum works and what is allowed.', canonical: `${origin}/forum/rules` });
  const rules = [
    ['Be kind and respectful', 'Disagree with ideas, never attack people. No insults, hate, harassment or threats.'],
    ['Share views, not tips', 'Explain your thinking and experience. Do not tell people to buy or sell, and never promise returns ("can’t lose", "will 10x").'],
    ['No advertising or private deals', 'No links, phone numbers, emails, referral codes, or invitations to private chats or paid groups.'],
    ['Keep it on topic', 'Money, investing, markets, saving and the economy. Post in the topic and region that fit best.'],
    ['Protect your privacy', 'Do not share personal details, account numbers or documents. Our moderators remove them.'],
    ['Nothing here is advice', 'Posts are readers’ own views. Always do your own research and, for big decisions, speak to a licensed adviser.'],
  ];
  const body = `
      <section class="fa-band slim" style="--sec:#0a1128;--sec-tint:#ece9e1">
        <p class="fa-crumbs"><a href="/forum">Forum</a> › Rules</p>
      </section>
      <div class="fa-main fa-rules">
        <h1 class="fa-thread-title">Forum rules</h1>
        <p>Our forum is a friendly place for everyday people to learn about money. Every post is checked by our moderators, and readers can report anything that breaks these rules.</p>
        <ol>${rules.map(([h, p]) => `<li><strong>${esc(h)}.</strong> ${esc(p)}</li>`).join('')}</ol>
        <h2 class="fa-h2">How it works</h2>
        <ul>
          <li><strong>Anyone</strong> can read. With a <strong>free account</strong> you can ask questions. <strong>Members</strong> can also reply and edit their posts.</li>
          <li>New posts usually appear within seconds. Some are held for a moderator to check first.</li>
          <li>Posts reported by two readers are hidden until a moderator reviews them.</li>
          <li>Moderators may edit or remove posts and block accounts that break the rules. You are responsible for what you post (see our <a href="/terms">Terms</a>).</li>
        </ul>
      </div>`;
  return pageShell({ head, body, active: 'forum' });
}
