/* ════════════════════════════════════════════════════════════════════════
   QUALITY CHECKS — run on every automatically written explainer BEFORE it
   can go live. If any check fails, the piece is kept as a draft with the
   reasons attached (visible in Admin → Health and Inventory) instead of
   being published. You can still publish it yourself after a read.

   To add a banned phrase: add a line to BANNED below.
   ════════════════════════════════════════════════════════════════════════ */

// [pattern, reason shown in Admin]
const BANNED = [
  [/\bAI\b/u, 'mentions "AI"'],
  [/\bA\.I\./u, 'mentions "A.I."'],
  [/artificial intelligence/iu, 'mentions artificial intelligence'],
  // Only unambiguous tool names: "Gemini" (crypto exchange), "perplexity"
  // (ordinary word) and "Claude" (people's names) are left out on purpose.
  [/\b(chat ?gpt|gpt-?\d(\.\d)?|llms?|large language|chatbot)\b/iu, 'names a writing tool or model'],
  [/language model|as an assistant|i cannot|i can't help|i'm unable|as of my (last|knowledge)|knowledge cutoff/iu, 'sounds machine-written'],
  [/\b(auto-?generated|generated (by|with|using)|written (by|with|using) (an? )?(software|computer|machine|tool|bot))\b/iu, 'says how it was written'],
  [/guarantee(d|s)? (returns?|profits?|gains?|income)|can'?t lose|risk[- ]free (returns?|profits?|investment)|get rich|sure thing|double your money/iu, 'promises returns'],
  [/\b(you should|you must) (buy|sell)\b|\bbuy (it )?now\b|\bstrong buy\b/iu, 'tells readers to buy or sell'],
  [/lorem ipsum|\[insert|\bTODO\b|\bundefined\b|\bnull\b|\{\{|\}\}/u, 'contains placeholder text'],
];

const MIN = { headline: 15, plainEnglish: 150, summary: 40 };
const MAX = { headline: 120 };

function articleText(article) {
  const parts = [
    article.headline,
    article.summary,
    article.plainEnglish,
    article.whyItMatters,
    article.everydayExample,
    ...(article.takeaways || []),
    ...(article.bodySections || []).flatMap((s) => [s.heading, s.body]),
    ...(article.jargonBuster || []).flatMap((j) => (typeof j === 'string' ? [j] : [j.term, j.meaning, j.definition])),
  ];
  return parts.filter(Boolean).map(String).join('\n');
}

/* Phrases like "guaranteed returns" are fine when the sentence is WARNING
   readers about them (an explainer on spotting scams has to name them).
   Returns the first phrase used as a real promise, or null. */
const WARNING_WORDS = /\b(scams?|scammers?|fraud\w*|red flags?|warning signs?|beware|be wary|wary of|suspicious|too good to be true|no (legitimate )?investment|nobody can|no one can|cannot|can'?t (really )?(be )?guarantee|never|avoid|walk away|fake|ponzi|pyramid|regulators?|claims? (of|to)|promis\w+|lure|trap|mislead\w*)\b/iu;
function promiseNotWarning(text, pattern) {
  const global = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`);
  for (const m of String(text).matchAll(global)) {
    const start = Math.max(String(text).lastIndexOf('.', m.index) + 1, String(text).lastIndexOf('\n', m.index) + 1, 0);
    const endDot = String(text).slice(m.index).search(/[.\n]/u);
    const sentence = String(text).slice(start, endDot === -1 ? undefined : m.index + endDot);
    if (!WARNING_WORDS.test(sentence.replace(m[0], ''))) return m[0];
  }
  return null;
}

/** Returns { ok, issues: [plain-English reasons] } */
export function checkArticle(article) {
  const issues = [];
  const text = articleText(article);

  for (const [pattern, reason] of BANNED) {
    if (reason === 'promises returns') {
      const bad = promiseNotWarning(text, pattern);
      if (bad) issues.push(`${reason} ("${bad}")`);
      continue;
    }
    const match = text.match(pattern);
    if (match) issues.push(`${reason} ("${match[0]}")`);
  }

  const headline = String(article.headline || '').trim();
  if (headline.length < MIN.headline) issues.push('headline is missing or too short');
  if (headline.length > MAX.headline) issues.push('headline is too long');
  if (headline && headline === headline.toUpperCase() && /[A-Z]{4}/u.test(headline)) issues.push('headline is in capitals');
  if (String(article.plainEnglish || '').trim().length < MIN.plainEnglish) issues.push('"simple version" is missing or too short');
  if (String(article.summary || '').trim().length < MIN.summary) issues.push('summary is missing or too short');
  if (!String(article.everydayExample || '').trim()) issues.push('everyday example is missing');

  return { ok: issues.length === 0, issues };
}

/** Checks a short news summary. News may mention AI as a topic (e.g. a
    company making AI chips), so only the other banned phrases apply. */
export function checkNewsText(text) {
  const issues = [];
  for (const [pattern, reason] of BANNED.slice(3)) {
    const match = String(text || '').match(pattern);
    if (match) issues.push(`${reason} ("${match[0]}")`);
  }
  return issues;
}
