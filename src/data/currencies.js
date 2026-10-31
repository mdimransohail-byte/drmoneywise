/* ════════════════════════════════════════════════════════════════════════
   CURRENCIES for the converter: code → [country code for the flag, name].
   Flags are small SVGs in public/flags (from the MIT-licensed flag-icons set). Rates for all of
   these come from ExchangeRate-API's free open-access feed (see
   src/services/fxService.js getAllRates), which must be credited with the
   link "Rates By Exchange Rate API".
   ════════════════════════════════════════════════════════════════════════ */

export const CURRENCIES = {
  USD: ['us', 'US dollar'], EUR: ['eu', 'Euro'], GBP: ['gb', 'British pound'], AED: ['ae', 'UAE dirham'], SAR: ['sa', 'Saudi riyal'],
  INR: ['in', 'Indian rupee'], PKR: ['pk', 'Pakistani rupee'], BDT: ['bd', 'Bangladeshi taka'], LKR: ['lk', 'Sri Lankan rupee'], NPR: ['np', 'Nepalese rupee'],
  QAR: ['qa', 'Qatari riyal'], KWD: ['kw', 'Kuwaiti dinar'], BHD: ['bh', 'Bahraini dinar'], OMR: ['om', 'Omani rial'], JOD: ['jo', 'Jordanian dinar'],
  EGP: ['eg', 'Egyptian pound'], TRY: ['tr', 'Turkish lira'], ILS: ['il', 'Israeli shekel'], IQD: ['iq', 'Iraqi dinar'], LBP: ['lb', 'Lebanese pound'],
  MAD: ['ma', 'Moroccan dirham'], TND: ['tn', 'Tunisian dinar'], DZD: ['dz', 'Algerian dinar'], IRR: ['ir', 'Iranian rial'], AFN: ['af', 'Afghan afghani'],
  JPY: ['jp', 'Japanese yen'], CNY: ['cn', 'Chinese yuan'], HKD: ['hk', 'Hong Kong dollar'], TWD: ['tw', 'Taiwan dollar'], KRW: ['kr', 'South Korean won'],
  SGD: ['sg', 'Singapore dollar'], MYR: ['my', 'Malaysian ringgit'], IDR: ['id', 'Indonesian rupiah'], THB: ['th', 'Thai baht'], PHP: ['ph', 'Philippine peso'],
  VND: ['vn', 'Vietnamese dong'], MMK: ['mm', 'Myanmar kyat'], KHR: ['kh', 'Cambodian riel'], LAK: ['la', 'Lao kip'], BND: ['bn', 'Brunei dollar'],
  MVR: ['mv', 'Maldivian rufiyaa'], MNT: ['mn', 'Mongolian tögrög'], KZT: ['kz', 'Kazakh tenge'], UZS: ['uz', 'Uzbek som'], AZN: ['az', 'Azerbaijani manat'],
  GEL: ['ge', 'Georgian lari'], AMD: ['am', 'Armenian dram'], KGS: ['kg', 'Kyrgyz som'], TJS: ['tj', 'Tajik somoni'], TMT: ['tm', 'Turkmen manat'],
  AUD: ['au', 'Australian dollar'], NZD: ['nz', 'New Zealand dollar'], FJD: ['fj', 'Fijian dollar'], PGK: ['pg', 'Papua New Guinea kina'],
  CHF: ['ch', 'Swiss franc'], SEK: ['se', 'Swedish krona'], NOK: ['no', 'Norwegian krone'], DKK: ['dk', 'Danish krone'], ISK: ['is', 'Icelandic króna'],
  PLN: ['pl', 'Polish złoty'], CZK: ['cz', 'Czech koruna'], HUF: ['hu', 'Hungarian forint'], RON: ['ro', 'Romanian leu'], BGN: ['bg', 'Bulgarian lev'],
  RSD: ['rs', 'Serbian dinar'], UAH: ['ua', 'Ukrainian hryvnia'], RUB: ['ru', 'Russian rouble'], BYN: ['by', 'Belarusian rouble'], MDL: ['md', 'Moldovan leu'],
  ALL: ['al', 'Albanian lek'], MKD: ['mk', 'Macedonian denar'], BAM: ['ba', 'Bosnian convertible mark'],
  CAD: ['ca', 'Canadian dollar'], MXN: ['mx', 'Mexican peso'], BRL: ['br', 'Brazilian real'], ARS: ['ar', 'Argentine peso'], CLP: ['cl', 'Chilean peso'],
  COP: ['co', 'Colombian peso'], PEN: ['pe', 'Peruvian sol'], UYU: ['uy', 'Uruguayan peso'], PYG: ['py', 'Paraguayan guaraní'], BOB: ['bo', 'Bolivian boliviano'],
  VES: ['ve', 'Venezuelan bolívar'], CRC: ['cr', 'Costa Rican colón'], GTQ: ['gt', 'Guatemalan quetzal'], HNL: ['hn', 'Honduran lempira'], NIO: ['ni', 'Nicaraguan córdoba'],
  PAB: ['pa', 'Panamanian balboa'], DOP: ['do', 'Dominican peso'], JMD: ['jm', 'Jamaican dollar'], TTD: ['tt', 'Trinidad and Tobago dollar'], BBD: ['bb', 'Barbadian dollar'],
  BSD: ['bs', 'Bahamian dollar'], BZD: ['bz', 'Belize dollar'], HTG: ['ht', 'Haitian gourde'], XCD: ['ag', 'East Caribbean dollar'], KYD: ['ky', 'Cayman Islands dollar'],
  ZAR: ['za', 'South African rand'], NGN: ['ng', 'Nigerian naira'], KES: ['ke', 'Kenyan shilling'], GHS: ['gh', 'Ghanaian cedi'], ETB: ['et', 'Ethiopian birr'],
  TZS: ['tz', 'Tanzanian shilling'], UGX: ['ug', 'Ugandan shilling'], RWF: ['rw', 'Rwandan franc'], ZMW: ['zm', 'Zambian kwacha'], MWK: ['mw', 'Malawian kwacha'],
  MZN: ['mz', 'Mozambican metical'], BWP: ['bw', 'Botswana pula'], NAD: ['na', 'Namibian dollar'], AOA: ['ao', 'Angolan kwanza'], MUR: ['mu', 'Mauritian rupee'],
  SCR: ['sc', 'Seychellois rupee'], MGA: ['mg', 'Malagasy ariary'], XOF: ['sn', 'West African CFA franc'], XAF: ['cm', 'Central African CFA franc'], SDG: ['sd', 'Sudanese pound'],
  LYD: ['ly', 'Libyan dinar'], SOS: ['so', 'Somali shilling'], DJF: ['dj', 'Djiboutian franc'], GMD: ['gm', 'Gambian dalasi'], SLE: ['sl', 'Sierra Leonean leone'],
  YER: ['ye', 'Yemeni rial'], SYP: ['sy', 'Syrian pound'],
};

/** Order for the picker: the most used first, then A to Z by name. */
export const TOP_CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'PKR', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'SGD', 'HKD', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'TRY', 'BDT', 'PHP', 'NGN', 'ZAR', 'MYR'];
