import crypto from 'node:crypto';

import { updateStore } from './storeService.js';

export async function trackEvent({ type, path = '/', userId = null, value = 1, articleSlug = '' }) {
  await updateStore((store) => {
    store.events.push({
      id: crypto.randomUUID(),
      type,
      path,
      userId,
      value,
      articleSlug,
      at: new Date().toISOString(),
    });
    return store;
  });
}
