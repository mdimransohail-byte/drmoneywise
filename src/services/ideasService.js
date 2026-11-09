/* ════════════════════════════════════════════════════════════════════════
   IDEAS THAT MATCH YOUR RULES (Premium)
   A member saves up to 5 sets of screener rules ("idea lists"). /ideas
   shows the companies that match each one today, marks the ones that are
   new since last week, and the Saturday email lists them.
   Matching is done here, on the server, with the same rules as the
   screener (public/screener.js). These are companies that match rules
   the member chose, not recommendations.
   ════════════════════════════════════════════════════════════════════════ */

import crypto from 'node:crypto';

import { screenerRows } from './screenerService.js';
import { updateStore } from './storeService.js';

export const MAX_IDEAS = 5;
const NUM_FIELDS = ['growth', 'margin', 'score', 'divYears', 'debt', 'funds'];
const PRESETS = {
  all: () => true,
  divgrow: (r) => r.divYears >= 10,
  fast: (r) => r.salesGrowth !== null && r.salesGrowth >= 10,
  money: (r) => r.margin !== null && r.margin >= 20,
  lowdebt: (r) => r.debtYears !== null && r.debtYears < 2,
  top: (r) => r.score !== null && r.score >= 80,
  fundsbuy: (r) => (r.buyers || 0) > (r.sellers || 0) && (r.buyers || 0) >= 2,
  fundsown: (r) => (r.funds || 0) >= 4,
  bosses: (r) => (r.bossBuys || 0) > 0,
};
export const PRESET_WORDS = {
  divgrow: 'Dividend raised 10+ years in a row', fast: 'Sales growing 10%+', money: 'Profit margin 20%+', lowdebt: 'Debt under 2 years of cash',
  top: 'Score 80+', fundsbuy: 'Big funds buying', fundsown: 'Owned by 4+ big funds', bosses: 'Company bosses buying',
};

/** Ready-made idea lists a member can add with one click. */
export const STARTER_IDEAS = [
  { name: 'Steady dividend raisers with low debt', preset: 'divgrow', f: { debt: '3' } },
  { name: 'Fast growers that make good money', preset: 'fast', f: { margin: '15' } },
  { name: 'Where big funds and bosses are buying', preset: 'fundsbuy', f: { score: '60' } },
  { name: 'Top scores outside the US', preset: 'top', f: { region: 'abroad' } },
];

/** Cleans what the browser sends. */
export function cleanIdea(raw = {}) {
  const f = raw.f || {};
  const out = { preset: PRESETS[raw.preset] ? raw.preset : 'all', f: {} };
  for (const k of NUM_FIELDS) {
    const v = String(f[k] ?? '').trim();
    if (v !== '' && Number.isFinite(Number(v))) out.f[k] = String(Number(v));
  }
  if (f.sector) out.f.sector = String(f.sector).slice(0, 40);
  if (f.region) out.f.region = String(f.region).replace(/[^a-z-]/gu, '').slice(0, 20);
  if (f.buying) out.f.buying = true;
  out.name = String(raw.name || '').replace(/\s+/gu, ' ').trim().slice(0, 60) || describe(out).slice(0, 60) || 'My idea list';
  return out;
}

/** The rules in plain words, for chips and emails. */
export function describe(idea) {
  const f = idea.f || {};
  const parts = [];
  if (idea.preset && idea.preset !== 'all') parts.push(PRESET_WORDS[idea.preset]);
  if (f.region) parts.push(f.region === 'abroad' ? 'Outside the US' : f.region === 'us' ? 'United States' : f.region.replace(/-/gu, ' ').replace(/\b([a-z])/gu, (x) => x.toUpperCase()));
  if (f.sector) parts.push(f.sector);
  if (f.growth) parts.push(`Sales growth ${f.growth}%+`);
  if (f.margin) parts.push(`Profit margin ${f.margin}%+`);
  if (f.score) parts.push(`Score ${f.score}+`);
  if (f.divYears) parts.push(`Dividend raised ${f.divYears}+ years`);
  if (f.debt) parts.push(`Debt ${f.debt} years or less`);
  if (f.funds) parts.push(`Held by ${f.funds}+ big funds`);
  if (f.buying) parts.push('More funds buying than selling');
  return parts.join(' · ');
}

export function matches(r, idea) {
  const f = idea.f || {};
  const n = (k) => (f[k] === undefined || f[k] === '' ? null : Number(f[k]));
  if (!(PRESETS[idea.preset] || PRESETS.all)(r)) return false;
  if (f.region === 'abroad' ? r.region === 'us' : f.region && r.region !== f.region) return false;
  if (f.sector && r.sector !== f.sector) return false;
  if (n('growth') !== null && !(r.salesGrowth >= n('growth'))) return false;
  if (n('margin') !== null && !(r.margin >= n('margin'))) return false;
  if (n('score') !== null && !(r.score >= n('score'))) return false;
  if (n('divYears') !== null && !(r.divYears >= n('divYears'))) return false;
  if (n('debt') !== null && !(r.debtYears !== null && r.debtYears <= n('debt'))) return false;
  if (n('funds') !== null && !((r.funds || 0) >= n('funds'))) return false;
  if (f.buying && !((r.buyers || 0) > (r.sellers || 0))) return false;
  return true;
}

/** Each of the member's idea lists with today's matches (best score first). */
export async function ideasFor(user) {
  const { rows } = await screenerRows({ premium: true });
  return (user.ideas || []).map((idea) => {
    const hits = rows.filter((r) => matches(r, idea)).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    const before = new Set(idea.lastMatches || []);
    return {
      ...idea,
      words: describe(idea),
      count: hits.length,
      newTickers: idea.lastMatches ? hits.filter((r) => !before.has(r.ticker)).map((r) => r.ticker) : [],
      gone: idea.lastMatches ? [...before].filter((t) => !hits.some((r) => r.ticker === t)) : [],
      rows: hits.slice(0, 60),
      allTickers: hits.map((r) => r.ticker),
    };
  });
}

/** Saves the member's list (add, rename, delete all go through here). */
export async function saveIdeas(userId, list) {
  const clean = (Array.isArray(list) ? list : []).slice(0, MAX_IDEAS).map((x) => ({ ...cleanIdea(x), id: /^[a-f0-9-]{8,40}$/u.test(String(x.id || '')) ? x.id : crypto.randomUUID() }));
  // A new list starts from today's matches, so "new" means new since it was saved
  const { rows } = await screenerRows({ premium: true });
  const store = await updateStore((s) => {
    const u = s.users.find((x) => x.id === userId);
    if (!u) throw new Error('Member not found.');
    const old = u.ideas || [];
    u.ideas = clean.map((x) => {
      const prev = old.find((o) => o.id === x.id);
      const same = prev && JSON.stringify({ p: prev.preset, f: prev.f }) === JSON.stringify({ p: x.preset, f: x.f });
      return same ? { ...x, lastMatches: prev.lastMatches, lastAt: prev.lastAt }
        : { ...x, lastMatches: rows.filter((r) => matches(r, x)).map((r) => r.ticker), lastAt: new Date().toISOString() };
    });
    return s;
  });
  return store.users.find((x) => x.id === userId)?.ideas || [];
}

/** After the weekly email: remember today's matches so next week can say what's new. */
export async function rememberMatches(userId, ideas) {
  await updateStore((s) => {
    const u = s.users.find((x) => x.id === userId);
    if (!u) return s;
    u.ideas = (u.ideas || []).map((x) => {
      const now = ideas.find((i) => i.id === x.id);
      return now ? { ...x, lastMatches: now.allTickers || now.rows.map((r) => r.ticker), lastAt: new Date().toISOString() } : x;
    });
    return s;
  });
}
