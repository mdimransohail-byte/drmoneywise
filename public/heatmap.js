/* Homepage stock market heat map (TradingView's free widget, with its
   credit link). The reader picks a market; the choice is remembered on
   this device. To add or fix a market, edit the MARKETS list: the second
   value is TradingView's name for that set of shares. */
(function () {
  var box = document.getElementById('hmWidget');
  var pick = document.getElementById('hmMarket');
  if (!box || !pick) return;
  var MARKETS = [
    ['US: S&P 500', 'SPX500'],
    ['US: Nasdaq 100', 'NASDAQ100'],
    ['US: Dow Jones 30', 'DJDJI'],
  ];
  // TradingView's free heat map only covers these US lists; other markets
  // fell back to the S&P 500, so they were taken out (31 Oct 2026).
  var saved = '';
  try { saved = localStorage.getItem('dmw-heatmap') || ''; } catch (e) { saved = ''; }
  if (!MARKETS.some(function (m) { return m[1] === saved; })) saved = '';
  pick.innerHTML = MARKETS.map(function (m) { return '<option value="' + m[1] + '"' + (m[1] === saved ? ' selected' : '') + '>' + m[0] + '</option>'; }).join('');
  function draw(source) {
    box.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container';
    wrap.style.cssText = 'height:100%;width:100%';
    var inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.cssText = 'height:100%;width:100%';
    wrap.appendChild(inner);
    var s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
    s.async = true;
    s.text = JSON.stringify({
      exchanges: [], dataSource: source, grouping: 'sector', blockSize: 'market_cap_basic', blockColor: 'change',
      locale: 'en', symbolUrl: '', colorTheme: 'light', hasTopBar: false, isDataSetEnabled: false,
      isZoomEnabled: true, hasSymbolTooltip: true, isMonoSize: false, width: '100%', height: '100%',
    });
    wrap.appendChild(s);
    box.appendChild(wrap);
  }
  pick.addEventListener('change', function () {
    try { localStorage.setItem('dmw-heatmap', pick.value); } catch (e) { /* not saved */ }
    draw(pick.value);
  });
  draw(pick.value || 'SPX500');
})();
