/* Admin explainers: a short "what is this and what do I do" line under each
   page title and each box heading. Added after every page draw (the admin
   pages are drawn by admin.js into #mainArea). To change a line, edit the
   lists below; headings are matched by how they start. */
(function () {
  var PAGES = {
    'Analytics': 'How many people visit, who joins and what they read. Nothing to do here; check it once a week to see what is growing.',
    'News Feed': 'Fresh headlines from the news services. Tick a story and press Write to turn it into an article in our own words. Optional: the site writes plenty by itself.',
    'AI Writer': 'Write one article on demand: pick a topic, choose a writing service and press Write. The site already writes lessons and explainers on its own.',
    'Article Inventory': 'Every article on the site. Look for “Draft”: those were held back by an automatic check. Read them, fix if needed, then Publish or Delete. 5 minutes, 2–3 times a week.',
    'APIs & More': 'The keys and settings that switch features on. Paste a key, press Save, and the feature starts working. The data engine (right) shows what runs by itself and whether it worked.',
    'Site health': 'A traffic-light check of everything. Green is fine; amber means look when you can; red means something has stopped (usually a missing or expired key).',
    'Forum moderation': 'Posts the automatic check wasn’t sure about wait here. Approve the fine ones, remove the rest. 2–3 times a week.',
    'Property pages': 'Where the property figures come from and when they last updated. Updates run by themselves each month.',
    'Ads & partners': 'The four advert spaces on the site. Paste an advert or partner link into a space to show it; leave it empty to hide that space. Pro members never see adverts.',
    'Ask Dr MoneyWise': 'Members’ questions. Open one, press Draft answer, edit the draft in your own words, then Send. Nothing is sent without you. Reply within 2–3 days.',
    'Newsletter': 'The Saturday newsletter builds and sends itself (see “Automatic Saturday newsletter”). You can also write one by hand, preview it and send a test to yourself first.',
    'Social studio': 'Ready-made pictures and captions for social media from any page of the site. Pick a page, choose a size, download and post.',
    'Offers': 'Run a discount for any occasion: it pops up on the homepage after a couple of seconds and takes people to the membership page with the code filled in. Also: the free Pro trial and the welcome emails.',
    'Video maker': 'Turns any page into a Short or a longer video with a voice. Paste a link, check the script, press “Hear the voice first”, then “Make the video”.',
  };
  var BOXES = [
    // Analytics
    ['Traffic', 'Page views per day. A steady rise means more people are finding the site.'],
    ['Member tier mix', 'How many members are Free, Plus and Pro. Paid members are what pay the bills.'],
    ['Signups', 'New accounts each day. A jump usually follows a newsletter or a social post.'],
    ['Article status', 'How many articles are live, scheduled or waiting as drafts.'],
    ['Readers', 'What members told us about themselves when they joined. Use it to decide what to write about.'],
    ['Suggested writing level', 'How simple or deep the writing should be, based on readers’ experience.'],
    // Writer
    ['🔥 Trending', 'Topics people are searching for right now. Press one to write about it.'],
    ['✍ Article from a guest expert', 'Paste an expert’s article, choose Simplify or Publish as written, and save. It is credited to them and never rewritten automatically.'],
    // APIs & More
    ['AI & News API keys', 'Keys for the writing services, news, photos, logos and prices. Paste each key once and press Save; it stays saved.'],
    ['Learn level names', 'The names of the course levels (Beginners, Intermediate, Advanced…). Changing them doesn’t break any links.'],
    ['Payments (Stripe)', 'Your Stripe secret key and webhook secret. With both saved and showing LIVE, members can pay and are upgraded automatically.'],
    ['Backup', 'Downloads everything (members, articles, settings) in one file. Do it every Sunday and keep it somewhere private.'],
    ['Data engine', 'Every job that runs by itself, when it last ran and whether it worked. Red means it failed: read the message, usually a missing key. “Run now” tries again.'],
    ['Search engines', 'Codes that prove to Google and Bing you own the site, so it appears in search results.'],
    ['Site settings', 'Site name, contact email and other general settings.'],
    ['Discount coupons', 'Codes members type at checkout for money off. Switch a code off when a promotion ends.'],
    // Health
    ['Data', 'Whether prices, company figures and the economy numbers are up to date.'],
    ['Content', 'Whether new articles and lessons are being written and published.'],
    ['Forum', 'Whether the forum is working and how many posts are waiting.'],
    ['Keys', 'Which keys are saved. A red one means that feature is switched off.'],
    ['Licences', 'Credits we must show for free data and photos. All should be green.'],
    ['Site', 'The basics: the site is up, pages load and the saved-data space isn’t full.'],
    ['Daily health email', 'This check by email every morning. Read it in a minute; act only on red.'],
    ['Member emails', 'Dividend alerts, big-fund alerts, chart alerts and the Saturday members’ email. They send themselves.'],
    ['What runs by itself', 'Everything the site does without you, and how often.'],
    // Forum
    ['Forum on the site', 'Switch the forum on or off for everyone.'],
    ['Waiting for review', 'Posts held for a human look. Approve or remove.'],
    ['Starter threads', 'Conversation starters shown when the forum is quiet.'],
    ['Banned readers', 'People who can no longer post. Remove a name to let them back.'],
    ['How moderation works', 'What the automatic check allows, holds or refuses.'],
    // Property
    ['What each place has', 'Which figures each city or country has, and how recent they are.'],
    ['Add Dubai figures', 'For later: Dubai is hidden on the site for now.'],
    ['Dubai quarters saved', 'For later: Dubai is hidden on the site for now.'],
    // Ads
    ['Top banner', 'The wide space under the menu. Shown to Free and Plus readers only.'],
    ['Middle of page', 'A box between sections on long pages.'],
    ['Partner offer box', 'A recommended product or partner, with your affiliate link.'],
    ['Bottom scrolling strip', 'A thin moving strip at the bottom of the screen.'],
    // Newsletter
    ['Preview', 'Exactly how the email will look. Check the links and pictures before sending.'],
    ['Add people by hand', 'Paste email addresses to invite people, send them one issue, or gift a subscription. Choose Free, Plus or Pro for them.'],
    ['Automatic Saturday newsletter', 'Leave this ticked and the newsletter goes out every Saturday morning without you. A copy comes to your inbox.'],
    ['Sending speed', 'How many newsletter emails go out per day. Raise it when you move to a paid Resend plan.'],
    ['Past and current newsletters', 'Every issue, with how many were sent. A big list carries on by itself the next day.'],
    ['New newsletter', 'Write your own issue: a subject, a short intro and a few stories with links.'],
    ['Edit draft', 'Change the issue, then Preview, Send me a test, and Send.'],
    // Analytics: sources
    ['How members joined', 'Where new members found us (Google, Instagram, an advert, the pop-up…), and how many started a trial or paid. Use it to decide where to spend.'],
    // Offers
    ['Offer pop-up', 'Choose the occasion, discount and dates, tick “Show”, then Save. The discount code is created for you and stops working the day after the offer ends.'],
    ['Pop-up picture', 'The picture shown in the pop-up. Make one here, or upload one from Social studio.'],
    ['Free Pro trial', 'How many days new Pro members can try it free. 7 is usual; 0 switches it off.'],
    ['Welcome emails', 'Five short emails that show new members the most useful parts of the site, ending with the trial offer.'],
    // Social
    ['Caption', 'The text to post with the picture. Edit it to sound like you.'],
    ['Pictures', 'Download the size you need: square for Instagram, landscape for X and LinkedIn, tall for Stories.'],
    ['Gamma themes', 'Design styles for the optional Gamma infographics.'],
    ['Made in the last 30 days', 'Pictures you made recently, ready to download again.'],
    // Video
    ['Saved-data space', 'How full the storage is. If it turns red, press “Free up space”.'],
    ['Your videos', 'Videos you’ve made. Open to edit, Cancel if one is stuck, Delete when posted.'],
    ['Voice', 'Choose a computer voice or record your own. Press Listen to hear a voice first.'],
  ];

  function lookup(text) {
    text = String(text || '').trim();
    for (var i = 0; i < BOXES.length; i++) if (text.indexOf(BOXES[i][0]) === 0) return BOXES[i][1];
    return '';
  }

  /* Two-column pages: a box left alone on its row (an odd one out before a
     full-width section) is stretched across, so there are no empty gaps. */
  function fillRows(main) {
    var run = [];
    function close() { if (run.length % 2 === 1) run[run.length - 1].classList.add('adm-wide'); run = []; }
    Array.prototype.forEach.call(main.children, function (el) {
      el.classList.remove('adm-wide');
      var wide = getComputedStyle(el).gridColumnEnd === '-1' || el.style.gridColumn;
      if (wide) close(); else run.push(el);
    });
    close();
  }

  function decorate() {
    var main = document.getElementById('mainArea');
    if (!main) return;
    if (window.innerWidth > 1100) fillRows(main);
    var h1 = main.querySelector('.pg-head h1');
    if (h1 && !h1.parentNode.querySelector('.adm-help')) {
      var t = h1.textContent.trim(); var msg = '';
      Object.keys(PAGES).forEach(function (k) { if (!msg && t.indexOf(k) === 0) msg = PAGES[k]; });
      if (msg) { var p = document.createElement('p'); p.className = 'adm-help'; p.textContent = msg; h1.parentNode.appendChild(p); }
    }
    main.querySelectorAll('.card > h2, .card > h3, .card > .card-title, .card-title').forEach(function (h) {
      var next = h.nextElementSibling;
      if (next && next.classList && next.classList.contains('adm-help')) return;
      var msg = lookup(h.textContent);
      if (!msg) return;
      var p = document.createElement('p'); p.className = 'adm-help'; p.textContent = msg;
      h.insertAdjacentElement('afterend', p);
    });
  }

  var timer = null;
  function soon() { clearTimeout(timer); timer = setTimeout(decorate, 30); }
  document.addEventListener('DOMContentLoaded', function () {
    var main = document.getElementById('mainArea');
    if (!main) return;
    new MutationObserver(soon).observe(main, { childList: true, subtree: true });
    soon();
  });
})();
