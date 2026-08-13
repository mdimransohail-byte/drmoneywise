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

export async function generateGammaInfographic({ headline, infographic }) {
  if (!process.env.GAMMA_API_KEY) {
    console.warn('[visualsService] Skipping Gamma — GAMMA_API_KEY is not set.');
    return null;
  }

  const inputText = buildGammaInfographicPrompt({ headline, infographic });

  const createResponse = await fetch(`${GAMMA_BASE_URL}/generations`, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.GAMMA_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputText,
      textMode: 'generate',
      format: 'social',
      numCards: 1,
      exportAs: 'png',
    }),
  });

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

function buildGammaInfographicPrompt({ headline, infographic }) {
  const items = infographic?.items || [];
  const itemLines = items.map((item) => `- ${item.label}: ${item.value} (${item.context})`).join('\n');

  return [
    `Create a single-card visual infographic summarizing: ${headline}`,
    infographic?.title ? `Title: ${infographic.title}` : '',
    itemLines ? `Key points to visualize:\n${itemLines}` : '',
    'Style: clean, modern financial infographic. Dark navy background with a gold accent color. Minimal text, clear icons or simple charts. A designed infographic card, not a stock photo.',
  ]
    .filter(Boolean)
    .join('\n\n');
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
      if (!payload.exportUrl) {
        throw new Error('Gamma generation completed but returned no exportUrl.');
      }
      return payload.exportUrl;
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
