import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';

/* ════════════════════════════════════════════════════════════════════════
   PEXELS — stock photography search
   ───────────────────────────────────────────────────────────────────────
   Simple, synchronous, free. Images are hotlinked straight from Pexels'
   own CDN (their API explicitly supports this) — nothing downloaded or
   re-hosted. Attribution isn't strictly required by Pexels' terms, but we
   keep the photographer credit/link since it's their recommended practice.
   ════════════════════════════════════════════════════════════════════════ */
export async function searchPexelsImage(query) {
  if (!process.env.PEXELS_API_KEY) {
    console.warn('[visualsService] Skipping Pexels — PEXELS_API_KEY is not set.');
    return null;
  }

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '1');
  url.searchParams.set('orientation', 'landscape');

  // Pexels requires the raw key as the Authorization value — NOT "Bearer <key>".
  const response = await fetch(url, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Pexels request failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const payload = await response.json();
  const photo = payload.photos?.[0];
  if (!photo) {
    return null;
  }

  return {
    url: photo.src.large,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    pexelsPageUrl: photo.url,
  };
}

/* ════════════════════════════════════════════════════════════════════════
   GAMMA — AI-generated infographic
   ───────────────────────────────────────────────────────────────────────
   Requires a paid Gamma Pro+ plan. Unlike every other integration in this
   app, this is fully asynchronous: create a generation, poll for status
   (up to ~2.5 minutes), then download the result — which comes back as a
   ZIP file (one image per card), never a direct image URL. We extract the
   single PNG and save it onto the persistent data/ volume, then serve it
   through the /media/:filename route in server.js.

   This is meaningfully slower and more expensive per call than Pexels —
   treat it as a deliberate, occasional action, not something to run on
   every article.
   ════════════════════════════════════════════════════════════════════════ */
const GAMMA_BASE_URL = 'https://public-api.gamma.app/v1.0';
const GAMMA_POLL_INTERVAL_MS = 5000;
const GAMMA_MAX_POLL_ATTEMPTS = 30; // ~2.5 minutes total

export async function generateGammaInfographic({ headline, infographic, summary = '', points = [], stats = [], dimensions = '1x1' }) {
  if (!process.env.GAMMA_API_KEY) {
    console.warn('[visualsService] Skipping Gamma — GAMMA_API_KEY is not set.');
    return null;
  }

  const inputText = buildGammaInfographicPrompt({ headline, infographic, summary, points, stats });
  const base = { inputText, textMode: 'condense', format: 'social', numCards: 1, exportAs: 'png' };
  // Full design request first; if Gamma rejects an option, try again with the basics only
  const full = {
    ...base,
    ...(await gammaThemeId() ? { themeId: await gammaThemeId() } : {}),
    additionalInstructions: GAMMA_STYLE,
    textOptions: { amount: 'brief', tone: 'clear, friendly, plain English', audience: 'everyday savers and new investors', language: 'en-gb' },
    imageOptions: { source: 'noImages' },
    cardOptions: { dimensions },
  };
  let createResponse = await gammaCreate(full);
  if (createResponse.status === 400 || createResponse.status === 422) {
    console.warn('[visualsService] Gamma rejected the design options; retrying with the basics.');
    createResponse = await gammaCreate({ ...base, inputText: `${inputText}\n\n${GAMMA_STYLE}` });
  }

  if (!createResponse.ok) {
    const errorBody = await createResponse.text().catch(() => '');
    throw new Error(`Gamma generation request failed with status ${createResponse.status}: ${errorBody.slice(0, 300)}`);
  }

  const { generationId } = await createResponse.json();
  if (!generationId) {
    throw new Error('Gamma did not return a generationId.');
  }

  console.warn(`[visualsService] Gamma generation ${generationId} started — polling for up to ~2.5 minutes.`);
  const exportUrl = await pollGammaGeneration(generationId);
  const { buffer, extension } = await extractFirstImageFromZip(exportUrl);
  return saveGeneratedImage(buffer, extension);
}

async function gammaThemeId() {
  try {
    const { readStore } = await import('./storeService.js');
    return (await readStore()).settings?.gammaThemeId || process.env.GAMMA_THEME_ID || '';
  } catch { return process.env.GAMMA_THEME_ID || ''; }
}

/** Gamma's themes (standard and your own), for Admin → Social studio. */
export async function listGammaThemes() {
  if (!process.env.GAMMA_API_KEY) return [];
  const out = []; let after = '';
  for (let page = 0; page < 5; page += 1) {
    const r = await fetch(`${GAMMA_BASE_URL}/themes?limit=50${after ? `&after=${encodeURIComponent(after)}` : ''}`, { headers: { 'X-API-KEY': process.env.GAMMA_API_KEY } });
    if (!r.ok) throw new Error(`Gamma said ${r.status} when listing themes`);
    const d = await r.json();
    const list = Array.isArray(d) ? d : d.data || d.themes || [];
    for (const t of list) if (t.id) out.push({ id: t.id, name: t.name || t.id, type: t.type || '', colors: t.colorKeywords || t.colors || [] });
    after = d.nextCursor || ''; if (!d.hasMore || !after) break;
  }
  return out;
}

function gammaCreate(body) {
  return fetch(`${GAMMA_BASE_URL}/generations`, {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.GAMMA_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const GAMMA_STYLE = [
  'Design ONE infographic card that fills the whole card edge to edge, with no empty areas and no small picture inset in a corner.',
  'Colours: deep navy background (#0a1128), gold accents (#c9a227), white and light text. Bold, modern, high contrast, easy to read on a phone.',
  'Layout: a large bold headline at the top; under it the key points as 3 or 4 numbered or icon boxes in a grid that uses the full width; any figures shown big, as stat boxes.',
  'Use simple flat icons or simple shapes only; no photos, no people.',
  'Use ONLY the facts and numbers given here. Do not add new facts, figures, names or claims. British English.',
  'Do not add any logo, website or footer: those are added afterwards.',
].join(' ');

function buildGammaInfographicPrompt({ headline, infographic, summary = '', points = [], stats = [] }) {
  const items = (infographic?.items || []).filter((item) => item.label && item.value);
  const lines = [
    `Headline: ${headline}`,
    summary ? `In one line: ${summary}` : '',
    stats.length ? `Key figures:\n${stats.map((x) => `- ${x.label}: ${x.value}${x.note ? ` (${x.note})` : ''}`).join('\n')}` : '',
    items.length ? `Key figures:\n${items.map((item) => `- ${item.label}: ${item.value}${item.context ? ` (${item.context})` : ''}`).join('\n')}` : '',
    points.length ? `Key points:\n${points.slice(0, 4).map((x, i) => `${i + 1}. ${x}`).join('\n')}` : '',
  ];
  return lines.filter(Boolean).join('\n\n');
}

async function pollGammaGeneration(generationId) {
  for (let attempt = 0; attempt < GAMMA_MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(GAMMA_POLL_INTERVAL_MS);

    const response = await fetch(`${GAMMA_BASE_URL}/generations/${generationId}`, {
      headers: { 'X-API-KEY': process.env.GAMMA_API_KEY },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Gamma status check failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
    }

    const payload = await response.json();

    if (payload.status === 'completed') {
      const url = payload.exportUrl || payload.exportUrls?.[0] || payload.export?.url || payload.files?.[0]?.url;
      if (!url) {
        throw new Error('Gamma finished but didn’t return a download link.');
      }
      return url;
    }

    if (payload.status === 'failed') {
      throw new Error(`Gamma generation failed: ${payload.error || 'unknown reason'}`);
    }

    // still pending/processing — keep polling
  }

  throw new Error('Gamma generation timed out after ~2.5 minutes.');
}

async function extractFirstImageFromZip(zipUrl) {
  const response = await fetch(zipUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Gamma export ZIP: status ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  // Gamma now sends a single PNG for one card (it used to send a ZIP): accept both
  if (buffer[0] === 0x89 && buffer.slice(1, 4).toString() === 'PNG') return { buffer, extension: 'png' };
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return { buffer, extension: 'jpg' };
  if (buffer.slice(0, 2).toString() !== 'PK') {
    throw new Error(`Gamma’s download wasn’t a picture (it looked like ${buffer.slice(0, 4).toString() === '%PDF' ? 'a PDF' : 'another kind of file'}).`);
  }
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const imageEntry = entries.find((entry) => /\.(png|jpe?g)$/i.test(entry.entryName));

  if (!imageEntry) {
    throw new Error('No image file found inside the Gamma export ZIP.');
  }

  return {
    buffer: imageEntry.getData(),
    extension: imageEntry.entryName.split('.').pop().toLowerCase(),
  };
}

/* ════════════════════════════════════════════════════════════════════════
   STORAGE — generated images live on the persistent data/ volume, same
   as platform-store.json and .env, so they survive redeploys. Served via
   GET /media/:filename in server.js.
   ════════════════════════════════════════════════════════════════════════ */
const MEDIA_DIR = path.join(process.cwd(), 'data', 'generated-media');

export function getMediaDir() {
  return MEDIA_DIR;
}

async function saveGeneratedImage(buffer, extension) {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(MEDIA_DIR, filename), buffer);
  return `/media/${filename}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
