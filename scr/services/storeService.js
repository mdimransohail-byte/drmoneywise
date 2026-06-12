import fs from 'node:fs/promises';
import path from 'node:path';

import { createPlatformSeed } from '../data/platformSeed.js';

const dataDir = path.join(process.cwd(), 'data');
const storePath = path.join(dataDir, 'platform-store.json');

export async function ensureStore() {
  try {
    await fs.access(storePath);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(storePath, JSON.stringify(createPlatformSeed(), null, 2), 'utf8');
  }
}

export async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(storePath, 'utf8');
  return JSON.parse(raw);
}

export async function writeStore(data) {
  await ensureStore();
  await fs.writeFile(storePath, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

export async function updateStore(mutator) {
  const current = await readStore();
  const next = await mutator(structuredClone(current));
  await writeStore(next);
  return next;
}

export function getStorePath() {
  return storePath;
}
