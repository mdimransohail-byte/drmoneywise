/* ════════════════════════════════════════════════════════════════════════
   HIBERNATE — one switch (Admin → sidebar) that stops the site spending
   money on the writing services (Claude, OpenAI, Gemini, Perplexity)
   while it is not live or is under maintenance.

   While hibernating:
     • no writing-service call is made, automatic or from Admin
       (writerService.requestStructuredWriting returns nothing)
     • these scheduled jobs wait: learning (homepage explainers), deeper
       (Premium lessons), review, report, results (company results are
       explained by the writing service; the job looks back 10 days, so
       results filed while asleep are picked up and explained on waking)
     • pages, free data downloads (SEC, economy, news headlines, prices)
       and member sign-ins carry on as normal
   The setting is saved in data/hibernate.json (Railway volume), so it
   survives redeploys. Switch it off ("Wake up") when you need writing.
   ════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'data', 'hibernate.json');

/* Jobs in dataEngine.js that use the writing services */
export const WRITING_JOBS = new Set(['learning', 'deeper', 'review', 'report', 'results']);

let state = { on: false, since: null, by: '' };
try { state = { ...state, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { /* first run: awake */ }
if (state.on) console.log(`[hibernate] Site is HIBERNATING since ${state.since}: writing services are switched off.`);

export const isHibernating = () => Boolean(state.on);
export const hibernateStatus = () => ({ ...state });

export function setHibernate(on, by = 'admin') {
  state = { on: Boolean(on), since: new Date().toISOString(), by };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
  console.log(state.on ? '[hibernate] Hibernating: writing services switched OFF.' : '[hibernate] Awake: writing services switched ON.');
  return hibernateStatus();
}

/* One log line per hour at most, so the Railway log isn't flooded */
let lastNote = 0;
export function noteSkipped(what) {
  if (Date.now() - lastNote < 3600000) return;
  lastNote = Date.now();
  console.log(`[hibernate] Skipped ${what}: the site is hibernating (Admin → Wake up to switch writing back on).`);
}
