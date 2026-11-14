/* /my/watchlist and /my/portfolio: the pages are a frame; public/mylists.js
   signs the member in and fills them from /api/member/my-watchlist and
   /api/member/my-portfolio (see myListsService.js for what each plan sees). */

import { buildHeadTags, pageShell } from './seoService.js';

export function renderMyList(origin, view) {
  const isW = view === 'watchlist';
  const head = buildHeadTags({
    title: `${isW ? 'My watchlist' : 'My portfolio'} | Dr MoneyWise`,
    description: isW ? 'The companies you follow, with prices, report cards and results.' : 'What you own, its value and gain, and a health check of each holding and your whole portfolio.',
    canonical: `${origin}/my/${view}`,
  });
  const body = `
      <section class="block my-page">
        <nav class="my-tabs" aria-label="My lists"><a href="/my/watchlist"${isW ? ' aria-current="page"' : ''}>☆ My watchlist</a><a href="/my/portfolio"${isW ? '' : ' aria-current="page"'}>▤ My portfolio</a></nav>
        <div id="myApp" class="my-app" data-view="${view}"><div class="pf-loading">Loading your ${isW ? 'watchlist' : 'portfolio'}…</div></div>
        <noscript><p class="note-box">This page needs JavaScript switched on.</p></noscript>
      </section>
      <script src="/mylists.js" defer></script>`;
  return pageShell({ head: head + '<meta name="robots" content="noindex" />', body, active: '' });
}
