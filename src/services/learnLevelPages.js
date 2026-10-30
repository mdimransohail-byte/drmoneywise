/* ════════════════════════════════════════════════════════════════════════
   /learn/beginners and /learn/intermediate — the two free levels
   (names set in Admin → APIs & More; defaults "Young Turks" and "Knights")
   Each page: who it's for, the starter steps from the learning path, every
   explainer at that level, then the next level, Premium and the newsletter.
   ════════════════════════════════════════════════════════════════════════ */

import { LEVELS, levelEmblem, levelNames, levelOf } from '../data/learnLevels.js';
import { PATH_LEVELS } from '../data/learningPath.js';
import { buildHeadTags, getPublishedLearningArticles, pageShell } from './seoService.js';
import { newsletterSignupBox } from './newsletterPage.js';

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const mins = (a) => Number(String(a.readingTime || '5').match(/\d+/u)?.[0] || 5);

export function levelBySlug(slug) {
  return Object.values(LEVELS).find((l) => l.slug === slug) || null;
}

export async function renderLevelPage(slug, origin) {
  const L = levelBySlug(slug);
  if (!L) return null;
  const names = await levelNames();
  const name = names[L.id];
  const other = L.id === 'beginner' ? LEVELS.intermediate : LEVELS.beginner;
  const all = await getPublishedLearningArticles();
  const lessons = all.filter((a) => !(a.tags || []).includes('deeper') && levelOf(a) === L.id);
  const deeper = all.filter((a) => (a.tags || []).includes('deeper')).slice(0, 3);
  const path = PATH_LEVELS.find((p) => p.id === L.pathLevel);
  const total = lessons.reduce((n, a) => n + mins(a), 0);

  const head = buildHeadTags({
    title: `${name}: free money lessons for ${L.who.toLowerCase()} | Dr MoneyWise`,
    description: `${L.tagline} ${lessons.length} free plain-English lessons with worked examples, infographics and a quick check at the end of each.`,
    canonical: `${origin}/learn/${L.slug}`,
  });

  const steps = path ? path.steps.map((s, i) => `
          <a class="lv-step" href="/learn/path#level-${path.id}" style="--c:${['#1baf7a', '#2a78d6', '#e8a33d', '#6250d6', '#e5566f', '#0fa3b1'][i % 6]}">
            <span class="lv-step-n">${i + 1}</span><strong>${esc(s.title)}</strong><span>${esc(s.plain.split('. ')[0].replace(/\.+$/u, ''))}.</span></a>`).join('') : '';

  const cards = lessons.map((a) => `
          <a class="lv-card" href="/learn/${esc(a.slug)}">
            ${a.heroImage?.url ? `<img src="${esc(a.heroImage.url)}" alt="" loading="lazy">` : `<span class="lv-card-ph" style="--c:${L.colour}">${levelEmblem(L.id, 48)}</span>`}
            <div><strong>${esc(a.headline)}</strong><span>${esc(String(a.summary || '').slice(0, 130))}${String(a.summary || '').length > 130 ? '…' : ''}</span><em>${esc(a.readingTime || '5 min read')}${a.format === 2 ? ' · with infographic and quiz' : ''}</em></div>
          </a>`).join('');

  const body = `
      <section class="block lvp" style="--c:${L.colour};--c2:${L.colour2}">
        <p class="crumbs"><a href="/learn">Learn</a> › ${esc(name)}</p>
        <div class="lvp-hero">
          <div class="lvp-emblem">${levelEmblem(L.id, 96)}</div>
          <div class="lvp-text">
            <span class="pf-badge">Free · ${esc(L.who)}</span>
            <h1>${esc(name)}</h1>
            <p class="lvp-tag">${esc(L.tagline)}</p>
            <p>${esc(L.intro)}</p>
            <ul class="lvp-promise">${L.promise.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          </div>
          <div class="lvp-stats">
            <div><strong>${lessons.length}</strong><span>lesson${lessons.length === 1 ? '' : 's'}</span></div>
            <div><strong>${total}</strong><span>minutes of reading</span></div>
            <div><strong>${path ? path.steps.length : 0}</strong><span>starter steps</span></div>
          </div>
        </div>

        ${steps ? `<h2 class="lvp-h">Start here: ${path.steps.length} first steps</h2><div class="lv-steps">${steps}</div>` : ''}

        <h2 class="lvp-h">All ${esc(name)} lessons</h2>
        ${cards ? `<div class="lv-cards">${cards}</div>` : '<p class="note-box">The first lessons at this level are being written now. Meanwhile, the starter steps above and <a href="/learn/path">your learning path</a> cover the basics.</p>'}

        <div class="ax-row">
          <a class="ax-promo" href="/learn/${other.slug}" style="--c:${other.colour}">${levelEmblem(other.id, 44)}<span><b>${L.id === 'beginner' ? 'Ready for the next level?' : 'Need a refresher?'}</b>${L.id === 'beginner' ? `Join the ${esc(names.intermediate)}: ratios, the economy and the habits of steady investors.` : `The ${esc(names.beginner)} lessons cover the basics in everyday words.`} Free.</span></a>
          <a class="ax-promo prem" href="${deeper[0] ? `/learn/${esc(deeper[0].slug)}` : '/membership'}"><span class="ax-crown" aria-hidden="true"><svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#0a1128"/></svg></span><span><b>Premium: deeper explainers</b>${deeper.length ? `${deeper.map((d) => esc(d.headline)).join(' · ')}. ` : ''}Plus the weekly portfolio newsletter, Shariah ratios and full company data.</span></a>
        </div>
        ${newsletterSignupBox(`level-${L.slug}`)}
        <p class="note-box">These lessons explain how money and investing work in general. They are not personal advice. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>
      <script src="/newsletter.js" defer></script>`;
  return pageShell({ head, body, active: 'learn' });
}

/** The "Choose your level" cards at the top of /learn. */
export async function levelChooserHtml() {
  const names = await levelNames();
  const all = await getPublishedLearningArticles();
  const count = (id) => all.filter((a) => !(a.tags || []).includes('deeper') && levelOf(a) === id).length;
  const deeper = all.filter((a) => (a.tags || []).includes('deeper')).length;
  const card = (L) => `<a class="lc-card" href="/learn/${L.slug}" style="--c:${L.colour};--c2:${L.colour2}">
          ${levelEmblem(L.id, 64)}<span class="lc-free">Free</span><strong>${esc(names[L.id])}</strong><em>${esc(L.who)}</em><span>${esc(L.tagline)}</span><b>${count(L.id)} lesson${count(L.id) === 1 ? '' : 's'} →</b></a>`;
  return `<h2 class="lvp-h">Choose your level</h2>
        <div class="lc-row">${card(LEVELS.beginner)}${card(LEVELS.intermediate)}
          <a class="lc-card prem" href="#deeper"><span class="ax-crown big" aria-hidden="true"><svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#0a1128"/></svg></span><span class="lc-free">Premium</span><strong>Deeper explainers</strong><em>Confident investors</em><span>How things really work, what professionals watch, and the common mistakes.</span><b>${deeper} lesson${deeper === 1 ? '' : 's'} →</b></a>
        </div>`;
}
