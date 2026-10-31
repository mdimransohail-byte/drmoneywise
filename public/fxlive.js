/* Homepage live currency rates (TradingView's free cross-rates table).
   Readers tick the currencies they want (3 to 8); remembered on this device. */
(function () {
  var box = document.getElementById('fxWidget');
  var picks = document.getElementById('fxPicks');
  if (!box || !picks) return;
  var ALL = [['USD', 'US dollar'], ['EUR', 'Euro'], ['GBP', 'Pound'], ['AED', 'UAE dirham'], ['SAR', 'Saudi riyal'], ['INR', 'Indian rupee'],
    ['PKR', 'Pakistani rupee'], ['JPY', 'Japanese yen'], ['CHF', 'Swiss franc'], ['CNY', 'Chinese yuan'], ['CAD', 'Canadian dollar'], ['AUD', 'Australian dollar'], ['SGD', 'Singapore dollar'], ['HKD', 'Hong Kong dollar']];
  var KEY = 'dmw-fx';
  var chosen = ['USD', 'EUR', 'GBP', 'AED', 'INR', 'JPY'];
  try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (Array.isArray(v) && v.length >= 2) chosen = v; } catch (e) { /* default */ }
  picks.innerHTML = ALL.map(function (c) { return '<label title="' + c[1] + '"><input type="checkbox" value="' + c[0] + '"' + (chosen.indexOf(c[0]) >= 0 ? ' checked' : '') + '> ' + c[0] + '</label>'; }).join('');
  function draw() {
    box.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container';
    wrap.style.cssText = 'height:100%;width:100%';
    var inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    wrap.appendChild(inner);
    var s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js';
    s.async = true;
    s.text = JSON.stringify({ width: '100%', height: '100%', currencies: chosen, isTransparent: false, colorTheme: 'light', locale: 'en' });
    wrap.appendChild(s);
    box.appendChild(wrap);
  }
  picks.addEventListener('change', function (e) {
    var now = Array.prototype.map.call(picks.querySelectorAll('input:checked'), function (i) { return i.value; });
    if (now.length > 8 || now.length < 2) { e.target.checked = !e.target.checked; return; }
    chosen = now;
    try { localStorage.setItem(KEY, JSON.stringify(chosen)); } catch (err) { /* this visit only */ }
    draw();
  });
  draw();
})();
