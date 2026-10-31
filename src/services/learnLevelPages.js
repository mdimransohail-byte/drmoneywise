/* ════════════════════════════════════════════════════════════════════════
   /learn/beginners, /learn/intermediate, /learn/advanced — the three levels
   (names set in Admin → APIs & More; defaults Young Guns, Knights, Lords)
   Each page: who it's for, then the course week by week (Week 1 has five
   lessons, later weeks four; src/data/learnCourse.js). Lessons not written
   yet are listed as "coming soon", so each week is complete at a glance.
   Then other lessons at that level, the next level, Premium, newsletter.
   ════════════════════════════════════════════════════════════════════════ */

import { LEVELS, levelEmblem, levelNames, levelOf } from '../data/learnLevels.js';
import { COURSE, courseArticleMap, lessonForArticle } from '../data/learnCourse.js';
import { buildHeadTags, getPublishedLearningArticles, pageShell } from './seoService.js';
import { newsletterSignupBox } from './newsletterPage.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const mins = (a) => Number(String(a.readingTime || '5').match(/\d+/u)?.[0] || 5);
const WEEK_COLOURS = ['#1baf7a', '#2a78d6', '#e8a33d', '#6250d6', '#e5566f', '#0fa3b1'];
const CROWN = '<svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#0a1128"/></svg>';

export function levelBySlug(slug) {
  return Object.values(LEVELS).find((l) => l.slug === slug) || null;
}

function weekBlock(L, week, map, i) {
  const c = WEEK_COLOURS[i % WEEK_COLOURS.length];
  const ready = week.lessons.filter((l) => map.has(l.id)).length;
  const rows = week.lessons.map((lesson, n) => {
    const a = map.get(lesson.id);
    if (!a) return `<li class="wk-l soon"><span class="wk-n">${n + 1}</span><div><strong>${esc(lesson.headline)}</strong><em>Coming soon</em></div></li>`;
    return `<li class="wk-l" data-lesson="${esc(a.slug)}"><a href="/learn/${esc(a.slug)}">${a.heroImage?.url ? `<img src="${esc(a.heroImage.url)}" alt="" loading="lazy">` : `<span class="wk-n">${n + 1}</span>`}<div><strong>${esc(a.headline)}</strong><em>${esc(a.readingTime || '5 min read')}${a.format === 2 ? ' · infographic and quiz' : ''}${L.premium ? ' · Premium' : ''}</em></div></a></li>`;
  }).join('');
  return `<section class="wk" id="week-${week.week}" style="--c:${c}">
          <div class="wk-head"><span class="wk-badge">Week ${week.week}</span><h3>${esc(week.title)}</h3><span class="wk-count">${ready} of ${week.lessons.length} ready</span><span class="wk-mine" hidden></span></div>
          <ol class="wk-list">${rows}</ol>
        </section>`;
}

export async function renderLevelPage(slug, origin) {
  const L = levelBySlug(slug);
  if (!L) return null;
  const names = await levelNames();
  const name = names[L.id];
  const all = await getPublishedLearningArticles();
  const lessons = all.filter((a) => levelOf(a) === L.id);
  const map = courseArticleMap(lessons);
  const weeks = COURSE[L.id] || [];
  const extra = lessons.filter((a) => !lessonForArticle(a));
  const total = lessons.reduce((n, a) => n + mins(a), 0);
  const planned = weeks.reduce((n, w) => n + w.lessons.length, 0);
  const order = ['beginner', 'intermediate', 'technical', 'lords'];
  const next = LEVELS[order[order.indexOf(L.id) + 1]] || null;
  const prev = LEVELS[order[order.indexOf(L.id) - 1]] || null;

  const head = buildHeadTags({
    title: `${name}: ${L.premium ? 'advanced' : 'free'} money lessons for ${L.who.toLowerCase()}, week by week | Dr MoneyWise`,
    description: `${L.tagline} A ${weeks.length}-week course of plain-English lessons with worked examples, infographics and a quick check at the end of each.`,
    canonical: `${origin}/learn/${L.slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: `${name}: ${L.tagline}`,
      description: L.intro,
      provider: { '@type': 'Organization', name: 'Dr MoneyWise', sameAs: origin },
      isAccessibleForFree: !L.premium,
      inLanguage: 'en-GB',
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: `P${weeks.length}W` },
    },
  });

  const extraCards = extra.map((a) => `
          <a class="lv-card" href="/learn/${esc(a.slug)}">
            ${a.heroImage?.url ? `<img src="${esc(a.heroImage.url)}" alt="" loading="lazy">` : `<span class="lv-card-ph" style="--c:${L.colour}">${levelEmblem(L.id, 48)}</span>`}
            <div><strong>${esc(a.headline)}</strong><span>${esc(String(a.summary || '').slice(0, 130))}${String(a.summary || '').length > 130 ? '…' : ''}</span><em>${esc(a.readingTime || '5 min read')}</em></div>
          </a>`).join('');

  const promos = [
    prev ? `<a class="ax-promo" href="/learn/${prev.slug}" style="--c:${prev.colour}">${levelEmblem(prev.id, 44)}<span><b>Need a refresher?</b>The ${esc(names[prev.id])} lessons cover the ground before this level.</span></a>` : '',
    next && !next.premium ? `<a class="ax-promo" href="/learn/${next.slug}" style="--c:${next.colour}">${levelEmblem(next.id, 44)}<span><b>Ready for the next level?</b>Join the ${esc(names[next.id])}: ${esc(next.tagline.charAt(0).toLowerCase() + next.tagline.slice(1))} ${next.paid ? 'For members.' : 'Free.'}</span></a>` : '',
    !L.premium ? `<a class="ax-promo prem" href="/learn/advanced"><span class="ax-crown" aria-hidden="true">${CROWN}</span><span><b>Become a ${esc(names.lords.replace(/s$/u, ''))}</b>The ${esc(names.lords)} lessons go deeper: valuing a company, the economy’s warning lights and advanced portfolio craft. Premium.</span></a>` : `<a class="ax-promo prem" href="/membership"><span class="ax-crown" aria-hidden="true">${CROWN}</span><span><b>Premium: $19.99 a month or $179 a year</b>Every ${esc(names.lords)} lesson, the Financial Health Check in full, the portfolio check and no adverts.</span></a>`,
  ].filter(Boolean).join('');

  const body = `
      <section class="block lvp" style="--c:${L.colour};--c2:${L.colour2}">
        <p class="crumbs"><a href="/learn">Learn</a> › ${esc(name)}</p>
        <div class="lvp-hero${L.premium ? ' prem' : ''}">
          <div class="lvp-emblem">${levelEmblem(L.id, 96)}</div>
          <div class="lvp-text">
            <span class="pf-badge ${L.premium ? 'prem' : L.paid ? 'mem' : 'free'}">${L.premium ? 'Premium' : L.paid ? 'Members' : 'Free'} · ${esc(L.who)}</span>
            <h1>${esc(name)}</h1>
            <p class="lvp-tag">${esc(L.tagline)}</p>
            <p>${esc(L.intro)}</p>
            <ul class="lvp-promise">${L.promise.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          </div>
          <div class="lvp-stats">
            <div><strong>${weeks.length}</strong><span>weeks</span></div>
            <div><strong>${map.size}/${planned}</strong><span>lessons ready</span></div>
            <div><strong>${total}</strong><span>minutes of reading</span></div>
          </div>
        </div>

        <div class="lp-me" data-level-progress="${L.id}">
          <div class="lp-me-bar"><i style="width:0%"></i></div>
          <p class="lp-me-text">Sign in (free) to tick off lessons as you read them and track your progress from any device. <a href="/#join">Sign in or join free →</a></p>
        </div>
        ${L.id === 'technical' ? `<form class="ta-form lv-ta" onsubmit="var t=this.t.value.trim().toUpperCase();if(t){location.href='/technical/'+encodeURIComponent(t)}return false"><label for="lvTa">Try it now: the Chart check for any US-listed company</label><input id="lvTa" name="t" placeholder="e.g. AAPL" maxlength="10" required><button class="pf-btn gold" type="submit">Check the chart</button></form>` : ''}
        <nav class="wk-jump" aria-label="Weeks">${weeks.map((w, i) => `<a href="#week-${w.week}" style="--c:${WEEK_COLOURS[i % 6]}">Week ${w.week}<span>${esc(w.title)}</span></a>`).join('')}</nav>
        <div class="wk-grid">${weeks.map((w, i) => weekBlock(L, w, map, i)).join('')}</div>
        <p class="lvp-tip">${L.premium ? 'Premium members can read every lesson. Others can read the opening of each one.' : L.paid ? 'Regular and Premium members can read every lesson; others can read the opening. Try each idea on a real company with the <a href="/technical">Chart check</a>.' : 'One week at a time works well: read a lesson a day, take the quick check at the end, then move on.'} Our free newsletter features one week of the course in every issue.</p>

        ${extraCards ? `<h2 class="lvp-h">More ${esc(name)} lessons</h2><div class="lv-cards">${extraCards}</div>` : ''}

        <div class="ax-row">${promos}</div>
        ${newsletterSignupBox(`level-${L.slug}`)}
        <p class="note-box">These lessons explain how money and investing work in general. They are not personal advice. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>
      <script src="/newsletter.js" defer></script>
      <script src="/learnprogress.js" defer></script>`;
  return pageShell({ head, body, active: 'learn' });
}

/** The "Choose your level" cards at the top of /learn. */
export async function levelChooserHtml() {
  const names = await levelNames();
  const all = await getPublishedLearningArticles();
  const card = (L) => {
    const lessons = all.filter((a) => levelOf(a) === L.id).length;
    const weeks = (COURSE[L.id] || []).length;
    return `<a class="lc-card${L.premium ? ' prem' : ''}" href="/learn/${L.slug}" style="--c:${L.colour};--c2:${L.colour2}">
          ${levelEmblem(L.id, 64)}<span class="lc-free">${L.premium ? 'Premium' : L.paid ? 'Members' : 'Free'}</span><strong>${esc(names[L.id])}</strong><em>${esc(L.who)}</em><span>${esc(L.tagline)}</span><b>${weeks}-week course · ${lessons} lesson${lessons === 1 ? '' : 's'} →</b><span class="lc-mine" data-level-mine="${L.id}" hidden></span></a>`;
  };
  return `<h2 class="lvp-h">Choose your level</h2>
        <div class="lc-row lc-4">${card(LEVELS.beginner)}${card(LEVELS.intermediate)}${card(LEVELS.technical)}${card(LEVELS.lords)}</div>`;
}
