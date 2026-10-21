/* ════════════════════════════════════════════════════════════════════════
   /ideas — Ideas that match your rules (Premium). public/ideas.js draws
   the page from /api/member/ideas.
   ════════════════════════════════════════════════════════════════════════ */

import { buildHeadTags, pageShell } from './seoService.js';

export function renderIdeasPage(origin) {
  const head = buildHeadTags({
    title: 'Ideas that match your rules | Dr MoneyWise',
    description: 'Save your own rules (dividend record, growth, profit, debt, big funds, company bosses buying) and see every company that matches, with what is new each week.',
    canonical: `${origin}/ideas`,
  });
  const body = `
      <section class="block sc-page">
        <p class="crumbs"><a href="/markets">Markets</a> › <a href="/screener">Stock screener</a> › Your idea lists</p>
        <div id="idApp"><div class="pf-loading">Loading your idea lists…</div></div>
        <p class="note-box" style="margin-top:22px">Idea lists show the companies that match the rules you chose, using their official figures. They are a starting point for your own research, not recommendations to buy or sell. Read our <a href="/disclaimer">disclaimer</a>.</p>
      </section>
      <script src="/ideas.js" defer></script>`;
  return pageShell({ head, body, active: 'markets' });
}
