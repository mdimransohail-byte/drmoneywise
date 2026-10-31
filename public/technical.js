/* Chart check: fills "What the chart shows" from /api/technical.
   Everyone sees the headline signals; Regular and Premium see them all,
   with support and resistance and the annotated chart. */
(function () {
  var box = document.getElementById('taRead');
  var full = document.getElementById('taFull');
  if (!box) return;
  var token = '';
  try { token = JSON.parse(localStorage.getItem('drmoneywise-session') || '{}').token || ''; } catch (e) { token = ''; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var TONE = { good: ['▲', 'Positive'], weak: ['▼', 'Negative'], watch: ['!', 'Worth watching'], okay: ['●', 'Neutral'] };
  function sig(s) { var t = TONE[s.tone] || TONE.okay; return '<li class="ta-sig ' + s.tone + '"><span class="ta-ico" aria-hidden="true">' + t[0] + '</span><div><strong>' + esc(s.label) + ' <em>' + t[1] + '</em></strong><p>' + esc(s.plain) + '</p></div></li>'; }
  fetch('/api/technical?t=' + encodeURIComponent(box.dataset.ticker), { headers: token ? { 'x-session-token': token } : {} })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.ok) {
        box.innerHTML = '<h2>What the chart shows</h2><p>' + (d.reason === 'prices-off' ? 'Our own reading of the chart switches on when daily prices go live. Meanwhile, the live chart shows the 50-day average, RSI and MACD.' : d.reason === 'busy' ? 'We’ve read a lot of charts today. Please try again tomorrow, or try a popular company.' : 'We couldn’t get prices for this ticker. Check it is a US-listed company.') + '</p><p><a href="/learn/technical">Learn to read these yourself →</a></p>';
        return;
      }
      var head = '<h2>What the chart shows</h2><p class="ta-date">Closing price $' + d.price.toFixed(2) + ' on ' + esc(d.date) + '</p>';
      if (d.full) {
        head += '<div class="ta-picture ' + (d.picture === 'Mostly positive' ? 'good' : d.picture === 'Mostly negative' ? 'weak' : 'okay') + '"><strong>' + esc(d.picture) + '</strong><span>' + d.good + ' positive and ' + d.weak + ' negative signs</span></div>';
      }
      box.innerHTML = head + '<ul class="ta-list">' + d.signals.map(sig).join('') + '</ul>' +
        (d.full ? '' : '<div class="ta-lock"><span class="pf-badge mem">Members</span><p><b>' + d.hidden + ' more signs</b>, support and resistance levels, an overall reading and our annotated chart are for Regular and Premium members.</p><a class="pf-btn gold" href="/membership">See membership</a></div>');
      if (d.full && full) {
        full.innerHTML = '<div class="ta-full"><h2>Our annotated chart</h2><p class="calc-hint">The last 180 trading days: price with its 50- and 200-day averages and Bollinger bands, support and resistance lines, then RSI and MACD.</p>' + d.chart + '</div>';
      }
    })
    .catch(function () { box.innerHTML = '<h2>What the chart shows</h2><p>Please try again shortly.</p>'; });
})();
