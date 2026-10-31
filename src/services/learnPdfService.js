/* ════════════════════════════════════════════════════════════════════════
   LESSON PDFs (Premium) — a printable workbook for each lesson, and one for
   a whole week of the course.
     GET /api/learn/pdf?slug=<lesson slug>          one lesson
     GET /api/learn/pdf-week?level=lords&week=9     the week's workbook
   Made on request with pdfkit (MIT licence) and our own brand fonts in
   assets/fonts, so nothing is stored. Each copy says who it was prepared
   for, which discourages passing it around.
   Layout: navy and gold cover band, summary, three key points, the "at a
   glance" figures as coloured tiles, the lesson sections, a bar chart when
   the lesson has one, word meanings, a self-check with answers at the
   back, and a notes page.
   ════════════════════════════════════════════════════════════════════════ */

import path from 'node:path';
import PDFDocument from 'pdfkit';

const FONTS = path.join(process.cwd(), 'assets', 'fonts');
const NAVY = '#0a1128';
const GOLD = '#c9a227';
const PREM = '#5b2a9e';
const INK = '#1d2433';
const GREY = '#5a6478';
const TILE = ['#1baf7a', '#2a78d6', '#e8a33d', '#6250d6', '#e5566f', '#0fa3b1'];

function newDoc(title) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 64, bottom: 64, left: 54, right: 54 }, bufferPages: true, info: { Title: title, Author: 'Dr MoneyWise', Subject: 'Premium lesson workbook' } });
  doc.registerFont('serif', path.join(FONTS, 'LibreBaskerville-Bold.ttf'));
  doc.registerFont('body', path.join(FONTS, 'Lato-Regular.ttf'));
  doc.registerFont('bold', path.join(FONTS, 'Lato-Bold.ttf'));
  doc.registerFont('black', path.join(FONTS, 'Lato-Black.ttf'));
  doc.font('body').fontSize(11).fillColor(INK);
  return doc;
}

const W = (doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;
const L = (doc) => doc.page.margins.left;
const bottom = (doc) => doc.page.height - doc.page.margins.bottom;
function room(doc, h) { if (doc.y + h > bottom(doc)) doc.addPage(); }
const clean = (t) => String(t ?? '').replace(/<[^>]+>/gu, '').replace(/\r/gu, '').trim();

/** Navy band with gold lettering at the top of a lesson. */
function band(doc, kicker, title, sub) {
  const x = L(doc); const w = W(doc);
  doc.font('serif').fontSize(21);
  const th = doc.heightOfString(title, { width: w - 40, lineGap: 2 });
  doc.font('body').fontSize(10.5);
  const sh = sub ? doc.heightOfString(sub, { width: w - 40 }) + 8 : 0;
  const h = 58 + th + sh;
  room(doc, h + 20);
  const y = doc.y;
  doc.save().roundedRect(x, y, w, h, 10).fill(NAVY).restore();
  doc.save().rect(x, y + h - 5, w, 5).fill(GOLD).restore();
  doc.font('black').fontSize(9).fillColor(GOLD).text(kicker.toUpperCase(), x + 20, y + 18, { width: w - 40, characterSpacing: 1.2 });
  doc.font('serif').fontSize(21).fillColor('#ffffff').text(title, x + 20, y + 34, { width: w - 40, lineGap: 2 });
  if (sub) doc.font('body').fontSize(10.5).fillColor('#d9dcf0').text(sub, x + 20, doc.y + 6, { width: w - 40 });
  doc.fillColor(INK);
  doc.x = x; doc.y = y + h + 16;
}

function heading(doc, text, colour = PREM) {
  room(doc, 60);
  doc.moveDown(0.4);
  const y = doc.y;
  doc.save().rect(L(doc), y + 2, 4, 16).fill(colour).restore();
  doc.font('serif').fontSize(13.5).fillColor(NAVY).text(text, L(doc) + 12, y, { width: W(doc) - 12 });
  doc.x = L(doc); doc.moveDown(0.35);
  doc.fillColor(INK);
}

function paras(doc, text) {
  for (const p of clean(text).split(/\n\s*\n/u).map((x) => x.replace(/\s*\n\s*/gu, ' ').trim()).filter(Boolean)) {
    room(doc, 40);
    doc.font('body').fontSize(10.8).fillColor(INK).text(p, L(doc), doc.y, { width: W(doc), lineGap: 2.2, align: 'left' });
    doc.moveDown(0.55);
  }
}

/** Coloured tiles in a row (figures or key points). */
function tiles(doc, items, { cols = 2, big = true } = {}) {
  const gap = 10; const w = (W(doc) - gap * (cols - 1)) / cols;
  for (let i = 0; i < items.length; i += cols) {
    const row = items.slice(i, i + cols);
    const hs = row.map((it) => {
      doc.font('black').fontSize(big ? 16 : 11);
      const a = it.value ? doc.heightOfString(it.value, { width: w - 24 }) : 0;
      doc.font('bold').fontSize(9.5);
      const b = doc.heightOfString(it.label || '', { width: w - 24 });
      doc.font('body').fontSize(9);
      const c = it.context ? doc.heightOfString(it.context, { width: w - 24 }) + 4 : 0;
      return a + b + c + 26;
    });
    const h = Math.max(...hs);
    room(doc, h + gap);
    const y = doc.y;
    row.forEach((it, k) => {
      const x = L(doc) + k * (w + gap); const col = TILE[(i + k) % TILE.length];
      doc.save().roundedRect(x, y, w, h, 8).fillOpacity(0.09).fill(col).restore();
      doc.save().roundedRect(x, y, 4, h, 2).fill(col).restore();
      let yy = y + 12;
      if (it.value) { doc.font('black').fontSize(big ? 16 : 11).fillColor(col).text(it.value, x + 14, yy, { width: w - 24 }); yy = doc.y + 2; }
      doc.font('bold').fontSize(9.5).fillColor(NAVY).text(it.label || '', x + 14, yy, { width: w - 24 });
      if (it.context) doc.font('body').fontSize(9).fillColor(GREY).text(it.context, x + 14, doc.y + 3, { width: w - 24 });
    });
    doc.fillColor(INK); doc.x = L(doc); doc.y = y + h + gap;
  }
}

function barChart(doc, chart) {
  const pts = (chart?.points || []).filter((p) => Number.isFinite(Number(p.value))).slice(0, 8);
  if (pts.length < 2) return;
  heading(doc, chart.title || 'The figures', '#2a78d6');
  const max = Math.max(...pts.map((p) => Math.abs(Number(p.value)))) || 1;
  const labelW = 150; const barW = W(doc) - labelW - 90;
  room(doc, pts.length * 22 + 10);
  pts.forEach((p, i) => {
    const y = doc.y; const v = Number(p.value); const col = TILE[i % TILE.length];
    doc.font('bold').fontSize(9.5).fillColor(INK).text(clean(p.label), L(doc), y + 3, { width: labelW - 8, height: 14, ellipsis: true });
    doc.save().roundedRect(L(doc) + labelW, y + 2, barW, 13, 4).fillOpacity(0.12).fill(col).restore();
    doc.save().roundedRect(L(doc) + labelW, y + 2, Math.max(4, Math.abs(v) / max * barW), 13, 4).fill(col).restore();
    const unit = clean(chart.unit);
    const shown = unit === '$' || unit === '£' || unit === '€' ? `${unit}${v.toLocaleString('en-GB')}` : `${v.toLocaleString('en-GB')}${unit && unit !== '%' ? ` ${unit}` : unit}`;
    doc.font('black').fontSize(9.5).fillColor(col).text(shown, L(doc) + labelW + barW + 8, y + 3, { width: 80 });
    doc.x = L(doc); doc.y = y + 22;
  });
  doc.fillColor(INK); doc.moveDown(0.5);
}

function jargon(doc, list) {
  const items = (list || []).filter((j) => j?.term && j?.meaning);
  if (!items.length) return;
  heading(doc, 'Words worth knowing', '#0fa3b1');
  for (const j of items) {
    room(doc, 30);
    doc.font('bold').fontSize(10.5).fillColor(NAVY).text(`${clean(j.term)}: `, L(doc), doc.y, { continued: true, width: W(doc) });
    doc.font('body').fillColor(INK).text(clean(j.meaning), { width: W(doc), lineGap: 1.5 });
    doc.moveDown(0.35);
  }
}

function quizQuestions(doc, quiz, startNo = 1) {
  const qs = (quiz || []).filter((q) => q?.question && Array.isArray(q.options));
  if (!qs.length) return [];
  heading(doc, 'Check yourself', '#e8a33d');
  qs.forEach((q, i) => {
    room(doc, 70);
    doc.font('bold').fontSize(10.5).fillColor(NAVY).text(`${startNo + i}. ${clean(q.question)}`, L(doc), doc.y, { width: W(doc) });
    q.options.forEach((o, k) => {
      const y = doc.y + 3;
      doc.save().circle(L(doc) + 16, y + 6, 5).lineWidth(1).stroke(GREY).restore();
      doc.font('body').fontSize(10).fillColor(INK).text(`${'ABC'[k] || k + 1}  ${clean(o)}`, L(doc) + 28, y, { width: W(doc) - 28 });
    });
    doc.moveDown(0.5);
  });
  doc.font('body').fontSize(9).fillColor(GREY).text('Answers are at the back of this workbook.', L(doc), doc.y, { width: W(doc) });
  doc.moveDown(0.5);
  return qs.map((q, i) => ({ n: startNo + i, answer: 'ABC'[Number(q.answer)] || '?', why: clean(q.why) }));
}

function notesPage(doc, title = 'Your notes') {
  doc.addPage();
  heading(doc, title, GOLD);
  doc.font('body').fontSize(9.5).fillColor(GREY).text('Try the ideas on a company you know: write down its figures, what they tell you, and what you would check next.', L(doc), doc.y, { width: W(doc) });
  doc.moveDown(1);
  let y = doc.y;
  while (y < bottom(doc) - 10) { doc.save().moveTo(L(doc), y).lineTo(L(doc) + W(doc), y).lineWidth(0.5).stroke('#cfd3df').restore(); y += 24; }
}

function answersPage(doc, answers) {
  if (!answers.length) return;
  doc.addPage();
  heading(doc, 'Answers', '#e8a33d');
  for (const a of answers) {
    room(doc, 30);
    doc.font('black').fontSize(10.5).fillColor(NAVY).text(`${a.n}. ${a.answer}`, L(doc), doc.y, { continued: Boolean(a.why), width: W(doc) });
    if (a.why) doc.font('body').fillColor(INK).text(`  ${a.why}`, { width: W(doc) });
    doc.moveDown(0.3);
  }
}

/** Footer on every page: page number, who it's for, and the education note. */
function finish(doc, { forWho, site }) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const y = doc.page.height - 44;
    const x = doc.page.margins.left; const w = W(doc);
    const keep = doc.page.margins.bottom; doc.page.margins.bottom = 0;
    doc.save().moveTo(x, y - 8).lineTo(x + w, y - 8).lineWidth(0.6).stroke(GOLD).restore();
    doc.font('bold').fontSize(8).fillColor(NAVY).text(`Dr MoneyWise · ${site.replace(/^https?:\/\//u, '')}`, x, y, { width: w / 2, lineBreak: false });
    doc.font('body').fontSize(8).fillColor(GREY).text(`Page ${i + 1} of ${range.count}`, x + w / 2, y, { width: w / 2, align: 'right', lineBreak: false });
    doc.font('body').fontSize(7.2).fillColor(GREY).text(`${forWho ? `Prepared for ${forWho}. ` : ''}For your learning only, not personal financial advice. © Dr MoneyWise. Please don’t share or resell.`, x, y + 12, { width: w, lineBreak: false });
    doc.page.margins.bottom = keep;
  }
}

/** Writes one lesson's body; returns its quiz answers. */
function lessonBody(doc, a, { kicker, qStart = 1 }) {
  band(doc, kicker, clean(a.headline), clean(a.summary));
  const keys = (a.takeaways || []).map(clean).filter(Boolean).slice(0, 3);
  if (keys.length) {
    heading(doc, 'Three things to remember', '#1baf7a');
    tiles(doc, keys.map((t) => ({ label: t })), { cols: keys.length === 3 ? 3 : 2, big: false });
  }
  const glance = (a.infographic?.items || []).filter((x) => x?.value || x?.label).slice(0, 4);
  if (glance.length >= 2) {
    heading(doc, clean(a.infographic.title) || 'At a glance', '#2a78d6');
    tiles(doc, glance.map((x) => ({ value: clean(x.value), label: clean(x.label), context: clean(x.context) })), { cols: 2 });
  }
  const sections = Array.isArray(a.bodySections) && a.bodySections.length ? a.bodySections : [
    { heading: 'The simple version', body: a.plainEnglish }, { heading: 'Why this matters', body: a.whyItMatters }, { heading: 'Everyday example', body: a.everydayExample },
  ];
  sections.filter((s) => clean(s.body)).forEach((s, i) => { heading(doc, clean(s.heading) || `Part ${i + 1}`, TILE[i % TILE.length]); paras(doc, s.body); });
  barChart(doc, a.chart);
  jargon(doc, a.jargonBuster);
  return quizQuestions(doc, a.quiz, qStart);
}

const toBuffer = (doc) => new Promise((resolve, reject) => {
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);
  doc.end();
});

/** PDF for one lesson. */
export async function lessonPdf(article, { kicker = 'Premium lesson', forWho = '', site = 'https://drmoneywise.com' } = {}) {
  const doc = newDoc(clean(article.headline));
  const answers = lessonBody(doc, article, { kicker });
  doc.moveDown(0.6); room(doc, 40);
  doc.font('bold').fontSize(9.5).fillColor(PREM).text(`Read it online, with the interactive check: ${site}/learn/${article.slug}`, L(doc), doc.y, { width: W(doc), link: `${site}/learn/${article.slug}`, underline: true });
  answersPage(doc, answers);
  notesPage(doc);
  finish(doc, { forWho, site });
  return toBuffer(doc);
}

/** PDF workbook for one week: cover, contents, every lesson ready so far, answers, notes. */
export async function weekPdf({ levelName, week, lessons, forWho = '', site = 'https://drmoneywise.com' }) {
  const doc = newDoc(`${levelName} · Week ${week.week}: ${week.title}`);
  // Cover
  const x = L(doc); const w = W(doc);
  doc.save().rect(0, 0, doc.page.width, doc.page.height).fill(NAVY).restore();
  doc.save().rect(0, doc.page.height * 0.62, doc.page.width, 6).fill(GOLD).restore();
  doc.font('black').fontSize(11).fillColor(GOLD).text(`DR MONEYWISE · ${levelName.toUpperCase()}${week.module ? ` · ${week.module.toUpperCase()}` : ''}`, x, 150, { width: w, characterSpacing: 1.5 });
  doc.font('serif').fontSize(40).fillColor('#ffffff').text(`Week ${week.week}`, x, 190, { width: w });
  doc.font('serif').fontSize(26).fillColor(GOLD).text(week.title, x, doc.y + 6, { width: w, lineGap: 3 });
  doc.font('body').fontSize(12).fillColor('#d9dcf0').text(`Premium workbook: ${week.lessons.length} lessons with worked examples, key figures, a self-check and space for your notes.`, x, doc.y + 18, { width: w * 0.85, lineGap: 2 });
  doc.font('bold').fontSize(10).fillColor('#d9dcf0').text(forWho ? `Prepared for ${forWho}` : '', x, doc.page.height * 0.62 + 30, { width: w });
  // Contents
  doc.addPage();
  heading(doc, 'In this workbook', GOLD);
  const ready = new Map(lessons.map((l) => [l.lesson.id, l.article]));
  week.lessons.forEach((les, i) => {
    const a = ready.get(les.id);
    room(doc, 30);
    const y = doc.y;
    doc.save().circle(x + 11, y + 8, 11).fill(TILE[i % TILE.length]).restore();
    doc.font('black').fontSize(10).fillColor('#ffffff').text(String(i + 1), x, y + 3, { width: 22, align: 'center' });
    doc.font('bold').fontSize(11.5).fillColor(NAVY).text(clean(a ? a.headline : les.headline), x + 32, y, { width: w - 32 });
    doc.font('body').fontSize(9.5).fillColor(GREY).text(a ? (clean(a.readingTime) || 'Lesson') : 'Coming soon: download this workbook again once it is published', x + 32, doc.y + 1, { width: w - 32 });
    doc.x = x; doc.moveDown(0.6);
  });
  // Lessons
  let answers = []; let n = 1;
  week.lessons.forEach((les, i) => {
    const a = ready.get(les.id);
    if (!a) return;
    doc.addPage();
    const got = lessonBody(doc, a, { kicker: `Week ${week.week} · Lesson ${i + 1}`, qStart: n });
    answers = answers.concat(got); n += got.length;
  });
  answersPage(doc, answers);
  notesPage(doc, 'Your notes for the week');
  finish(doc, { forWho, site });
  return toBuffer(doc);
}
