/* Live price scroller under the header, on every page (TradingView's free
   ticker tape, with its credit link). Readers choose what scrolls past with
   "Choose"; the choice is remembered on this device. Up to 12 items. */
(function () {
  var bar = document.getElementById('tickerBar');
  if (!bar) return;
  var GROUPS = [
    ['Stock markets', [
      ['FOREXCOM:SPXUSD', 'S&P 500'], ['FOREXCOM:NSXUSD', 'Nasdaq 100'], ['FOREXCOM:DJI', 'Dow Jones'],
      ['FOREXCOM:UKXGBP', 'FTSE 100'], ['INDEX:DEU40', 'DAX'], ['INDEX:NKY', 'Nikkei 225'],
    ]],
    ['Currencies', [
      ['FX:EURUSD', 'EUR/USD'], ['FX:GBPUSD', 'GBP/USD'], ['FX:USDJPY', 'USD/JPY'], ['FX:USDCHF', 'USD/CHF'],
      ['FX:AUDUSD', 'AUD/USD'], ['FX:USDCAD', 'USD/CAD'], ['FX_IDC:USDINR', 'USD/INR'], ['FX_IDC:GBPINR', 'GBP/INR'],
    ]],
    ['Commodities', [
      ['TVC:GOLD', 'Gold'], ['TVC:SILVER', 'Silver'], ['TVC:UKOIL', 'Brent oil'], ['TVC:USOIL', 'US oil'],
    ]],
    ['Crypto', [
      ['BITSTAMP:BTCUSD', 'Bitcoin'], ['BITSTAMP:ETHUSD', 'Ether'],
    ]],
  ];
  var ALL = {};
  GROUPS.forEach(function (g) { g[1].forEach(function (s) { ALL[s[0]] = s[1]; }); });
  var DEFAULT = ['FOREXCOM:SPXUSD', 'FOREXCOM:NSXUSD', 'FOREXCOM:DJI', 'FOREXCOM:UKXGBP', 'TVC:GOLD', 'TVC:UKOIL', 'FX:EURUSD', 'FX:GBPUSD', 'BITSTAMP:BTCUSD'];
  var KEY = 'dmw-ticker';
  function load() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (Array.isArray(v) && v.length) return v.filter(function (s) { return ALL[s]; }).slice(0, 12); } catch (e) { /* default */ }
    return DEFAULT.slice();
  }
  var chosen = load();

  bar.innerHTML = '<div class="tk-tape" id="tkTape"></div><button type="button" class="tk-choose" aria-expanded="false" aria-controls="tkPanel">Choose</button>' +
    '<div class="tk-panel" id="tkPanel" hidden><div class="tk-panel-head"><strong>Choose what scrolls past</strong><span>Up to 12. Remembered on this device.</span></div>' +
    GROUPS.map(function (g) { return '<fieldset><legend>' + g[0] + '</legend>' + g[1].map(function (s) { return '<label><input type="checkbox" value="' + s[0] + '"> ' + s[1] + '</label>'; }).join('') + '</fieldset>'; }).join('') +
    '<div class="tk-actions"><button type="button" data-tk="save" class="tk-save">Show these</button><button type="button" data-tk="reset">Back to the usual</button><span class="tk-msg" aria-live="polite"></span></div></div>';
  var tape = bar.querySelector('#tkTape');
  var panel = bar.querySelector('#tkPanel');
  var btn = bar.querySelector('.tk-choose');

  function draw() {
    tape.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container';
    var inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    wrap.appendChild(inner);
    var s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    s.async = true;
    s.text = JSON.stringify({
      symbols: chosen.map(function (k) { return { proName: k, title: ALL[k] }; }),
      showSymbolLogo: true, isTransparent: true, displayMode: 'adaptive', colorTheme: 'dark', locale: 'en',
    });
    wrap.appendChild(s);
    tape.appendChild(wrap);
  }
  function syncBoxes() { panel.querySelectorAll('input').forEach(function (i) { i.checked = chosen.indexOf(i.value) >= 0; }); }

  btn.addEventListener('click', function () {
    var open = panel.hidden;
    panel.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (open) syncBoxes();
  });
  panel.addEventListener('change', function (e) {
    var n = panel.querySelectorAll('input:checked').length;
    var msg = panel.querySelector('.tk-msg');
    if (n > 12) { e.target.checked = false; msg.textContent = 'Up to 12 at a time.'; } else msg.textContent = n + ' chosen';
  });
  panel.addEventListener('click', function (e) {
    var act = e.target.getAttribute && e.target.getAttribute('data-tk');
    if (!act) return;
    chosen = act === 'reset' ? DEFAULT.slice() : Array.prototype.map.call(panel.querySelectorAll('input:checked'), function (i) { return i.value; });
    if (!chosen.length) chosen = DEFAULT.slice();
    try { localStorage.setItem(KEY, JSON.stringify(chosen)); } catch (err) { /* this visit only */ }
    panel.hidden = true; btn.setAttribute('aria-expanded', 'false');
    draw();
  });
  draw();
})();
