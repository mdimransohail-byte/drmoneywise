/* ════════════════════════════════════════════════════════════════════════
   SOURCES for the zakat calculator, the Islamic finance guide and the
   Shariah pages. Every page lists the sources it relies on at the bottom.
   Add a source here, then add its key to the page's list below.
   ════════════════════════════════════════════════════════════════════════ */

export const SOURCES = {
  iifaShares: ['International Islamic Fiqh Academy: Resolution 28 (3/4), zakat on company shares (1988)', 'https://iifa-aifi.org/en/32294.html'],
  nzfGuide: ['National Zakat Foundation (UK): Calculating your Zakat (guide, PDF)', 'https://nzf.org.uk/wp-content/uploads/2021/03/NZF_Calculating-your-Zakat_A5_P_2021_V1.1.pdf'],
  nzfProxy: ['National Zakat Foundation: Zakat on share investments, determining a proxy (cites AAOIFI Shariah Standard No. 35)', 'https://nzf.org.uk/knowledge/zakat-on-share-investments-determining-a-proxy-for-calculation/'],
  seekersShares: ['SeekersGuidance: How is zakat calculated on long-term investments? (Hanafi)', 'https://seekersguidance.org/answers/hanafi-fiqh/how-is-zakat-calculated-on-long-term-investments/'],
  zfaRental: ['Zakat Foundation of America: Is zakat owed on rental property?', 'https://www.zakat.org/is-zakat-owed-on-rental-property'],
  irPensions: ['Islamic Relief South Africa: Zakat and pensions', 'https://islamic-relief.org.za/zakat/pensions/'],
  ifgPensions: ['Islamic Finance Guru: Calculate zakat on pensions, SIPPs and final salary pensions', 'https://www.islamicfinanceguru.com/articles/calculate-zakat-on-pensions-sipps-final-salary-pensions'],
  musaffaGold: ['Musaffa Academy: Zakat on gold and worn jewellery, the four schools', 'https://academy.musaffa.com/zakat-on-gold-and-worn-jewelry-guide/'],
  worldBank: ['World Bank: Commodity price data (gold and silver prices)', 'https://www.worldbank.org/en/research/commodity-markets'],
  aaoifi21: ['AAOIFI Shariah Standard No. 21, Financial Papers (PDF)', 'https://documents.pse.com.ph/wp-content/uploads/sites/15/2021/04/AAOIFI-Sharia-Standard-No-21-Financial-Paper-1.pdf'],
  iifaMarkets: ['International Islamic Fiqh Academy: Resolution 63 (1/7), shares and stock markets', 'https://iifa-aifi.org/en/32987.html'],
  qaradawiMarkets: ['IslamOnline fiqh: Stock markets and their applications', 'https://fiqh.islamonline.net/en/stock-markets-and-their-applications/'],
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** A "Sources" box: a list of [label, url] pairs (duplicates removed). */
export function sourcesHtml(list, title = 'Sources') {
  const seen = new Set();
  const items = list.filter(([, url]) => url && !seen.has(url) && seen.add(url));
  if (!items.length) return '';
  return `<div class="src-box"><h2>${esc(title)}</h2><ol>${items.map(([label, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a> <span>${esc(new URL(url).hostname.replace(/^www\./u, ''))}</span></li>`).join('')}</ol></div>`;
}
