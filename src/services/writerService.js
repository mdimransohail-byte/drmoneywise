import { updateStore } from './storeService.js';

/* ════════════════════════════════════════════════════════════════════════
   WRITER ROTATION — fixed order, not admin-configurable
   ───────────────────────────────────────────────────────────────────────
   Every article generation (news rewrite or admin-given topic) cycles
   through these providers in this order: OpenAI first, then Claude.
   store.meta.nextWriterSlot just counts up forever; the modulo picks the
   provider. DeepSeek was removed (repeated price increases) — Perplexity
   and Gemini remain available as manual picks only, same as before.

   Per-provider model overrides come straight from env vars — set
   OPENAI_MODEL / CLAUDE_MODEL in Admin → Settings (or Railway Variables)
   to pin a specific model. Leave blank to use each provider's default
   below.
   ════════════════════════════════════════════════════════════════════════ */
const WRITER_ROTATION = ['openai', 'claude']; // automatic rotation order
const ALL_PROVIDERS = ['openai', 'claude', 'perplexity', 'gemini']; // valid for manual/forced selection

const MODEL_ENV_KEYS = {
  openai: 'OPENAI_MODEL',
  claude: 'CLAUDE_MODEL',
  perplexity: 'PERPLEXITY_MODEL',
  gemini: 'GEMINI_MODEL',
};

export async function summarizeNewsItem(item) {
  const writer = await getNextWriter();
  const sourceNotes = [
    `Summary: ${item.summary}`,
    `Why it matters: ${item.whyItMatters || item.summary}`,
    `Region: ${item.region}`,
    `Interest: ${item.asset}`,
    `Topics: ${(item.topics || []).join(', ')}`,
  ].join(' ');

  const prompt = buildArticlePrompt({
    accessTier: item.accessTier || 'free',
    headline: item.title,
    sourceNotes,
  });

  const { sanitized, used } = await writeWithFallback(writer, prompt, false);
  return {
    writerSlot: sanitized ? used.slot : 'local-fallback',
    provider: sanitized ? used.provider : 'local-fallback',
    ...(sanitized || createLocalNewsDraft(item)),
  };
}

export async function createLearningArticleFromTopic(topic, accessTier = 'free', region = 'global', interest = 'equities', forceProvider = '', context = '') {
  const writer = await getNextWriter(forceProvider);
  const sourceNotes = [
    `Region: ${region}`,
    `Interest: ${interest}`,
    ...(context ? [`Latest official figure to explain: ${context}`, 'Explain what this means for everyday savers and borrowers. Keep the headline short (under 90 characters).'] : []),
    'This is an original explainer topic with no external news source — write it as a standalone piece on this topic.',
  ].join(' ');

  const prompt = buildArticlePrompt({
    accessTier,
    headline: topic,
    sourceNotes,
  });

  const { sanitized, used } = await writeWithFallback(writer, prompt, Boolean(forceProvider));
  return {
    writerSlot: sanitized ? used.slot : 'local-fallback',
    provider: sanitized ? used.provider : 'local-fallback',
    ...(sanitized || createLocalLearningDraft(topic, accessTier, region, interest)),
  };
}

/* ════════════════════════════════════════════════════════════════════════
   STANDARDIZED PROMPTS — same rules for all 3 writers, chosen by tier.
   Free tier gets the "simple language" prompt; regular and premium both
   get the "professional tone" prompt (both are paid tiers).
   ════════════════════════════════════════════════════════════════════════ */
const RESPONSE_JSON_SCHEMA =
  '{"headline":"string","summary":"string","plainEnglish":"string","whyItMatters":"string","everydayExample":"string","takeaways":["string"],"jargonBuster":[{"term":"string","meaning":"string"}],"infographic":{"title":"string","items":[{"label":"string","value":"string","context":"string"}]},"visualSuggestion":"string"}';

function buildArticlePrompt({ accessTier, headline, sourceNotes }) {
  const isPaidTier = accessTier === 'regular' || accessTier === 'premium';

  const instructions = isPaidTier
    ? [
        'Write like a premium macro-financial intelligence publication.',
        'Rules:',
        '- Professional tone',
        '- Concise but layered',
        '- Analytical, not journalistic',
        '- Assume a middle-level financially literate reader',
        '- Explain second-order implications',
        '- Include capital flow logic where relevant',
        '- Mention policy sensitivity where relevant',
        'Mandatory:',
        '- Explain technical terms immediately in plain language',
        '- Include at least one real-world example',
        '- Suggest one infographic idea suitable for this article (put it in the visualSuggestion field)',
        '- Write for clarity first, sophistication second',
        'Structure:',
        '1. Immediate market development',
        '2. Why institutional investors care',
        '3. Second-order implication',
        '4. Forward scenario',
      ]
    : [
        'You are writing for intelligent readers who are not finance professionals.',
        'Task: Convert the headline and source notes into a clear article using simple language.',
        'Rules:',
        '- Short paragraphs',
        '- Explain difficult terms simply',
        '- No unnecessary jargon',
        '- If jargon appears, explain immediately',
        '- Tone must feel intelligent but easy',
        '- Avoid sounding academic',
        '- Focus on what happened, why it matters, what may happen next',
        'Mandatory:',
        '- Explain technical terms immediately in plain language',
        '- Include at least one real-world example',
        '- Suggest one illustration/image idea suitable for this article (put it in the visualSuggestion field)',
        '- Write for clarity first, sophistication second',
        'Structure:',
        '1. Clear opening',
        '2. Why this matters',
        '3. Immediate implication',
        '4. One practical takeaway',
      ];

  // Explicit per-field word targets — critical. plainEnglish, whyItMatters,
  // and everydayExample each render as their own full-width card on the
  // article page. A blanket "500-700 words total, spread across the JSON
  // fields" instruction lets the model default to one sentence per field,
  // which reads as broken/empty cards even though nothing is technically
  // wrong. Each of those three fields needs real paragraph length on its
  // own — this is what actually fixes that, not the total word count.
  const fieldTargets = isPaidTier
    ? [
        'Field-by-field length targets (this is what matters — hit these, not just an overall total):',
        '- summary: 2-3 sentences (about 40-60 words) — a standalone teaser, used in preview cards elsewhere',
        '- plainEnglish: 3-4 full paragraphs (about 250-350 words) — this is the main body of the article',
        '- whyItMatters: 2-3 full paragraphs (about 150-200 words)',
        '- everydayExample: 1-2 full paragraphs with a concrete, specific example (about 120-180 words)',
        '- takeaways: exactly 3 items, one full sentence each (15-25 words per item)',
        '- jargonBuster: 2-3 terms, each with a one-sentence plain-language definition',
        'Total across all fields should land around 800-1200 words — but hit the per-field targets above, not just the total.',
      ]
    : [
        'Field-by-field length targets (this is what matters — hit these, not just an overall total):',
        '- summary: 1-2 sentences (about 25-40 words) — a standalone teaser, used in preview cards elsewhere',
        '- plainEnglish: 2-3 full paragraphs (about 150-220 words) — this is the main body of the article',
        '- whyItMatters: 1-2 full paragraphs (about 100-150 words)',
        '- everydayExample: 1 full paragraph with a concrete, specific example (about 100-150 words)',
        '- takeaways: exactly 3 items, one full sentence each (12-20 words per item)',
        '- jargonBuster: 2 terms, each with a one-sentence plain-language definition',
        'Total across all fields should land around 500-700 words — but hit the per-field targets above, not just the total.',
      ];

  return [
    ...instructions,
    ...fieldTargets,
    // Saying this up front means fewer pieces fail the quality checks
    // (src/services/qualityService.js) — each failed piece is paid for but unused.
    'NEVER use these words or ideas: "AI", "artificial intelligence", the name of any writing tool or model; "guaranteed" (about returns, profits or income), "risk-free", "can\'t lose", "get rich", "double your money"; "buy now", "you should buy", "you should sell", "strong buy". This is education, not advice: describe, never promise or recommend.',
    'Keep the headline under 90 characters.',
    'CRITICAL FORMATTING RULE: every string value must be plain text only.',
    'Do not use HTML tags of any kind (no <strong>, <br>, <p>, <ul>, <li>, etc).',
    'Do not use Markdown formatting either (no **bold**, no # headings, no - bullet dashes inside a string).',
    'Write plain sentences and paragraphs only — the app applies its own formatting.',
    `Headline: ${headline}`,
    `Source Notes: ${sourceNotes}`,
    'Return strict JSON with keys:',
    RESPONSE_JSON_SCHEMA,
  ].join('\n');
}

/* ════════════════════════════════════════════════════════════════════════
   SANITIZATION — code-level guarantee against HTML/markdown leaking into
   article text. The prompt already tells every provider to return plain
   text only, but models don't always comply — this strips it regardless,
   so a provider misbehaving can never break the site's rendering again.
   ════════════════════════════════════════════════════════════════════════ */
function stripHtmlTags(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .replace(/<[^>]*>/g, '') // actual HTML tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/\*\*/g, '') // stray markdown bold markers
    .trim();
}

function sanitizeGeneratedContent(generated) {
  if (!generated || typeof generated !== 'object') {
    return generated;
  }

  const sanitized = { ...generated };

  for (const key of ['headline', 'summary', 'plainEnglish', 'whyItMatters', 'everydayExample', 'visualSuggestion']) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = stripHtmlTags(sanitized[key]);
    }
  }

  if (Array.isArray(sanitized.takeaways)) {
    sanitized.takeaways = sanitized.takeaways.map((item) => stripHtmlTags(item));
  }

  if (Array.isArray(sanitized.jargonBuster)) {
    sanitized.jargonBuster = sanitized.jargonBuster.map((entry) => ({
      term: stripHtmlTags(entry?.term || ''),
      meaning: stripHtmlTags(entry?.meaning || ''),
    }));
  }

  if (sanitized.infographic) {
    sanitized.infographic = {
      title: stripHtmlTags(sanitized.infographic.title || ''),
      items: (sanitized.infographic.items || []).map((item) => ({
        label: stripHtmlTags(item?.label || ''),
        value: stripHtmlTags(item?.value || ''),
        context: stripHtmlTags(item?.context || ''),
      })),
    };
  }

  return sanitized;
}

async function getNextWriter(forceProvider = '') {
  // Per-call override (e.g. the admin picking a specific writer for one
  // article) takes priority over everything else.
  const explicitProvider = ALL_PROVIDERS.includes(forceProvider) ? forceProvider : '';

  // Global override for testing phases — set WRITER_FORCE_PROVIDER in
  // Railway Variables (or Admin → Settings, once wired there) to
  // temporarily pin every generation to one provider without touching
  // code. Unset it to go back to the normal OpenAI → Claude rotation.
  const envProvider = ALL_PROVIDERS.includes(process.env.WRITER_FORCE_PROVIDER) ? process.env.WRITER_FORCE_PROVIDER : '';

  const forced = explicitProvider || envProvider;
  if (forced) {
    return {
      slot: forced,
      provider: forced,
      model: process.env[MODEL_ENV_KEYS[forced]] || '',
    };
  }

  let index = 0;
  const updated = await updateStore((store) => {
    index = (store.meta.nextWriterSlot || 0) % WRITER_ROTATION.length;
    store.meta.nextWriterSlot = index + 1;
    return store;
  });

  const provider = WRITER_ROTATION[index];
  return {
    slot: provider,
    provider,
    model: process.env[MODEL_ENV_KEYS[provider]] || '',
  };
}

/* If the writer whose turn it is has no key or fails, try every other
   writer that has a key saved (Claude, OpenAI, Gemini, Perplexity) before
   giving up. Before this, a site with only one key failed every other
   turn of the OpenAI → Claude rotation. A manual pick (forced) is not
   swapped for another writer. */
const KEY_ENV = { openai: 'OPENAI_API_KEY', claude: 'CLAUDE_API_KEY', perplexity: 'PERPLEXITY_API_KEY', gemini: 'GEMINI_API_KEY' };

async function writeWithFallback(writer, prompt, forced = false) {
  // At most 2 tries per piece (the writer whose turn it is + one backup),
  // so one bad moment can't burn through every service's allowance.
  const order = [writer, ...(forced ? [] : ['claude', 'openai', 'gemini', 'perplexity']
    .filter((p) => p !== writer.provider && process.env[KEY_ENV[p]])
    .map((p) => ({ slot: p, provider: p, model: process.env[MODEL_ENV_KEYS[p]] || '' })))].slice(0, 2);
  for (const attempt of order) {
    const generated = await requestStructuredWriting(attempt, prompt).catch(() => null);
    const sanitized = sanitizeGeneratedContent(generated);
    if (sanitized) {
      if (attempt !== writer) console.log(`[writerService] Written by ${attempt.provider} instead (${writer.provider} unavailable).`);
      return { sanitized, used: attempt };
    }
  }
  console.error(`[writerService] No writing service answered (tried: ${order.map((o) => o.provider).join(', ')}). Check the keys in Admin → APIs & More.`);
  return { sanitized: null, used: writer };
}

async function requestStructuredWriting(writer, prompt) {
  const hasKey = {
    openai: Boolean(process.env.OPENAI_API_KEY),
    claude: Boolean(process.env.CLAUDE_API_KEY),
    perplexity: Boolean(process.env.PERPLEXITY_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  };

  if (writer.provider === 'openai' && !hasKey.openai) {
    console.warn(`[writerService] Skipping OpenAI — OPENAI_API_KEY is not set. Falling back to local draft.`);
    return null;
  }
  if ((writer.provider === 'claude' || writer.provider === 'anthropic') && !hasKey.claude) {
    console.warn(`[writerService] Skipping Claude — CLAUDE_API_KEY is not set. Falling back to local draft.`);
    return null;
  }
  if (writer.provider === 'perplexity' && !hasKey.perplexity) {
    console.warn(`[writerService] Skipping Perplexity — PERPLEXITY_API_KEY is not set. Falling back to local draft.`);
    return null;
  }
  if (writer.provider === 'gemini' && !hasKey.gemini) {
    console.warn(`[writerService] Skipping Gemini — GEMINI_API_KEY is not set. Falling back to local draft.`);
    return null;
  }

  try {
    if (writer.provider === 'openai') {
      return await callOpenAI(writer.model, prompt);
    }
    if (writer.provider === 'claude' || writer.provider === 'anthropic') {
      return await callClaude(writer.model, prompt);
    }
    if (writer.provider === 'perplexity') {
      return await callPerplexity(writer.model, prompt);
    }
    if (writer.provider === 'gemini') {
      return await callGemini(writer.model, prompt);
    }
  } catch (error) {
    console.error(`[writerService] ${writer.provider} call failed — falling back to local draft. Reason:`, error.message);
    return null;
  }

  return null;
}

// Perplexity's Sonar API is also OpenAI-compatible. Unlike the other
// providers, Sonar does its own live web search per call — useful for
// topic-based articles where fresh context helps, but note it bills an
// extra ~$5 per 1,000 requests on top of token costs (not just tokens like
// OpenAI/Claude/Gemini), so it's not directly cost-comparable per-token.
async function callPerplexity(model, prompt) {
  const response = await fetch(process.env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'sonar',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Perplexity request failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content || '';
  return parseJson(text);
}

// Gemini's OpenAI-compatibility layer — confirmed against Google's own docs.
// Default model is Flash-Lite: cheap and fine for structured article JSON.
// Update GEMINI_MODEL in Admin → Settings if Google ships a newer Flash-Lite.
async function callGemini(model, prompt) {
  const response = await fetch(
    process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gemini-3.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Gemini request failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content || '';
  return parseJson(text);
}

async function callOpenAI(model, prompt) {
  const response = await fetch(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4.1-mini',
      input: prompt,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`OpenAI request failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  return parseResponseText(await response.json());
}

async function callClaude(model, prompt) {
  const response = await fetch(process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': process.env.CLAUDE_VERSION || '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // 'claude-3-5-sonnet-latest' was retired October 28, 2025 — Anthropic
      // now returns a 404 not_found_error for it, which was silently
      // falling back to the canned local-draft template on every call that
      // didn't have WRITER_A_MODEL/WRITER_B_MODEL set in .env. Current
      // default: claude-sonnet-5.
      model: model || 'claude-sonnet-5',
      // 1200 was too small: long explainers were cut off mid-JSON
      // ("Provider did not return valid JSON" in the logs).
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Claude request failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const payload = await response.json();
  const text = (payload.content || [])
    .filter((entry) => typeof entry.text === 'string')
    .map((entry) => entry.text)
    .join('\n');

  return parseJson(text);
}

function parseResponseText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return parseJson(payload.output_text);
  }

  const text = (payload.output || [])
    .flatMap((entry) => entry.content || [])
    .filter((entry) => typeof entry.text === 'string')
    .map((entry) => entry.text)
    .join('\n');

  return parseJson(text);
}

/* Reads the JSON object out of a writer's reply. Copes with ```json fences,
   text before/after the object, and stops at the object's real closing
   brace (the old "first { to last }" grab broke when the reply had extra
   text with braces after it). */
function parseJson(rawText) {
  const text = String(rawText || '').replace(/```(?:json)?/giu, '').trim();
  try {
    return JSON.parse(text);
  } catch { /* fall through */ }
  const start = text.indexOf('{');
  if (start < 0) throw new Error('Provider did not return valid JSON (no object found).');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error(`Provider did not return valid JSON (reply cut off after ${text.length} characters).`);
}

function createLocalNewsDraft(item) {
  return {
    summary: item.summary,
    plainEnglish: `In simple terms, ${lowercaseFirst(item.summary)}`,
    whyItMatters: item.whyItMatters || 'This matters because it can change how investors think about risk, growth, or income.',
    everydayExample: `Think of it like a busy road getting one important traffic signal changed. Even one change can affect the whole journey.`,
    takeaways: [
      'The headline points to a real shift, not just noise.',
      'The wider market impact depends on how long the trend lasts.',
      'Watch related sectors and your own holdings before reacting.',
    ],
    jargonBuster: [
      { term: 'Market sentiment', meaning: 'The overall mood of investors.' },
      { term: 'Positioning', meaning: 'How investors are currently placed in the market.' },
    ],
    infographic: {
      title: 'Quick breakdown',
      items: [
        { label: 'Headline impact', value: 'Now', context: 'Immediate reaction' },
        { label: 'Sector spillover', value: 'Next', context: 'Related areas may move too' },
        { label: 'Longer effect', value: 'Watch', context: 'Depends on follow-through' },
      ],
    },
  };
}

function createLocalLearningDraft(topic, accessTier, region, interest) {
  return {
    headline: toTitleCase(topic),
    summary: `${toTitleCase(topic)} explained in clear, everyday language for readers who want practical money knowledge.`,
    plainEnglish: `The simple version is this: ${topic.toLowerCase()} matters because it can change the way your money grows, earns, or handles risk.`,
    whyItMatters: `Readers in ${region.replace(/-/gu, ' ')} who follow ${interest.replace(/-/gu, ' ')} can use this topic to understand what headlines really mean.`,
    everydayExample: 'It is like reading the weather before leaving home. You may still go out, but you dress differently and plan better.',
    takeaways: [
      'Start with the basic idea before looking at numbers.',
      'Ask how the topic changes risk, income, or growth.',
      'Look for one practical action or one thing to monitor next.',
    ],
    jargonBuster: [
      { term: 'Volatility', meaning: 'How sharply prices move up and down.' },
      { term: 'Allocation', meaning: 'How money is spread across investments.' },
    ],
    infographic: {
      title: `${toTitleCase(topic)} at a glance`,
      items: [
        { label: 'What it is', value: 'Simple', context: 'Plain-English meaning' },
        { label: 'Why it matters', value: accessTier.toUpperCase(), context: 'Useful to your plan' },
        { label: 'What to do', value: 'Watch', context: 'One next step' },
      ],
    },
  };
}

function toTitleCase(value) {
  return String(value)
    .split(/\s+/u)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function lowercaseFirst(value) {
  if (!value) {
    return '';
  }
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/* ════════════════════════════════════════════════════════════════════════
   FORUM MODERATION — a short check of one forum post (about 0.1 US cent).
   Returns { verdict: 'allow' | 'review' | 'block', reason, checkedBy }
   or null if no writing service answered (the forum then keeps the post
   visible if it passed the rule checks, and logs it).
   ════════════════════════════════════════════════════════════════════════ */
export async function moderateForumPost({ title = '', body = '' }) {
  const prompt = [
    'You are the moderator of a friendly personal-finance education forum for everyday people.',
    'Decide if this post may be shown. Rules:',
    '- BLOCK: hate, harassment, threats, sexual content, illegal activity, scams, sharing personal contact details, spam/advertising, attempts to get people to message privately or join paid groups.',
    '- REVIEW (a human will check): pumping a specific coin or share ("will 10x", "buy now before it moons"), promises of guaranteed returns, claims that sound like insider information, accusations against named people or companies, anything that looks like personal financial advice given as certain fact, or off-topic content.',
    '- ALLOW: genuine questions, opinions, experiences and explanations about money, investing, markets, saving, retirement, taxes and the economy, even if blunt or mistaken.',
    'Reply with JSON only: {"verdict":"allow"|"review"|"block","reason":"one short sentence in plain English"}',
    `Title: ${String(title).slice(0, 300)}`,
    `Post: ${String(body).slice(0, 4000)}`,
  ].join('\n');
  const order = ['claude', 'openai', 'gemini', 'perplexity'].filter((p) => process.env[KEY_ENV[p]]).slice(0, 2);
  for (const provider of order) {
    const result = await requestStructuredWriting({ slot: provider, provider, model: process.env[MODEL_ENV_KEYS[provider]] || '' }, prompt).catch(() => null);
    const verdict = String(result?.verdict || '').toLowerCase();
    if (['allow', 'review', 'block'].includes(verdict)) {
      return { verdict, reason: String(result.reason || '').slice(0, 200), checkedBy: provider };
    }
  }
  console.warn('[writerService] Forum moderation: no writing service answered — rule checks only.');
  return null;
}

/* ════════════════════════════════════════════════════════════════════════
   "WHAT THE HEADLINES SAY" — 2–3 plain-English sentences written ONLY from
   a list of recent headlines (never from the articles themselves), for the
   "In the news" box on stock, ETF, commodity, bond and property pages.
   About 0.1 US cent each; at most once a day per page.
   Returns the text, or null if no writing service answered.
   ════════════════════════════════════════════════════════════════════════ */
export async function summarizeHeadlines({ subject = '', headlines = [] }) {
  if (headlines.length < 3) return null;
  const prompt = [
    'You write for Dr MoneyWise, a plain-English money education site for everyday readers.',
    `Below are recent news headlines about ${String(subject).slice(0, 120)}.`,
    'Write 2 or 3 short sentences (60 words at most) saying what the headlines are mainly about.',
    'Rules: use only what the headlines say; do not add facts, numbers or reasons that are not in them; do not predict prices; do not tell anyone to buy, sell or hold; say "headlines report" or "news this week focused on" rather than stating things as certain; British spelling; simple words; no jargon without a short explanation; do not mention how this text was written.',
    'Reply with JSON only: {"summary":"..."}',
    ...headlines.slice(0, 6).map((h, i) => `${i + 1}. ${String(h).slice(0, 220)}`),
  ].join('\n');
  const order = ['claude', 'openai', 'gemini', 'perplexity'].filter((p) => process.env[KEY_ENV[p]]).slice(0, 2);
  if (!order.length) return null;
  for (const provider of order) {
    const result = await requestStructuredWriting({ slot: provider, provider, model: process.env[MODEL_ENV_KEYS[provider]] || '' }, prompt).catch(() => null);
    const text = String(result?.summary || '').replace(/<[^>]+>/gu, '').replace(/\s+/gu, ' ').trim();
    if (text.length >= 40 && text.length <= 600) return text;
  }
  console.warn('[writerService] Headline summary: no writing service answered — links shown without a summary.');
  return null;
}

/* ════════════════════════════════════════════════════════════════════════
   COMPANY RESULTS — turns a company's results press release (from its SEC
   filing) into: a headline, "In simple words", up to 4 key numbers (free)
   and "What it means" (Premium). Only figures stated in the release.
   About 1–2 US cents per result. Returns null if no service answered.
   ════════════════════════════════════════════════════════════════════════ */
export async function explainResults({ company = '', ticker = '', text = '' }) {
  const prompt = [
    'You write for Dr MoneyWise, a plain-English money education site for everyday readers (many are beginners).',
    `Below is the results press release from ${String(company).slice(0, 80)} (${ticker}), taken from its official filing.`,
    'Using ONLY facts and figures stated in the release, reply with JSON only:',
    '{"headline":"max 80 characters, e.g. \\"Sales up 6% as more customers bought phones\\" (no company name)",',
    ' "period":"the period covered, e.g. \\"three months to 30 September 2026\\"",',
    ' "simple":"3 or 4 short sentences in simple words: what the company sold and earned in the period and how that compares with a year earlier",',
    ' "numbers":[{"label":"Sales","value":"$94.9 billion","change":"up 6% on a year earlier"}],  (2 to 4 items: sales/revenue, profit, earnings per share, dividend — only if stated)',
    ' "impact":"4 or 5 short sentences: what changed most and why the company says it changed, what the company says it expects next (only if it says so), and what readers may want to keep an eye on. No share-price predictions.",',
    ' "dividend":{"action":"raised|cut|kept|started|stopped|special|none","amount":"e.g. $0.52 a share, or empty","previous":"previous amount if stated, or empty","summary":"one short sentence, or empty"}}  (use "none" if the release does not announce a dividend)',
    'Rules: never invent or calculate numbers that are not in the text; use the company’s own currency; British spelling; explain any finance word in brackets the first time; do not tell anyone to buy, sell or hold; do not mention how this text was written.',
    '--- PRESS RELEASE ---',
    String(text).slice(0, 16000),
  ].join('\n');
  const order = ['claude', 'openai', 'gemini', 'perplexity'].filter((p) => process.env[KEY_ENV[p]]).slice(0, 2);
  if (!order.length) return null;
  for (const provider of order) {
    const r = await requestStructuredWriting({ slot: provider, provider, model: process.env[MODEL_ENV_KEYS[provider]] || '' }, prompt).catch(() => null);
    const clean = (v, max) => String(v || '').replace(/<[^>]+>/gu, '').replace(/\s+/gu, ' ').trim().slice(0, max);
    const headline = clean(r?.headline, 110);
    const simple = clean(r?.simple, 900);
    if (headline.length < 10 || simple.length < 60) continue;
    const numbers = (Array.isArray(r.numbers) ? r.numbers : []).slice(0, 4)
      .map((n) => ({ label: clean(n?.label, 40), value: clean(n?.value, 40), change: clean(n?.change, 60) }))
      .filter((n) => n.label && n.value);
    return { headline, period: clean(r.period, 80), simple, numbers, impact: clean(r.impact, 1400) || null, dividend: cleanDividend(r.dividend, clean), writtenBy: provider };
  }
  console.warn('[writerService] Results explanation: no writing service answered — listed with a link only.');
  return null;
}

const DIVIDEND_ACTIONS = ['raised', 'cut', 'kept', 'started', 'stopped', 'special'];
function cleanDividend(d, clean) {
  const action = String(d?.action || '').toLowerCase().trim();
  if (!DIVIDEND_ACTIONS.includes(action)) return null;
  return { action, amount: clean(d.amount, 60), previous: clean(d.previous, 60), summary: clean(d.summary, 300) };
}

/* ════════════════════════════════════════════════════════════════════════
   DIVIDEND ANNOUNCEMENTS — reads a company announcement that mentions a
   dividend and says whether it was raised, cut, kept, started, stopped or a
   one-off special payment. For dividend alerts (Regular and Premium).
   ════════════════════════════════════════════════════════════════════════ */
export async function explainDividend({ company = '', ticker = '', text = '' }) {
  const prompt = [
    `Below is an announcement from ${String(company).slice(0, 80)} (${ticker}), taken from its official filing.`,
    'If it declares or changes a dividend, reply with JSON only:',
    '{"action":"raised|cut|kept|started|stopped|special|none","amount":"e.g. $0.52 a share","previous":"previous amount if stated","payable":"payment date if stated","summary":"one or two short sentences in plain English"}',
    'Use "none" if the announcement does not declare a dividend. Only use facts stated in the text. British spelling. Do not tell anyone to buy, sell or hold.',
    '--- ANNOUNCEMENT ---',
    String(text).slice(0, 8000),
  ].join('\n');
  const order = ['claude', 'openai', 'gemini', 'perplexity'].filter((p) => process.env[KEY_ENV[p]]).slice(0, 2);
  for (const provider of order) {
    const r = await requestStructuredWriting({ slot: provider, provider, model: process.env[MODEL_ENV_KEYS[provider]] || '' }, prompt).catch(() => null);
    if (!r) continue;
    const clean = (v, max) => String(v || '').replace(/<[^>]+>/gu, '').replace(/\s+/gu, ' ').trim().slice(0, max);
    const d = cleanDividend(r, clean);
    if (!d && String(r.action || '').toLowerCase() === 'none') return null;
    if (d) return { ...d, payable: clean(r.payable, 60) };
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════════════
   MONTHLY RESEARCH REPORT — the executive summary and "what to watch",
   written only from the figures we pass in (reportService.js then checks
   every number in the text against those figures).
   ════════════════════════════════════════════════════════════════════════ */
export async function writeReportSummary({ month, facts }) {
  const prompt = [
    'You write for Dr MoneyWise, a plain-English money education site for everyday investors.',
    `Write the opening of our monthly research report for ${month}, using ONLY the figures below.`,
    'Return JSON only: {"headline":"...","summary":["...","...","..."],"watch":["...","...","..."]}',
    '- headline: under 80 characters, the month’s main theme.',
    '- summary: 3 or 4 short paragraphs (40-70 words each) on what the figures show and why it matters to an everyday investor.',
    '- watch: 3 short points (under 30 words each) on what to keep an eye on next month, based only on these figures.',
    'Rules: every number you write must appear in the figures below, written the same way; do not add facts, events, dates, forecasts or company news that are not in the figures; do not predict prices; do not tell anyone to buy, sell or hold; British spelling; simple words; explain any jargon in a few words; do not mention how this text was written.',
    'Figures:',
    JSON.stringify(facts),
  ].join('\n');
  const order = ['claude', 'openai', 'gemini', 'perplexity'].filter((p) => process.env[KEY_ENV[p]]).slice(0, 3);
  for (const provider of order) {
    const result = await requestStructuredWriting({ slot: provider, provider, model: process.env[MODEL_ENV_KEYS[provider]] || '' }, prompt).catch(() => null);
    const clean = (t) => String(t || '').replace(/<[^>]+>/gu, '').replace(/\s+/gu, ' ').trim();
    const out = {
      headline: clean(result?.headline).slice(0, 110),
      summary: (Array.isArray(result?.summary) ? result.summary : []).map(clean).filter((p) => p.length > 20).slice(0, 4),
      watch: (Array.isArray(result?.watch) ? result.watch : []).map(clean).filter((p) => p.length > 10).slice(0, 4),
      provider,
    };
    if (out.headline && out.summary.length >= 2) return out;
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════════════
   ASK DR MONEYWISE — a first draft of an answer for the team to check and
   edit in Admin before anything is sent.
   ════════════════════════════════════════════════════════════════════════ */
export async function writeAskDraft({ question, topic }) {
  const prompt = [
    'You help the Dr MoneyWise team answer questions from members of a plain-English money education site.',
    `Topic: ${String(topic).slice(0, 60)}`,
    `Member’s question: ${String(question).slice(0, 1200)}`,
    'Write a draft answer of 150-300 words that the team will check and edit before sending.',
    'Rules: explain the ideas and the main options in general terms; give the questions the reader should think about; do NOT give personal advice or tell them what to buy, sell or do with their money; do not name specific shares or funds to buy; no made-up figures (only well-known general facts, and say "about" or "usually" when rules vary by country); if tax or legal rules matter, say they differ by country and suggest checking with an official source or a qualified adviser; British spelling; short paragraphs separated by a blank line; friendly and clear; do not mention how this text was written.',
    'Reply with JSON only: {"answer":"..."}',
  ].join('\n');
  const order = ['claude', 'openai', 'gemini', 'perplexity'].filter((p) => process.env[KEY_ENV[p]]).slice(0, 2);
  for (const provider of order) {
    const result = await requestStructuredWriting({ slot: provider, provider, model: process.env[MODEL_ENV_KEYS[provider]] || '' }, prompt).catch(() => null);
    const text = String(result?.answer || '').replace(/<[^>]+>/gu, '').trim();
    if (text.length >= 200) return text;
  }
  return null;
}
