/* ════════════════════════════════════════════════════════════════════════
   BIG FUNDS — the well-known investors whose official quarterly holdings
   reports (SEC form 13F) we read for "What the big funds are doing".
   ───────────────────────────────────────────────────────────────────────
   cik  = the fund's SEC number. `match` = a word that must appear in the
   SEC's name for that number; if it doesn't, the fund is skipped and the
   log says so (protects against a typo here).
   13F reports are public, free, and come out up to 45 days after each
   quarter ends — so they show what funds held, not what they hold today.
   ════════════════════════════════════════════════════════════════════════ */

export const BIG_FUNDS = [
  { cik: 1067983, name: 'Berkshire Hathaway', manager: 'Warren Buffett / Greg Abel', match: 'BERKSHIRE' },
  { cik: 1350694, name: 'Bridgewater Associates', manager: 'founded by Ray Dalio', match: 'BRIDGEWATER' },
  { cik: 1037389, name: 'Renaissance Technologies', manager: 'founded by Jim Simons', match: 'RENAISSANCE' },
  { cik: 1336528, name: 'Pershing Square', manager: 'Bill Ackman', match: 'PERSHING' },
  { cik: 1536411, name: 'Duquesne Family Office', manager: 'Stanley Druckenmiller', match: 'DUQUESNE' },
  { cik: 1656456, name: 'Appaloosa', manager: 'David Tepper', match: 'APPALOOSA' },
  { cik: 1061768, name: 'Baupost Group', manager: 'Seth Klarman', match: 'BAUPOST' },
  { cik: 1040273, name: 'Third Point', manager: 'Dan Loeb', match: 'THIRD POINT' },
  { cik: 1167483, name: 'Tiger Global', manager: 'Chase Coleman', match: 'TIGER' },
  { cik: 1135730, name: 'Coatue Management', manager: 'Philippe Laffont', match: 'COATUE' },
  { cik: 1061165, name: 'Lone Pine Capital', manager: 'Stephen Mandel', match: 'LONE PINE' },
  { cik: 1103804, name: 'Viking Global', manager: 'Andreas Halvorsen', match: 'VIKING' },
  { cik: 1423053, name: 'Citadel Advisors', manager: 'Ken Griffin', match: 'CITADEL' },
  { cik: 1179392, name: 'Two Sigma Investments', manager: 'John Overdeck / David Siegel', match: 'TWO SIGMA' },
  { cik: 1009207, name: 'D. E. Shaw', manager: 'founded by David Shaw', match: 'SHAW' },
  { cik: 921669, name: 'Icahn Enterprises', manager: 'Carl Icahn', match: 'ICAHN' },
  { cik: 1079114, name: 'Greenlight Capital', manager: 'David Einhorn', match: 'GREENLIGHT' },
  { cik: 1166559, name: 'Gates Foundation Trust', manager: 'Bill & Melinda Gates Foundation', match: 'GATES' },
  { cik: 1569205, name: 'Fundsmith', manager: 'Terry Smith', match: 'FUNDSMITH' },
  { cik: 1112520, name: 'Akre Capital', manager: 'founded by Chuck Akre', match: 'AKRE' },
  { cik: 1345471, name: 'Trian Fund Management', manager: 'Nelson Peltz', match: 'TRIAN' },
];
