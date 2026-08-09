import { updateStore } from './storeService.js';

/* ════════════════════════════════════════════════════════════════════════
   WRITER ROTATION — fixed order, not admin-configurable
   ───────────────────────────────────────────────────────────────────────
   Every article generation (news rewrite or admin-given topic) cycles
   through these three providers in this exact order: DeepSeek first
   (cheapest), then OpenAI, then Claude. store.meta.nextWriterSlot just
   counts up forever; the modulo picks the provider.

   Per-provider model overrides come straight from env vars — set
   DEEPSEEK_MODEL / OPENAI_MODEL / CLAUDE_MODEL in Admin → Settings (or
   Railway Variables) to pin a specific model. Leave blank to use each
   provider's default below.

   NOTE ON DEEPSEEK PRICING: DeepSeek V4 (mid-2026) bills double during
   Beijing peak hours (9:00-12:00 and 14:00-18:00 Beijing Time). If daily
   article-generation cost matters, consider running the admin "Generate"
   workflow or any future auto-scheduling outside those windows.
   ════════════════════════════════════════════════════════════════════════ */
const WRITER_ROTATION = ['deepseek', 'openai', 'claude']; // automatic rotation order — unchanged
const ALL_PROVIDERS = ['deepseek', 'openai', 'claude', 'perplexity', 'gemini']; // valid for manual/forced selection

const MODEL_ENV_KEYS = {
  deepseek: 'DEEPSEEK_MODEL',
  openai: 'OPENAI_MODEL',
  claude: 'CLAUDE_MODEL',
  perplexity: 'PERPLEXITY_MODEL',
  gemini: 'GEMINI_MODEL',
};

const DEEPSEEK_PEAK_WINDOWS = [
  [9, 12],
  [14, 18],
];

/**
 * DeepSeek V4 doubles token pricing during Beijing-time peak windows
 * (9:00-12:00 and 14:00-18:00). This checks the current time against those
 * windows so the admin UI can warn before spending money at 2x the rate.
 * Returns { active, untilLabel } — untilLabel is a human-readable Beijing
 * time string for when the current peak window ends, or null if off-peak.
 */
export function getDeepSeekSurgeStatus() {
  const beijingNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const hour = beijingNow.getHours();
  const minute = beijingNow.getMinutes();
  const decimalHour = hour + minute / 60;

  const activeWindow = DEEPSEEK_PEAK_WINDOWS.find(([start, end]) => decimalHour >= start && decimalHour < end);

  if (!activeWindow) {
    return { active: false, untilLabel: null };
  }

  const [, end] = activeWindow;
  const untilLabel = `${String(end).padStart(2, '0')}:00 Beijing Time`;
  return { active: true, untilLabel };
}

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

  const generated = await requestStructuredWriting(writer, prompt).catch(() => null);
  return {
    writerSlot: generated ? writer.slot : 'local-fallback',
    provider: generated ? writer.provider : 'local-fallback',
    ...(generated || createLocalNewsDraft(item)),
  };
}

export async function createLearningArticleFromTopic(topic, accessTier = 'free', region = 'global', interest = 'equities', forceProvider = '') {
  const writer = await getNextWriter(forceProvider);
  const sourceNotes = [
    `Region: ${region}`,
    `Interest: ${interest}`,
    'This is an original explainer topic with no external news source — write it as a standalone piece on this topic.',
  ].join(' ');

  const prompt = buildArticlePrompt({
    accessTier,
    headline: topic,
    sourceNotes,
  });

  const generated = await requestStructuredWriting(writer, prompt).catch(() => null);
  return {
    writerSlot: generated ? writer.slot : 'local-fallback',
    provider: generated ? writer.provider : 'local-fallback',
    ...(generated || createLocalLearningDraft(topic, accessTier, region, interest)),
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
        'Length: 800-1200 words of total article content, spread naturally across the JSON fields below.',
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
        'Length: 500-700 words of total article content, spread naturally across the JSON fields below.',
      ];

  return [
    ...instructions,
    `Headline: ${headline}`,
    `Source Notes: ${sourceNotes}`,
    'Return strict JSON with keys:',
    RESPONSE_JSON_SCHEMA,
  ].join('\n');
}

async function getNextWriter(forceProvider = '') {
  // Per-call override (e.g. the admin picking a specific writer for one
  // article) takes priority over everything else.
  const explicitProvider = ALL_PROVIDERS.includes(forceProvider) ? forceProvider : '';

  // Global override for testing phases — set WRITER_FORCE_PROVIDER in
  // Railway Variables (or Admin → Settings, once wired there) to
  // temporarily pin every generation to one provider without touching
  // code. Unset it to go back to the normal DeepSeek → OpenAI → Claude
  // rotation.
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

async function requestStructuredWriting(writer, prompt) {
  const hasKey = {
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    claude: Boolean(process.env.CLAUDE_API_KEY),
    perplexity: Boolean(process.env.PERPLEXITY_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  };

  if (writer.provider === 'deepseek' && !hasKey.deepseek) {
    console.warn(`[writerService] Skipping DeepSeek — DEEPSEEK_API_KEY is not set. Falling back to local draft.`);
    return null;
  }
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
    if (writer.provider === 'deepseek') {
      return await callDeepSeek(writer.model, prompt);
    }
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

// DeepSeek's API is OpenAI-SDK compatible — same chat-completions shape as callOpenAI below.
async function callDeepSeek(model, prompt) {
  const response = await fetch(process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`DeepSeek request failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content || '';
  return parseJson(text);
}

// Perplexity's Sonar API is also OpenAI-compatible. Unlike the other three
// providers, Sonar does its own live web search per call — useful for
// topic-based articles where fresh context helps, but note it bills an
// extra ~$5 per 1,000 requests on top of token costs (not just tokens like
// DeepSeek/OpenAI/Claude), so it's not directly cost-comparable per-token.
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
        model: model || 'gemini-2.5-flash-lite',
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
      model: model || 'claude-3-5-sonnet-latest',
      max_tokens: 1200,
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

function parseJson(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/u);
    if (!match) {
      throw new Error('Provider did not return valid JSON.');
    }
    return JSON.parse(match[0]);
  }
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
