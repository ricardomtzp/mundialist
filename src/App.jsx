import { useState, useMemo } from "react";

// ── WC2026 Brand Colours ──────────────────────────────────────────────────────
const C = {
  blue:"#2A398D",   blueLt:"#E8EBF7",
  red:"#E61D25",    redLt:"#FDECED",
  green:"#3CAC3B",  greenLt:"#EAF7EA",
  gold:"#C9A84C",   goldLt:"#FBF5E6",
  purple:"#7C3AED", purpleLt:"#EDE9FE",
};

// ── ACTUAL 2026 FIFA World Cup Groups ─────────────────────────────────────────
// Source: FIFA official draw, December 5 2025 + March 2026 playoffs
const GROUPS = {
  A: ["Mexico",      "South Africa", "South Korea",  "Czechia"],
  B: ["Canada",      "Switzerland",  "Qatar",         "Bosnia and Herzegovina"],
  C: ["Brazil",      "Morocco",      "Haiti",         "Scotland"],
  D: ["USA",         "Paraguay",     "Australia",     "Türkiye"],
  E: ["Germany",     "Curaçao",      "Ivory Coast",   "Ecuador"],
  F: ["Netherlands", "Japan",        "Sweden",        "Tunisia"],
  G: ["Belgium",     "Egypt",        "Iran",          "New Zealand"],
  H: ["Spain",       "Cape Verde",   "Saudi Arabia",  "Uruguay"],
  I: ["France",      "Senegal",      "Norway",        "Iraq"],
  J: ["Argentina",   "Algeria",      "Austria",       "Jordan"],
  K: ["Portugal",    "DR Congo",     "Uzbekistan",    "Colombia"],
  L: ["England",     "Croatia",      "Ghana",         "Panama"],
};

// Seeded / Pot 1 teams (hosts + top ranked)
const SEEDED = new Set([
  "Mexico","Canada","USA","Brazil","Germany","Spain",
  "France","England","Portugal","Belgium","Netherlands","Argentina"
]);

const STRONG = new Set([
  "Brazil","France","Germany","Spain","England","Argentina",
  "Portugal","Netherlands","USA","Mexico","Belgium","Morocco"
]);

const FLAGS = {
  Mexico:"🇲🇽","South Africa":"🇿🇦","South Korea":"🇰🇷",Czechia:"🇨🇿",
  Canada:"🇨🇦",Switzerland:"🇨🇭",Qatar:"🇶🇦","Bosnia and Herzegovina":"🇧🇦",
  Brazil:"🇧🇷",Morocco:"🇲🇦",Haiti:"🇭🇹",Scotland:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  USA:"🇺🇸",Paraguay:"🇵🇾",Australia:"🇦🇺","Türkiye":"🇹🇷",
  Germany:"🇩🇪","Curaçao":"🇨🇼","Ivory Coast":"🇨🇮",Ecuador:"🇪🇨",
  Netherlands:"🇳🇱",Japan:"🇯🇵",Sweden:"🇸🇪",Tunisia:"🇹🇳",
  Belgium:"🇧🇪",Egypt:"🇪🇬",Iran:"🇮🇷","New Zealand":"🇳🇿",
  Spain:"🇪🇸","Cape Verde":"🇨🇻","Saudi Arabia":"🇸🇦",Uruguay:"🇺🇾",
  France:"🇫🇷",Senegal:"🇸🇳",Norway:"🇳🇴",Iraq:"🇮🇶",
  Argentina:"🇦🇷",Algeria:"🇩🇿",Austria:"🇦🇹",Jordan:"🇯🇴",
  Portugal:"🇵🇹","DR Congo":"🇨🇩",Uzbekistan:"🇺🇿",Colombia:"🇨🇴",
  England:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",Croatia:"🇭🇷",Ghana:"🇬🇭",Panama:"🇵🇦",
  TBD:"❓",
};

// ── FIFA Annex C — R32 fixed structure ────────────────────────────────────────
// The 16 R32 matches — fixed opponents for group winners vs runners-up
// Third-place slots resolved via Annex C lookup table
// Match indices correspond to FIFA match numbers 73–88
const R32_FIXED = [
  { id:73,  home:"2A", away:"2B" },   // Runner-up A vs Runner-up B
  { id:74,  home:"1E", away:"3?"  },  // Winner E vs Best 3rd (A/B/C/D/F)
  { id:75,  home:"1F", away:"2C" },   // Winner F vs Runner-up C
  { id:76,  home:"1C", away:"2F" },   // Winner C vs Runner-up F
  { id:77,  home:"1I", away:"3?"  },  // Winner I vs Best 3rd (C/D/F/G/H)
  { id:78,  home:"2E", away:"2I" },   // Runner-up E vs Runner-up I
  { id:79,  home:"1A", away:"3?"  },  // Winner A vs Best 3rd (C/E/F/H/I)
  { id:80,  home:"1L", away:"3?"  },  // Winner L vs Best 3rd (E/H/I/J/K)
  { id:81,  home:"1D", away:"3?"  },  // Winner D vs Best 3rd (B/E/F/I/J)
  { id:82,  home:"1G", away:"3?"  },  // Winner G vs Best 3rd (A/E/H/I/J)
  { id:83,  home:"2K", away:"2L" },   // Runner-up K vs Runner-up L
  { id:84,  home:"1H", away:"2J" },   // Winner H vs Runner-up J
  { id:85,  home:"1B", away:"3?"  },  // Winner B vs Best 3rd (E/F/G/I/J)
  { id:86,  home:"1J", away:"2H" },   // Winner J vs Runner-up H
  { id:87,  home:"1K", away:"3?"  },  // Winner K vs Best 3rd (D/E/I/J/L)
  { id:88,  home:"2D", away:"2G" },   // Runner-up D vs Runner-up G
];

// Annex C — which 3rd place team goes where based on which 8 groups qualified
// Format: key = sorted string of 8 qualifying groups (e.g. "CDEFGHIJ")
// Value: [1A_3rd, 1B_3rd, 1D_3rd, 1E_3rd, 1G_3rd, 1I_3rd, 1K_3rd, 1L_3rd]
// These are the opponents in matches 79, 85, 81, 74, 82, 77, 87, 80 respectively
// FIFA Annex C — complete 495-scenario lookup table
// Key: sorted group letters of the 8 qualifying third-placed teams
// Value: array of opponents for [1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L]
const ANNEX_C = {
  "EFGHIJKL":["3E","3J","3I","3F","3H","3G","3L","3K"],
  "DFGHIJKL":["3H","3G","3I","3D","3J","3F","3L","3K"],
  "DEGHIJKL":["3E","3J","3I","3D","3H","3G","3L","3K"],
  "DEFHIJKL":["3E","3J","3I","3D","3H","3F","3L","3K"],
  "DEFGIJKL":["3E","3G","3I","3D","3J","3F","3L","3K"],
  "DEFGHJKL":["3E","3G","3J","3D","3H","3F","3L","3K"],
  "DEFGHIKL":["3E","3G","3I","3D","3H","3F","3L","3K"],
  "DEFGHIJL":["3E","3G","3J","3D","3H","3F","3L","3I"],
  "DEFGHIJK":["3E","3G","3J","3D","3H","3F","3I","3K"],
  "CFGHIJKL":["3H","3G","3I","3C","3J","3F","3L","3K"],
  "CEGHIJKL":["3E","3J","3I","3C","3H","3G","3L","3K"],
  "CEFHIJKL":["3E","3J","3I","3C","3H","3F","3L","3K"],
  "CEFGIJKL":["3E","3G","3I","3C","3J","3F","3L","3K"],
  "CEFGHJKL":["3E","3G","3J","3C","3H","3F","3L","3K"],
  "CEFGHIKL":["3E","3G","3I","3C","3H","3F","3L","3K"],
  "CEFGHIJL":["3E","3G","3J","3C","3H","3F","3L","3I"],
  "CEFGHIJK":["3E","3G","3J","3C","3H","3F","3I","3K"],
  "CDGHIJKL":["3H","3G","3I","3C","3J","3D","3L","3K"],
  "CDFHIJKL":["3C","3J","3I","3D","3H","3F","3L","3K"],
  "CDFGIJKL":["3C","3G","3I","3D","3J","3F","3L","3K"],
  "CDFGHJKL":["3C","3G","3J","3D","3H","3F","3L","3K"],
  "CDFGHIKL":["3C","3G","3I","3D","3H","3F","3L","3K"],
  "CDFGHIJL":["3C","3G","3J","3D","3H","3F","3L","3I"],
  "CDFGHIJK":["3C","3G","3J","3D","3H","3F","3I","3K"],
  "CDEHIJKL":["3E","3J","3I","3C","3H","3D","3L","3K"],
  "CDEGIJKL":["3E","3G","3I","3C","3J","3D","3L","3K"],
  "CDEGHJKL":["3E","3G","3J","3C","3H","3D","3L","3K"],
  "CDEGHIKL":["3E","3G","3I","3C","3H","3D","3L","3K"],
  "CDEGHIJL":["3E","3G","3J","3C","3H","3D","3L","3I"],
  "CDEGHIJK":["3E","3G","3J","3C","3H","3D","3I","3K"],
  "CDEFIJKL":["3C","3J","3E","3D","3I","3F","3L","3K"],
  "CDEFHJKL":["3C","3J","3E","3D","3H","3F","3L","3K"],
  "CDEFHIKL":["3C","3E","3I","3D","3H","3F","3L","3K"],
  "CDEFHIJL":["3C","3J","3E","3D","3H","3F","3L","3I"],
  "CDEFHIJK":["3C","3J","3E","3D","3H","3F","3I","3K"],
  "CDEFGJKL":["3C","3G","3E","3D","3J","3F","3L","3K"],
  "CDEFGIKL":["3C","3G","3E","3D","3I","3F","3L","3K"],
  "CDEFGIJL":["3C","3G","3E","3D","3J","3F","3L","3I"],
  "CDEFGIJK":["3C","3G","3E","3D","3J","3F","3I","3K"],
  "CDEFGHKL":["3C","3G","3E","3D","3H","3F","3L","3K"],
  "CDEFGHJL":["3C","3G","3J","3D","3H","3F","3L","3E"],
  "CDEFGHJK":["3C","3G","3J","3D","3H","3F","3E","3K"],
  "CDEFGHIL":["3C","3G","3E","3D","3H","3F","3L","3I"],
  "CDEFGHIK":["3C","3G","3E","3D","3H","3F","3I","3K"],
  "CDEFGHIJ":["3C","3G","3J","3D","3H","3F","3E","3I"],
  "BFGHIJKL":["3H","3J","3B","3F","3I","3G","3L","3K"],
  "BEGHIJKL":["3E","3J","3I","3B","3H","3G","3L","3K"],
  "BEFHIJKL":["3E","3J","3B","3F","3I","3H","3L","3K"],
  "BEFGIJKL":["3E","3J","3B","3F","3I","3G","3L","3K"],
  "BEFGHJKL":["3E","3J","3B","3F","3H","3G","3L","3K"],
  "BEFGHIKL":["3E","3G","3B","3F","3I","3H","3L","3K"],
  "BEFGHIJL":["3E","3J","3B","3F","3H","3G","3L","3I"],
  "BEFGHIJK":["3E","3J","3B","3F","3H","3G","3I","3K"],
  "BDGHIJKL":["3H","3J","3B","3D","3I","3G","3L","3K"],
  "BDFHIJKL":["3H","3J","3B","3D","3I","3F","3L","3K"],
  "BDFGIJKL":["3I","3G","3B","3D","3J","3F","3L","3K"],
  "BDFGHJKL":["3H","3G","3B","3D","3J","3F","3L","3K"],
  "BDFGHIKL":["3H","3G","3B","3D","3I","3F","3L","3K"],
  "BDFGHIJL":["3H","3G","3B","3D","3J","3F","3L","3I"],
  "BDFGHIJK":["3H","3G","3B","3D","3J","3F","3I","3K"],
  "BDEHIJKL":["3E","3J","3B","3D","3I","3H","3L","3K"],
  "BDEGIJKL":["3E","3J","3B","3D","3I","3G","3L","3K"],
  "BDEGHJKL":["3E","3J","3B","3D","3H","3G","3L","3K"],
  "BDEGHIKL":["3E","3G","3B","3D","3I","3H","3L","3K"],
  "BDEGHIJL":["3E","3J","3B","3D","3H","3G","3L","3I"],
  "BDEGHIJK":["3E","3J","3B","3D","3H","3G","3I","3K"],
  "BDEFIJKL":["3E","3J","3B","3D","3I","3F","3L","3K"],
  "BDEFHJKL":["3E","3J","3B","3D","3H","3F","3L","3K"],
  "BDEFHIKL":["3E","3I","3B","3D","3H","3F","3L","3K"],
  "BDEFHIJL":["3E","3J","3B","3D","3H","3F","3L","3I"],
  "BDEFHIJK":["3E","3J","3B","3D","3H","3F","3I","3K"],
  "BDEFGJKL":["3E","3G","3B","3D","3J","3F","3L","3K"],
  "BDEFGIKL":["3E","3G","3B","3D","3I","3F","3L","3K"],
  "BDEFGIJL":["3E","3G","3B","3D","3J","3F","3L","3I"],
  "BDEFGIJK":["3E","3G","3B","3D","3J","3F","3I","3K"],
  "BDEFGHKL":["3E","3G","3B","3D","3H","3F","3L","3K"],
  "BDEFGHJL":["3H","3G","3B","3D","3J","3F","3L","3E"],
  "BDEFGHJK":["3H","3G","3B","3D","3J","3F","3E","3K"],
  "BDEFGHIL":["3E","3G","3B","3D","3H","3F","3L","3I"],
  "BDEFGHIK":["3E","3G","3B","3D","3H","3F","3I","3K"],
  "BDEFGHIJ":["3H","3G","3B","3D","3J","3F","3E","3I"],
  "BCGHIJKL":["3H","3J","3B","3C","3I","3G","3L","3K"],
  "BCFHIJKL":["3H","3J","3B","3C","3I","3F","3L","3K"],
  "BCFGIJKL":["3I","3G","3B","3C","3J","3F","3L","3K"],
  "BCFGHJKL":["3H","3G","3B","3C","3J","3F","3L","3K"],
  "BCFGHIKL":["3H","3G","3B","3C","3I","3F","3L","3K"],
  "BCFGHIJL":["3H","3G","3B","3C","3J","3F","3L","3I"],
  "BCFGHIJK":["3H","3G","3B","3C","3J","3F","3I","3K"],
  "BCEHIJKL":["3E","3J","3B","3C","3I","3H","3L","3K"],
  "BCEGIJKL":["3E","3J","3B","3C","3I","3G","3L","3K"],
  "BCEGHJKL":["3E","3J","3B","3C","3H","3G","3L","3K"],
  "BCEGHIKL":["3E","3G","3B","3C","3I","3H","3L","3K"],
  "BCEGHIJL":["3E","3J","3B","3C","3H","3G","3L","3I"],
  "BCEGHIJK":["3E","3J","3B","3C","3H","3G","3I","3K"],
  "BCEFIJKL":["3E","3J","3B","3C","3I","3F","3L","3K"],
  "BCEFHJKL":["3E","3J","3B","3C","3H","3F","3L","3K"],
  "BCEFHIKL":["3E","3I","3B","3C","3H","3F","3L","3K"],
  "BCEFHIJL":["3E","3J","3B","3C","3H","3F","3L","3I"],
  "BCEFHIJK":["3E","3J","3B","3C","3H","3F","3I","3K"],
  "BCEFGJKL":["3E","3G","3B","3C","3J","3F","3L","3K"],
  "BCEFGIKL":["3E","3G","3B","3C","3I","3F","3L","3K"],
  "BCEFGIJL":["3E","3G","3B","3C","3J","3F","3L","3I"],
  "BCEFGIJK":["3E","3G","3B","3C","3J","3F","3I","3K"],
  "BCEFGHKL":["3E","3G","3B","3C","3H","3F","3L","3K"],
  "BCEFGHJL":["3H","3G","3B","3C","3J","3F","3L","3E"],
  "BCEFGHJK":["3H","3G","3B","3C","3J","3F","3E","3K"],
  "BCEFGHIL":["3E","3G","3B","3C","3H","3F","3L","3I"],
  "BCEFGHIK":["3E","3G","3B","3C","3H","3F","3I","3K"],
  "BCEFGHIJ":["3H","3G","3B","3C","3J","3F","3E","3I"],
  "BCDHIJKL":["3H","3J","3B","3C","3I","3D","3L","3K"],
  "BCDGIJKL":["3I","3G","3B","3C","3J","3D","3L","3K"],
  "BCDGHJKL":["3H","3G","3B","3C","3J","3D","3L","3K"],
  "BCDGHIKL":["3H","3G","3B","3C","3I","3D","3L","3K"],
  "BCDGHIJL":["3H","3G","3B","3C","3J","3D","3L","3I"],
  "BCDGHIJK":["3H","3G","3B","3C","3J","3D","3I","3K"],
  "BCDFIJKL":["3C","3J","3B","3D","3I","3F","3L","3K"],
  "BCDFHJKL":["3C","3J","3B","3D","3H","3F","3L","3K"],
  "BCDFHIKL":["3C","3I","3B","3D","3H","3F","3L","3K"],
  "BCDFHIJL":["3C","3J","3B","3D","3H","3F","3L","3I"],
  "BCDFHIJK":["3C","3J","3B","3D","3H","3F","3I","3K"],
  "BCDFGJKL":["3C","3G","3B","3D","3J","3F","3L","3K"],
  "BCDFGIKL":["3C","3G","3B","3D","3I","3F","3L","3K"],
  "BCDFGIJL":["3C","3G","3B","3D","3J","3F","3L","3I"],
  "BCDFGIJK":["3C","3G","3B","3D","3J","3F","3I","3K"],
  "BCDFGHKL":["3C","3G","3B","3D","3H","3F","3L","3K"],
  "BCDFGHJL":["3C","3G","3B","3D","3H","3F","3L","3J"],
  "BCDFGHJK":["3H","3G","3B","3C","3J","3F","3D","3K"],
  "BCDFGHIL":["3C","3G","3B","3D","3H","3F","3L","3I"],
  "BCDFGHIK":["3C","3G","3B","3D","3H","3F","3I","3K"],
  "BCDFGHIJ":["3H","3G","3B","3C","3J","3F","3D","3I"],
  "BCDEIJKL":["3E","3J","3B","3C","3I","3D","3L","3K"],
  "BCDEHJKL":["3E","3J","3B","3C","3H","3D","3L","3K"],
  "BCDEHIKL":["3E","3I","3B","3C","3H","3D","3L","3K"],
  "BCDEHIJL":["3E","3J","3B","3C","3H","3D","3L","3I"],
  "BCDEHIJK":["3E","3J","3B","3C","3H","3D","3I","3K"],
  "BCDEGJKL":["3E","3G","3B","3C","3J","3D","3L","3K"],
  "BCDEGIKL":["3E","3G","3B","3C","3I","3D","3L","3K"],
  "BCDEGIJL":["3E","3G","3B","3C","3J","3D","3L","3I"],
  "BCDEGIJK":["3E","3G","3B","3C","3J","3D","3I","3K"],
  "BCDEGHKL":["3E","3G","3B","3C","3H","3D","3L","3K"],
  "BCDEGHJL":["3H","3G","3B","3C","3J","3D","3L","3E"],
  "BCDEGHJK":["3H","3G","3B","3C","3J","3D","3E","3K"],
  "BCDEGHIL":["3E","3G","3B","3C","3H","3D","3L","3I"],
  "BCDEGHIK":["3E","3G","3B","3C","3H","3D","3I","3K"],
  "BCDEGHIJ":["3H","3G","3B","3C","3J","3D","3E","3I"],
  "BCDEFJKL":["3C","3J","3B","3D","3E","3F","3L","3K"],
  "BCDEFIKL":["3C","3E","3B","3D","3I","3F","3L","3K"],
  "BCDEFIJL":["3C","3J","3B","3D","3E","3F","3L","3I"],
  "BCDEFIJK":["3C","3J","3B","3D","3E","3F","3I","3K"],
  "BCDEFHKL":["3C","3E","3B","3D","3H","3F","3L","3K"],
  "BCDEFHJL":["3C","3J","3B","3D","3H","3F","3L","3E"],
  "BCDEFHJK":["3C","3J","3B","3D","3H","3F","3E","3K"],
  "BCDEFHIL":["3C","3E","3B","3D","3H","3F","3L","3I"],
  "BCDEFHIK":["3C","3E","3B","3D","3H","3F","3I","3K"],
  "BCDEFHIJ":["3C","3J","3B","3D","3H","3F","3E","3I"],
  "BCDEFGKL":["3C","3G","3B","3D","3E","3F","3L","3K"],
  "BCDEFGJL":["3C","3G","3B","3D","3J","3F","3L","3E"],
  "BCDEFGJK":["3C","3G","3B","3D","3J","3F","3E","3K"],
  "BCDEFGIL":["3C","3G","3B","3D","3E","3F","3L","3I"],
  "BCDEFGIK":["3C","3G","3B","3D","3E","3F","3I","3K"],
  "BCDEFGIJ":["3C","3G","3B","3D","3J","3F","3E","3I"],
  "BCDEFGHL":["3C","3G","3B","3D","3H","3F","3L","3E"],
  "BCDEFGHK":["3C","3G","3B","3D","3H","3F","3E","3K"],
  "BCDEFGHJ":["3H","3G","3B","3C","3J","3F","3D","3E"],
  "BCDEFGHI":["3C","3G","3B","3D","3H","3F","3E","3I"],
  "AFGHIJKL":["3H","3J","3I","3F","3A","3G","3L","3K"],
  "AEGHIJKL":["3E","3J","3I","3A","3H","3G","3L","3K"],
  "AEFHIJKL":["3E","3J","3I","3F","3A","3H","3L","3K"],
  "AEFGIJKL":["3E","3J","3I","3F","3A","3G","3L","3K"],
  "AEFGHJKL":["3E","3G","3J","3F","3A","3H","3L","3K"],
  "AEFGHIKL":["3E","3G","3I","3F","3A","3H","3L","3K"],
  "AEFGHIJL":["3E","3G","3J","3F","3A","3H","3L","3I"],
  "AEFGHIJK":["3E","3G","3J","3F","3A","3H","3I","3K"],
  "ADGHIJKL":["3H","3J","3I","3D","3A","3G","3L","3K"],
  "ADFHIJKL":["3H","3J","3I","3D","3A","3F","3L","3K"],
  "ADFGIJKL":["3I","3G","3J","3D","3A","3F","3L","3K"],
  "ADFGHJKL":["3H","3G","3J","3D","3A","3F","3L","3K"],
  "ADFGHIKL":["3H","3G","3I","3D","3A","3F","3L","3K"],
  "ADFGHIJL":["3H","3G","3J","3D","3A","3F","3L","3I"],
  "ADFGHIJK":["3H","3G","3J","3D","3A","3F","3I","3K"],
  "ADEHIJKL":["3E","3J","3I","3D","3A","3H","3L","3K"],
  "ADEGIJKL":["3E","3J","3I","3D","3A","3G","3L","3K"],
  "ADEGHJKL":["3E","3G","3J","3D","3A","3H","3L","3K"],
  "ADEGHIKL":["3E","3G","3I","3D","3A","3H","3L","3K"],
  "ADEGHIJL":["3E","3G","3J","3D","3A","3H","3L","3I"],
  "ADEGHIJK":["3E","3G","3J","3D","3A","3H","3I","3K"],
  "ADEFIJKL":["3E","3J","3I","3D","3A","3F","3L","3K"],
  "ADEFHJKL":["3H","3J","3E","3D","3A","3F","3L","3K"],
  "ADEFHIKL":["3H","3E","3I","3D","3A","3F","3L","3K"],
  "ADEFHIJL":["3H","3J","3E","3D","3A","3F","3L","3I"],
  "ADEFHIJK":["3H","3J","3E","3D","3A","3F","3I","3K"],
  "ADEFGJKL":["3E","3G","3J","3D","3A","3F","3L","3K"],
  "ADEFGIKL":["3E","3G","3I","3D","3A","3F","3L","3K"],
  "ADEFGIJL":["3E","3G","3J","3D","3A","3F","3L","3I"],
  "ADEFGIJK":["3E","3G","3J","3D","3A","3F","3I","3K"],
  "ADEFGHKL":["3H","3G","3E","3D","3A","3F","3L","3K"],
  "ADEFGHJL":["3H","3G","3J","3D","3A","3F","3L","3E"],
  "ADEFGHJK":["3H","3G","3J","3D","3A","3F","3E","3K"],
  "ADEFGHIL":["3H","3G","3E","3D","3A","3F","3L","3I"],
  "ADEFGHIK":["3H","3G","3E","3D","3A","3F","3I","3K"],
  "ADEFGHIJ":["3H","3G","3J","3D","3A","3F","3E","3I"],
  "ACGHIJKL":["3H","3J","3I","3C","3A","3G","3L","3K"],
  "ACFHIJKL":["3H","3J","3I","3C","3A","3F","3L","3K"],
  "ACFGIJKL":["3I","3G","3J","3C","3A","3F","3L","3K"],
  "ACFGHJKL":["3H","3G","3J","3C","3A","3F","3L","3K"],
  "ACFGHIKL":["3H","3G","3I","3C","3A","3F","3L","3K"],
  "ACFGHIJL":["3H","3G","3J","3C","3A","3F","3L","3I"],
  "ACFGHIJK":["3H","3G","3J","3C","3A","3F","3I","3K"],
  "ACEHIJKL":["3E","3J","3I","3C","3A","3H","3L","3K"],
  "ACEGIJKL":["3E","3J","3I","3C","3A","3G","3L","3K"],
  "ACEGHJKL":["3E","3G","3J","3C","3A","3H","3L","3K"],
  "ACEGHIKL":["3E","3G","3I","3C","3A","3H","3L","3K"],
  "ACEGHIJL":["3E","3G","3J","3C","3A","3H","3L","3I"],
  "ACEGHIJK":["3E","3G","3J","3C","3A","3H","3I","3K"],
  "ACEFIJKL":["3E","3J","3I","3C","3A","3F","3L","3K"],
  "ACEFHJKL":["3H","3J","3E","3C","3A","3F","3L","3K"],
  "ACEFHIKL":["3H","3E","3I","3C","3A","3F","3L","3K"],
  "ACEFHIJL":["3H","3J","3E","3C","3A","3F","3L","3I"],
  "ACEFHIJK":["3H","3J","3E","3C","3A","3F","3I","3K"],
  "ACEFGJKL":["3E","3G","3J","3C","3A","3F","3L","3K"],
  "ACEFGIKL":["3E","3G","3I","3C","3A","3F","3L","3K"],
  "ACEFGIJL":["3E","3G","3J","3C","3A","3F","3L","3I"],
  "ACEFGIJK":["3E","3G","3J","3C","3A","3F","3I","3K"],
  "ACEFGHKL":["3H","3G","3E","3C","3A","3F","3L","3K"],
  "ACEFGHJL":["3H","3G","3J","3C","3A","3F","3L","3E"],
  "ACEFGHJK":["3H","3G","3J","3C","3A","3F","3E","3K"],
  "ACEFGHIL":["3H","3G","3E","3C","3A","3F","3L","3I"],
  "ACEFGHIK":["3H","3G","3E","3C","3A","3F","3I","3K"],
  "ACEFGHIJ":["3H","3G","3J","3C","3A","3F","3E","3I"],
  "ACDHIJKL":["3H","3J","3I","3C","3A","3D","3L","3K"],
  "ACDGIJKL":["3I","3G","3J","3C","3A","3D","3L","3K"],
  "ACDGHJKL":["3H","3G","3J","3C","3A","3D","3L","3K"],
  "ACDGHIKL":["3H","3G","3I","3C","3A","3D","3L","3K"],
  "ACDGHIJL":["3H","3G","3J","3C","3A","3D","3L","3I"],
  "ACDGHIJK":["3H","3G","3J","3C","3A","3D","3I","3K"],
  "ACDFIJKL":["3C","3J","3I","3D","3A","3F","3L","3K"],
  "ACDFHJKL":["3H","3J","3F","3C","3A","3D","3L","3K"],
  "ACDFHIKL":["3H","3F","3I","3C","3A","3D","3L","3K"],
  "ACDFHIJL":["3H","3J","3F","3C","3A","3D","3L","3I"],
  "ACDFHIJK":["3H","3J","3F","3C","3A","3D","3I","3K"],
  "ACDFGJKL":["3C","3G","3J","3D","3A","3F","3L","3K"],
  "ACDFGIKL":["3C","3G","3I","3D","3A","3F","3L","3K"],
  "ACDFGIJL":["3C","3G","3J","3D","3A","3F","3L","3I"],
  "ACDFGIJK":["3C","3G","3J","3D","3A","3F","3I","3K"],
  "ACDFGHKL":["3H","3G","3F","3C","3A","3D","3L","3K"],
  "ACDFGHJL":["3C","3G","3J","3D","3A","3F","3L","3H"],
  "ACDFGHJK":["3H","3G","3J","3C","3A","3F","3D","3K"],
  "ACDFGHIL":["3H","3G","3F","3C","3A","3D","3L","3I"],
  "ACDFGHIK":["3H","3G","3F","3C","3A","3D","3I","3K"],
  "ACDFGHIJ":["3H","3G","3J","3C","3A","3F","3D","3I"],
  "ACDEIJKL":["3E","3J","3I","3C","3A","3D","3L","3K"],
  "ACDEHJKL":["3H","3J","3E","3C","3A","3D","3L","3K"],
  "ACDEHIKL":["3H","3E","3I","3C","3A","3D","3L","3K"],
  "ACDEHIJL":["3H","3J","3E","3C","3A","3D","3L","3I"],
  "ACDEHIJK":["3H","3J","3E","3C","3A","3D","3I","3K"],
  "ACDEGJKL":["3E","3G","3J","3C","3A","3D","3L","3K"],
  "ACDEGIKL":["3E","3G","3I","3C","3A","3D","3L","3K"],
  "ACDEGIJL":["3E","3G","3J","3C","3A","3D","3L","3I"],
  "ACDEGIJK":["3E","3G","3J","3C","3A","3D","3I","3K"],
  "ACDEGHKL":["3H","3G","3E","3C","3A","3D","3L","3K"],
  "ACDEGHJL":["3H","3G","3J","3C","3A","3D","3L","3E"],
  "ACDEGHJK":["3H","3G","3J","3C","3A","3D","3E","3K"],
  "ACDEGHIL":["3H","3G","3E","3C","3A","3D","3L","3I"],
  "ACDEGHIK":["3H","3G","3E","3C","3A","3D","3I","3K"],
  "ACDEGHIJ":["3H","3G","3J","3C","3A","3D","3E","3I"],
  "ACDEFJKL":["3C","3J","3E","3D","3A","3F","3L","3K"],
  "ACDEFIKL":["3C","3E","3I","3D","3A","3F","3L","3K"],
  "ACDEFIJL":["3C","3J","3E","3D","3A","3F","3L","3I"],
  "ACDEFIJK":["3C","3J","3E","3D","3A","3F","3I","3K"],
  "ACDEFHKL":["3H","3E","3F","3C","3A","3D","3L","3K"],
  "ACDEFHJL":["3H","3J","3F","3C","3A","3D","3L","3E"],
  "ACDEFHJK":["3H","3J","3E","3C","3A","3F","3D","3K"],
  "ACDEFHIL":["3H","3E","3F","3C","3A","3D","3L","3I"],
  "ACDEFHIK":["3H","3E","3F","3C","3A","3D","3I","3K"],
  "ACDEFHIJ":["3H","3E","3J","3C","3A","3D","3F","3I"],
  "ACDEFGKL":["3C","3G","3E","3D","3A","3F","3L","3K"],
  "ACDEFGJL":["3C","3G","3J","3D","3A","3F","3L","3E"],
  "ACDEFGJK":["3C","3G","3J","3D","3A","3F","3E","3K"],
  "ACDEFGIL":["3C","3G","3E","3D","3A","3F","3L","3I"],
  "ACDEFGIK":["3C","3G","3E","3D","3A","3F","3I","3K"],
  "ACDEFGIJ":["3C","3G","3J","3D","3A","3F","3E","3I"],
  "ACDEFGHL":["3H","3G","3F","3C","3A","3D","3L","3E"],
  "ACDEFGHK":["3H","3G","3E","3C","3A","3F","3D","3K"],
  "ACDEFGHJ":["3H","3G","3J","3C","3A","3F","3D","3E"],
  "ACDEFGHI":["3H","3G","3E","3C","3A","3D","3F","3I"],
  "ABGHIJKL":["3H","3J","3I","3B","3A","3G","3L","3K"],
  "ABFHIJKL":["3H","3J","3I","3F","3A","3B","3L","3K"],
  "ABFGIJKL":["3I","3G","3J","3F","3A","3B","3L","3K"],
  "ABFGHJKL":["3H","3G","3J","3F","3A","3B","3L","3K"],
  "ABFGHIKL":["3H","3G","3I","3F","3A","3B","3L","3K"],
  "ABFGHIJL":["3H","3G","3J","3F","3A","3B","3L","3I"],
  "ABFGHIJK":["3H","3G","3J","3F","3A","3B","3I","3K"],
  "ABEHIJKL":["3E","3J","3I","3B","3A","3H","3L","3K"],
  "ABEGIJKL":["3E","3J","3I","3B","3A","3G","3L","3K"],
  "ABEGHJKL":["3E","3G","3J","3B","3A","3H","3L","3K"],
  "ABEGHIKL":["3E","3G","3I","3B","3A","3H","3L","3K"],
  "ABEGHIJL":["3E","3G","3J","3B","3A","3H","3L","3I"],
  "ABEGHIJK":["3E","3G","3J","3B","3A","3H","3I","3K"],
  "ABEFIJKL":["3E","3J","3I","3B","3A","3F","3L","3K"],
  "ABEFHJKL":["3H","3J","3E","3B","3A","3F","3L","3K"],
  "ABEFHIKL":["3H","3E","3I","3B","3A","3F","3L","3K"],
  "ABEFHIJL":["3H","3J","3E","3B","3A","3F","3L","3I"],
  "ABEFHIJK":["3H","3J","3E","3B","3A","3F","3I","3K"],
  "ABEFGJKL":["3E","3G","3J","3B","3A","3F","3L","3K"],
  "ABEFGIKL":["3E","3G","3I","3B","3A","3F","3L","3K"],
  "ABEFGIJL":["3E","3G","3J","3B","3A","3F","3L","3I"],
  "ABEFGIJK":["3E","3G","3J","3B","3A","3F","3I","3K"],
  "ABEFGHKL":["3H","3G","3E","3B","3A","3F","3L","3K"],
  "ABEFGHJL":["3H","3G","3J","3B","3A","3F","3L","3E"],
  "ABEFGHJK":["3H","3G","3J","3B","3A","3F","3E","3K"],
  "ABEFGHIL":["3H","3G","3E","3B","3A","3F","3L","3I"],
  "ABEFGHIK":["3H","3G","3E","3B","3A","3F","3I","3K"],
  "ABEFGHIJ":["3H","3G","3J","3B","3A","3F","3E","3I"],
  "ABDHIJKL":["3H","3J","3I","3D","3A","3B","3L","3K"],
  "ABDGIJKL":["3I","3G","3J","3D","3A","3B","3L","3K"],
  "ABDGHJKL":["3H","3G","3J","3D","3A","3B","3L","3K"],
  "ABDGHIKL":["3H","3G","3I","3D","3A","3B","3L","3K"],
  "ABDGHIJL":["3H","3G","3J","3D","3A","3B","3L","3I"],
  "ABDGHIJK":["3H","3G","3J","3D","3A","3B","3I","3K"],
  "ABDFIJKL":["3I","3J","3B","3D","3A","3F","3L","3K"],
  "ABDFHJKL":["3H","3J","3B","3D","3A","3F","3L","3K"],
  "ABDFHIKL":["3H","3I","3B","3D","3A","3F","3L","3K"],
  "ABDFHIJL":["3H","3J","3B","3D","3A","3F","3L","3I"],
  "ABDFHIJK":["3H","3J","3B","3D","3A","3F","3I","3K"],
  "ABDFGJKL":["3I","3G","3B","3D","3A","3F","3L","3K"],
  "ABDFGIKL":["3I","3G","3B","3D","3A","3F","3L","3K"],
  "ABDFGIJL":["3I","3G","3B","3D","3A","3F","3L","3J"],
  "ABDFGIJK":["3I","3G","3B","3D","3A","3F","3J","3K"],
  "ABDFGHKL":["3H","3G","3B","3D","3A","3F","3L","3K"],
  "ABDFGHJL":["3H","3G","3J","3D","3A","3F","3L","3B"],
  "ABDFGHJK":["3H","3G","3J","3D","3A","3F","3B","3K"],
  "ABDFGHIL":["3H","3G","3B","3D","3A","3F","3L","3I"],
  "ABDFGHIK":["3H","3G","3B","3D","3A","3F","3I","3K"],
  "ABDFGHIJ":["3H","3G","3J","3D","3A","3F","3B","3I"],
  "ABDEIJKL":["3E","3J","3I","3B","3A","3D","3L","3K"],
  "ABDEHJKL":["3H","3J","3E","3B","3A","3D","3L","3K"],
  "ABDEHIKL":["3H","3E","3I","3B","3A","3D","3L","3K"],
  "ABDEHIJL":["3H","3J","3E","3B","3A","3D","3L","3I"],
  "ABDEHIJK":["3H","3J","3E","3B","3A","3D","3I","3K"],
  "ABDEGJKL":["3E","3G","3J","3B","3A","3D","3L","3K"],
  "ABDEGIKL":["3E","3G","3I","3B","3A","3D","3L","3K"],
  "ABDEGIJL":["3E","3G","3J","3B","3A","3D","3L","3I"],
  "ABDEGIJK":["3E","3G","3J","3B","3A","3D","3I","3K"],
  "ABDEGHKL":["3H","3G","3E","3B","3A","3D","3L","3K"],
  "ABDEGHJL":["3H","3G","3J","3B","3A","3D","3L","3E"],
  "ABDEGHJK":["3H","3G","3J","3B","3A","3D","3E","3K"],
  "ABDEGHIL":["3H","3G","3E","3B","3A","3D","3L","3I"],
  "ABDEGHIK":["3H","3G","3E","3B","3A","3D","3I","3K"],
  "ABDEGHIJ":["3H","3G","3J","3B","3A","3D","3E","3I"],
  "ABDEFJKL":["3E","3J","3B","3D","3A","3F","3L","3K"],
  "ABDEFIKL":["3E","3I","3B","3D","3A","3F","3L","3K"],
  "ABDEFIJL":["3E","3J","3B","3D","3A","3F","3L","3I"],
  "ABDEFIJK":["3E","3J","3B","3D","3A","3F","3I","3K"],
  "ABDEFHKL":["3H","3E","3B","3D","3A","3F","3L","3K"],
  "ABDEFHJL":["3H","3J","3B","3D","3A","3F","3L","3E"],
  "ABDEFHJK":["3H","3J","3B","3D","3A","3F","3E","3K"],
  "ABDEFHIL":["3H","3E","3B","3D","3A","3F","3L","3I"],
  "ABDEFHIK":["3H","3E","3B","3D","3A","3F","3I","3K"],
  "ABDEFHIJ":["3H","3J","3B","3D","3A","3F","3E","3I"],
  "ABDEFGKL":["3E","3G","3B","3D","3A","3F","3L","3K"],
  "ABDEFGJL":["3E","3G","3J","3B","3A","3F","3L","3D"],
  "ABDEFGJK":["3E","3G","3J","3B","3A","3F","3D","3K"],
  "ABDEFGIL":["3E","3G","3B","3D","3A","3F","3L","3I"],
  "ABDEFGIK":["3E","3G","3B","3D","3A","3F","3I","3K"],
  "ABDEFGIJ":["3E","3G","3J","3B","3A","3F","3D","3I"],
  "ABDEFGHL":["3H","3G","3B","3D","3A","3F","3L","3E"],
  "ABDEFGHK":["3H","3G","3B","3D","3A","3F","3E","3K"],
  "ABDEFGHJ":["3H","3G","3J","3B","3A","3F","3D","3E"],
  "ABDEFGHI":["3H","3G","3B","3D","3A","3F","3E","3I"],
  "ABCHIJKL":["3H","3J","3I","3C","3A","3B","3L","3K"],
  "ABCGIJKL":["3I","3G","3J","3C","3A","3B","3L","3K"],
  "ABCGHJKL":["3H","3G","3J","3C","3A","3B","3L","3K"],
  "ABCGHIKL":["3H","3G","3I","3C","3A","3B","3L","3K"],
  "ABCGHIJL":["3H","3G","3J","3C","3A","3B","3L","3I"],
  "ABCGHIJK":["3H","3G","3J","3C","3A","3B","3I","3K"],
  "ABCFIJKL":["3C","3J","3I","3F","3A","3B","3L","3K"],
  "ABCFHJKL":["3H","3J","3C","3F","3A","3B","3L","3K"],
  "ABCFHIKL":["3H","3C","3I","3F","3A","3B","3L","3K"],
  "ABCFHIJL":["3H","3J","3C","3F","3A","3B","3L","3I"],
  "ABCFHIJK":["3H","3J","3C","3F","3A","3B","3I","3K"],
  "ABCFGJKL":["3C","3G","3J","3F","3A","3B","3L","3K"],
  "ABCFGIKL":["3C","3G","3I","3F","3A","3B","3L","3K"],
  "ABCFGIJL":["3C","3G","3J","3F","3A","3B","3L","3I"],
  "ABCFGIJK":["3C","3G","3J","3F","3A","3B","3I","3K"],
  "ABCFGHKL":["3H","3G","3C","3F","3A","3B","3L","3K"],
  "ABCFGHJL":["3H","3G","3J","3C","3A","3B","3L","3F"],
  "ABCFGHJK":["3H","3G","3J","3C","3A","3B","3F","3K"],
  "ABCFGHIL":["3H","3G","3C","3F","3A","3B","3L","3I"],
  "ABCFGHIK":["3H","3G","3C","3F","3A","3B","3I","3K"],
  "ABCFGHIJ":["3H","3G","3J","3C","3A","3B","3F","3I"],
  "ABCEIJKL":["3E","3J","3I","3C","3A","3B","3L","3K"],
  "ABCEHJKL":["3H","3J","3E","3C","3A","3B","3L","3K"],
  "ABCEHIKL":["3H","3E","3I","3C","3A","3B","3L","3K"],
  "ABCEHIJL":["3H","3J","3E","3C","3A","3B","3L","3I"],
  "ABCEHIJK":["3H","3J","3E","3C","3A","3B","3I","3K"],
  "ABCEGJKL":["3E","3G","3J","3C","3A","3B","3L","3K"],
  "ABCEGIKL":["3E","3G","3I","3C","3A","3B","3L","3K"],
  "ABCEGIJL":["3E","3G","3J","3C","3A","3B","3L","3I"],
  "ABCEGIJK":["3E","3G","3J","3C","3A","3B","3I","3K"],
  "ABCEGHKL":["3H","3G","3E","3C","3A","3B","3L","3K"],
  "ABCEGHJL":["3H","3G","3J","3C","3A","3B","3L","3E"],
  "ABCEGHJK":["3H","3G","3J","3C","3A","3B","3E","3K"],
  "ABCEGHIL":["3H","3G","3E","3C","3A","3B","3L","3I"],
  "ABCEGHIK":["3H","3G","3E","3C","3A","3B","3I","3K"],
  "ABCEGHIJ":["3H","3G","3J","3C","3A","3B","3E","3I"],
  "ABCEFJKL":["3C","3J","3E","3B","3A","3F","3L","3K"],
  "ABCEFIKL":["3C","3E","3I","3B","3A","3F","3L","3K"],
  "ABCEFIJL":["3C","3J","3E","3B","3A","3F","3L","3I"],
  "ABCEFIJK":["3C","3J","3E","3B","3A","3F","3I","3K"],
  "ABCEFHKL":["3H","3E","3C","3B","3A","3F","3L","3K"],
  "ABCEFHJL":["3H","3J","3C","3B","3A","3F","3L","3E"],
  "ABCEFHJK":["3H","3J","3E","3C","3A","3F","3B","3K"],
  "ABCEFHIL":["3H","3E","3C","3B","3A","3F","3L","3I"],
  "ABCEFHIK":["3H","3E","3C","3B","3A","3F","3I","3K"],
  "ABCEFHIJ":["3H","3J","3C","3B","3A","3F","3E","3I"],
  "ABCEFGKL":["3C","3G","3E","3B","3A","3F","3L","3K"],
  "ABCEFGJL":["3C","3G","3J","3B","3A","3F","3L","3E"],
  "ABCEFGJK":["3C","3G","3J","3B","3A","3F","3E","3K"],
  "ABCEFGIL":["3C","3G","3E","3B","3A","3F","3L","3I"],
  "ABCEFGIK":["3C","3G","3E","3B","3A","3F","3I","3K"],
  "ABCEFGIJ":["3C","3G","3J","3B","3A","3F","3E","3I"],
  "ABCEFGHL":["3H","3G","3C","3B","3A","3F","3L","3E"],
  "ABCEFGHK":["3H","3G","3C","3B","3A","3F","3E","3K"],
  "ABCEFGHJ":["3H","3G","3J","3C","3A","3F","3B","3E"],
  "ABCEFGHI":["3H","3G","3C","3B","3A","3F","3E","3I"],
  "ABCDIJKL":["3I","3J","3B","3C","3A","3D","3L","3K"],
  "ABCDHJKL":["3H","3J","3B","3C","3A","3D","3L","3K"],
  "ABCDHIKL":["3H","3I","3B","3C","3A","3D","3L","3K"],
  "ABCDHIJL":["3H","3J","3B","3C","3A","3D","3L","3I"],
  "ABCDHIJK":["3H","3J","3B","3C","3A","3D","3I","3K"],
  "ABCDGJKL":["3I","3G","3B","3C","3A","3D","3L","3K"],
  "ABCDGIKL":["3I","3G","3B","3C","3A","3D","3L","3K"],
  "ABCDGIJL":["3I","3G","3B","3C","3A","3D","3L","3J"],
  "ABCDGIJK":["3I","3G","3B","3C","3A","3D","3J","3K"],
  "ABCDGHKL":["3H","3G","3B","3C","3A","3D","3L","3K"],
  "ABCDGHJL":["3H","3G","3J","3C","3A","3D","3L","3B"],
  "ABCDGHJK":["3H","3G","3J","3C","3A","3D","3B","3K"],
  "ABCDGHIL":["3H","3G","3B","3C","3A","3D","3L","3I"],
  "ABCDGHIK":["3H","3G","3B","3C","3A","3D","3I","3K"],
  "ABCDGHIJ":["3H","3G","3J","3C","3A","3D","3B","3I"],
  "ABCDFJKL":["3C","3J","3B","3D","3A","3F","3L","3K"],
  "ABCDFIKL":["3C","3I","3B","3D","3A","3F","3L","3K"],
  "ABCDFIJL":["3C","3J","3B","3D","3A","3F","3L","3I"],
  "ABCDFIJK":["3C","3J","3B","3D","3A","3F","3I","3K"],
  "ABCDFHKL":["3C","3H","3B","3D","3A","3F","3L","3K"],
  "ABCDFHJL":["3C","3J","3B","3D","3A","3F","3L","3H"],
  "ABCDFHJK":["3H","3J","3B","3C","3A","3F","3D","3K"],
  "ABCDFHIL":["3C","3H","3B","3D","3A","3F","3L","3I"],
  "ABCDFHIK":["3C","3H","3B","3D","3A","3F","3I","3K"],
  "ABCDFHIJ":["3H","3J","3B","3C","3A","3F","3D","3I"],
  "ABCDFGKL":["3C","3G","3B","3D","3A","3F","3L","3K"],
  "ABCDFGJL":["3C","3G","3J","3D","3A","3F","3L","3B"],
  "ABCDFGJK":["3C","3G","3J","3D","3A","3F","3B","3K"],
  "ABCDFGIL":["3C","3G","3B","3D","3A","3F","3L","3I"],
  "ABCDFGIK":["3C","3G","3B","3D","3A","3F","3I","3K"],
  "ABCDFGIJ":["3C","3G","3J","3D","3A","3F","3B","3I"],
  "ABCDFGHL":["3H","3G","3B","3C","3A","3F","3L","3D"],
  "ABCDFGHK":["3H","3G","3B","3C","3A","3F","3D","3K"],
  "ABCDFGHJ":["3H","3G","3J","3C","3A","3F","3D","3B"],
  "ABCDFGHI":["3H","3G","3B","3C","3A","3F","3D","3I"],
  "ABCDEJKL":["3E","3J","3B","3C","3A","3D","3L","3K"],
  "ABCDEIKL":["3E","3I","3B","3C","3A","3D","3L","3K"],
  "ABCDEIJL":["3E","3J","3B","3C","3A","3D","3L","3I"],
  "ABCDEIJK":["3E","3J","3B","3C","3A","3D","3I","3K"],
  "ABCDEHKL":["3H","3E","3B","3C","3A","3D","3L","3K"],
  "ABCDEHJL":["3H","3J","3B","3C","3A","3D","3L","3E"],
  "ABCDEHJK":["3H","3J","3B","3C","3A","3D","3E","3K"],
  "ABCDEHIL":["3H","3E","3B","3C","3A","3D","3L","3I"],
  "ABCDEHIK":["3H","3E","3B","3C","3A","3D","3I","3K"],
  "ABCDEHIJ":["3H","3J","3B","3C","3A","3D","3E","3I"],
  "ABCDEGKL":["3E","3G","3B","3C","3A","3D","3L","3K"],
  "ABCDEGJL":["3E","3G","3J","3C","3A","3D","3L","3B"],
  "ABCDEGJK":["3E","3G","3J","3C","3A","3D","3B","3K"],
  "ABCDEGIL":["3E","3G","3B","3C","3A","3D","3L","3I"],
  "ABCDEGIK":["3E","3G","3B","3C","3A","3D","3I","3K"],
  "ABCDEGIJ":["3E","3G","3J","3C","3A","3D","3B","3I"],
  "ABCDEGHL":["3H","3G","3B","3C","3A","3D","3L","3E"],
  "ABCDEGHK":["3H","3G","3B","3C","3A","3D","3E","3K"],
  "ABCDEGHJ":["3H","3G","3J","3C","3A","3D","3B","3E"],
  "ABCDEGHI":["3H","3G","3B","3C","3A","3D","3E","3I"],
  "ABCDEFKL":["3C","3E","3B","3D","3A","3F","3L","3K"],
  "ABCDEFJL":["3C","3J","3B","3D","3A","3F","3L","3E"],
  "ABCDEFJK":["3C","3J","3B","3D","3A","3F","3E","3K"],
  "ABCDEFIL":["3C","3E","3B","3D","3A","3F","3L","3I"],
  "ABCDEFIK":["3C","3E","3B","3D","3A","3F","3I","3K"],
  "ABCDEFIJ":["3C","3J","3B","3D","3A","3F","3E","3I"],
  "ABCDEFHL":["3H","3E","3B","3C","3A","3F","3L","3D"],
  "ABCDEFHK":["3H","3E","3B","3C","3A","3F","3D","3K"],
  "ABCDEFHJ":["3H","3J","3B","3C","3A","3F","3D","3E"],
  "ABCDEFHI":["3H","3E","3B","3C","3A","3F","3D","3I"],
  "ABCDEFGL":["3C","3G","3B","3D","3A","3F","3L","3E"],
  "ABCDEFGK":["3C","3G","3B","3D","3A","3F","3E","3K"],
  "ABCDEFGJ":["3C","3G","3J","3D","3A","3F","3B","3E"],
  "ABCDEFGI":["3C","3G","3B","3D","3A","3F","3E","3I"],
  "ABCDEFGH":["3H","3G","3B","3C","3A","3F","3D","3E"]
};


// R16 progression from R32: which matches feed which R16 match
// M73+M74 winners → R16 match 89
// M75+M76 winners → R16 match 90
// M77+M78 winners → R16 match 91
// M79+M80 winners → R16 match 92
// M81+M82 winners → R16 match 93
// M83+M84 winners → R16 match 94
// M85+M86 winners → R16 match 95
// M87+M88 winners → R16 match 96
const R32_TO_R16 = [
  [0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]
];

const GOLDEN_BOOT_PLAYERS = [
  {name:"Kylian Mbappé",       nation:"France",       flag:"🇫🇷"},
  {name:"Erling Haaland",      nation:"Norway",       flag:"🇳🇴"},
  {name:"Vinicius Jr",         nation:"Brazil",       flag:"🇧🇷"},
  {name:"Harry Kane",          nation:"England",      flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Lionel Messi",        nation:"Argentina",    flag:"🇦🇷"},
  {name:"Cristiano Ronaldo",   nation:"Portugal",     flag:"🇵🇹"},
  {name:"Lautaro Martínez",    nation:"Argentina",    flag:"🇦🇷"},
  {name:"Bukayo Saka",         nation:"England",      flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Jude Bellingham",     nation:"England",      flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Phil Foden",          nation:"England",      flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Pedri",               nation:"Spain",        flag:"🇪🇸"},
  {name:"Florian Wirtz",       nation:"Germany",      flag:"🇩🇪"},
  {name:"Jamal Musiala",       nation:"Germany",      flag:"🇩🇪"},
  {name:"Federico Valverde",   nation:"Uruguay",      flag:"🇺🇾"},
  {name:"Rafael Leão",         nation:"Portugal",     flag:"🇵🇹"},
  {name:"Achraf Hakimi",       nation:"Morocco",      flag:"🇲🇦"},
  {name:"Sadio Mané",          nation:"Senegal",      flag:"🇸🇳"},
  {name:"Victor Osimhen",      nation:"Nigeria",      flag:"🇳🇬"},
  {name:"Christian Pulisic",   nation:"USA",          flag:"🇺🇸"},
  {name:"Antoine Griezmann",   nation:"France",       flag:"🇫🇷"},
  {name:"Son Heung-min",       nation:"South Korea",  flag:"🇰🇷"},
  {name:"Romelu Lukaku",       nation:"Belgium",      flag:"🇧🇪"},
  {name:"Robert Lewandowski",  nation:"Poland",       flag:"🇵🇱"},
  {name:"Darwin Núñez",        nation:"Uruguay",      flag:"🇺🇾"},
  {name:"Richarlison",         nation:"Brazil",       flag:"🇧🇷"},
  {name:"Gavi",                nation:"Spain",        flag:"🇪🇸"},
  {name:"Memphis Depay",       nation:"Netherlands",  flag:"🇳🇱"},
  {name:"Lorenzo Pellegrini",  nation:"Italy",        flag:"🇮🇹"},
  {name:"Giovanni Reyna",      nation:"USA",          flag:"🇺🇸"},
  {name:"Hakim Ziyech",        nation:"Morocco",      flag:"🇲🇦"},
];

const GOLDEN_GLOVE_PLAYERS = [
  {name:"Thibaut Courtois",    nation:"Belgium",     flag:"🇧🇪"},
  {name:"Alisson Becker",      nation:"Brazil",      flag:"🇧🇷"},
  {name:"Ederson",             nation:"Brazil",      flag:"🇧🇷"},
  {name:"Jordan Pickford",     nation:"England",     flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Gianluigi Donnarumma",nation:"Italy",       flag:"🇮🇹"},
  {name:"Hugo Lloris",         nation:"France",      flag:"🇫🇷"},
  {name:"Jan Oblak",           nation:"Slovenia",    flag:"🇸🇮"},
  {name:"Marc-André ter Stegen",nation:"Germany",    flag:"🇩🇪"},
  {name:"Manuel Neuer",        nation:"Germany",     flag:"🇩🇪"},
  {name:"Unai Simón",          nation:"Spain",       flag:"🇪🇸"},
  {name:"David Raya",          nation:"Spain",       flag:"🇪🇸"},
  {name:"Yann Sommer",         nation:"Switzerland", flag:"🇨🇭"},
  {name:"Yassine Bounou",      nation:"Morocco",     flag:"🇲🇦"},
  {name:"Édouard Mendy",       nation:"Senegal",     flag:"🇸🇳"},
  {name:"André Onana",         nation:"Cameroon",    flag:"🇨🇲"},
  {name:"Wojciech Szczęsny",   nation:"Poland",      flag:"🇵🇱"},
  {name:"Nick Pope",           nation:"England",     flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Gregor Kobel",        nation:"Switzerland", flag:"🇨🇭"},
  {name:"Emiliano Martínez",   nation:"Argentina",   flag:"🇦🇷"},
  {name:"Guglielmo Vicario",   nation:"Italy",       flag:"🇮🇹"},
];

const ROUND_INDICES = [[0,1],[2,3],[4,5]];

function rndGoals(strong) {
  const r=Math.random();
  if(r<0.15)return 0;if(r<0.40)return 1;if(r<0.65)return 2;
  if(r<0.82)return strong?3:2;if(r<0.93)return strong?4:3;
  return strong?5:3;
}

function simulateAllMatches() {
  const all={};
  Object.entries(GROUPS).forEach(([g,teams])=>{
    all[g]=[
      {home:teams[0],away:teams[1]},{home:teams[2],away:teams[3]},
      {home:teams[0],away:teams[2]},{home:teams[1],away:teams[3]},
      {home:teams[0],away:teams[3]},{home:teams[1],away:teams[2]},
    ].map(m=>({...m,
      homeScore:String(rndGoals(STRONG.has(m.home))),
      awayScore:String(rndGoals(STRONG.has(m.away))),
    }));
  });
  return all;
}

function generateGroupMatches(teams) {
  return [
    {home:teams[0],away:teams[1],homeScore:"",awayScore:""},
    {home:teams[2],away:teams[3],homeScore:"",awayScore:""},
    {home:teams[0],away:teams[2],homeScore:"",awayScore:""},
    {home:teams[1],away:teams[3],homeScore:"",awayScore:""},
    {home:teams[0],away:teams[3],homeScore:"",awayScore:""},
    {home:teams[1],away:teams[2],homeScore:"",awayScore:""},
  ];
}

function getGroupStandings(teams,matches) {
  const t={};
  teams.forEach(x=>t[x]={played:0,won:0,drawn:0,lost:0,gf:0,ga:0,pts:0});
  matches.forEach(m=>{
    if(m.homeScore===""||m.awayScore==="")return;
    const h=parseInt(m.homeScore),a=parseInt(m.awayScore);
    t[m.home].played++;t[m.away].played++;
    t[m.home].gf+=h;t[m.home].ga+=a;
    t[m.away].gf+=a;t[m.away].ga+=h;
    if(h>a){t[m.home].won++;t[m.home].pts+=3;t[m.away].lost++;}
    else if(h<a){t[m.away].won++;t[m.away].pts+=3;t[m.home].lost++;}
    else{t[m.home].drawn++;t[m.home].pts++;t[m.away].drawn++;t[m.away].pts++;}
  });
  return Object.entries(t)
    .map(([team,s])=>({team,...s,gd:s.gf-s.ga}))
    .sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);
}

// Derive the full R32 bracket from group standings using Annex C
function buildR32Bracket(allStandings) {
  // Get 1st, 2nd, 3rd from each group
  const pos={};
  Object.entries(allStandings).forEach(([g,standings])=>{
    pos[`1${g}`]=standings[0]?.team||"TBD";
    pos[`2${g}`]=standings[1]?.team||"TBD";
    pos[`3${g}`]={team:standings[2]?.team||"TBD",...standings[2]};
  });

  // Rank all 12 third-placed teams, pick best 8
  const allThirds=Object.keys(GROUPS).map(g=>({
    group:g,...(allStandings[g]?.[2]||{team:"TBD",pts:0,gd:0,gf:0})
  })).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);
  const best8=allThirds.slice(0,8);
  const best8Groups=best8.map(t=>t.group).sort().join("");

  // Look up Annex C for which 3rd goes where
  // Array format: [1A_opp, 1B_opp, 1D_opp, 1E_opp, 1G_opp, 1I_opp, 1K_opp, 1L_opp]
  const annexRow=ANNEX_C[best8Groups]||null;
  const ANNEX_IDX={"1A":0,"1B":1,"1D":2,"1E":3,"1G":4,"1I":5,"1K":6,"1L":7};

  // Build the 16 R32 matches
  return R32_FIXED.map(match=>{
    let home=match.home;
    let away=match.away;
    // Resolve group winner/runner-up positions to team names
    if(home.startsWith("1")||home.startsWith("2")) home=pos[home]||"TBD";
    if(away.startsWith("1")||away.startsWith("2")) away=pos[away]||"TBD";
    // Resolve 3rd place slots using Annex C
    if(home==="3?"||away==="3?") {
      if(annexRow) {
        // The match opponent is the group winner — find which slot this is
        const winnerKey=match.home.startsWith("1")?match.home:null;
        const idx=winnerKey?ANNEX_IDX[winnerKey]:null;
        const thirdCode=idx!=null?annexRow[idx]:null; // e.g. "3E"
        if(thirdCode) {
          const thirdGroup=thirdCode.slice(1); // e.g. "E"
          const thirdTeam=allStandings[thirdGroup]?.[2]?.team||"TBD";
          if(home==="3?") home=thirdTeam;
          if(away==="3?") away=thirdTeam;
        } else {
          if(home==="3?") home="TBD";
          if(away==="3?") away="TBD";
        }
      } else {
        if(home==="3?") home="TBD";
        if(away==="3?") away="TBD";
      }
    }
    return {matchId:match.id,home,away};
  });
}

function calcAdventurousness(groupMatches,allStandings) {
  let score=0,total=0;
  Object.entries(groupMatches).forEach(([g,matches])=>{
    matches.forEach(m=>{
      if(m.homeScore===""||m.awayScore==="")return;
      const h=parseInt(m.homeScore),a=parseInt(m.awayScore);
      total++;
      if(h+a>=5)score+=2;else if(h+a>=3)score+=1;
      if(SEEDED.has(m.away)&&!SEEDED.has(m.home)&&h>a)score+=3;
      if(SEEDED.has(m.home)&&!SEEDED.has(m.away)&&a>h)score+=3;
    });
    const w=allStandings[g]?.[0]?.team;
    if(w&&!SEEDED.has(w))score+=4;
  });
  if(total===0)return null;
  return Math.min(100,Math.round((score/(total*3+12*4))*100));
}
function adventLabel(pct) {
  if(pct===null)return{label:"Fill in picks to see your style",color:"#888",emoji:"",width:0};
  if(pct<20)return{label:"Cautious",color:C.blue,emoji:"🛡️",width:pct};
  if(pct<40)return{label:"Balanced",color:C.green,emoji:"⚖️",width:pct};
  if(pct<65)return{label:"Bold",color:C.gold,emoji:"🔥",width:pct};
  return{label:"Maverick",color:C.red,emoji:"🚀",width:pct};
}

const card={background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,overflow:"hidden"};
const inp={width:"100%",boxSizing:"border-box",padding:"10px 12px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,fontSize:14,background:"var(--color-background-primary)",color:"var(--color-text-primary)",outline:"none"};

function AdSlot(){return(<div style={{width:"100%",height:72,background:"var(--color-background-secondary)",border:"0.5px dashed var(--color-border-tertiary)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"1.5rem"}}><span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Advertisement — sponsor@mundialist.com</span></div>);}
function LockBanner(){return(<div style={{display:"flex",gap:10,padding:"11px 14px",background:C.goldLt,border:`0.5px solid ${C.gold}`,borderRadius:10,marginBottom:"1.25rem",fontSize:13,color:"#7a5c10",lineHeight:1.5}}><span>🔒</span><div><strong>All predictions lock at tournament kickoff — June 11, 2026.</strong> No changes after the first whistle.</div></div>);}

const NAV=[{label:"Home",page:"home"},{label:"Group Stage",page:"predict"},{label:"Bracket",page:"bracket"},{label:"Bonuses",page:"bonuses"},{label:"My League",page:"league"},{label:"Points",page:"points"}];

export default function App(){
  const [page,setPage]=useState("home");
  const [user,setUser]=useState(null);
  const [formName,setFormName]=useState("");
  const [formHandle,setFormHandle]=useState("");
  const [formEmail,setFormEmail]=useState("");
  const [emailError,setEmailError]=useState("");

  const [groupMatches,setGroupMatches]=useState(()=>simulateAllMatches());
  const [activeGroup,setActiveGroup]=useState("A");
  const [doubleDown,setDoubleDown]=useState({r1:null,r2:null,r3:null});
  const [goldenMatch,setGoldenMatch]=useState(null);
  const [goldenMatchLocked,setGoldenMatchLocked]=useState(false);
  const [goldenBootPick,setGoldenBootPick]=useState(null);
  const [goldenBootLocked,setGoldenBootLocked]=useState(false);
  const [bootSearch,setBootSearch]=useState("");
  const [topAssistPick,setTopAssistPick]=useState(null);
  const [topAssistLocked,setTopAssistLocked]=useState(false);
  const [assistSearch,setAssistSearch]=useState("");
  const [goldenGlovePick,setGoldenGlovePick]=useState(null);
  const [goldenGloveLocked,setGoldenGloveLocked]=useState(false);
  const [gloveSearch,setGloveSearch]=useState("");
  // Knockout picks per round: { r32:{0:"team",...}, r16:{...}, qf:{...}, sf:{...}, final:{...} }
  const [koPicks,setKoPicks]=useState({r32:{},r16:{},qf:{},sf:{},final:{}});
  const [leagueCode,setLeagueCode]=useState("");
  const [joinedLeagues,setJoinedLeagues]=useState([]);
  const [activeLeague,setActiveLeague]=useState(null);
  const [leagueTab,setLeagueTab]=useState("overview");
  const [createdCode]=useState("MND26-"+Math.random().toString(36).substring(2,7).toUpperCase());

  const allStandings=useMemo(()=>{
    const s={};
    Object.keys(GROUPS).forEach(g=>{s[g]=getGroupStandings(GROUPS[g],groupMatches[g]);});
    return s;
  },[groupMatches]);

  const r32Bracket=useMemo(()=>buildR32Bracket(allStandings),[allStandings]);

  // R16 matchups — derived from R32 picks
  const r16Matchups=useMemo(()=>{
    return R32_TO_R16.map(([i,j],idx)=>({
      id:idx,
      home:koPicks.r32[i]||"TBD",
      away:koPicks.r32[j]||"TBD",
    }));
  },[koPicks.r32]);

  // QF from R16
  const qfMatchups=useMemo(()=>[
    {id:0,home:koPicks.r16[0]||"TBD",away:koPicks.r16[1]||"TBD"},
    {id:1,home:koPicks.r16[2]||"TBD",away:koPicks.r16[3]||"TBD"},
    {id:2,home:koPicks.r16[4]||"TBD",away:koPicks.r16[5]||"TBD"},
    {id:3,home:koPicks.r16[6]||"TBD",away:koPicks.r16[7]||"TBD"},
  ],[koPicks.r16]);

  // SF from QF
  const sfMatchups=useMemo(()=>[
    {id:0,home:koPicks.qf[0]||"TBD",away:koPicks.qf[1]||"TBD"},
    {id:1,home:koPicks.qf[2]||"TBD",away:koPicks.qf[3]||"TBD"},
  ],[koPicks.qf]);

  const finalMatchup=useMemo(()=>({
    home:koPicks.sf[0]||"TBD",away:koPicks.sf[1]||"TBD"
  }),[koPicks.sf]);

  const champion=koPicks.final[0]||"TBD";

  const pickKO=(round,id,team)=>{
    setKoPicks(prev=>{
      const updated={...prev,[round]:{...prev[round],[id]:team}};
      // Clear downstream
      if(round==="r32"){updated.r16={};updated.qf={};updated.sf={};updated.final={};}
      if(round==="r16"){updated.qf={};updated.sf={};updated.final={};}
      if(round==="qf"){updated.sf={};updated.final={};}
      if(round==="sf"){updated.final={};}
      return updated;
    });
  };

  const totalPredicted=Object.values(groupMatches).flat().filter(m=>m.homeScore!==""&&m.awayScore!=="").length;
  const doublesSelected=Object.values(doubleDown).filter(Boolean).length;
  const r32Picked=Object.keys(koPicks.r32).length;
  const koPicked=r32Picked+Object.keys(koPicks.r16).length+Object.keys(koPicks.qf).length+Object.keys(koPicks.sf).length+Object.keys(koPicks.final).length;
  const adventScore=useMemo(()=>calcAdventurousness(groupMatches,allStandings),[groupMatches,allStandings]);
  const adventInfo=adventLabel(adventScore);

  const updateScore=(group,idx,side,val)=>{
    if(val!==""&&(isNaN(val)||parseInt(val)<0||parseInt(val)>99))return;
    setGroupMatches(prev=>{const u=[...prev[group]];u[idx]={...u[idx],[side]:val};return{...prev,[group]:u};});
  };
  const setDouble=(roundKey,groupKey,matchIdx)=>{
    const id=`${groupKey}-${matchIdx}`;
    setDoubleDown(prev=>({...prev,[roundKey]:prev[roundKey]===id?null:id}));
  };
  const simulateAll=()=>{setGroupMatches(simulateAllMatches());setKoPicks({r32:{},r16:{},qf:{},sf:{},final:{}});};
  const clearAll=()=>{
    const all={};Object.entries(GROUPS).forEach(([g,teams])=>{all[g]=generateGroupMatches(teams);});
    setGroupMatches(all);setDoubleDown({r1:null,r2:null,r3:null});setKoPicks({r32:{},r16:{},qf:{},sf:{},final:{}});
  };
  const validateEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const handleCreate=()=>{
    if(!formName.trim()||!formHandle.trim())return;
    if(!validateEmail(formEmail)){setEmailError("Please enter a valid email");return;}
    setEmailError("");
    setUser({name:formName,handle:"@"+formHandle.replace("@",""),email:formEmail,avatar:formName[0].toUpperCase()});
    setJoinedLeagues([{id:"global",name:"Global League",members:10420,rank:4821,code:null}]);
    setPage("predict");
  };
  const filteredPlayers=bootSearch.length>1?GOLDEN_BOOT_PLAYERS.filter(p=>p.name.toLowerCase().includes(bootSearch.toLowerCase())||p.nation.toLowerCase().includes(bootSearch.toLowerCase())):[];
  const filteredAssist=assistSearch.length>1?GOLDEN_BOOT_PLAYERS.filter(p=>p.name.toLowerCase().includes(assistSearch.toLowerCase())||p.nation.toLowerCase().includes(assistSearch.toLowerCase())):[];
  const filteredGlove=gloveSearch.length>1?GOLDEN_GLOVE_PLAYERS.filter(p=>p.name.toLowerCase().includes(gloveSearch.toLowerCase())||p.nation.toLowerCase().includes(gloveSearch.toLowerCase())):[];

  const leagueMembers=[
    {name:user?.name||"You",handle:user?.handle||"@you",pts:142,avatar:user?.avatar||"Y"},
    {name:"Alex Chen",handle:"@alexc",pts:138,avatar:"A"},
    {name:"Sara Kim",handle:"@sarakim",pts:125,avatar:"S"},
    {name:"Tom Walsh",handle:"@tomw",pts:119,avatar:"T"},
    {name:"Priya Nair",handle:"@priya",pts:108,avatar:"P"},
  ];

  // ── Match pick card for bracket ──
  function MatchCard({home,away,picked,onPick,roundLabel,matchLabel,slim=false}){
    const isDark=t=>t!=="TBD"&&!SEEDED.has(t);
    const canPick=home!=="TBD"||away!=="TBD";
    return(
      <div style={{background:"var(--color-background-primary)",border:`1.5px solid ${picked?"#2A398D":"var(--color-border-tertiary)"}`,borderRadius:9,overflow:"hidden",marginBottom:slim?4:6,transition:"border-color 0.15s"}}>
        {matchLabel&&<div style={{padding:"3px 8px",background:picked?C.blueLt:"var(--color-background-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:10,color:picked?C.blue:"var(--color-text-tertiary)",fontWeight:500,letterSpacing:"0.03em",display:"flex",justifyContent:"space-between"}}>
          <span>{matchLabel}</span>{picked&&<span style={{color:C.blue}}>✓ {picked}</span>}
        </div>}
        {[{team:home},{team:away}].map(({team},ti)=>(
          <div key={ti}
            onClick={()=>canPick&&team!=="TBD"&&onPick&&onPick(team)}
            style={{padding:slim?"6px 8px":"8px 10px",display:"flex",alignItems:"center",gap:6,
              cursor:(canPick&&team!=="TBD"&&onPick)?"pointer":"default",
              background:picked===team?C.blueLt:"transparent",
              borderBottom:ti===0?"0.5px solid var(--color-border-tertiary)":"none",
              transition:"background 0.12s"}}>
            <span style={{fontSize:slim?14:16}}>{FLAGS[team]||"❓"}</span>
            <span style={{flex:1,fontSize:slim?11:12,fontWeight:picked===team?600:400,
              color:picked===team?C.blue:"var(--color-text-primary)",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team}</span>
            {isDark(team)&&<span style={{fontSize:9,color:"#c026d3",flexShrink:0}}>★</span>}
            {picked===team&&<span style={{fontSize:10,color:C.blue,fontWeight:700,flexShrink:0}}>✓</span>}
          </div>
        ))}
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:"var(--color-background-tertiary)",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* ── Nav ── */}
      {user&&(
        <nav style={{background:"var(--color-background-primary)",borderBottom:"0.5px solid var(--color-border-tertiary)",position:"sticky",top:0,zIndex:100}}>
          <div style={{maxWidth:1280,margin:"0 auto",padding:"0 1.5rem",display:"flex",alignItems:"center",gap:"1rem",height:56}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginRight:"auto",cursor:"pointer"}} onClick={()=>setPage("home")}>
              <span style={{fontSize:18,fontWeight:600,letterSpacing:"-0.03em",color:C.blue}}>Mundial26</span>
              <span style={{fontSize:11,fontWeight:500,background:C.blue,color:"#fff",padding:"2px 7px",borderRadius:99}}>Predictor</span>
            </div>
            {NAV.map(({label,page:p})=>(
              <button key={p} onClick={()=>setPage(p)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,
                fontWeight:page===p?500:400,color:page===p?"var(--color-text-primary)":"var(--color-text-secondary)",
                borderBottom:page===p?`2px solid ${C.blue}`:"2px solid transparent",
                padding:"0 2px",paddingBottom:18,paddingTop:18,whiteSpace:"nowrap"}}>
                {label}
              </button>
            ))}
            <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:4,flexShrink:0}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:"#fff"}}>{user.avatar}</div>
              <div>
                <div style={{fontSize:12,color:"var(--color-text-primary)",fontWeight:500}}>{user.handle}</div>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)",fontFamily:"monospace"}}>{totalPredicted}/72 · {koPicked}/31 KO</div>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* ══ HOME ══ */}
      {page==="home"&&(
        <div style={{maxWidth:540,margin:"0 auto",padding:"4rem 2rem 3rem"}}>
          <div style={{marginBottom:"2.5rem"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.blueLt,padding:"4px 12px",borderRadius:99,marginBottom:"1.25rem"}}>
              <span style={{fontSize:12,fontWeight:500,color:C.blue,fontFamily:"monospace"}}>FIFA World Cup 2026 · Kicks off June 11</span>
            </div>
            <h1 style={{fontSize:34,fontWeight:600,letterSpacing:"-0.04em",lineHeight:1.2,color:"var(--color-text-primary)",margin:"0 0 2rem"}}>
              The World Cup predictor<br/>that rewards knowing<br/>your football.
            </h1>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:"2rem"}}>
              {[
                {emoji:"⏰",title:"Picks lock June 11",sub:"Submit before the first whistle — no changes after kickoff"},
                {emoji:"🏆",title:"Mini leagues + global ranking",sub:"Private leagues with friends, plus a worldwide leaderboard"},
                {emoji:"🌟",title:"Dark horse & golden match bonuses",sub:"Brave picks earn more — bold predictions are rewarded"},
                {emoji:"📧",title:"Daily match digest",sub:"Your league's picks land in your inbox every match day"},
              ].map(({emoji,title,sub})=>(
                <div key={title} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12}}>
                  <span style={{fontSize:26,flexShrink:0}}>{emoji}</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:2}}>{title}</div>
                    <div style={{fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.5}}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {!user?(
            <div style={{...card,padding:"1.75rem",overflow:"visible"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.25rem"}}>
                <h2 style={{fontSize:16,fontWeight:500,margin:0,color:"var(--color-text-primary)"}}>Create your free profile</h2>
                <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>2 minutes</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:11}}>
                <div><label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Full name</label><input value={formName} onChange={e=>setFormName(e.target.value)} placeholder="Jamie Vardy" style={inp}/></div>
                <div><label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Username</label><div style={{position:"relative"}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--color-text-secondary)",fontSize:14}}>@</span><input value={formHandle} onChange={e=>setFormHandle(e.target.value)} placeholder="jamievardy" style={{...inp,paddingLeft:26}}/></div></div>
                <div>
                  <label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Email <span style={{color:"var(--color-text-tertiary)"}}>— daily digest & league updates</span></label>
                  <input value={formEmail} onChange={e=>{setFormEmail(e.target.value);setEmailError("");}} placeholder="jamie@example.com" type="email" style={{...inp,borderColor:emailError?C.red:undefined}}/>
                  {emailError&&<p style={{fontSize:12,color:C.red,margin:"4px 0 0"}}>{emailError}</p>}
                </div>
                <button onClick={handleCreate} style={{marginTop:4,padding:"12px",background:C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer"}}>Start predicting — free →</button>
                <p style={{fontSize:11,color:"var(--color-text-tertiary)",margin:0,textAlign:"center"}}>No spam. No credit card. Just football.</p>
              </div>
            </div>
          ):(
            <div style={{background:C.greenLt,border:`0.5px solid ${C.green}`,borderRadius:12,padding:"1rem 1.25rem",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600}}>{user.avatar}</div>
              <div><div style={{fontWeight:500,fontSize:14,color:"#166534"}}>Welcome back, {user.name}</div><div style={{fontSize:12,color:C.green}}>{totalPredicted}/72 group picks · {koPicked}/31 knockout picks</div></div>
              <button onClick={()=>setPage("predict")} style={{marginLeft:"auto",padding:"8px 16px",background:C.green,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"}}>Continue →</button>
            </div>
          )}
          <div style={{marginTop:"1.25rem",padding:"1rem 1.25rem",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,display:"flex",alignItems:"center",gap:12}}>
            <div style={{display:"flex"}}>{[C.blue,C.red,C.green,C.gold,C.purple].map((bg,i)=><div key={i} style={{width:28,height:28,borderRadius:"50%",background:bg,border:"2px solid var(--color-background-primary)",marginLeft:i>0?-8:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"#fff"}}>{"ABCDE"[i]}</div>)}</div>
            <span style={{fontSize:13,color:"var(--color-text-secondary)"}}><strong style={{color:"var(--color-text-primary)"}}>1,204 players</strong> have already locked their picks</span>
          </div>
        </div>
      )}

      {/* ══ GROUP STAGE ══ */}
      {page==="predict"&&(
        <div style={{maxWidth:800,margin:"0 auto",padding:"2rem"}}>
          <AdSlot/>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:"1.25rem",flexWrap:"wrap"}}>
            <div>
              <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.03em",margin:"0 0 4px",color:"var(--color-text-primary)"}}>Group Stage</h1>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:0}}>Predict scores for all 72 matches. Locks June 11, 2026.</p>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,padding:"8px 14px",textAlign:"center",minWidth:60}}>
                <div style={{fontSize:20,fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace",lineHeight:1}}>{totalPredicted}<span style={{fontSize:11,color:"var(--color-text-tertiary)",fontWeight:400}}>/72</span></div>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>picks</div>
              </div>
              <div style={{background:"var(--color-background-primary)",border:`0.5px solid ${doublesSelected===3?C.green:"var(--color-border-tertiary)"}`,borderRadius:10,padding:"8px 14px",textAlign:"center",minWidth:60}}>
                <div style={{fontSize:20,fontWeight:600,color:doublesSelected===3?C.green:"var(--color-text-primary)",fontFamily:"monospace",lineHeight:1}}>{doublesSelected}<span style={{fontSize:11,color:"var(--color-text-tertiary)",fontWeight:400}}>/3</span></div>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>doubles</div>
              </div>
              <button onClick={simulateAll} style={{padding:"8px 14px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-primary)",fontSize:12,color:"var(--color-text-secondary)",cursor:"pointer"}}>Simulate ↻</button>
              <button onClick={clearAll} style={{padding:"8px 14px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-primary)",fontSize:12,color:"var(--color-text-secondary)",cursor:"pointer"}}>Clear</button>
            </div>
          </div>

          {/* Adventurousness */}
          <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,padding:"12px 14px",marginBottom:"1.25rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Prediction style</span>
                {adventScore!==null&&<span style={{fontSize:12,fontWeight:500,color:adventInfo.color,background:adventInfo.color+"18",padding:"2px 9px",borderRadius:99}}>{adventInfo.emoji} {adventInfo.label}</span>}
              </div>
              {adventScore!==null&&<span style={{fontSize:12,color:"var(--color-text-tertiary)",fontFamily:"monospace"}}>{adventScore}/100</span>}
            </div>
            <div style={{height:6,background:"var(--color-background-secondary)",borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${adventInfo.width||0}%`,background:adventInfo.color,borderRadius:99,transition:"width 0.3s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
              {["🛡️ Cautious","⚖️ Balanced","🔥 Bold","🚀 Maverick"].map(l=><span key={l} style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{l}</span>)}
            </div>
          </div>

          {/* Group tabs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,marginBottom:"1.25rem"}}>
            {Object.keys(GROUPS).map(g=>{
              const done=groupMatches[g].filter(m=>m.homeScore!==""&&m.awayScore!=="").length;
              const complete=done===6,active=activeGroup===g;
              return(<button key={g} onClick={()=>setActiveGroup(g)} style={{padding:"9px 4px",borderRadius:8,cursor:"pointer",border:`0.5px solid ${active?C.blue:complete?C.green:"var(--color-border-tertiary)"}`,background:active?C.blueLt:complete?C.greenLt:"var(--color-background-primary)",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <span style={{fontSize:13,fontWeight:500,color:active?C.blue:complete?C.green:"var(--color-text-primary)"}}>Group {g}</span>
                <span style={{fontSize:10,color:complete?C.green:"var(--color-text-tertiary)",fontFamily:"monospace"}}>{done}/6{complete?" ✓":""}</span>
              </button>);
            })}
          </div>

          {/* Matches */}
          <div style={card}>
            <div style={{padding:"12px 18px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>Group {activeGroup}</span>
              <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{GROUPS[activeGroup].join(" · ")}</span>
            </div>
            {ROUND_INDICES.map((indices,ri)=>{
              const roundKey=["r1","r2","r3"][ri];
              const currentDouble=doubleDown[roundKey];
              const roundHasDouble=currentDouble!==null;
              return(<div key={ri}>
                <div style={{padding:"8px 18px",background:"var(--color-background-secondary)",borderTop:ri>0?"0.5px solid var(--color-border-tertiary)":undefined,borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>Matchday {ri+1}</span>
                  <span style={{fontSize:12,color:currentDouble?C.gold:"var(--color-text-tertiary)",fontWeight:currentDouble?500:400}}>
                    {currentDouble?"⚡ Double active":"Tap ×2 to double your points for a match"}
                  </span>
                </div>
                {indices.map(idx=>{
                  const match=groupMatches[activeGroup][idx];
                  const done=match.homeScore!==""&&match.awayScore!=="";
                  const isSeeded=SEEDED.has(match.home)||SEEDED.has(match.away);
                  const doubleId=`${activeGroup}-${idx}`;
                  const isMyDouble=currentDouble===doubleId;
                  const canDouble=!isSeeded&&(!roundHasDouble||isMyDouble);
                  return(
                    <div key={idx} style={{padding:"14px 18px",borderBottom:"0.5px solid var(--color-border-tertiary)",background:isMyDouble?C.goldLt:done?"#f8faff":"transparent",display:"flex",alignItems:"center",gap:14}}>
                      <div style={{flex:1,display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
                        <span style={{fontSize:15,color:"var(--color-text-primary)",fontWeight:500}}>{match.home}</span>
                        <span style={{fontSize:22}}>{FLAGS[match.home]||"❓"}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                        <input type="number" min="0" max="99" value={match.homeScore} onChange={e=>updateScore(activeGroup,idx,"homeScore",e.target.value)} style={{width:52,textAlign:"center",padding:"10px 0",border:`0.5px solid ${isMyDouble?C.gold:"var(--color-border-tertiary)"}`,borderRadius:8,fontSize:20,fontWeight:600,background:"var(--color-background-secondary)",color:"var(--color-text-primary)",outline:"none",fontFamily:"monospace"}}/>
                        <span style={{fontSize:14,color:"var(--color-text-tertiary)"}}>–</span>
                        <input type="number" min="0" max="99" value={match.awayScore} onChange={e=>updateScore(activeGroup,idx,"awayScore",e.target.value)} style={{width:52,textAlign:"center",padding:"10px 0",border:`0.5px solid ${isMyDouble?C.gold:"var(--color-border-tertiary)"}`,borderRadius:8,fontSize:20,fontWeight:600,background:"var(--color-background-secondary)",color:"var(--color-text-primary)",outline:"none",fontFamily:"monospace"}}/>
                      </div>
                      <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:22}}>{FLAGS[match.away]||"❓"}</span>
                        <span style={{fontSize:15,color:"var(--color-text-primary)",fontWeight:500}}>{match.away}</span>
                      </div>
                      {!isSeeded?(<button onClick={()=>canDouble&&setDouble(roundKey,activeGroup,idx)} title={isMyDouble?"Remove double":roundHasDouble?"Used this matchday":"Double your points"} style={{padding:"6px 11px",borderRadius:7,fontSize:12,fontWeight:isMyDouble?600:400,cursor:canDouble?"pointer":"not-allowed",border:`0.5px solid ${isMyDouble?C.gold:"var(--color-border-tertiary)"}`,background:isMyDouble?C.goldLt:"transparent",color:isMyDouble?C.gold:!canDouble?"var(--color-text-tertiary)":"var(--color-text-secondary)",opacity:!canDouble&&!isMyDouble?0.3:1,flexShrink:0}}>{isMyDouble?"⚡ ×2":"×2"}</button>)
                      :(<span style={{padding:"6px 11px",fontSize:12,color:"var(--color-text-tertiary)",opacity:0.2,flexShrink:0}} title="Seeded — not eligible">×2</span>)}
                    </div>
                  );
                })}
              </div>);
            })}
            {/* Standings */}
            <div style={{borderTop:"0.5px solid var(--color-border-tertiary)"}}>
              <div style={{padding:"8px 18px",background:"var(--color-background-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}><span style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>Predicted standing</span></div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"var(--color-background-secondary)"}}>{["#","Team","P","W","D","L","GD","Pts"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:h==="Team"?"left":"center",color:"var(--color-text-secondary)",fontWeight:500,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {allStandings[activeGroup].map((row,i)=>(
                    <tr key={row.team} style={{borderBottom:i<3?"0.5px solid var(--color-border-tertiary)":"none",background:i<2?C.blueLt:"transparent"}}>
                      <td style={{padding:"9px 12px",textAlign:"center",color:i<2?C.blue:"var(--color-text-tertiary)",fontWeight:i<2?500:400}}>{i+1}</td>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:18}}>{FLAGS[row.team]||"❓"}</span>
                          <span style={{color:"var(--color-text-primary)",fontSize:14}}>{row.team}</span>
                          {SEEDED.has(row.team)&&<span style={{fontSize:9,background:C.goldLt,color:"#7a5c10",padding:"1px 6px",borderRadius:99}}>Seeded</span>}
                          {!SEEDED.has(row.team)&&i<2&&<span style={{fontSize:9,background:"#fdf2f8",color:"#9d174d",padding:"1px 6px",borderRadius:99}}>★ dark horse</span>}
                        </div>
                      </td>
                      {[row.played,row.won,row.drawn,row.lost,row.gd>0?"+"+row.gd:row.gd].map((v,j)=><td key={j} style={{padding:"9px 12px",textAlign:"center",color:"var(--color-text-secondary)",fontFamily:"monospace"}}>{v}</td>)}
                      <td style={{padding:"9px 12px",textAlign:"center",fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace"}}>{row.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ BRACKET ══ */}
      {page==="bracket"&&(
        <div style={{maxWidth:1300,margin:"0 auto",padding:"2rem",overflowX:"auto"}}>
          <div style={{marginBottom:"1.25rem",display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div>
              <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.03em",margin:"0 0 4px",color:"var(--color-text-primary)"}}>Knockout Bracket</h1>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 6px"}}>
                R32 pairings are built from your group picks using <strong>FIFA's official Annex C table</strong>. Tap a team in each match to pick the winner — your pick cascades to the next round automatically.
              </p>
              <div style={{display:"flex",gap:10,fontSize:11,flexWrap:"wrap"}}>
                <span style={{color:C.blue}}>🔵 Tap to pick winner</span>
                <span style={{color:"#c026d3"}}>★ dark horse (non-seeded)</span>
                <span style={{color:C.gold,fontFamily:"monospace"}}>{koPicked}/31 knockout picks</span>
              </div>
            </div>
            <button onClick={()=>setPage("predict")} style={{padding:"8px 14px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-primary)",fontSize:12,color:"var(--color-text-secondary)",cursor:"pointer",flexShrink:0}}>← Group stage</button>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1.4fr 1.2fr 1fr 0.85fr 0.7fr",gap:12,alignItems:"start",minWidth:900}}>

            {/* R32 — interactive, picks cascade to R16 */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:C.blue,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                Round of 32
                <span style={{fontSize:9,background:C.blueLt,color:C.blue,padding:"2px 6px",borderRadius:99,fontWeight:500,textTransform:"none",letterSpacing:0}}>{r32Picked}/16</span>
              </div>
              {r32Bracket.map((match,i)=>(
                <MatchCard key={i}
                  home={match.home} away={match.away}
                  picked={koPicks.r32[i]}
                  onPick={team=>pickKO("r32",i,team)}
                  matchLabel={`M${match.matchId}`}
                  slim={true}
                />
              ))}
            </div>

            {/* R16 */}
            <div style={{paddingTop:"0.8rem"}}>
              <div style={{fontSize:10,fontWeight:600,color:C.blue,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,textAlign:"center"}}> Round of 16 <span style={{fontSize:9,background:C.blueLt,color:C.blue,padding:"2px 6px",borderRadius:99,fontWeight:500}}>{Object.keys(koPicks.r16).length}/8</span></div>
              {r16Matchups.map((m,i)=>(
                <div key={i} style={{marginBottom:"0.5rem"}}>
                  <MatchCard home={m.home} away={m.away} picked={koPicks.r16[i]} onPick={team=>pickKO("r16",i,team)} matchLabel={`R16 M${i+1}`} dimmed={m.home==="TBD"&&m.away==="TBD"}/>
                </div>
              ))}
            </div>

            {/* QF */}
            <div style={{paddingTop:"3.5rem"}}>
              <div style={{fontSize:10,fontWeight:600,color:C.blue,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,textAlign:"center"}}>Quarter-finals <span style={{fontSize:9,background:C.blueLt,color:C.blue,padding:"2px 6px",borderRadius:99,fontWeight:500}}>{Object.keys(koPicks.qf).length}/4</span></div>
              {qfMatchups.map((m,i)=>(
                <div key={i} style={{marginBottom:"1.25rem"}}>
                  <MatchCard home={m.home} away={m.away} picked={koPicks.qf[i]} onPick={team=>pickKO("qf",i,team)} matchLabel={`QF ${i+1}`}/>
                </div>
              ))}
            </div>

            {/* SF */}
            <div style={{paddingTop:"8rem"}}>
              <div style={{fontSize:10,fontWeight:600,color:C.blue,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,textAlign:"center"}}>Semi-finals <span style={{fontSize:9,background:C.blueLt,color:C.blue,padding:"2px 6px",borderRadius:99,fontWeight:500}}>{Object.keys(koPicks.sf).length}/2</span></div>
              {sfMatchups.map((m,i)=>(
                <div key={i} style={{marginBottom:"3rem"}}>
                  <MatchCard home={m.home} away={m.away} picked={koPicks.sf[i]} onPick={team=>pickKO("sf",i,team)} matchLabel={`SF ${i+1}`}/>
                </div>
              ))}
            </div>

            {/* Final + Champion */}
            <div style={{paddingTop:"18rem"}}>
              <div style={{fontSize:10,fontWeight:600,color:C.gold,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,textAlign:"center"}}>Final</div>
              <MatchCard home={finalMatchup.home} away={finalMatchup.away} picked={koPicks.final[0]} onPick={team=>pickKO("final",0,team)} matchLabel="Final"/>
              {champion!=="TBD"&&(
                <div style={{marginTop:12,padding:"14px",background:C.goldLt,border:`0.5px solid ${C.gold}`,borderRadius:10,textAlign:"center"}}>
                  <div style={{fontSize:22,marginBottom:4}}>🏆</div>
                  <div style={{fontSize:11,color:"#7a5c10",marginBottom:6}}>Your champion</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <span style={{fontSize:24}}>{FLAGS[champion]||"❓"}</span>
                    <span style={{fontSize:15,fontWeight:600,color:"#7a5c10"}}>{champion}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{marginTop:"1.5rem",padding:"10px 14px",background:C.blueLt,border:`0.5px solid ${C.blue}44`,borderRadius:8,fontSize:12,color:"#4a5568",lineHeight:1.6}}>
            <strong style={{color:C.blue}}>How R32 pairings work:</strong> The 12 group winners and runners-up are paired using FIFA's fixed bracket structure. The 8 best third-placed teams are slotted into specific matches using FIFA's official Annex C lookup table — the same logic used in the real tournament. ★ dark horse bonus: QF +3 / SF +5 / Final +8 pts, on top of normal knockout points.
          </div>
        </div>
      )}

      {/* ══ BONUSES ══ */}
      {page==="bonuses"&&(
        <div style={{maxWidth:660,margin:"0 auto",padding:"2rem"}}>
          <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.03em",margin:"0 0 4px",color:"var(--color-text-primary)"}}>Bonus Picks</h1>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1.25rem"}}>All bonuses can be changed up until June 11, 2026.</p>
          <LockBanner/>

          {/* Double-down */}
          <div style={{...card,marginBottom:"1rem",borderLeft:`3px solid ${C.gold}`,borderRadius:"0 12px 12px 0"}}>
            <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Double-down picks</span>
              <span style={{fontSize:11,fontWeight:500,color:doublesSelected===3?C.green:C.gold}}>{doublesSelected}/3 selected{doublesSelected===3?" ✓":""}</span>
            </div>
            <div style={{padding:"1rem 16px"}}>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1rem",lineHeight:1.6}}>Pick one match per matchday — 3 total — where your points are doubled. Cannot involve a seeded team.</p>
              {["r1","r2","r3"].map((rk,ri)=>{
                const val=doubleDown[rk];
                const eligibleMatches=[];
                Object.entries(GROUPS).forEach(([g])=>{
                  ROUND_INDICES[ri].forEach(idx=>{
                    const m=groupMatches[g][idx];
                    if(!SEEDED.has(m.home)&&!SEEDED.has(m.away)){
                      eligibleMatches.push({g,idx,home:m.home,away:m.away,homeScore:m.homeScore,awayScore:m.awayScore});
                    }
                  });
                });
                return(<div key={rk} style={{marginBottom:"1.25rem"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.04em"}}>Matchday {ri+1}</span>
                    {val&&<span style={{fontSize:11,color:C.gold,fontWeight:500}}>⚡ Double selected</span>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:220,overflowY:"auto"}}>
                    {eligibleMatches.slice(0,8).map(m=>{
                      const matchId=`${m.g}-${m.idx}`;
                      const selected=val===matchId;
                      const otherSelected=val&&val!==matchId;
                      return(<button key={matchId} onClick={()=>setDouble(rk,m.g,m.idx)} disabled={!!otherSelected}
                        style={{padding:"9px 12px",border:`0.5px solid ${selected?C.gold:"var(--color-border-tertiary)"}`,borderRadius:8,background:selected?C.goldLt:"var(--color-background-secondary)",cursor:otherSelected?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:10,opacity:otherSelected?0.4:1,textAlign:"left"}}>
                        <span style={{fontSize:16}}>{FLAGS[m.home]||"❓"}</span>
                        <span style={{fontSize:13,color:"var(--color-text-primary)",flex:1,fontWeight:500}}>{m.home}</span>
                        {m.homeScore&&m.awayScore?<span style={{fontSize:12,fontFamily:"monospace",color:"var(--color-text-secondary)"}}>{m.homeScore}–{m.awayScore}</span>:null}
                        <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>vs</span>
                        <span style={{fontSize:13,color:"var(--color-text-primary)",flex:1,textAlign:"right",fontWeight:500}}>{m.away}</span>
                        <span style={{fontSize:16}}>{FLAGS[m.away]||"❓"}</span>
                        {selected&&<span style={{fontSize:12,fontWeight:600,color:C.gold,flexShrink:0}}>×2 ⚡</span>}
                      </button>);
                    })}
                  </div>
                </div>);
              })}
            </div>
          </div>

          {/* Golden Match */}
          <div style={{...card,marginBottom:"1rem",borderLeft:`3px solid ${C.purple}`,borderRadius:"0 12px 12px 0"}}>
            <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Golden Match</span>
              <span style={{fontSize:11,color:C.purple,background:C.purpleLt,padding:"2px 8px",borderRadius:99}}>R16 only · ×2</span>
            </div>
            <div style={{padding:"1rem 16px"}}>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1rem",lineHeight:1.6}}>Pick one Round of 16 match where your advancing team prediction earns double points. Editable until June 11.</p>
              {!goldenMatchLocked?(
                <div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                    {r16Matchups.map((m,i)=>{
                      const sel=goldenMatch===String(i);
                      return(<button key={i} onClick={()=>setGoldenMatch(sel?null:String(i))}
                        style={{padding:"10px 14px",border:`0.5px solid ${sel?C.purple:"var(--color-border-tertiary)"}`,borderRadius:8,background:sel?C.purpleLt:"var(--color-background-secondary)",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                        <span style={{fontSize:18}}>{FLAGS[m.home]||"❓"}</span>
                        <span style={{fontSize:13,color:"var(--color-text-primary)",flex:1,fontWeight:500}}>{m.home}</span>
                        <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>vs</span>
                        <span style={{fontSize:13,color:"var(--color-text-primary)",flex:1,textAlign:"right",fontWeight:500}}>{m.away}</span>
                        <span style={{fontSize:18}}>{FLAGS[m.away]||"❓"}</span>
                        {sel&&<span style={{fontSize:12,fontWeight:600,color:C.purple,marginLeft:4}}>⚡</span>}
                      </button>);
                    })}
                    {r16Matchups.every(m=>m.home==="TBD")&&<p style={{fontSize:13,color:"var(--color-text-tertiary)",margin:0}}>Complete group stage picks and R32 picks to see R16 matchups.</p>}
                  </div>
                  <button onClick={()=>goldenMatch&&setGoldenMatchLocked(true)} disabled={!goldenMatch} style={{width:"100%",padding:"11px",background:goldenMatch?C.purple:"var(--color-background-secondary)",color:goldenMatch?"#fff":"var(--color-text-tertiary)",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:goldenMatch?"pointer":"not-allowed"}}>Lock in golden match →</button>
                </div>
              ):(
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C.purpleLt,border:"0.5px solid #c4b5fd",borderRadius:10}}>
                  <span style={{fontSize:20}}>⚡</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:"#4c1d95"}}>{r16Matchups[parseInt(goldenMatch)]?.home} vs {r16Matchups[parseInt(goldenMatch)]?.away}</div>
                    <div style={{fontSize:11,color:C.purple}}>Advancing team worth double</div>
                  </div>
                  <button onClick={()=>setGoldenMatchLocked(false)} style={{marginLeft:"auto",padding:"4px 10px",background:"none",border:"0.5px solid #c4b5fd",borderRadius:6,fontSize:11,color:C.purple,cursor:"pointer"}}>Change</button>
                </div>
              )}
            </div>
          </div>

          {/* Golden Boot */}
          <div style={{...card,borderLeft:`3px solid ${C.green}`,borderRadius:"0 12px 12px 0"}}>
            <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Golden Boot</span>
              <span style={{fontSize:11,color:C.green,background:C.greenLt,padding:"2px 8px",borderRadius:99}}>12 pts if correct</span>
            </div>
            <div style={{padding:"1rem 16px"}}>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1rem",lineHeight:1.6}}>Pick the tournament's top scorer. Can be changed up until June 11 — locks at kickoff.</p>
              {!goldenBootLocked?(
                <div>
                  <input value={bootSearch} onChange={e=>setBootSearch(e.target.value)} placeholder="Search player name..." style={{...inp,marginBottom:8}}/>
                  {bootSearch.length>1&&(
                    <div style={{...card,marginBottom:10,overflow:"visible"}}>
                      {filteredPlayers.length>0?filteredPlayers.slice(0,6).map(p=>(
                        <div key={p.name} onClick={()=>{setGoldenBootPick(p);setBootSearch(p.name);}} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",gap:10,background:goldenBootPick?.name===p.name?C.greenLt:"transparent"}}>
                          <span style={{fontSize:20}}>{p.flag}</span>
                          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{p.name}</div><div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{p.nation}</div></div>
                          {goldenBootPick?.name===p.name&&<span style={{fontSize:11,color:C.green}}>Selected ✓</span>}
                        </div>
                      )):<div style={{padding:"10px 14px",fontSize:13,color:"var(--color-text-tertiary)"}}>No results — try another name</div>}
                    </div>
                  )}
                  {goldenBootPick&&(
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.greenLt,border:`0.5px solid ${C.green}`,borderRadius:8,marginBottom:10}}>
                      <span style={{fontSize:22}}>{goldenBootPick.flag}</span>
                      <div><div style={{fontSize:13,fontWeight:500,color:"#166534"}}>{goldenBootPick.name}</div><div style={{fontSize:11,color:C.green}}>{goldenBootPick.nation} · 12 pts if correct</div></div>
                      <button onClick={()=>{setGoldenBootPick(null);setBootSearch("");}} style={{marginLeft:"auto",padding:"4px 8px",background:"none",border:`0.5px solid ${C.green}`,borderRadius:6,fontSize:11,color:C.green,cursor:"pointer"}}>Change</button>
                    </div>
                  )}
                  <button onClick={()=>goldenBootPick&&setGoldenBootLocked(true)} disabled={!goldenBootPick} style={{width:"100%",padding:"11px",background:goldenBootPick?C.green:"var(--color-background-secondary)",color:goldenBootPick?"#fff":"var(--color-text-tertiary)",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:goldenBootPick?"pointer":"not-allowed"}}>Lock in pick →</button>
                </div>
              ):(
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C.greenLt,border:`0.5px solid ${C.green}`,borderRadius:10}}>
                  <span style={{fontSize:26}}>{goldenBootPick?.flag||"⚽"}</span>
                  <div><div style={{fontSize:14,fontWeight:500,color:"#166534"}}>{goldenBootPick?.name}</div><div style={{fontSize:12,color:C.green}}>{goldenBootPick?.nation} · Locked · 12 pts if correct</div></div>
                  <button onClick={()=>setGoldenBootLocked(false)} style={{marginLeft:"auto",padding:"4px 10px",background:"none",border:`0.5px solid ${C.green}`,borderRadius:6,fontSize:11,color:C.green,cursor:"pointer"}}>Change</button>
                </div>
              )}
            </div>
          </div>

          {/* Top Assist */}
          <div style={{...card,marginBottom:"1rem",borderLeft:`3px solid ${C.blue}`,borderRadius:"0 12px 12px 0"}}>
            <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Top Assist</span>
              <span style={{fontSize:11,color:C.blue,background:C.blueLt,padding:"2px 8px",borderRadius:99}}>8 pts if correct</span>
            </div>
            <div style={{padding:"1rem 16px"}}>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1rem",lineHeight:1.6}}>Pick the tournament's top assist provider. Can be changed up until June 11 — locks at kickoff.</p>
              {!topAssistLocked?(
                <div>
                  <input value={assistSearch} onChange={e=>setAssistSearch(e.target.value)} placeholder="Search player name..." style={{...inp,marginBottom:8}}/>
                  {assistSearch.length>1&&(
                    <div style={{...card,marginBottom:10,overflow:"visible"}}>
                      {filteredAssist.length>0?filteredAssist.slice(0,6).map(p=>(
                        <div key={p.name} onClick={()=>{setTopAssistPick(p);setAssistSearch(p.name);}} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",gap:10,background:topAssistPick?.name===p.name?C.blueLt:"transparent"}}>
                          <span style={{fontSize:20}}>{p.flag}</span>
                          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{p.name}</div><div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{p.nation}</div></div>
                          {topAssistPick?.name===p.name&&<span style={{fontSize:11,color:C.blue}}>Selected ✓</span>}
                        </div>
                      )):<div style={{padding:"10px 14px",fontSize:13,color:"var(--color-text-tertiary)"}}>No results — try another name</div>}
                    </div>
                  )}
                  {topAssistPick&&(
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.blueLt,border:`0.5px solid ${C.blue}`,borderRadius:8,marginBottom:10}}>
                      <span style={{fontSize:22}}>{topAssistPick.flag}</span>
                      <div><div style={{fontSize:13,fontWeight:500,color:"#1e3a8a"}}>{topAssistPick.name}</div><div style={{fontSize:11,color:C.blue}}>{topAssistPick.nation} · 8 pts if correct</div></div>
                      <button onClick={()=>{setTopAssistPick(null);setAssistSearch("");}} style={{marginLeft:"auto",padding:"4px 8px",background:"none",border:`0.5px solid ${C.blue}`,borderRadius:6,fontSize:11,color:C.blue,cursor:"pointer"}}>Change</button>
                    </div>
                  )}
                  <button onClick={()=>topAssistPick&&setTopAssistLocked(true)} disabled={!topAssistPick} style={{width:"100%",padding:"11px",background:topAssistPick?C.blue:"var(--color-background-secondary)",color:topAssistPick?"#fff":"var(--color-text-tertiary)",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:topAssistPick?"pointer":"not-allowed"}}>Lock in pick →</button>
                </div>
              ):(
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C.blueLt,border:`0.5px solid ${C.blue}`,borderRadius:10}}>
                  <span style={{fontSize:26}}>{topAssistPick?.flag||"🎯"}</span>
                  <div><div style={{fontSize:14,fontWeight:500,color:"#1e3a8a"}}>{topAssistPick?.name}</div><div style={{fontSize:12,color:C.blue}}>{topAssistPick?.nation} · 8 pts if correct</div></div>
                  <button onClick={()=>setTopAssistLocked(false)} style={{marginLeft:"auto",padding:"4px 10px",background:"none",border:`0.5px solid ${C.blue}`,borderRadius:6,fontSize:11,color:C.blue,cursor:"pointer"}}>Change</button>
                </div>
              )}
            </div>
          </div>

          {/* Golden Glove */}
          <div style={{...card,borderLeft:`3px solid ${C.gold}`,borderRadius:"0 12px 12px 0"}}>
            <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Golden Glove</span>
              <span style={{fontSize:11,color:C.gold,background:C.goldLt,padding:"2px 8px",borderRadius:99}}>8 pts if correct</span>
            </div>
            <div style={{padding:"1rem 16px"}}>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1rem",lineHeight:1.6}}>Pick the tournament's best goalkeeper. Can be changed up until June 11 — locks at kickoff.</p>
              {!goldenGloveLocked?(
                <div>
                  <input value={gloveSearch} onChange={e=>setGloveSearch(e.target.value)} placeholder="Search goalkeeper name..." style={{...inp,marginBottom:8}}/>
                  {gloveSearch.length>1&&(
                    <div style={{...card,marginBottom:10,overflow:"visible"}}>
                      {filteredGlove.length>0?filteredGlove.slice(0,6).map(p=>(
                        <div key={p.name} onClick={()=>{setGoldenGlovePick(p);setGloveSearch(p.name);}} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",gap:10,background:goldenGlovePick?.name===p.name?C.goldLt:"transparent"}}>
                          <span style={{fontSize:20}}>{p.flag}</span>
                          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{p.name}</div><div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{p.nation}</div></div>
                          {goldenGlovePick?.name===p.name&&<span style={{fontSize:11,color:C.gold}}>Selected ✓</span>}
                        </div>
                      )):<div style={{padding:"10px 14px",fontSize:13,color:"var(--color-text-tertiary)"}}>No results — try another name</div>}
                    </div>
                  )}
                  {goldenGlovePick&&(
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.goldLt,border:`0.5px solid ${C.gold}`,borderRadius:8,marginBottom:10}}>
                      <span style={{fontSize:22}}>{goldenGlovePick.flag}</span>
                      <div><div style={{fontSize:13,fontWeight:500,color:"#7a5c10"}}>{goldenGlovePick.name}</div><div style={{fontSize:11,color:C.gold}}>{goldenGlovePick.nation} · 8 pts if correct</div></div>
                      <button onClick={()=>{setGoldenGlovePick(null);setGloveSearch("");}} style={{marginLeft:"auto",padding:"4px 8px",background:"none",border:`0.5px solid ${C.gold}`,borderRadius:6,fontSize:11,color:C.gold,cursor:"pointer"}}>Change</button>
                    </div>
                  )}
                  <button onClick={()=>goldenGlovePick&&setGoldenGloveLocked(true)} disabled={!goldenGlovePick} style={{width:"100%",padding:"11px",background:goldenGlovePick?C.gold:"var(--color-background-secondary)",color:goldenGlovePick?"#fff":"var(--color-text-tertiary)",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:goldenGlovePick?"pointer":"not-allowed"}}>Lock in pick →</button>
                </div>
              ):(
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C.goldLt,border:`0.5px solid ${C.gold}`,borderRadius:10}}>
                  <span style={{fontSize:26}}>{goldenGlovePick?.flag||"🧤"}</span>
                  <div><div style={{fontSize:14,fontWeight:500,color:"#7a5c10"}}>{goldenGlovePick?.name}</div><div style={{fontSize:12,color:C.gold}}>{goldenGlovePick?.nation} · 8 pts if correct</div></div>
                  <button onClick={()=>setGoldenGloveLocked(false)} style={{marginLeft:"auto",padding:"4px 10px",background:"none",border:`0.5px solid ${C.gold}`,borderRadius:6,fontSize:11,color:C.gold,cursor:"pointer"}}>Change</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {page==="league"&&(
        <div style={{maxWidth:660,margin:"0 auto",padding:"2rem"}}>
          <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.03em",margin:"0 0 0.25rem",color:"var(--color-text-primary)"}}>My Leagues</h1>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1.5rem"}}>Your rankings across all leagues.</p>
          <div style={{display:"flex",gap:0,background:"var(--color-background-secondary)",borderRadius:10,padding:4,marginBottom:"1.5rem"}}>
            {["overview","join","create"].map(tab=>(<button key={tab} onClick={()=>{setLeagueTab(tab);setActiveLeague(null);}} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:7,background:leagueTab===tab&&!activeLeague?"var(--color-background-primary)":"transparent",color:leagueTab===tab&&!activeLeague?"var(--color-text-primary)":"var(--color-text-secondary)",fontWeight:leagueTab===tab&&!activeLeague?500:400,fontSize:13,cursor:"pointer"}}>{tab==="overview"?"My Leagues":tab==="join"?"Join":"Create"}</button>))}
          </div>
          {activeLeague?(
            <div>
              <button onClick={()=>setActiveLeague(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1rem",padding:0}}>← Back</button>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem"}}>
                <div style={{flex:1}}><div style={{fontSize:18,fontWeight:600,color:"var(--color-text-primary)"}}>{activeLeague.name}</div><div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{activeLeague.members?.toLocaleString()} members · Updated 4× daily</div></div>
                {activeLeague.code&&<span style={{fontFamily:"monospace",fontSize:11,color:"var(--color-text-tertiary)",background:"var(--color-background-secondary)",padding:"5px 10px",borderRadius:99,border:"0.5px solid var(--color-border-tertiary)"}}>{activeLeague.code}</span>}
              </div>
              <div style={card}>
                {leagueMembers.map((m,i)=>(
                  <div key={i} style={{padding:"12px 16px",borderBottom:i<leagueMembers.length-1?"0.5px solid var(--color-border-tertiary)":"none",display:"grid",gridTemplateColumns:"2.5rem 1fr auto",gap:10,alignItems:"center",background:m.name===(user?.name||"You")?C.blueLt:"transparent"}}>
                    <span style={{fontSize:13,fontWeight:600,color:i<3?C.blue:"var(--color-text-tertiary)",fontFamily:"monospace"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:[C.blue,C.red,C.green,C.gold,C.purple][i%5],display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:"#fff"}}>{m.avatar}</div>
                      <div><div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{m.name}</div><div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{m.handle}</div></div>
                    </div>
                    <span style={{fontFamily:"monospace",fontWeight:600,fontSize:15,color:"var(--color-text-primary)"}}>{m.pts}</span>
                  </div>
                ))}
              </div>
            </div>
          ):leagueTab==="overview"?(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {joinedLeagues.map(league=>(<button key={league.id} onClick={()=>setActiveLeague(league)} style={{...card,padding:"14px 16px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12,width:"100%",background:"var(--color-background-primary)"}}>
                <div style={{width:38,height:38,borderRadius:9,background:league.id==="global"?C.blueLt:C.purpleLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{league.id==="global"?"🌍":"🏆"}</div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{league.name}</div><div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{league.members?.toLocaleString()} members</div></div>
                <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Your rank</div><div style={{fontSize:18,fontWeight:600,color:C.blue,fontFamily:"monospace"}}>#{league.rank||1}</div></div>
                <span style={{color:"var(--color-text-tertiary)",fontSize:18}}>›</span>
              </button>))}
              <button onClick={()=>setLeagueTab("join")} style={{padding:"12px",border:"0.5px dashed var(--color-border-tertiary)",borderRadius:12,background:"transparent",cursor:"pointer",fontSize:13,color:"var(--color-text-secondary)"}}>+ Join another league</button>
            </div>
          ):leagueTab==="join"?(
            <div style={{...card,padding:"1.5rem",overflow:"visible"}}>
              <h2 style={{fontSize:15,fontWeight:500,margin:"0 0 0.75rem",color:"var(--color-text-primary)"}}>Enter invite code</h2>
              <input value={leagueCode} onChange={e=>setLeagueCode(e.target.value.toUpperCase())} placeholder="MND26-XXXXX" style={{...inp,fontFamily:"monospace",letterSpacing:"0.05em",marginBottom:10}}/>
              <button onClick={()=>{if(leagueCode.startsWith("MND26-")){const nl={id:leagueCode,name:"Friends League",members:12,rank:3,code:leagueCode};setJoinedLeagues(p=>[...p,nl]);setActiveLeague(nl);setLeagueTab("overview");}}} style={{width:"100%",padding:"11px",background:C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer"}}>Join league →</button>
            </div>
          ):(
            <div style={{...card,padding:"1.5rem",overflow:"visible"}}>
              <h2 style={{fontSize:15,fontWeight:500,margin:"0 0 0.75rem",color:"var(--color-text-primary)"}}>Your league code</h2>
              <div style={{display:"flex",alignItems:"center",gap:10,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
                <span style={{flex:1,fontFamily:"monospace",fontSize:18,fontWeight:500,letterSpacing:"0.08em",color:"var(--color-text-primary)"}}>{createdCode}</span>
                <button onClick={()=>navigator.clipboard?.writeText(createdCode)} style={{padding:"6px 12px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,fontSize:12,cursor:"pointer",color:"var(--color-text-secondary)"}}>Copy</button>
              </div>
              <button onClick={()=>{const nl={id:createdCode,name:"My Mundialist League",members:1,rank:1,code:createdCode};setJoinedLeagues(p=>[...p,nl]);setActiveLeague(nl);setLeagueTab("overview");}} style={{width:"100%",padding:"11px",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer"}}>Go to my league →</button>
            </div>
          )}
        </div>
      )}

      {/* ══ POINTS ══ */}
      {page==="points"&&(
        <div style={{maxWidth:640,margin:"0 auto",padding:"2rem"}}>
          <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.03em",margin:"0 0 0.25rem",color:"var(--color-text-primary)"}}>Points Guide</h1>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1.25rem"}}>How every prediction is scored.</p>
          <LockBanner/>
          {[
            {title:"Pre-tournament picks",accent:C.gold,items:[
              {label:"Double-down",note:"×2 on chosen match · one per matchday · 3 total",val:"×2",c:C.gold},
              {label:"Golden Match",note:"×2 on chosen R16 advancing team",val:"×2",c:C.purple},
              {label:"Golden Boot — correct top scorer",note:"Editable until June 11",val:"12 pts",c:C.green},
              {label:"Top Assist — correct top assist provider",note:"Editable until June 11",val:"8 pts",c:C.blue},
              {label:"Golden Glove — correct best goalkeeper",note:"Editable until June 11",val:"8 pts",c:C.gold},
            ]},
            {title:"Group stage — match scores",accent:C.blue,items:[
              {label:"Exact score",note:"e.g. predict 2–1, result 2–1",val:"10",c:C.blue},
              {label:"Correct result + correct goal difference",note:"e.g. predict 1–2, result 2–3",val:"8",c:C.blue},
              {label:"Correct draw, different score",note:"e.g. predict 1–1, result 2–2",val:"8",c:C.blue},
              {label:"Correct result only",val:"6",c:C.blue},
              {label:"Wrong result",note:"No negative scoring",val:"0",c:"#888"},
            ]},
            {title:"Group tables",accent:C.purple,note:"Auto-calculated from your scores — no separate pick needed.",items:[
              {label:"Winner & runner-up correct, right order",val:"5",c:C.purple},
              {label:"Both correct, positions swapped",val:"3",c:C.purple},
              {label:"Any other outcome",val:"0",c:"#888"},
            ]},
            {title:"Knockout stage — R32, R16, QF, SF, Final",accent:C.green,note:"Points accumulate — a correct champion pick earns 16+18+20+25 = 79 pts total. R32 pairings are determined by FIFA's official Annex C bracket logic, based on your group stage predictions.",items:[
              {label:"R32 correct advancing team",val:"15",c:C.green},
              {label:"R16 correct advancing team",val:"16",c:C.green},
              {label:"QF correct advancing team",val:"18",c:C.green},
              {label:"SF correct advancing team",val:"20",c:C.green},
              {label:"Tournament champion",val:"25",c:C.gold},
              {label:"Runner-up",val:"18",c:C.green},
              {label:"Third place",val:"12",c:C.green},
            ]},
            {title:"Dark horse bonus",accent:C.red,note:"On top of normal knockout pts. Only if you predicted that team to reach that round.",items:[
              {label:"Non-seeded team correctly predicted to QF",val:"+3",c:C.red},
              {label:"Non-seeded team correctly predicted to SF",val:"+5",c:C.red},
              {label:"Non-seeded team correctly predicted to Final",val:"+8",c:C.red},
            ]},
          ].map(({title,accent,note,items})=>(
            <div key={title} style={{...card,marginBottom:"1rem",borderLeft:`3px solid ${accent}`,borderRadius:"0 12px 12px 0"}}>
              <div style={{padding:"11px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)"}}><span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{title}</span></div>
              <div style={{padding:"0.75rem 16px"}}>
                {note&&<p style={{fontSize:12,color:"var(--color-text-secondary)",margin:items.length?"0 0 0.75rem":"0",lineHeight:1.6}}>{note}</p>}
                {items.map((r,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<items.length-1?"0.5px solid var(--color-border-tertiary)":"none"}}>
                  <div style={{flex:1,fontSize:13,color:"var(--color-text-primary)"}}>{r.label}{r.note&&<span style={{fontSize:11,color:"var(--color-text-tertiary)",marginLeft:8}}>{r.note}</span>}</div>
                  <span style={{fontFamily:"monospace",fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:99,background:r.c+"22",color:r.c,flexShrink:0}}>{r.val}</span>
                </div>))}
              </div>
            </div>
          ))}
        </div>
      )}

      <footer style={{marginTop:"3rem",borderTop:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)"}}>
        <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"0.75rem 2rem",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:"100%",height:52,background:"var(--color-background-secondary)",border:"0.5px dashed var(--color-border-tertiary)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Sponsor slot — sponsor@mundialist.com</span>
          </div>
        </div>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"1.25rem 2rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:14,fontWeight:600,color:C.blue}}>Mundial26</span>
            <span style={{fontSize:11,background:C.blue,color:"#fff",padding:"1px 6px",borderRadius:99}}>Predictor</span>
            <span style={{fontSize:12,color:"var(--color-text-tertiary)",marginLeft:4}}>· FIFA World Cup 2026 · USA · Canada · Mexico</span>
          </div>
          <div style={{display:"flex",gap:"1.5rem"}}>
            <a href="mailto:sponsor@mundialist.com" style={{fontSize:12,color:"var(--color-text-tertiary)",textDecoration:"none"}}>Sponsor us</a>
            <a href="mailto:hello@mundialist.com" style={{fontSize:12,color:"var(--color-text-tertiary)",textDecoration:"none"}}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
