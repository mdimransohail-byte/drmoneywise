/* ════════════════════════════════════════════════════════════════════════
   ASK DR MONEYWISE (Regular and Premium) — /ask
   Members send a money question. The team answers it from Admin → "Ask
   Dr MoneyWise" (a first draft can be written for them to check and edit).
   The member is emailed when it's answered. If they said yes, the question
   and answer are shown on /ask without their name, to help other readers.
   Answers are general education, never personal advice.
   Saved in the main store (store.questions).
   ════════════════════════════════════════════════════════════════════════ */

import crypto from 'node:crypto';

import { canAccess } from '../config.js';
import { readStore, updateStore } from './storeService.js';

export const ASK_TOPICS = [
  ['saving', 'Saving and budgeting'], ['investing', 'Getting started with investing'], ['stocks', 'Shares and companies'],
  ['funds', 'ETFs and funds'], ['bonds', 'Bonds and interest rates'], ['retirement', 'Retirement and pensions'],
  ['property', 'Property'], ['crypto', 'Crypto'], ['economy', 'The economy'], ['site', 'Using Dr MoneyWise'], ['other', 'Something else'],
];
const LIMITS = { regular: 3, premium: 10 };
const monthKey = () => new Date().toISOString().slice(0, 7);
const clean = (t, max) => String(t || '').replace(/\s+/gu, ' ').trim().slice(0, max);

function publicView(q) {
  return { id: q.id, slug: q.slug, topic: q.topic, question: q.question, answer: q.answer, answeredAt: q.answeredAt };
}
function memberView(q) {
  return { id: q.id, topic: q.topic, question: q.question, status: q.status, createdAt: q.createdAt, answer: q.status === 'answered' ? q.answer : '', answeredAt: q.answeredAt || null, publishOk: q.publishOk, published: Boolean(q.published) };
}

export function monthlyLimit(user) {
  if (user?.role === 'admin') return 99;
  if (canAccess(user?.plan || 'free', 'premium')) return LIMITS.premium;
  if (canAccess(user?.plan || 'free', 'regular')) return LIMITS.regular;
  return 0;
}

/** The member's own questions and how many they can still send this month. */
export async function myQuestions(user) {
  const store = await readStore();
  const mine = (store.questions || []).filter((q) => q.userId === user.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const used = mine.filter((q) => String(q.createdAt).slice(0, 7) === monthKey()).length;
  const limit = monthlyLimit(user);
  return { questions: mine.map(memberView), limit, left: Math.max(0, limit - used) };
}

export async function askQuestion(user, payload) {
  const question = clean(payload.question, 1200);
  if (question.length < 20) throw Object.assign(new Error('Please write your question in a sentence or two (at least 20 characters).'), { status: 400 });
  const topic = ASK_TOPICS.some(([id]) => id === payload.topic) ? payload.topic : 'other';
  const { left } = await myQuestions(user);
  if (left <= 0) throw Object.assign(new Error('You’ve used this month’s questions. You can ask again next month.'), { status: 429 });
  const q = {
    id: crypto.randomUUID(), userId: user.id, email: user.email, name: String(user.name || '').split(' ')[0], plan: user.plan || 'free',
    question, topic, publishOk: Boolean(payload.publishOk), status: 'waiting', createdAt: new Date().toISOString(),
    draft: '', answer: '', answeredAt: null, published: false, slug: '',
  };
  await updateStore((store) => { store.questions = [...(store.questions || []), q]; return store; });
  return memberView(q);
}

/** Published answers for /ask (no names). */
export async function publishedAnswers() {
  const store = await readStore();
  return (store.questions || []).filter((q) => q.status === 'answered' && q.published).sort((a, b) => String(b.answeredAt).localeCompare(String(a.answeredAt))).map(publicView);
}

/* ── Admin ─────────────────────────────────────────────────────────── */
export async function adminQuestions() {
  const store = await readStore();
  const list = (store.questions || []).slice().sort((a, b) => (a.status === 'waiting' ? 0 : 1) - (b.status === 'waiting' ? 0 : 1) || String(b.createdAt).localeCompare(String(a.createdAt)));
  return { questions: list.slice(0, 200), waiting: list.filter((q) => q.status === 'waiting').length, topics: ASK_TOPICS };
}

/** A first draft for the team to check and edit (never sent as it is). */
export async function draftAnswer(id) {
  const store = await readStore();
  const q = (store.questions || []).find((x) => x.id === id);
  if (!q) throw Object.assign(new Error('Question not found.'), { status: 404 });
  const { writeAskDraft } = await import('./writerService.js');
  const draft = await writeAskDraft({ question: q.question, topic: (ASK_TOPICS.find(([t]) => t === q.topic) || [])[1] || 'Money' });
  if (!draft) throw Object.assign(new Error('No writing service answered. Please write the answer yourself or try again.'), { status: 502 });
  await updateStore((s) => { const t = (s.questions || []).find((x) => x.id === id); if (t) t.draft = draft; return s; });
  return { draft };
}

const slugify = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 70);

/** Save an answer (and email the member), decline, or change publishing. */
export async function adminAnswer(id, { answer, publish, decline = false }) {
  let saved = null; let notify = false;
  await updateStore((s) => {
    const t = (s.questions || []).find((x) => x.id === id);
    if (!t) throw Object.assign(new Error('Question not found.'), { status: 404 });
    if (decline) { t.status = 'declined'; t.published = false; }
    else {
      const text = String(answer || '').trim().slice(0, 5000);
      if (text.length < 40) throw Object.assign(new Error('Please write an answer of at least a couple of sentences.'), { status: 400 });
      const first = t.status !== 'answered';
      t.answer = text; t.status = 'answered'; t.answeredAt = t.answeredAt || new Date().toISOString();
      t.published = Boolean(publish) && t.publishOk;
      t.slug = t.slug || `${slugify(t.question.split(/[?.!]/u)[0])}-${t.id.slice(0, 6)}`;
      notify = first;
    }
    saved = { ...t };
    return s;
  });
  let emailed = null;
  if (notify) {
    const { sendAskAnswer } = await import('./alertsService.js');
    emailed = await sendAskAnswer(saved).catch((error) => ({ ok: false, message: error.message }));
  }
  return { ok: true, status: saved.status, published: saved.published, emailed };
}
