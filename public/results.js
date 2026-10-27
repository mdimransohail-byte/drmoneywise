/* ════════════════════════════════════════════════════════════════════════
   Company results in the browser:
   • the scrolling "Latest results" strip under the menu (every page)
   • the "Latest company results" cards on the homepage
   • "What it means" for Premium members (on /results and company pages)
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.__dmwResults) return; // load once even if included twice
  window.__dmwResults = true;
  var esc = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }

  /* ── Strip ── */
  var strip = document.getElementById('resultsStrip');
  if (strip) {
    fetch('/api/site/results-strip').then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (d) {
      var items = (d && d.items) || [];
      if (!items.length) { strip.remove(); return; }
      var links = items.map(function (x) { return '<a href="/results#r-' + esc(x.id) + '"><b>' + esc(x.ticker) + '</b> ' + esc(x.headline) + '</a>'; }).join('<span aria-hidden="true">•</span>');
      // Only scroll when there are enough results to fill the strip
      var moving = items.length >= 4;
      strip.innerHTML = '<div class="wrap rs-strip-inner"><a class="rs-strip-label" href="/results">Latest results</a><div class="rs-strip-scroll"><div class="rs-strip-track' + (moving ? '' : ' still') + '">' + links + (moving ? '<span aria-hidden="true">•</span>' + links.replace(/<a /g, '<a tabindex="-1" aria-hidden="true" ') : '') + '</div></div></div>';
      strip.hidden = false;
    }).catch(function () { strip.remove(); });
  }

  /* ── Homepage cards ── */
  var home = document.getElementById('homeResults');
  if (home) {
    fetch('/api/site/results-strip?cards=1').then(function (r) { return r.ok ? r.json() : { cards: '' }; }).then(function (d) {
      if (!d || !d.cards) { home.remove(); return; }
      home.innerHTML = '<div class="block-head"><div><h2>Latest results from the biggest companies</h2><p>Explained in plain English, the day they come out. <a href="/results">See all results</a></p></div></div>' + d.cards;
      home.hidden = false;
      unlock();
    }).catch(function () { home.remove(); });
  }

  /* ── Premium: "What it means" ── */
  function unlock() {
    var boxes = document.querySelectorAll('[data-impact-for]');
    if (!boxes.length || !token) return;
    var ids = Array.prototype.map.call(boxes, function (b) { return b.getAttribute('data-impact-for'); });
    fetch('/api/results/impact?ids=' + encodeURIComponent(ids.join(',')), { headers: { 'x-session-token': token } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.impacts) return;
        boxes.forEach(function (b) {
          var text = d.impacts[b.getAttribute('data-impact-for')];
          if (text) b.innerHTML = '<h4>What it means <span class="members-badge">Premium</span></h4><p>' + esc(text) + '</p>';
        });
      }).catch(function () {});
  }
  unlock();
}());
