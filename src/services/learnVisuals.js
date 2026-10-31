/* ════════════════════════════════════════════════════════════════════════
   LEARN VISUALS — shared by the server page (/learn/<slug>) and the
   article script (public/article.js gets the finished HTML from the API)
   ───────────────────────────────────────────────────────────────────────
   cleanSections()   removes repeated sentences (a sentence already said in
                     the summary or an earlier section is dropped), splits
                     long text into paragraphs
   infographicHtml() colourful figure tiles + a bar chart when the article
                     has numbers; otherwise an "At a glance" card set built
                     from the key takeaways, so no explainer is text-only
   quizHtml()        3-question "Check yourself" box (answers shown on tap)
   ════════════════════════════════════════════════════════════════════════ */

const esc = (v) => String(v ?? '').replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;').replace(/'/gu, '&#39;');

export const PALETTE = ['#1baf7a', '#2a78d6', '#e8a33d', '#6250d6', '#e5566f', '#0fa3b1'];

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9% ]+/gu, ' ').replace(/\s+/gu, ' ').trim();
const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
function similar(a, b) {
  if (a.size < 4 || b.size < 4) return false;
  let both = 0;
  for (const w of a) if (b.has(w)) both += 1;
  return both / Math.min(a.size, b.size) >= 0.8;
}
const sentencesOf = (para) => String(para).match(/[^.!?]+(?:[.!?]+["”’)]*|$)/gu)?.map((s) => s.trim()).filter(Boolean) || [];

/** Paragraphs from a block of text: blank lines, or every ~3 sentences when the writer sent one long block. */
export function splitParagraphs(text) {
  const blocks = String(text || '').split(/\n\s*\n|\n/u).map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const b of blocks) {
    const s = sentencesOf(b);
    if (s.length <= 4 || b.length < 520) { out.push(b); continue; }
    for (let i = 0; i < s.length; i += 3) out.push(s.slice(i, i + 3).join(' '));
  }
  return out;
}
export const paragraphsHtml = (text) => splitParagraphs(text).map((p) => `<p>${esc(p)}</p>`).join('');

/** Sections with repeated sentences removed. Empty sections are dropped. */
export function cleanSections(article, sections = article?.bodySections || []) {
  const seen = [];
  const isSeen = (s) => { const n = norm(s); const w = words(s); return seen.some((x) => x.n === n || similar(w, x.w)); };
  const remember = (s) => seen.push({ n: norm(s), w: words(s) });
  sentencesOf(article?.summary || '').forEach(remember);
  const out = [];
  for (const sec of sections || []) {
    const paras = [];
    for (const para of splitParagraphs(sec?.body || '')) {
      const kept = sentencesOf(para).filter((s) => { if (isSeen(s)) return false; remember(s); return true; });
      if (kept.length) paras.push(kept.join(' '));
    }
    if (paras.length) out.push({ heading: sec.heading || '', body: paras.join('\n\n') });
  }
  return out;
}

/* ── Infographic ───────────────────────────────────────────────────── */
function barChart(chart) {
  const pts = (chart?.points || []).map((p) => ({ label: String(p.label || '').slice(0, 28), value: Number(String(p.value).replace(/[^0-9.-]/gu, '')) }))
    .filter((p) => p.label && Number.isFinite(p.value)).slice(0, 8);
  if (pts.length < 2) return '';
  const max = Math.max(...pts.map((p) => Math.abs(p.value))) || 1;
  const unit = String(chart.unit || '').slice(0, 6);
  const fmt = (v) => {
    const n = Math.abs(v) >= 1000 ? v.toLocaleString('en-GB', { maximumFractionDigits: 0 }) : String(+v.toFixed(2));
    return /^[£$€₹]/u.test(unit) ? `${unit}${n}` : `${n}${unit}`;
  };
  const rows = pts.map((p, i) => {
    const c = PALETTE[i % PALETTE.length];
    const w = Math.max(3, (Math.abs(p.value) / max) * 100);
    return `<div class="lv-bar" style="--c:${c}"><span class="lv-bl">${esc(p.label)}</span><span class="lv-bt"><i style="width:${w.toFixed(1)}%"></i></span><b>${esc(fmt(p.value))}</b></div>`;
  }).join('');
  return `<figure class="lv-chart"><figcaption>${esc(chart.title || 'In numbers')}</figcaption><div class="lv-bars" role="img" aria-label="${esc(chart.title || 'Chart')}">${rows}</div></figure>`;
}

export function infographicHtml(article) {
  const items = (article?.infographic?.items || []).filter((i) => i && (i.value || i.label)).slice(0, 6);
  const chart = barChart(article?.chart);
  if (items.length) {
    const tiles = items.map((it, i) => `
        <div class="lv-tile" style="--c:${PALETTE[i % PALETTE.length]}">
          <span class="lv-num">${i + 1}</span>
          <strong class="lv-val${String(it.value || it.label).length > 7 ? ' lv-long' : ''}">${esc(it.value || it.label)}</strong>
          ${it.value ? `<span class="lv-lab">${esc(it.label)}</span>` : ''}
          ${it.context ? `<span class="lv-ctx">${esc(it.context)}</span>` : ''}
        </div>`).join('');
    return `<section class="lv-box"><h2 class="lv-title"><span class="lv-ico" aria-hidden="true">▤</span>${esc(article.infographic.title || 'The key numbers')}</h2><div class="lv-tiles">${tiles}</div>${chart}</section>`;
  }
  // No figures: show the chart if there is one. (The takeaways already have
  // their own box, so repeating them here would be repetition.)
  return chart ? `<section class="lv-box">${chart}</section>` : '';
}

/* ── Quiz ──────────────────────────────────────────────────────────── */
export function quizHtml(article) {
  const qs = (article?.quiz || []).filter((q) => q?.question && Array.isArray(q.options) && q.options.length >= 2).slice(0, 3);
  if (!qs.length) return '';
  return `<section class="lv-quiz" id="checkYourself"><h2 class="lv-title"><span class="lv-ico" aria-hidden="true">✓</span>Check yourself</h2><p class="lv-quiz-intro">Three quick questions. Tap an answer to see how you did.</p>
      ${qs.map((q, qi) => `<div class="lv-q" data-quiz="${qi}" data-answer="${Number(q.answer) || 0}">
        <p class="lv-qtext"><b>${qi + 1}.</b> ${esc(q.question)}</p>
        <div class="lv-opts">${q.options.slice(0, 4).map((o, oi) => `<button type="button" class="lv-opt" data-opt="${oi}">${esc(o)}</button>`).join('')}</div>
        <p class="lv-why" hidden>${esc(q.why || '')}</p></div>`).join('')}
      <p class="lv-score" hidden></p></section>`;
}
