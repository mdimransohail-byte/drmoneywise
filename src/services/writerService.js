import { updateStore } from './storeService.js';

export async function summarizeNewsItem(item) {
  const writer = await getNextWriter();
  const prompt = [
    'You turn finance news into plain-English articles for everyday readers.',
    'Return strict JSON with keys:',
    '{"summary":"string","plainEnglish":"string","whyItMatters":"string","everydayExample":"string","takeaways":["string"],"jargonBuster":[{"term":"string","meaning":"string"}],"infographic":{"title":"string","items":[{"label":"string","value":"string","context":"string"}]}}',
    'Keep the original headline untouched. Use simple words. No hype. No investment advice.',
    `Headline: ${item.title}`,
    `Summary: ${item.summary}`,
    `Why it matters: ${item.whyItMatters || item.summary}`,
    `Region: ${item.region}`,
    `Interest: ${item.asset}`,
    `Topics: ${(item.topics || []).join(', ')}`,
  ].join('\n');

  const generated = await requestStructuredWriting(writer, prompt).catch(() => null);
  return {
    writerSlot: writer.slot,
    provider: writer.provider,
    ...(generated || createLocalNewsDraft(item)),
  };
}

export async function createLearningArticleFromTopic(topic, accessTier = 'free', region = 'global', interest = 'equities') {
  const writer = await getNextWriter();
  const prompt = [
    'You write friendly learning articles for beginner and intermediate market readers.',
    'Return strict JSON with keys:',
    '{"headline":"string","summary":"string","plainEnglish":"string","whyItMatters":"string","everydayExample":"string","takeaways":["string"],"jargonBuster":[{"term":"string","meaning":"string"}],"infographic":{"title":"string","items":[{"label":"string","value":"string","context":"string"}]}}',
    'Use very simple language, practical tone, and one real-life example.',
    `Topic: ${topic}`,
    `Access tier: ${accessTier}`,
    `Region: ${region}`,
    `Interest: ${interest}`,
  ].join('\n');

  const generated = await requestStructuredWriting(writer, prompt).catch(() => null);
  return {
    writerSlot: writer.slot,
    provider: writer.provider,
    ...(generated || createLocalLearningDraft(topic, accessTier, region, interest)),
  };
}

async function getNextWriter() {
  let chosenSlot = 'writerA';
  const updated = await updateStore((store) => {
    chosenSlot = store.meta.nextWriterSlot % 2 === 0 ? 'writerA' : 'writerB';
    store.meta.nextWriterSlot += 1;
    return store;
  });

  const settings = updated.settings?.[chosenSlot] || {};
  return {
    slot: chosenSlot,
    provider: settings.provider || (chosenSlot === 'writerA' ? 'openai' : 'claude'),
    model: settings.model || '',
  };
}

async function requestStructuredWriting(writer, prompt) {
  if (writer.provider === 'openai' && process.env.OPENAI_API_KEY) {
    return callOpenAI(writer.model, prompt);
  }

  if ((writer.provider === 'claude' || writer.provider === 'anthropic') && process.env.CLAUDE_API_KEY) {
    return callClaude(writer.model, prompt);
  }

  return null;
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
    throw new Error(`OpenAI request failed with status ${response.status}`);
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
    throw new Error(`Claude request failed with status ${response.status}`);
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
