/* ════════════════════════════════════════════════════════════════════════
   READER PROFILE — the questions on Membership → "Your profile".
   All optional. Used (in totals only) to pitch the site's vocabulary and
   depth, shown in Admin → Analytics → "Your readers".
   Each list: [id, label]. Add or rename options here and upload.
   Choosing "other" shows a small box where the reader can type their own.
   ════════════════════════════════════════════════════════════════════════ */

// Every country and territory (ISO 3166 list), A to Z
const COUNTRIES = [
    ["af", "Afghanistan"], ["ax", "Åland Islands"], ["al", "Albania"], ["dz", "Algeria"], ["as", "American Samoa"],
    ["ad", "Andorra"], ["ao", "Angola"], ["ai", "Anguilla"], ["aq", "Antarctica"], ["ag", "Antigua and Barbuda"],
    ["ar", "Argentina"], ["am", "Armenia"], ["aw", "Aruba"], ["au", "Australia"], ["at", "Austria"], ["az", "Azerbaijan"],
    ["bs", "Bahamas"], ["bh", "Bahrain"], ["bd", "Bangladesh"], ["bb", "Barbados"], ["by", "Belarus"], ["be", "Belgium"],
    ["bz", "Belize"], ["bj", "Benin"], ["bm", "Bermuda"], ["bt", "Bhutan"], ["bo", "Bolivia"], ["ba", "Bosnia and Herzegovina"],
    ["bw", "Botswana"], ["bv", "Bouvet Island"], ["br", "Brazil"], ["io", "British Indian Ocean Territory"],
    ["vg", "British Virgin Islands"], ["bn", "Brunei"], ["bg", "Bulgaria"], ["bf", "Burkina Faso"], ["bi", "Burundi"],
    ["kh", "Cambodia"], ["cm", "Cameroon"], ["ca", "Canada"], ["cv", "Cape Verde"], ["bq", "Caribbean Netherlands"],
    ["ky", "Cayman Islands"], ["cf", "Central African Republic"], ["td", "Chad"], ["cl", "Chile"], ["cn", "China"],
    ["cx", "Christmas Island"], ["cc", "Cocos (Keeling) Islands"], ["co", "Colombia"], ["km", "Comoros"],
    ["cd", "Congo (Democratic Republic)"], ["cg", "Congo (Republic)"], ["ck", "Cook Islands"], ["cr", "Costa Rica"],
    ["ci", "Côte d’Ivoire"], ["hr", "Croatia"], ["cu", "Cuba"], ["cw", "Curaçao"], ["cy", "Cyprus"], ["cz", "Czechia"],
    ["dk", "Denmark"], ["dj", "Djibouti"], ["dm", "Dominica"], ["do", "Dominican Republic"], ["ec", "Ecuador"], ["eg", "Egypt"],
    ["sv", "El Salvador"], ["gq", "Equatorial Guinea"], ["er", "Eritrea"], ["ee", "Estonia"], ["sz", "Eswatini"],
    ["et", "Ethiopia"], ["fk", "Falkland Islands"], ["fo", "Faroe Islands"], ["fj", "Fiji"], ["fi", "Finland"], ["fr", "France"],
    ["gf", "French Guiana"], ["pf", "French Polynesia"], ["tf", "French Southern Territories"], ["ga", "Gabon"],
    ["gm", "Gambia"], ["ge", "Georgia"], ["de", "Germany"], ["gh", "Ghana"], ["gi", "Gibraltar"], ["gr", "Greece"],
    ["gl", "Greenland"], ["gd", "Grenada"], ["gp", "Guadeloupe"], ["gu", "Guam"], ["gt", "Guatemala"], ["gg", "Guernsey"],
    ["gn", "Guinea"], ["gw", "Guinea-Bissau"], ["gy", "Guyana"], ["ht", "Haiti"], ["hm", "Heard and McDonald Islands"],
    ["hn", "Honduras"], ["hk", "Hong Kong"], ["hu", "Hungary"], ["is", "Iceland"], ["in", "India"], ["id", "Indonesia"],
    ["ir", "Iran"], ["iq", "Iraq"], ["ie", "Ireland"], ["im", "Isle of Man"], ["il", "Israel"], ["it", "Italy"],
    ["jm", "Jamaica"], ["jp", "Japan"], ["je", "Jersey"], ["jo", "Jordan"], ["kz", "Kazakhstan"], ["ke", "Kenya"],
    ["ki", "Kiribati"], ["xk", "Kosovo"], ["kw", "Kuwait"], ["kg", "Kyrgyzstan"], ["la", "Laos"], ["lv", "Latvia"],
    ["lb", "Lebanon"], ["ls", "Lesotho"], ["lr", "Liberia"], ["ly", "Libya"], ["li", "Liechtenstein"], ["lt", "Lithuania"],
    ["lu", "Luxembourg"], ["mo", "Macao"], ["mg", "Madagascar"], ["mw", "Malawi"], ["my", "Malaysia"], ["mv", "Maldives"],
    ["ml", "Mali"], ["mt", "Malta"], ["mh", "Marshall Islands"], ["mq", "Martinique"], ["mr", "Mauritania"], ["mu", "Mauritius"],
    ["yt", "Mayotte"], ["mx", "Mexico"], ["fm", "Micronesia"], ["md", "Moldova"], ["mc", "Monaco"], ["mn", "Mongolia"],
    ["me", "Montenegro"], ["ms", "Montserrat"], ["ma", "Morocco"], ["mz", "Mozambique"], ["mm", "Myanmar"], ["na", "Namibia"],
    ["nr", "Nauru"], ["np", "Nepal"], ["nl", "Netherlands"], ["nc", "New Caledonia"], ["nz", "New Zealand"], ["ni", "Nicaragua"],
    ["ne", "Niger"], ["ng", "Nigeria"], ["nu", "Niue"], ["nf", "Norfolk Island"], ["kp", "North Korea"],
    ["mk", "North Macedonia"], ["mp", "Northern Mariana Islands"], ["no", "Norway"], ["om", "Oman"], ["pk", "Pakistan"],
    ["pw", "Palau"], ["ps", "Palestine"], ["pa", "Panama"], ["pg", "Papua New Guinea"], ["py", "Paraguay"], ["pe", "Peru"],
    ["ph", "Philippines"], ["pn", "Pitcairn Islands"], ["pl", "Poland"], ["pt", "Portugal"], ["pr", "Puerto Rico"],
    ["qa", "Qatar"], ["re", "Réunion"], ["ro", "Romania"], ["ru", "Russia"], ["rw", "Rwanda"], ["bl", "Saint Barthélemy"],
    ["sh", "Saint Helena"], ["kn", "Saint Kitts and Nevis"], ["lc", "Saint Lucia"], ["mf", "Saint Martin"],
    ["pm", "Saint Pierre and Miquelon"], ["vc", "Saint Vincent and the Grenadines"], ["ws", "Samoa"], ["sm", "San Marino"],
    ["st", "São Tomé and Príncipe"], ["sa", "Saudi Arabia"], ["sn", "Senegal"], ["rs", "Serbia"], ["sc", "Seychelles"],
    ["sl", "Sierra Leone"], ["sg", "Singapore"], ["sx", "Sint Maarten"], ["sk", "Slovakia"], ["si", "Slovenia"],
    ["sb", "Solomon Islands"], ["so", "Somalia"], ["za", "South Africa"], ["gs", "South Georgia and South Sandwich Islands"],
    ["kr", "South Korea"], ["ss", "South Sudan"], ["es", "Spain"], ["lk", "Sri Lanka"], ["sd", "Sudan"], ["sr", "Suriname"],
    ["sj", "Svalbard and Jan Mayen"], ["se", "Sweden"], ["ch", "Switzerland"], ["sy", "Syria"], ["tw", "Taiwan"],
    ["tj", "Tajikistan"], ["tz", "Tanzania"], ["th", "Thailand"], ["tl", "Timor-Leste"], ["tg", "Togo"], ["tk", "Tokelau"],
    ["to", "Tonga"], ["tt", "Trinidad and Tobago"], ["tn", "Tunisia"], ["tr", "Türkiye"], ["tm", "Turkmenistan"],
    ["tc", "Turks and Caicos Islands"], ["tv", "Tuvalu"], ["ug", "Uganda"], ["ua", "Ukraine"], ["ae", "United Arab Emirates"],
    ["gb", "United Kingdom"], ["us", "United States"], ["uy", "Uruguay"], ["um", "US Outlying Islands"],
    ["vi", "US Virgin Islands"], ["uz", "Uzbekistan"], ["vu", "Vanuatu"], ["va", "Vatican City"], ["ve", "Venezuela"],
    ["vn", "Vietnam"], ["wf", "Wallis and Futuna"], ["eh", "Western Sahara"], ["ye", "Yemen"], ["zm", "Zambia"],
    ["zw", "Zimbabwe"],
];

export const PROFILE_OPTIONS = {
  country: [...COUNTRIES, ['other', 'Somewhere else']],
  ageRange: [['18-24', '18–24'], ['25-34', '25–34'], ['35-44', '35–44'], ['45-54', '45–54'], ['55-64', '55–64'], ['65+', '65 or over'], ['na', 'Prefer not to say']],
  profession: [
    ['student', 'Student'], ['employed', 'Employed (salaried)'], ['business', 'Business owner / self-employed'],
    ['professional', 'Professional (e.g. doctor, engineer, lawyer)'], ['finance', 'Work in finance or accounting'],
    ['homemaker', 'Homemaker'], ['retired', 'Retired'], ['other', 'Other'],
  ],
  knowledge: [
    ['beginner', 'Beginner — I’m just starting to learn'],
    ['some', 'Some knowledge — I know the basics'],
    ['confident', 'Confident — I understand most investing terms'],
    ['expert', 'Expert — I work with markets or follow them closely'],
  ],
  experience: [['none', 'I haven’t invested yet'], ['lt1', 'Less than 1 year'], ['1-3', '1–3 years'], ['3-10', '3–10 years'], ['10+', 'More than 10 years']],
  investAmount: [
    ['lt1k', 'Under $1,000'], ['1k-10k', '$1,000 – $10,000'], ['10k-50k', '$10,000 – $50,000'],
    ['50k-250k', '$50,000 – $250,000'], ['250k+', 'Over $250,000'], ['na', 'Prefer not to say'],
  ],
  goals: [
    ['learn', 'Learn how markets work'], ['savings', 'Build my savings'], ['wealth', 'Grow my wealth over time'], ['income', 'Earn a regular income'],
    ['retirement', 'Plan for retirement'], ['home', 'Buy a home'], ['education', 'Pay for children’s education'], ['other', 'Something else'],
  ],
};

// interests and markets reuse the site's existing lists (config.js)
export const PROFILE_FIELDS = ['country', 'ageRange', 'profession', 'knowledge', 'experience', 'investAmount', 'goals', 'interests', 'regions'];
export const MULTI_FIELDS = ['goals', 'interests', 'regions'];
// Fields where "other" opens a typing box; the typed text is saved as <field>Other
export const OTHER_TEXT_FIELDS = ['country', 'profession', 'goals'];
export const OTHER_TEXT_MAX = 60;
