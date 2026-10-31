/* ════════════════════════════════════════════════════════════════════════
   /learn/path — Your learning path (free). Every step is written into the
   page (so search engines and readers without JavaScript see it all);
   public/learnpath.js picks the starting level and saves ticks.
   ════════════════════════════════════════════════════════════════════════ */

import { PATH_LEVELS } from '../data/learningPath.js';
import { GLOSSARY, slugify } from '../data/glossary.js';
import { buildHeadTags, getPublishedLearningArticles, pageShell } from './seoService.js';
import { adSlot } from './adService.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

export async function renderLearningPath(origin) {
  const articles = await getPublishedLearningArticles();
  const byTopic = new Map(articles.filter((a) => a.trendingTopic).map((a) => [a.trendingTopic, a]));
  const known = new Set(GLOSSARY.map((g) => g.term));
  const total = PATH_LEVELS.reduce((a, l) => a + l.steps.length, 0);
  const head = buildHeadTags({
    title: 'Your learning path: investing step by step | Dr MoneyWise',
    description: `${total} short steps from your first savings to running a portfolio, in plain English, with explainers, money words and tools to try. Free.`,
    canonical: `${origin}/learn/path`,
  });
  const levels = PATH_LEVELS.map((level, li) => `
        <section class="lp-level" id="level-${level.id}" data-level="${level.id}" style="--c:${level.colour}">
          <div class="lp-level-head"><span class="lp-num">${li + 1}</span><div><h2>${esc(level.name)}</h2><p>${esc(level.intro)}</p></div>
            <div class="lp-progress" data-progress="${level.id}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="none" stroke="#e8e0cc" stroke-width="6"/><circle class="lp-ring" cx="22" cy="22" r="18" fill="none" stroke="${level.colour}" stroke-width="6" stroke-linecap="round" stroke-dasharray="0 113" transform="rotate(-90 22 22)"/></svg><b>0/${level.steps.length}</b></div></div>
          <ol class="lp-steps">${level.steps.map((s, si) => {
            const art = s.topic ? byTopic.get(s.topic) : null;
            const words = s.words.filter((w) => known.has(w));
            return `
            <li class="lp-step" data-step="${level.id}:${s.id}">
              <div class="lp-dot">${si + 1}</div>
              <div class="lp-card">
                <h3>${esc(s.title)}</h3>
                <p>${esc(s.plain)}</p>
                <ul>${s.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
                <div class="lp-links">
                  ${art ? `<a class="lp-read" href="/learn/${esc(art.slug)}">Read: ${esc(art.headline)}</a>` : ''}
                  <a class="lp-try" href="${esc(s.tryIt[1])}">${esc(s.tryIt[0])} →</a>
                </div>
                ${words.length ? `<p class="lp-words">Money words: ${words.map((w) => `<a href="/glossary/${slugify(w)}">${esc(w)}</a>`).join(' · ')}</p>` : ''}
                <label class="lp-done"><input type="checkbox" data-done="${level.id}:${s.id}"> I’ve done this step</label>
              </div>
            </li>`;
          }).join('')}
          </ol>
        </section>`).join('');
  const body = `
      <section class="block lp-page">
        <p class="crumbs"><a href="/learn">Learn</a> › Your learning path</p>
        <div class="lp-hero"><div><span class="pf-badge free">Free</span><h1>Your learning path</h1><p>${total} short steps, from your first savings to running a portfolio. Each one takes a few minutes: read the lesson, try it on the site, tick it off.</p></div>
          <div class="lp-total"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="12"/><circle id="lpRing" cx="60" cy="60" r="50" fill="none" stroke="url(#lpGold)" stroke-width="12" stroke-linecap="round" stroke-dasharray="0 315" transform="rotate(-90 60 60)"/><defs><linearGradient id="lpGold"><stop offset="0" stop-color="#f7d07c"/><stop offset="1" stop-color="#c9a227"/></linearGradient></defs></svg><div><strong id="lpCount">0</strong><span>of ${total} done</span></div></div></div>
        <div class="lp-tabs" role="tablist">${PATH_LEVELS.map((l, i) => `<button data-tab="${l.id}" style="--c:${l.colour}"><span>${i + 1}</span>${esc(l.name)}</button>`).join('')}</div>
        <p class="lp-note" id="lpNote">Start wherever suits you. Members who fill in their profile start at the level that fits their investing experience, and their ticks are saved to their account.</p>
        ${levels}
        ${adSlot('in-content')}
        <p class="note-box">These lessons explain how investing works in general. They are not personal advice. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>
      <script src="/learnpath.js" defer></script>`;
  return pageShell({ head, body, active: 'learn' });
}
