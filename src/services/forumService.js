/* ════════════════════════════════════════════════════════════════════════
   FORUM — storage, permissions and moderation
   ───────────────────────────────────────────────────────────────────────
   Who can do what:
     • Anyone can read.
     • Any signed-in reader (free or paid) can start a thread (ask a question).
     • Paid members (Regular/Premium) can reply and edit their own posts.
     • Admin can reply, edit, remove, restore and ban.
   Every new or edited post is checked before it shows:
     1. rule checks (instant, free): length, links, contact details, shouting,
        promises of returns, posting too fast
     2. the writing service's moderation check (writerService.moderateForumPost)
   Result: shown straight away, held for review (Admin → Forum), or refused
   with a reason. Two reports from different readers hide a post until
   reviewed. Saved in data/forum.json (Railway volume).
   ════════════════════════════════════════════════════════════════════════ */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { FORUM_LIMITS, FORUM_REGIONS, FORUM_SECTIONS, sectionById } from '../data/forumConfig.js';

const FILE = path.join(process.cwd(), 'data', 'forum.json');
let cache = null;
let writing = Promise.resolve();

async function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    cache = { threads: [], bans: {}, log: [] };
  }
  cache.threads = cache.threads || [];
  cache.bans = cache.bans || {};
  cache.log = cache.log || [];
  return cache;
}

/** Saves one change at a time (no two writes overlap). */
function save() {
  writing = writing.then(async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(`${FILE}.tmp`, JSON.stringify(cache));
    await fs.rename(`${FILE}.tmp`, FILE);
  }).catch((error) => console.error('[forum] Save failed:', error.message));
  return writing;
}

let viewsDirty = false;
setInterval(() => { if (viewsDirty) { viewsDirty = false; save(); } }, 60 * 1000).unref?.();

/* ── People ─────────────────────────────────────────────────────────── */
export const isPaid = (user) => Boolean(user && (user.role === 'admin' || ['regular', 'premium'].includes(user.plan)));
export const isAdmin = (user) => user?.role === 'admin';

/** "Imran Sohail" → "Imran S." (privacy: no full surnames on the forum). */
export function displayName(user) {
  if (isAdmin(user)) return 'Dr MoneyWise Team';
  const parts = String(user?.name || 'Reader').trim().split(/\s+/u);
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0].toUpperCase()}.` : parts[0];
}

function authorFields(user) {
  return {
    authorId: user.id,
    authorName: displayName(user),
    authorRole: isAdmin(user) ? 'team' : 'member',
    authorPlan: isAdmin(user) ? 'team' : user.plan || 'free',
  };
}

/* ── Rule checks (instant) ──────────────────────────────────────────── */
const BLOCK_WORDS = /\b(fuck|shit|cunt|bitch|bastard|nigg|faggot|retard)\w*/iu;
const REVIEW_PATTERNS = [
  [/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|io|org|co|xyz|app|me|ly|in|ae|uk)\b/iu, 'contains a link'],
  [/[\w.+-]+@[\w-]+\.[\w.]+/u, 'contains an email address'],
  [/(\+?\d[\d\s-]{8,}\d)/u, 'contains a phone number'],
  [/\b(whats ?app|telegram|signal group|dm me|message me|join my|vip group|signals? group)\b/iu, 'asks people to move to a private chat or group'],
  [/guarantee(d|s)? (returns?|profits?|gains?|income)|can'?t lose|risk[- ]free|double your money|100x|10x|to the moon|get rich/iu, 'promises big or certain returns'],
];

function ruleCheck({ title = '', body = '' }, { requireTitle }) {
  const text = `${title}\n${body}`;
  if (requireTitle && (title.trim().length < FORUM_LIMITS.titleMin || title.trim().length > FORUM_LIMITS.titleMax)) {
    return { verdict: 'refuse', reason: `Please give your question a title of ${FORUM_LIMITS.titleMin}–${FORUM_LIMITS.titleMax} characters.` };
  }
  if (body.trim().length < FORUM_LIMITS.bodyMin) return { verdict: 'refuse', reason: `Please write at least ${FORUM_LIMITS.bodyMin} characters.` };
  if (body.length > FORUM_LIMITS.bodyMax) return { verdict: 'refuse', reason: `Please keep it under ${FORUM_LIMITS.bodyMax} characters.` };
  if (BLOCK_WORDS.test(text)) return { verdict: 'block', reason: 'Please keep the language polite.' };
  const letters = text.replace(/[^A-Za-z]/gu, '');
  if (letters.length > 30 && letters.replace(/[^A-Z]/gu, '').length / letters.length > 0.6) {
    return { verdict: 'refuse', reason: 'Please don’t write in capital letters.' };
  }
  for (const [pattern, reason] of REVIEW_PATTERNS) {
    if (pattern.test(text)) return { verdict: 'review', reason: `Held for a moderator: ${reason}.` };
  }
  return { verdict: 'allow', reason: '' };
}

async function moderate(content, { requireTitle, user }) {
  const rules = ruleCheck(content, { requireTitle });
  if (rules.verdict === 'refuse') return { status: 'refused', reason: rules.reason };
  if (isAdmin(user)) return { status: 'visible', reason: '', checkedBy: 'admin' };
  if (rules.verdict === 'block') return { status: 'refused', reason: rules.reason };
  if (rules.verdict === 'review') return { status: 'pending', reason: rules.reason, checkedBy: 'rules' };
  try {
    const { moderateForumPost } = await import('./writerService.js');
    const result = await moderateForumPost(content);
    if (!result) return { status: 'visible', reason: '', checkedBy: 'rules-only' };
    if (result.verdict === 'block') return { status: 'refused', reason: result.reason || 'This post breaks the forum rules.', checkedBy: result.checkedBy };
    if (result.verdict === 'review') return { status: 'pending', reason: result.reason || 'Held for a moderator.', checkedBy: result.checkedBy };
    return { status: 'visible', reason: '', checkedBy: result.checkedBy };
  } catch (error) {
    console.error('[forum] Moderation check failed:', error.message);
    return { status: 'visible', reason: '', checkedBy: 'rules-only' };
  }
}

function checkRate(data, user) {
  if (isAdmin(user)) return null;
  const mine = [];
  for (const t of data.threads) {
    if (t.authorId === user.id) mine.push(t.createdAt);
    for (const r of t.replies) if (r.authorId === user.id) mine.push(r.createdAt);
  }
  const now = Date.now();
  if (mine.some((at) => now - new Date(at).getTime() < FORUM_LIMITS.secondsBetweenPosts * 1000)) {
    return `Please wait ${FORUM_LIMITS.secondsBetweenPosts} seconds between posts.`;
  }
  if (mine.filter((at) => now - new Date(at).getTime() < 86400000).length >= FORUM_LIMITS.postsPerDay) {
    return `You have reached today’s limit of ${FORUM_LIMITS.postsPerDay} posts. Thank you for taking part!`;
  }
  return null;
}

function slugify(text) {
  return String(text).toLowerCase().replace(/&/gu, ' and ').replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 70) || 'thread';
}

function logAction(data, entry) {
  data.log.unshift({ at: new Date().toISOString(), ...entry });
  data.log = data.log.slice(0, 300);
}

const outcomeMessage = (status, reason) => (status === 'visible'
  ? 'Posted.'
  : status === 'pending'
    ? `Thanks! Your post will appear once a moderator has checked it. ${reason || ''}`.trim()
    : reason || 'This post could not be published.');

/* ── Actions ────────────────────────────────────────────────────────── */
export async function createThread(user, payload) {
  if (!user) return { error: 'Please sign in (free) to ask a question.', status: 401 };
  const data = await load();
  if (data.bans[user.id]) return { error: 'Your account can no longer post in the forum.', status: 403 };
  const section = sectionById(payload.section);
  if (!section) return { error: 'Please choose a section.', status: 400 };
  const region = FORUM_REGIONS.some((r) => r.id === payload.region) ? payload.region : 'global';
  const rate = checkRate(data, user);
  if (rate) return { error: rate, status: 429 };

  let ticker = null;
  if (section.id === 'stocks' && payload.ticker) {
    ticker = String(payload.ticker).trim().toUpperCase().replace(/\./gu, '-');
    if (!/^[A-Z0-9-]{1,10}$/u.test(ticker)) ticker = null;
    if (ticker) {
      try {
        const { getTickerMapCached } = await import('./secService.js');
        const map = await getTickerMapCached();
        if (!map[ticker]) return { error: `We couldn’t find the US-listed company ${ticker}. Leave it blank for a general question.`, status: 400 };
      } catch { /* SEC list unavailable: accept the ticker as typed */ }
    }
  }

  const title = String(payload.title || '').trim().replace(/\s+/gu, ' ');
  const body = String(payload.body || '').trim();
  const mod = await moderate({ title, body }, { requireTitle: true, user });
  if (mod.status === 'refused') return { error: mod.reason, status: 400 };

  const now = new Date().toISOString();
  const thread = {
    id: crypto.randomUUID().slice(0, 12),
    slug: slugify(title),
    section: section.id,
    region,
    ticker,
    title,
    body,
    ...authorFields(user),
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    status: mod.status,
    modReason: mod.reason || '',
    checkedBy: mod.checkedBy || '',
    reports: [],
    views: 0,
    replies: [],
  };
  data.threads.unshift(thread);
  logAction(data, { action: 'thread', id: thread.id, by: user.id, status: mod.status });
  await save();
  console.log(`[forum] New thread "${title}" by ${thread.authorName}: ${mod.status}${mod.reason ? ` (${mod.reason})` : ''}`);
  return { ok: true, status: mod.status, message: outcomeMessage(mod.status, mod.reason), url: threadUrl(thread) };
}

export async function addReply(user, threadId, payload) {
  if (!user) return { error: 'Please sign in to reply.', status: 401 };
  if (!isPaid(user)) return { error: 'Replying is for members. Upgrade to join the conversation.', status: 403 };
  const data = await load();
  if (data.bans[user.id]) return { error: 'Your account can no longer post in the forum.', status: 403 };
  const thread = data.threads.find((t) => t.id === threadId);
  if (!thread || thread.status === 'removed') return { error: 'That thread is no longer available.', status: 404 };
  if (thread.locked && !isAdmin(user)) return { error: 'This thread is closed to new replies.', status: 403 };
  const rate = checkRate(data, user);
  if (rate) return { error: rate, status: 429 };
  const body = String(payload.body || '').trim();
  const mod = await moderate({ title: thread.title, body }, { requireTitle: false, user });
  if (mod.status === 'refused') return { error: mod.reason, status: 400 };
  const now = new Date().toISOString();
  const reply = {
    id: crypto.randomUUID().slice(0, 12), body, ...authorFields(user),
    createdAt: now, editedAt: null, status: mod.status, modReason: mod.reason || '', checkedBy: mod.checkedBy || '', reports: [],
  };
  thread.replies.push(reply);
  if (mod.status === 'visible') thread.lastActivityAt = now;
  logAction(data, { action: 'reply', id: reply.id, thread: thread.id, by: user.id, status: mod.status });
  await save();
  return { ok: true, status: mod.status, message: outcomeMessage(mod.status, mod.reason), url: `${threadUrl(thread)}#post-${reply.id}` };
}

function findPost(data, postId) {
  for (const thread of data.threads) {
    if (thread.id === postId) return { thread, post: thread, isThread: true };
    const reply = thread.replies.find((r) => r.id === postId);
    if (reply) return { thread, post: reply, isThread: false };
  }
  return null;
}

export async function editPost(user, postId, payload) {
  if (!user) return { error: 'Please sign in.', status: 401 };
  const data = await load();
  const found = findPost(data, postId);
  if (!found) return { error: 'Post not found.', status: 404 };
  const own = found.post.authorId === user.id;
  if (!isAdmin(user) && !(own && isPaid(user))) return { error: 'Editing posts is for members (your own posts only).', status: 403 };
  const body = String(payload.body || '').trim();
  const title = found.isThread ? String(payload.title ?? found.thread.title).trim().replace(/\s+/gu, ' ') : found.thread.title;
  const mod = await moderate({ title, body }, { requireTitle: found.isThread, user });
  if (mod.status === 'refused') return { error: mod.reason, status: 400 };
  found.post.body = body;
  if (found.isThread) { found.thread.title = title; found.thread.slug = slugify(title); }
  found.post.editedAt = new Date().toISOString();
  if (!isAdmin(user)) { found.post.status = mod.status; found.post.modReason = mod.reason || ''; }
  logAction(data, { action: 'edit', id: postId, by: user.id, status: found.post.status });
  await save();
  return { ok: true, status: found.post.status, message: found.post.status === 'visible' ? 'Saved.' : outcomeMessage(found.post.status, mod.reason) };
}

export async function reportPost(user, postId, reason = '') {
  if (!user) return { error: 'Please sign in to report a post.', status: 401 };
  const data = await load();
  const found = findPost(data, postId);
  if (!found) return { error: 'Post not found.', status: 404 };
  found.post.reports = found.post.reports || [];
  if (!found.post.reports.some((r) => r.by === user.id)) {
    found.post.reports.push({ by: user.id, reason: String(reason).slice(0, 200), at: new Date().toISOString() });
  }
  if (found.post.status === 'visible' && new Set(found.post.reports.map((r) => r.by)).size >= FORUM_LIMITS.reportsToHide) {
    found.post.status = 'pending';
    found.post.modReason = 'Hidden after reports from readers';
    console.log(`[forum] Post ${postId} hidden after ${found.post.reports.length} reports`);
  }
  await save();
  return { ok: true, message: 'Thank you. A moderator will take a look.' };
}

/* ── Admin ──────────────────────────────────────────────────────────── */
export async function adminAction(user, { postId, action, userId }) {
  if (!isAdmin(user)) return { error: 'Admins only.', status: 403 };
  const data = await load();
  if (action === 'ban' || action === 'unban') {
    if (!userId) return { error: 'No reader given.', status: 400 };
    if (action === 'ban') data.bans[userId] = { at: new Date().toISOString() };
    else delete data.bans[userId];
    logAction(data, { action, user: userId, by: user.id });
    await save();
    return { ok: true, message: action === 'ban' ? 'Reader banned from posting.' : 'Ban lifted.' };
  }
  const found = findPost(data, postId);
  if (!found) return { error: 'Post not found.', status: 404 };
  if (action === 'approve') { found.post.status = 'visible'; found.post.reports = []; if (found.isThread) found.thread.lastActivityAt = new Date().toISOString(); }
  else if (action === 'remove') found.post.status = 'removed';
  else if (action === 'restore') found.post.status = 'visible';
  else if (action === 'lock' && found.isThread) found.thread.locked = true;
  else if (action === 'unlock' && found.isThread) found.thread.locked = false;
  else if (action === 'pin' && found.isThread) found.thread.pinned = true;
  else if (action === 'unpin' && found.isThread) found.thread.pinned = false;
  else return { error: 'Unknown action.', status: 400 };
  logAction(data, { action, id: postId, by: user.id });
  await save();
  return { ok: true, message: 'Done.' };
}

export async function getModerationQueue() {
  const data = await load();
  const items = [];
  for (const t of data.threads) {
    if (t.status === 'pending') items.push({ kind: 'thread', id: t.id, threadId: t.id, title: t.title, body: t.body, authorId: t.authorId, authorName: t.authorName, at: t.createdAt, reason: t.modReason, reports: t.reports?.length || 0, url: threadUrl(t) });
    for (const r of t.replies) {
      if (r.status === 'pending') items.push({ kind: 'reply', id: r.id, threadId: t.id, title: t.title, body: r.body, authorId: r.authorId, authorName: r.authorName, at: r.createdAt, reason: r.modReason, reports: r.reports?.length || 0, url: `${threadUrl(t)}#post-${r.id}` });
    }
  }
  const banned = Object.entries(data.bans).map(([id, b]) => ({ id, at: b.at, name: findName(data, id) }));
  return { items: items.sort((a, b) => String(b.at).localeCompare(String(a.at))), banned, stats: await forumStats() };
}

function findName(data, userId) {
  for (const t of data.threads) {
    if (t.authorId === userId) return t.authorName;
    const r = t.replies.find((x) => x.authorId === userId);
    if (r) return r.authorName;
  }
  return 'Reader';
}

/* ── Reading ────────────────────────────────────────────────────────── */
export function threadUrl(t) {
  return `/forum/t/${t.id}/${t.slug}`;
}

const visibleReplies = (t) => t.replies.filter((r) => r.status === 'visible');

function summary(t) {
  const replies = visibleReplies(t);
  const last = replies.at(-1);
  return {
    id: t.id, url: threadUrl(t), title: t.title, section: t.section, region: t.region, ticker: t.ticker,
    excerpt: t.body.slice(0, 180), authorName: t.authorName, authorRole: t.authorRole,
    createdAt: t.createdAt, lastActivityAt: t.lastActivityAt, replyCount: replies.length, views: t.views || 0,
    lastBy: last ? last.authorName : t.authorName, answeredByTeam: replies.some((r) => r.authorRole === 'team'),
    pinned: Boolean(t.pinned), locked: Boolean(t.locked),
  };
}

export async function listThreads({ section, region, ticker, sort = 'latest', limit = 30, offset = 0 } = {}) {
  const data = await load();
  let rows = data.threads.filter((t) => t.status === 'visible');
  if (section) rows = rows.filter((t) => t.section === section);
  if (region && region !== 'all') rows = rows.filter((t) => t.region === region);
  if (ticker) rows = rows.filter((t) => t.ticker === ticker);
  const list = rows.map(summary);
  if (sort === 'popular') list.sort((a, b) => (b.replyCount * 5 + b.views) - (a.replyCount * 5 + a.views));
  else if (sort === 'unanswered') { list.splice(0, list.length, ...list.filter((t) => t.replyCount === 0)); list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  else list.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  list.sort((a, b) => Number(b.pinned) - Number(a.pinned));
  return { total: list.length, threads: list.slice(offset, offset + limit) };
}

export async function getThread(id, { countView = false } = {}) {
  const data = await load();
  const t = data.threads.find((x) => x.id === id);
  if (!t) return null;
  if (countView && t.status === 'visible') { t.views = (t.views || 0) + 1; viewsDirty = true; }
  return t;
}

export async function searchForum(query, limit = 40) {
  const words = String(query || '').toLowerCase().split(/\s+/u).filter((w) => w.length > 1).slice(0, 8);
  if (!words.length) return [];
  const data = await load();
  const scored = [];
  for (const t of data.threads) {
    if (t.status !== 'visible') continue;
    const title = t.title.toLowerCase();
    const text = `${t.body} ${visibleReplies(t).map((r) => r.body).join(' ')} ${t.ticker || ''}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (title.includes(w)) score += 5;
      if (text.includes(w)) score += 1;
      if (t.ticker && t.ticker.toLowerCase() === w) score += 8;
    }
    if (score >= words.length) scored.push({ score, t });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(({ t }) => summary(t));
}

export async function topContributors(limit = 5, days = 90) {
  const data = await load();
  const since = Date.now() - days * 86400000;
  const counts = new Map();
  const bump = (p, kind) => {
    if (p.status !== 'visible' || p.authorRole === 'team' || new Date(p.createdAt).getTime() < since) return;
    const c = counts.get(p.authorId) || { name: p.authorName, plan: p.authorPlan, threads: 0, replies: 0 };
    c[kind] += 1;
    counts.set(p.authorId, c);
  };
  for (const t of data.threads) {
    bump(t, 'threads');
    for (const r of t.replies) bump(r, 'replies');
  }
  return [...counts.values()].sort((a, b) => (b.replies * 2 + b.threads) - (a.replies * 2 + a.threads)).slice(0, limit);
}

export async function forumStats() {
  const data = await load();
  const visible = data.threads.filter((t) => t.status === 'visible');
  const bySection = Object.fromEntries(FORUM_SECTIONS.map((s) => [s.id, { threads: 0, replies: 0, latest: null }]));
  for (const t of visible) {
    const s = bySection[t.section];
    if (!s) continue;
    s.threads += 1;
    s.replies += visibleReplies(t).length;
    if (!s.latest || t.lastActivityAt > s.latest.lastActivityAt) s.latest = summary(t);
  }
  const pending = data.threads.reduce((n, t) => n + (t.status === 'pending' ? 1 : 0) + t.replies.filter((r) => r.status === 'pending').length, 0);
  return { threads: visible.length, replies: visible.reduce((n, t) => n + visibleReplies(t).length, 0), pending, bySection };
}

export async function discussedCompanies(limit = 12) {
  const data = await load();
  const counts = new Map();
  for (const t of data.threads) {
    if (t.status === 'visible' && t.ticker) counts.set(t.ticker, (counts.get(t.ticker) || 0) + 1 + visibleReplies(t).length);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([ticker, n]) => ({ ticker, n }));
}

export async function forumSitemapEntries(origin) {
  const data = await load();
  return data.threads.filter((t) => t.status === 'visible').map((t) => ({ loc: `${origin}${threadUrl(t)}`, lastmod: String(t.lastActivityAt).slice(0, 10), priority: '0.5' }));
}

/* ── Starter threads from the team (clearly labelled as the team) ─────── */
export async function addStarterThreads(user) {
  if (!isAdmin(user)) return { error: 'Admins only.', status: 403 };
  const { FORUM_STARTERS } = await import('../data/forumStarters.js');
  const data = await load();
  let added = 0;
  const base = Date.now();
  FORUM_STARTERS.forEach((s, i) => {
    if (data.threads.some((t) => t.title === s.title)) return;
    const at = new Date(base - (FORUM_STARTERS.length - i) * 3600 * 1000).toISOString();
    data.threads.push({
      id: crypto.randomUUID().slice(0, 12), slug: slugify(s.title), section: s.section, region: s.region || 'global', ticker: s.ticker || null,
      title: s.title, body: s.question, authorId: user.id, authorName: 'Dr MoneyWise Team', authorRole: 'team', authorPlan: 'team',
      createdAt: at, updatedAt: at, lastActivityAt: at, status: 'visible', modReason: '', checkedBy: 'admin', reports: [], views: 0, starter: true,
      replies: [{ id: crypto.randomUUID().slice(0, 12), body: s.answer, authorId: user.id, authorName: 'Dr MoneyWise Team', authorRole: 'team', authorPlan: 'team', createdAt: at, editedAt: null, status: 'visible', modReason: '', checkedBy: 'admin', reports: [] }],
    });
    added += 1;
  });
  await save();
  return { ok: true, message: added ? `${added} starter threads added.` : 'Starter threads are already there.' };
}
