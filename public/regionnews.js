/* ════════════════════════════════════════════════════════════════════════
   Homepage: business news by region. The reader picks a region (we guess
   from their time zone the first time, then remember their choice in this
   browser); the latest headlines scroll upwards slowly and pause when the
   mouse is over them. Each headline opens the article on the publisher's
   own site. Data: /api/site/region-news (GDELT, refreshed every few hours).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  var box = document.getElementById('regionNews');
  if (!box) return;
  var select = document.getElementById('rnRegion');
  var list = document.getElementById('rnList');
  var win = document.getElementById('rnWindow');
  var more = document.getElementById('rnMore');
  var KEY = 'dmw-news-region';
  var PAGES = { uk: '/stocks/world/uk', india: '/stocks/world/india', china: '/stocks/world/china', japan: '/stocks/world/japan', 'south-korea': '/stocks/world/south-korea', brazil: '/stocks/world/brazil', gulf: '/stocks/world/gulf', us: '/stocks', europe: '/stocks/world/europe' };
  var esc = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var ago = function (iso) {
    if (!iso) return '';
    var h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
    return h < 1 ? 'just now' : h < 24 ? h + 'h ago' : Math.round(h / 24) + 'd ago';
  };
  var site = function (d) { return String(d || '').replace(/^www\./, ''); };

  function guess() {
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; }
    if (/Kolkata|Calcutta/.test(tz)) return 'india';
    if (/Dubai|Riyadh|Qatar|Kuwait|Bahrain|Muscat/.test(tz)) return 'gulf';
    if (/London/.test(tz)) return 'uk';
    if (/Tokyo/.test(tz)) return 'japan';
    if (/Shanghai|Hong_Kong|Chongqing|Urumqi/.test(tz)) return 'china';
    if (/Seoul/.test(tz)) return 'south-korea';
    if (/Sao_Paulo|Fortaleza|Recife|Bahia|Manaus/.test(tz)) return 'brazil';
    if (/^Europe\//.test(tz)) return 'europe';
    return 'us';
  }

  function show(d) {
    var items = (d && d.items) || [];
    if (more) { more.href = PAGES[d.region] || '/stocks/world'; more.textContent = 'More on ' + d.name; }
    if (!items.length) {
      list.className = 'rn-list';
      list.innerHTML = '<li class="rn-empty">We’re collecting the latest headlines for ' + esc(d.name) + '. Please check back in a little while.</li>';
      return;
    }
    var row = function (x) { return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener nofollow"><strong>' + esc(x.title) + '</strong><span>' + esc(site(x.domain)) + (x.date ? ' · ' + esc(ago(x.date)) : '') + '</span></a></li>'; };
    var html = items.map(row).join('');
    // Scroll only when the list is taller than the window; repeat it once for a seamless loop
    list.innerHTML = html;
    var tall = list.scrollHeight > win.clientHeight + 10;
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (tall && !still) {
      list.innerHTML = html + html.replace(/<a /g, '<a tabindex="-1" aria-hidden="true" ');
      list.style.setProperty('--rn-time', Math.max(30, items.length * 6) + 's');
      list.className = 'rn-list rn-roll';
    } else {
      list.className = 'rn-list' + (tall ? ' rn-scroll' : '');
    }
  }

  function load(region) {
    list.className = 'rn-list';
    list.innerHTML = '<li class="rn-empty">Loading headlines…</li>';
    fetch('/api/site/region-news?region=' + encodeURIComponent(region))
      .then(function (r) { return r.json(); })
      .then(show)
      .catch(function () { list.innerHTML = '<li class="rn-empty">Headlines could not load. Please try again.</li>'; });
  }

  var start = '';
  try { start = localStorage.getItem(KEY) || ''; } catch (e) { start = ''; }
  if (!select.querySelector('option[value="' + start + '"]')) start = guess();
  select.value = start;
  select.addEventListener('change', function () {
    try { localStorage.setItem(KEY, select.value); } catch (e) { /* not saved */ }
    load(select.value);
  });
  load(start);
}());
