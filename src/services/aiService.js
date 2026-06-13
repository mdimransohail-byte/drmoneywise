import { APP_NAME, canAccess } from '../config.js';

export async function createMarketBrief({ news = [], preferences = {}, plan, mode = 'demo' }) {
  const cappedNews = news.slice(0, plan.aiDepth === 'starter' ? 4 : 6);

  if (process.env.OPENAI_API_KEY) {
    try {
      const generated = await requestStructuredOutput({
        kind: 'market-brief',
        payload: {
          news: cappedNews,
          preferences,
          plan: plan.id,
          mode,
        },
      });

      if (generated) {
        return {
          ...generated,
          engine: 'OpenAI',
          mode: 'ai',
        };
      }
    } catch {
      // Fall back to local generation if the model call fails.
    }
  }

  return createLocalMarketBrief({ news: cappedNews, preferences, plan, mode });
}

export async function createLearningGuide({ track, preferences = {}, plan }) {
  if (!track) {
    return {
      title: 'No track selected',
      summary: 'Choose a market lane to build your learning plan.',
      modules: [],
      quiz: [],
      coachNotes: [],
      mode: 'empty',
    };
  }

  if (process.env.OPENAI_API_KEY && track.accessible) {
    try {
      const generated = await requestStructuredOutput({
        kind: 'learning-guide',
        payload: {
          track,
          preferences,
          plan: plan.id,
        },
      });

      if (generated) {
        return {
          ...generated,
          engine: 'OpenAI',
          mode: 'ai',
        };
      }
    } catch {
      // Fall back to local generation if the model call fails.
    }
  }

  return createLocalLearningGuide({ track, preferences, plan });
}

async function requestStructuredOutput({ kind, payload }) {
  const endpoint = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/responses';
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const prompt = buildPrompt(kind, payload);
  const isResponsesApi = endpoint.includes('/responses');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      isResponsesApi
        ? {
            model,
            input: prompt,
          }
        : {
            model,
            messages: [{ role: 'user', content: prompt }],
          },
    ),
  });

  if (!response.ok) {
    throw new Error(`Model request failed with status ${response.status}`);
  }

  const payloadJson = await response.json();
  const rawText = extractText(payloadJson);
  if (!rawText) {
    return null;
  }

  return parseJsonObject(rawText);
}

function buildPrompt(kind, payload) {
  if (kind === 'market-brief') {
    return [
      `You are the AI desk inside ${APP_NAME}.`,
      'Return strict JSON with this shape:',
      '{"title":"string","summary":"string","signals":[{"label":"string","body":"string"}],"actionSteps":["string"],"watchlistAngles":["string"],"upgradeNote":"string"}',
      'Keep it concise, useful, and non-alarmist.',
      `Context: ${JSON.stringify(payload)}`,
    ].join('\n');
  }

  return [
    `You are the learning coach inside ${APP_NAME}.`,
    'Return strict JSON with this shape:',
    '{"title":"string","summary":"string","modules":["string"],"quiz":[{"question":"string","answer":"string"}],"coachNotes":["string"]}',
    'Make the plan practical and clear.',
    `Context: ${JSON.stringify(payload)}`,
  ].join('\n');
}

function extractText(payload) {
  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  if (Array.isArray(payload.output)) {
    const textParts = payload.output
      .flatMap((entry) => entry.content || [])
      .filter((entry) => typeof entry.text === 'string')
      .map((entry) => entry.text);
    if (textParts.length) {
      return textParts.join('\n');
    }
  }

  const chatText = payload.choices?.[0]?.message?.content;
  if (typeof chatText === 'string') {
    return chatText;
  }

  if (Array.isArray(chatText)) {
    return chatText.map((chunk) => chunk.text).filter(Boolean).join('\n');
  }

  return null;
}

function parseJsonObject(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/u);
    if (!match) {
      throw new Error('Model output was not valid JSON.');
    }

    return JSON.parse(match[0]);
  }
}

function createLocalMarketBrief({ news, preferences, plan, mode }) {
  const regionLabel = preferences.regionLabel || humanize(preferences.region || 'global');
  const assetLabel = preferences.assetLabel || humanize(preferences.asset || 'all assets');
  const positiveCount = news.filter((item) => item.sentiment === 'positive').length;
  const defensiveTilt = news.some((item) => item.asset === 'fixed-income' || item.asset === 'commodities');
  const topSignals = news.slice(0, plan.aiDepth === 'starter' ? 2 : 3);

  return {
    title: `${regionLabel} ${assetLabel} opening brief`,
    summary:
      positiveCount >= news.length / 2
        ? 'Risk appetite is constructive, but leadership is selective. The cleaner setups are in areas with durable cash flows and visible policy or demand support.'
        : 'Markets are moving with more caution than panic. Investors still want exposure, but they are demanding clearer evidence before adding risk.',
    signals: topSignals.map((item) => ({
      label: item.title,
      body: item.accessible
        ? item.whyItMatters
        : `${humanizeTier(item.accessTier)} content explains the second-order effect, sector transmission, and what to watch next.`,
    })),
    actionSteps: [
      `Focus on ${defensiveTilt ? 'barbell positioning between offense and defense' : 'high-quality leaders rather than crowded beta'}.`,
      `Scan your watchlist for ${assetLabel.toLowerCase()} names that benefit directly from the dominant headline.`,
      "Write one sentence about what would invalidate today's market view before acting.",
    ],
    watchlistAngles: [
      `Look for assets in ${regionLabel} where momentum is backed by earnings, policy, or visible liquidity.`,
      'Compare current headlines against your watchlist names instead of reacting to the index alone.',
      canAccess(plan, 'premium')
        ? 'Use cross-asset confirmation from bonds, FX, or commodities before escalating conviction.'
        : 'Upgrade to unlock cross-asset scenario mapping and paid article notes.',
    ],
    upgradeNote:
      canAccess(plan, 'premium') || mode === 'live'
        ? 'Regular and Premium tiers add deeper scenario notes, more articles, and stronger learning tracks.'
        : 'Connect API keys for live news and upgrade to a paid plan for deeper analysis.',
    engine: 'Local AI fallback',
    mode: process.env.OPENAI_API_KEY ? 'fallback' : 'local',
  };
}

function createLocalLearningGuide({ track, preferences, plan }) {
  const visibleModules = track.accessible ? track.modules : track.modules.slice(0, 2);
  const regionLabel = humanize(preferences.region || 'global');

  return {
    title: `${track.title} plan`,
    summary: track.accessible
      ? `${track.subtitle} This version is tuned to your ${regionLabel} focus so the lessons feel tied to the feed you are following.`
      : `${track.subtitle} The free tier includes a preview so you can test the learning flow before upgrading.`,
    modules: visibleModules,
    quiz: [
      {
        question: "What single data point or headline would make today's theme stronger?",
        answer: 'A confirming data point, earnings signal, or cross-asset move that supports the main narrative instead of contradicting it.',
      },
      {
        question: 'Why is a watchlist often better than reacting to the whole market?',
        answer: 'It keeps your attention on assets with context, setup, and a reason to move, rather than on noise.',
      },
    ],
    coachNotes: [
      `Tie each lesson back to one ${preferences.asset || 'market'} headline from the current feed.`,
      'Keep a tiny journal: thesis, trigger, and what would change your mind.',
      canAccess(plan, 'premium')
        ? 'Use the AI desk note to summarize what you learned at the end of each session.'
        : 'Upgrade to unlock paid and premium learning paths.',
    ],
    mode: 'local',
    engine: 'Local AI fallback',
  };
}

function humanize(input) {
  return String(input)
    .replace(/-/gu, ' ')
    .replace(/\ball\b/giu, 'all')
    .replace(/\b\w/gu, (match) => match.toUpperCase());
}

function humanizeTier(accessTier = 'free') {
  if (accessTier === 'regular') {
    return 'Paid regular';
  }

  if (accessTier === 'premium') {
    return 'Premium';
  }

  return 'Free';
}
