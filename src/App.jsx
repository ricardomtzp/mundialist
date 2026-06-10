import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";

const C = {
  blue:"#2A398D", blueLt:"#E8EBF7",
  red:"#E61D25",  redLt:"#FDECED",
  green:"#3CAC3B",greenLt:"#EAF7EA",
  gold:"#C9A84C", goldLt:"#FBF5E6",
  purple:"#7C3AED",purpleLt:"#EDE9FE",
};

const GROUPS = {
  A:["Mexico","South Africa","South Korea","Czechia"],
  B:["Canada","Switzerland","Qatar","Bosnia and Herzegovina"],
  C:["Brazil","Morocco","Haiti","Scotland"],
  D:["USA","Paraguay","Australia","Türkiye"],
  E:["Germany","Curaçao","Ivory Coast","Ecuador"],
  F:["Netherlands","Japan","Sweden","Tunisia"],
  G:["Belgium","Egypt","Iran","New Zealand"],
  H:["Spain","Cape Verde","Saudi Arabia","Uruguay"],
  I:["France","Senegal","Norway","Iraq"],
  J:["Argentina","Algeria","Austria","Jordan"],
  K:["Portugal","DR Congo","Uzbekistan","Colombia"],
  L:["England","Croatia","Ghana","Panama"],
};

const TOURNAMENT_START=new Date('2026-06-11T19:00:00Z');
const tournamentStarted=()=>Date.now()>=TOURNAMENT_START.getTime();

const SEEDED=new Set(["Mexico","USA","Brazil","Germany","Spain","France","England","Portugal","Belgium","Netherlands","Argentina"]);

// FIFA World Rankings April 2026 (higher = better)
const FIFA_RANK={
  France:100,Spain:99,Argentina:98,England:97,Portugal:96,
  Brazil:95,Netherlands:94,Morocco:93,Belgium:92,Germany:91,
  USA:88,Mexico:86,Uruguay:85,Croatia:84,Switzerland:83,
  Colombia:82,Senegal:81,Japan:80,Ecuador:79,"South Korea":78,
  Norway:77,Australia:76,"Ivory Coast":75,Canada:74,
  Austria:73,Algeria:72,Tunisia:71,Sweden:70,Qatar:69,
  Ghana:68,Bolivia:67,Paraguay:66,Iraq:65,Jordan:64,
  "DR Congo":63,Uzbekistan:62,"Cape Verde":61,"Saudi Arabia":60,
  Egypt:59,Iran:58,"New Zealand":57,Haiti:56,Scotland:55,
  Czechia:54,"Bosnia and Herzegovina":53,"South Africa":52,
  Türkiye:51,Curaçao:50,
};
const getRank=t=>FIFA_RANK[t]||50;
const STRONG=new Set(["Brazil","France","Germany","Spain","England","Argentina","Portugal","Netherlands","USA","Mexico","Belgium","Morocco"]);

const FLAGS={
  Mexico:"🇲🇽","South Africa":"🇿🇦","South Korea":"🇰🇷",Czechia:"🇨🇿","Czech Republic":"🇨🇿","Czechia ":"🇨🇿",
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
  England:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",Croatia:"🇭🇷",Ghana:"🇬🇭",Panama:"🇵🇦",TBD:"❓",
};

// ── GOLDEN BOOT — verified May 2026 from confirmed WC2026 squads ────────────
// FIFA top 10: France, Spain, Argentina, England, Portugal, Brazil,
//              Netherlands, Morocco, Belgium, Germany
// OUT confirmed: Foden/Palmer/Alexander-Arnold (Eng), Rodrygo/Richarlison/Estêvão (Bra),
//   Griezmann (Fra - not selected), ter Stegen (Ger - not selected),
//   Xavi Simons (Ned - injured), Italy/Poland/Cameroon did not qualify
const GOLDEN_BOOT_PLAYERS=[
  {name:"Kylian Mbappé",        nation:"France",      flag:"🇫🇷"},
  {name:"Harry Kane",           nation:"England",     flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Erling Haaland",       nation:"Norway",      flag:"🇳🇴"},
  {name:"Lionel Messi",         nation:"Argentina",   flag:"🇦🇷"},
  {name:"Mikel Oyarzabal",      nation:"Spain",       flag:"🇪🇸"},
  {name:"Lamine Yamal",         nation:"Spain",       flag:"🇪🇸"},
  {name:"Cristiano Ronaldo",    nation:"Portugal",    flag:"🇵🇹"},
  {name:"Julian Alvarez",       nation:"Argentina",   flag:"🇦🇷"},
  {name:"Raphinha",             nation:"Brazil",      flag:"🇧🇷"},
  {name:"Lautaro Martinez",     nation:"Argentina",   flag:"🇦🇷"},
  {name:"Vinicius Junior",      nation:"Brazil",      flag:"🇧🇷"},
  {name:"Ousmane Dembele",      nation:"France",      flag:"🇫🇷"},
  {name:"Kai Havertz",          nation:"Germany",     flag:"🇩🇪"},
  {name:"Cody Gakpo",           nation:"Netherlands", flag:"🇳🇱"},
  {name:"Florian Wirtz",        nation:"Germany",     flag:"🇩🇪"},
  {name:"Ferran Torres",        nation:"Spain",       flag:"🇪🇸"},
  {name:"Nick Woltemade",       nation:"Germany",     flag:"🇩🇪"},
  {name:"Igor Thiago",          nation:"Belgium",     flag:"🇧🇪"},
  {name:"Michael Olise",        nation:"France",      flag:"🇫🇷"},
  {name:"Luis Diaz",            nation:"Colombia",    flag:"🇨🇴"},
  {name:"Romelu Lukaku",        nation:"Belgium",     flag:"🇧🇪"},
  {name:"Matheus Cunha",        nation:"Brazil",      flag:"🇧🇷"},
  {name:"Jamal Musiala",        nation:"Germany",     flag:"🇩🇪"},
  {name:"Ollie Watkins",        nation:"England",     flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Bukayo Saka",          nation:"England",     flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Bruno Fernandes",      nation:"Portugal",    flag:"🇵🇹"},
  {name:"Jude Bellingham",      nation:"England",     flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Memphis Depay",        nation:"Netherlands", flag:"🇳🇱"},
  {name:"Desire Doue",          nation:"France",      flag:"🇫🇷"},
  {name:"Neymar",               nation:"Brazil",      flag:"🇧🇷"},
  {name:"Lennart Karl",         nation:"Germany",     flag:"🇩🇪"},
  {name:"Charles De Ketelaere", nation:"Belgium",     flag:"🇧🇪"},
  {name:"Brian Brobbey",        nation:"Netherlands", flag:"🇳🇱"},
  {name:"Darwin Nunez",         nation:"Uruguay",     flag:"🇺🇾"},
  {name:"Marcus Thuram",        nation:"France",      flag:"🇫🇷"},
  {name:"Enner Valencia",       nation:"Ecuador",     flag:"🇪🇨"},
  {name:"Jeremy Doku",          nation:"Belgium",     flag:"🇧🇪"},
  {name:"Donyell Malen",        nation:"Netherlands", flag:"🇳🇱"},
  {name:"Eberechi Eze",         nation:"England",     flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Leroy Sane",           nation:"Germany",     flag:"🇩🇪"},
  {name:"Pedro Neto",           nation:"Portugal",    flag:"🇵🇹"},
  {name:"Alexander Sorloth",    nation:"Norway",      flag:"🇳🇴"},
  {name:"Rafael Leao",          nation:"Portugal",    flag:"🇵🇹"},
  {name:"Christian Pulisic",    nation:"USA",         flag:"🇺🇸"},
  {name:"Sadio Mane",           nation:"Senegal",     flag:"🇸🇳"},
  {name:"Goncalo Ramos",        nation:"Portugal",    flag:"🇵🇹"},
  {name:"Mohamed Salah",        nation:"Egypt",       flag:"🇪🇬"},
  {name:"Anthony Gordon",       nation:"England",     flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Bradley Barcola",      nation:"France",      flag:"🇫🇷"},
  {name:"Dani Olmo",            nation:"Spain",       flag:"🇪🇸"},
  {name:"Kingsley Coman",       nation:"France",      flag:"🇫🇷"},
  {name:"Marcus Rashford",      nation:"England",     flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Viktor Gyokeres",      nation:"Sweden",      flag:"🇸🇪"},
  {name:"Alexander Isak",       nation:"Sweden",      flag:"🇸🇪"},
  {name:"Santiago Giménez",     nation:"Mexico",      flag:"🇲🇽"},
  {name:"Raúl Jiménez",         nation:"Mexico",      flag:"🇲🇽"},
  {name:"Alexis Vega",          nation:"Mexico",      flag:"🇲🇽"},
];

// ── GOLDEN GLOVE — verified May 2026 from confirmed WC2026 squads ────────────
// OUT: ter Stegen (Ger), Lloris (retired), Donnarumma/Vicario (Italy n/q),
//      Onana (Cameroon n/q), Szczęsny (Poland n/q), Xavi Simons (Ned - injured, outfield)
const GOLDEN_GLOVE_PLAYERS=[
  {name:"Mike Maignan",         nation:"France",       flag:"🇫🇷"},
  {name:"Emiliano Martínez",    nation:"Argentina",    flag:"🇦🇷"},
  {name:"Alisson Becker",       nation:"Brazil",       flag:"🇧🇷"},
  {name:"Jordan Pickford",      nation:"England",      flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Thibaut Courtois",     nation:"Belgium",      flag:"🇧🇪"},
  {name:"Ederson",              nation:"Brazil",       flag:"🇧🇷"},
  {name:"Unai Simón",           nation:"Spain",        flag:"🇪🇸"},
  {name:"Manuel Neuer",         nation:"Germany",      flag:"🇩🇪"},
  {name:"Diogo Costa",          nation:"Portugal",     flag:"🇵🇹"},
  {name:"Yassine Bounou",       nation:"Morocco",      flag:"🇲🇦"},
  {name:"Bart Verbruggen",      nation:"Netherlands",  flag:"🇳🇱"},
  {name:"David Raya",           nation:"Spain",        flag:"🇪🇸"},
  {name:"Dean Henderson",       nation:"England",      flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {name:"Édouard Mendy",        nation:"Senegal",      flag:"🇸🇳"},
  {name:"Yann Sommer",          nation:"Switzerland",  flag:"🇨🇭"},
  {name:"Oliver Baumann",       nation:"Germany",      flag:"🇩🇪"},
  {name:"Dominik Livaković",    nation:"Croatia",      flag:"🇭🇷"},
  {name:"Kristoffer Klaesson",  nation:"Norway",       flag:"🇳🇴"},
  {name:"Mathew Ryan",          nation:"Australia",    flag:"🇦🇺"},
  {name:"Lawrence Ati-Zigi",    nation:"Ghana",        flag:"🇬🇭"},
];
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
  [1,4],   // M89: W74 vs W77 -> Philadelphia Jul 4
  [0,2],   // M90: W73 vs W75 -> Houston Jul 4
  [3,5],   // M91: W76 vs W78 -> New Jersey Jul 5
  [6,7],   // M92: W79 vs W80 -> Mexico City Jul 5
  [10,11], // M93: W83 vs W84 -> Dallas Jul 6
  [8,9],   // M94: W81 vs W82 -> Seattle Jul 6
  [12,14], // M95: W85 vs W87 -> Vancouver Jul 7
  [13,15], // M96: W86 vs W88 -> Atlanta Jul 7
];

const ANNEX_IDX={"1A":0,"1B":1,"1D":2,"1E":3,"1G":4,"1I":5,"1K":6,"1L":7};


// FIFA WC2026 match venues — verified from NBC Sports/Al Jazeera official schedule May 2026
// FIFA renamed all venues: AT&T Stadium → Dallas Stadium, SoFi → Los Angeles Stadium, etc.
// Match order per group: [MD1 m1, MD1 m2, MD2 m1, MD2 m2, MD3 m1, MD3 m2]
const GROUP_VENUES={
  A:[ // Mexico vs South Africa, South Korea vs Czechia
    {venue:"Estadio Azteca",city:"Mexico City"},        // Mexico vs South Africa — Jun 11
    {venue:"Estadio Guadalajara",city:"Guadalajara"},   // South Korea vs Czechia — Jun 11
    {venue:"Estadio Guadalajara",city:"Guadalajara"},   // Mexico vs South Korea — Jun 17
    {venue:"Atlanta Stadium",city:"Atlanta"},           // South Africa vs Czechia — Jun 17
    {venue:"Estadio Azteca",city:"Mexico City"},        // Czechia vs Mexico — Jun 26
    {venue:"Estadio BBVA",city:"Monterrey"},            // South Africa vs South Korea — Jun 26
  ],
  B:[ // Canada vs Bosnia, Qatar vs Switzerland
    {venue:"Toronto Stadium",city:"Toronto"},           // Canada vs Bosnia — Jun 12
    {venue:"San Francisco Bay Area Stadium",city:"San Francisco"}, // Qatar vs Switzerland — Jun 12
    {venue:"Toronto Stadium",city:"Toronto"},           // Canada vs Qatar — Jun 18
    {venue:"Los Angeles Stadium",city:"Los Angeles"},   // Switzerland vs Bosnia — Jun 18
    {venue:"BC Place",city:"Vancouver"},                // Switzerland vs Canada — Jun 26
    {venue:"Seattle Stadium",city:"Seattle"},           // Bosnia vs Qatar — Jun 26
  ],
  C:[ // Brazil vs Morocco, Haiti vs Scotland
    {venue:"New York New Jersey Stadium",city:"New Jersey"}, // Brazil vs Morocco — Jun 13
    {venue:"Boston Stadium",city:"Boston"},             // Haiti vs Scotland — Jun 13
    {venue:"Philadelphia Stadium",city:"Philadelphia"}, // Brazil vs Haiti — Jun 19
    {venue:"Boston Stadium",city:"Boston"},             // Scotland vs Morocco — Jun 19
    {venue:"Miami Stadium",city:"Miami"},               // Scotland vs Brazil — Jun 27
    {venue:"Atlanta Stadium",city:"Atlanta"},           // Morocco vs Haiti — Jun 27
  ],
  D:[ // USA vs Paraguay, Australia vs Türkiye
    {venue:"Los Angeles Stadium",city:"Los Angeles"},   // USA vs Paraguay — Jun 12
    {venue:"BC Place",city:"Vancouver"},                // Australia vs Türkiye — Jun 12
    {venue:"Seattle Stadium",city:"Seattle"},           // USA vs Australia — Jun 19
    {venue:"San Francisco Bay Area Stadium",city:"San Francisco"}, // Türkiye vs Paraguay — Jun 19
    {venue:"Los Angeles Stadium",city:"Los Angeles"},   // Türkiye vs USA — Jun 25
    {venue:"San Francisco Bay Area Stadium",city:"San Francisco"}, // Paraguay vs Australia — Jun 25
  ],
  E:[ // Germany vs Curaçao, Ivory Coast vs Ecuador
    {venue:"Houston Stadium",city:"Houston"},           // Germany vs Curaçao — Jun 14
    {venue:"Philadelphia Stadium",city:"Philadelphia"}, // Ivory Coast vs Ecuador — Jun 14
    {venue:"Toronto Stadium",city:"Toronto"},           // Germany vs Ivory Coast — Jun 20
    {venue:"Kansas City Stadium",city:"Kansas City"},   // Ecuador vs Curaçao — Jun 20
    {venue:"New York New Jersey Stadium",city:"New Jersey"}, // Ecuador vs Germany — Jun 25
    {venue:"Philadelphia Stadium",city:"Philadelphia"}, // Curaçao vs Ivory Coast — Jun 25
  ],
  F:[ // Netherlands vs Japan, Sweden vs Tunisia
    {venue:"Dallas Stadium",city:"Dallas"},             // Netherlands vs Japan — Jun 14
    {venue:"Estadio BBVA",city:"Monterrey"},            // Sweden vs Tunisia — Jun 14
    {venue:"Houston Stadium",city:"Houston"},           // Netherlands vs Sweden — Jun 20
    {venue:"Estadio BBVA",city:"Monterrey"},            // Tunisia vs Japan — Jun 20
    {venue:"Dallas Stadium",city:"Dallas"},             // Japan vs Sweden — Jun 27
    {venue:"Kansas City Stadium",city:"Kansas City"},   // Tunisia vs Netherlands — Jun 27
  ],
  G:[ // Belgium vs Egypt, Iran vs New Zealand
    {venue:"Seattle Stadium",city:"Seattle"},           // Belgium vs Egypt — Jun 15
    {venue:"Los Angeles Stadium",city:"Los Angeles"},   // Iran vs New Zealand — Jun 15
    {venue:"Los Angeles Stadium",city:"Los Angeles"},   // Belgium vs Iran — Jun 21
    {venue:"BC Place",city:"Vancouver"},                // New Zealand vs Egypt — Jun 21
    {venue:"Seattle Stadium",city:"Seattle"},           // Egypt vs Iran — Jun 27
    {venue:"BC Place",city:"Vancouver"},                // New Zealand vs Belgium — Jun 27
  ],
  H:[ // Spain vs Cape Verde, Saudi Arabia vs Uruguay
    {venue:"Atlanta Stadium",city:"Atlanta"},           // Spain vs Cape Verde — Jun 15
    {venue:"Miami Stadium",city:"Miami"},               // Saudi Arabia vs Uruguay — Jun 15
    {venue:"Atlanta Stadium",city:"Atlanta"},           // Spain vs Saudi Arabia — Jun 21
    {venue:"Miami Stadium",city:"Miami"},               // Uruguay vs Cape Verde — Jun 21
    {venue:"Houston Stadium",city:"Houston"},           // Cape Verde vs Saudi Arabia — Jun 27
    {venue:"Estadio Guadalajara",city:"Guadalajara"},   // Uruguay vs Spain — Jun 27
  ],
  I:[ // France vs Senegal, Iraq vs Norway
    {venue:"New York New Jersey Stadium",city:"New Jersey"}, // France vs Senegal — Jun 16
    {venue:"Boston Stadium",city:"Boston"},             // Iraq vs Norway — Jun 16
    {venue:"Philadelphia Stadium",city:"Philadelphia"}, // France vs Iraq — Jun 22
    {venue:"New York New Jersey Stadium",city:"New Jersey"}, // Norway vs Senegal — Jun 22
    {venue:"Boston Stadium",city:"Boston"},             // Norway vs France — Jun 26
    {venue:"Toronto Stadium",city:"Toronto"},           // Senegal vs Iraq — Jun 26
  ],
  J:[ // Argentina vs Algeria, Austria vs Jordan
    {venue:"Kansas City Stadium",city:"Kansas City"},   // Argentina vs Algeria — Jun 16
    {venue:"San Francisco Bay Area Stadium",city:"San Francisco"}, // Austria vs Jordan — Jun 16
    {venue:"Dallas Stadium",city:"Dallas"},             // Argentina vs Austria — Jun 22
    {venue:"San Francisco Bay Area Stadium",city:"San Francisco"}, // Jordan vs Algeria — Jun 22
    {venue:"Kansas City Stadium",city:"Kansas City"},   // Algeria vs Austria — Jun 26
    {venue:"Dallas Stadium",city:"Dallas"},             // Jordan vs Argentina — Jun 26
  ],
  K:[ // Portugal vs DR Congo, Uzbekistan vs Colombia
    {venue:"Houston Stadium",city:"Houston"},           // Portugal vs DR Congo — Jun 17
    {venue:"Estadio Guadalajara",city:"Guadalajara"},   // Uzbekistan vs Colombia — Jun 17
    {venue:"Houston Stadium",city:"Houston"},           // Portugal vs Uzbekistan — Jun 23
    {venue:"Estadio Guadalajara",city:"Guadalajara"},   // Colombia vs DR Congo — Jun 23
    {venue:"Miami Stadium",city:"Miami"},               // Colombia vs Portugal — Jun 27
    {venue:"Atlanta Stadium",city:"Atlanta"},           // DR Congo vs Uzbekistan — Jun 27
  ],
  L:[ // England vs Croatia, Ghana vs Panama
    {venue:"Dallas Stadium",city:"Dallas"},             // England vs Croatia — Jun 17
    {venue:"Toronto Stadium",city:"Toronto"},           // Ghana vs Panama — Jun 17
    {venue:"Boston Stadium",city:"Boston"},             // England vs Ghana — Jun 23
    {venue:"Toronto Stadium",city:"Toronto"},           // Panama vs Croatia — Jun 23
    {venue:"New York New Jersey Stadium",city:"New Jersey"}, // Panama vs England — Jun 27
    {venue:"Philadelphia Stadium",city:"Philadelphia"}, // Croatia vs Ghana — Jun 27
  ],
};


const KO_VENUES={
  r32:[
    {date:"Jun 28",city:"Los Angeles"},   // M73: 2A vs 2B
    {date:"Jun 29",city:"Boston"},         // M74: 1E vs 3rd
    {date:"Jun 29",city:"Houston"},        // M75: 1F vs 2C
    {date:"Jun 29",city:"Monterrey"},      // M76: 1C vs 2F
    {date:"Jun 29",city:"Boston"},         // M77: 1I vs 3rd
    {date:"Jun 30",city:"Dallas"},         // M78: 2E vs 2I
    {date:"Jun 30",city:"Mexico City"},    // M79: 1A vs 3rd
    {date:"Jul 1",city:"Atlanta"},         // M80: 1L vs 3rd
    {date:"Jul 1",city:"San Francisco"},   // M81: 1D vs 3rd
    {date:"Jul 1",city:"Seattle"},         // M82: 1G vs 3rd
    {date:"Jul 2",city:"Toronto"},         // M83: 2K vs 2L
    {date:"Jul 2",city:"Los Angeles"},     // M84: 1H vs 2J
    {date:"Jul 3",city:"Vancouver"},       // M85: 1B vs 3rd
    {date:"Jul 3",city:"Miami"},           // M86: 1J vs 2H
    {date:"Jul 3",city:"Kansas City"},     // M87: 1K vs 3rd
    {date:"Jul 3",city:"Dallas"},          // M88: 2D vs 2G
  ],
  r16:[
    {date:"Jul 4",city:"Philadelphia"},    // M89: W74 vs W77
    {date:"Jul 4",city:"Houston"},         // M90: W73 vs W75
    {date:"Jul 5",city:"New Jersey"},      // M91: W76 vs W78
    {date:"Jul 5",city:"Mexico City"},     // M92: W79 vs W80
    {date:"Jul 6",city:"Dallas"},          // M93: W83 vs W84
    {date:"Jul 6",city:"Seattle"},         // M94: W81 vs W82
    {date:"Jul 7",city:"Vancouver"},       // M95: W85 vs W87
    {date:"Jul 7",city:"Atlanta"},         // M96: W86 vs W88
  ],
  qf:[
    {date:"Jul 9",city:"Boston"},          // M97: W89 vs W90
    {date:"Jul 10",city:"Los Angeles"},    // M98: W93 vs W94
    {date:"Jul 11",city:"Miami"},          // M99: W91 vs W92
    {date:"Jul 11",city:"Kansas City"},    // M100: W95 vs W96
  ],
  sf:[
    {date:"Jul 14",city:"Dallas"},         // M101: W97 vs W98
    {date:"Jul 15",city:"Atlanta"},        // M102: W99 vs W100
  ],
  final:{date:"Jul 19",city:"New Jersey"},
  third:{date:"Jul 18",city:"Miami"},
};

const GROUP_DATES={
  A:['Jun 11', 'Jun 11', 'Jun 17', 'Jun 17', 'Jun 26', 'Jun 26'],
  B:['Jun 12', 'Jun 12', 'Jun 18', 'Jun 18', 'Jun 26', 'Jun 26'],
  C:['Jun 13', 'Jun 13', 'Jun 19', 'Jun 19', 'Jun 27', 'Jun 27'],
  D:['Jun 12', 'Jun 12', 'Jun 19', 'Jun 19', 'Jun 25', 'Jun 25'],
  E:['Jun 14', 'Jun 14', 'Jun 20', 'Jun 20', 'Jun 25', 'Jun 25'],
  F:['Jun 14', 'Jun 14', 'Jun 20', 'Jun 20', 'Jun 27', 'Jun 27'],
  G:['Jun 15', 'Jun 15', 'Jun 21', 'Jun 21', 'Jun 27', 'Jun 27'],
  H:['Jun 15', 'Jun 15', 'Jun 21', 'Jun 21', 'Jun 27', 'Jun 27'],
  I:['Jun 16', 'Jun 16', 'Jun 22', 'Jun 22', 'Jun 26', 'Jun 26'],
  J:['Jun 16', 'Jun 16', 'Jun 22', 'Jun 22', 'Jun 26', 'Jun 26'],
  K:['Jun 17', 'Jun 17', 'Jun 23', 'Jun 23', 'Jun 27', 'Jun 27'],
  L:['Jun 17', 'Jun 17', 'Jun 23', 'Jun 23', 'Jun 27', 'Jun 27'],
};
const ROUND_INDICES = [[0,1],[2,3],[4,5]];


// ── Simulation with style bias ─────────────────────────────────────────────
// Simulate a match using FIFA rankings and prediction style
// Style strongly affects both result and goal distribution
function simulateMatch(homeTeam,awayTeam,style){
  const hr=getRank(homeTeam),ar=getRank(awayTeam);
  const diff=hr-ar; // positive = home stronger

  // Style parameters — controls how much rankings matter vs randomness
  const params={
    cautious: {noise:0.03, upsetChance:0.02, drawBase:0.20, maxGoals:2, avgWin:1.1},
    balanced: {noise:0.12, upsetChance:0.08, drawBase:0.25, maxGoals:3, avgWin:1.7},
    bold:     {noise:0.22, upsetChance:0.16, drawBase:0.22, maxGoals:4, avgWin:2.2},
    maverick: {noise:0.40, upsetChance:0.35, drawBase:0.18, maxGoals:6, avgWin:2.8},
  }[style]||{noise:0.12,upsetChance:0.08,drawBase:0.25,maxGoals:3,avgWin:1.7};

  // Base win prob from ranking diff (logistic curve)
  let homeWinProb=1/(1+Math.pow(10,-diff/18));
  // Add noise
  homeWinProb+=((Math.random()-0.5)*2*params.noise);
  // Upset flip: maverick can completely reverse the expected result
  if(Math.random()<params.upsetChance) homeWinProb=1-homeWinProb;
  homeWinProb=Math.max(0.04,Math.min(0.96,homeWinProb));

  // Draw probability
  const rankCloseness=Math.max(0,1-Math.abs(diff)/60);
  const drawProb=Math.min(0.38,params.drawBase+rankCloseness*0.10);

  const r=Math.random();
  let homeWins,isDraw;
  if(r<drawProb){isDraw=true;}
  else if(r<drawProb+(1-drawProb)*homeWinProb){homeWins=true;}
  else{homeWins=false;}

  // Goals — tightly bounded by style
  const winGoals=()=>Math.max(1,Math.min(params.maxGoals,
    1+Math.round(Math.random()*params.avgWin)));
  const loseGoals=(w)=>Math.max(0,Math.min(w-1,
    style==="cautious"?Math.round(Math.random()*0.4):
    style==="balanced"?Math.round(Math.random()*w*0.5):
    style==="bold"?Math.round(Math.random()*w*0.65):
    Math.round(Math.random()*w*0.85)));

  let h,a;
  if(isDraw){
    const maxDraw=style==="cautious"?1:style==="balanced"?2:style==="bold"?3:4;
    h=Math.floor(Math.random()*(maxDraw+1));a=h;
  } else if(homeWins){h=winGoals();a=loseGoals(h);}
  else{a=winGoals();h=loseGoals(a);}
  return{homeScore:String(h),awayScore:String(a)};
}
function simulateAllMatches(style="balanced"){
  const all={};
  Object.entries(GROUPS).forEach(([g,teams])=>{
    all[g]=[
      {home:teams[0],away:teams[1]},{home:teams[2],away:teams[3]},
      {home:teams[0],away:teams[2]},{home:teams[1],away:teams[3]},
      {home:teams[0],away:teams[3]},{home:teams[1],away:teams[2]},
    ].map(m=>{
      const result=simulateMatch(m.home,m.away,style);
      return{...m,...result};
    });
  });
  return all;
}

// Simulate the full knockout bracket using FIFA rankings + style
function simulateKnockout(r32Bracket, style){
  const newKO={r32:{},r16:{},qf:{},sf:{},final:{},third:null};

  // Simulate R32
  r32Bracket.forEach((match,i)=>{
    if(match.home==="TBD"||match.away==="TBD")return;
    const result=simulateMatch(match.home,match.away,style);
    const homeGoals=parseInt(result.homeScore);
    const awayGoals=parseInt(result.awayScore);
    // In knockout, no draws — if draw, pick winner by rank
    let winner;
    if(homeGoals>awayGoals) winner=match.home;
    else if(awayGoals>homeGoals) winner=match.away;
    else winner=getRank(match.home)>=getRank(match.away)?match.home:match.away;
    newKO.r32[i]=winner;
  });

  // Build R16 matchups from R32 results - official FIFA bracket path
  const r16pairs=[[1,4],[0,2],[3,5],[6,7],[10,11],[8,9],[12,14],[13,15]];
  r16pairs.forEach(([a,b],i)=>{
    const home=newKO.r32[a]||"TBD";
    const away=newKO.r32[b]||"TBD";
    if(home==="TBD"||away==="TBD")return;
    const result=simulateMatch(home,away,style);
    const hg=parseInt(result.homeScore),ag=parseInt(result.awayScore);
    newKO.r16[i]=hg>ag?home:ag>hg?away:getRank(home)>=getRank(away)?home:away;
  });

  // QF
  [[0,1],[2,3],[4,5],[6,7]].forEach(([a,b],i)=>{
    const home=newKO.r16[a]||"TBD";
    const away=newKO.r16[b]||"TBD";
    if(home==="TBD"||away==="TBD")return;
    const result=simulateMatch(home,away,style);
    const hg=parseInt(result.homeScore),ag=parseInt(result.awayScore);
    newKO.qf[i]=hg>ag?home:ag>hg?away:getRank(home)>=getRank(away)?home:away;
  });

  // SF — track losers for 3rd place
  const sfLosers=[];
  [[0,2],[1,3]].forEach(([a,b],i)=>{
    const home=newKO.qf[a]||"TBD";
    const away=newKO.qf[b]||"TBD";
    if(home==="TBD"||away==="TBD")return;
    const result=simulateMatch(home,away,style);
    const hg=parseInt(result.homeScore),ag=parseInt(result.awayScore);
    const winner=hg>ag?home:ag>hg?away:getRank(home)>=getRank(away)?home:away;
    const loser=winner===home?away:home;
    newKO.sf[i]=winner;
    sfLosers.push(loser);
  });

  // Final
  const finHome=newKO.sf[0]||"TBD";
  const finAway=newKO.sf[1]||"TBD";
  if(finHome!=="TBD"&&finAway!=="TBD"){
    const result=simulateMatch(finHome,finAway,style);
    const hg=parseInt(result.homeScore),ag=parseInt(result.awayScore);
    newKO.final[0]=hg>ag?finHome:ag>hg?finAway:getRank(finHome)>=getRank(finAway)?finHome:finAway;
  }

  // 3rd place
  if(sfLosers.length===2){
    const result=simulateMatch(sfLosers[0],sfLosers[1],style);
    const hg=parseInt(result.homeScore),ag=parseInt(result.awayScore);
    newKO.third=hg>ag?sfLosers[0]:ag>hg?sfLosers[1]:getRank(sfLosers[0])>=getRank(sfLosers[1])?sfLosers[0]:sfLosers[1];
  }

  return newKO;
}

function generateGroupMatches(teams){
  return [
    {home:teams[0],away:teams[1],homeScore:"",awayScore:""},
    {home:teams[2],away:teams[3],homeScore:"",awayScore:""},
    {home:teams[0],away:teams[2],homeScore:"",awayScore:""},
    {home:teams[1],away:teams[3],homeScore:"",awayScore:""},
    {home:teams[0],away:teams[3],homeScore:"",awayScore:""},
    {home:teams[1],away:teams[2],homeScore:"",awayScore:""},
  ];
}

function getGroupStandings(teams,matches){
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

function buildR32Bracket(allStandings){
  const pos={};
  Object.entries(allStandings).forEach(([g,s])=>{
    pos[`1${g}`]=s[0]?.team||"TBD";
    pos[`2${g}`]=s[1]?.team||"TBD";
  });
  const allThirds=Object.keys(GROUPS).map(g=>({group:g,...(allStandings[g]?.[2]||{team:"TBD",pts:0,gd:0,gf:0})}))
    .sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);
  const best8=allThirds.slice(0,8);
  const best8Groups=best8.map(t=>t.group).sort().join("");
  const annexRow=ANNEX_C[best8Groups]||null;
  return R32_FIXED.map(match=>{
    let home=match.home,away=match.away;
    if(home.startsWith("1")||home.startsWith("2"))home=pos[home]||"TBD";
    if(away.startsWith("1")||away.startsWith("2"))away=pos[away]||"TBD";
    if(home==="3?"||away==="3?"){
      if(annexRow){
        const winnerKey=match.home.startsWith("1")?match.home:null;
        const idx=winnerKey?ANNEX_IDX[winnerKey]:null;
        const thirdCode=idx!=null?annexRow[idx]:null;
        if(thirdCode){
          const thirdGroup=thirdCode.slice(1);
          const thirdTeam=allStandings[thirdGroup]?.[2]?.team||"TBD";
          if(home==="3?")home=thirdTeam;
          if(away==="3?")away=thirdTeam;
        }else{if(home==="3?")home="TBD";if(away==="3?")away="TBD";}
      }else{if(home==="3?")home="TBD";if(away==="3?")away="TBD";}
    }
    return{matchId:match.id,home,away};
  });
}

function calcAdventurousness(groupMatches,allStandings){
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

function adventLabel(pct){
  if(pct===null)return{label:"Fill in picks to see your style",color:"#888",emoji:"",width:0};
  if(pct<15)return{label:"Cautious",color:C.blue,emoji:"🛡️",width:pct};
  if(pct<35)return{label:"Balanced",color:C.green,emoji:"⚖️",width:pct};
  if(pct<55)return{label:"Bold",color:C.gold,emoji:"🔥",width:pct};
  return{label:"Maverick",color:C.red,emoji:"🚀",width:pct};
}

// ── Points calculation engine ─────────────────────────────────────────────
function calcMatchPoints(predHome, predAway, actualHome, actualAway){
  if(actualHome===null||actualAway===null)return 0;
  if(predHome===null||predAway===null)return 0;
  const ph=parseInt(predHome),pa=parseInt(predAway);
  const ah=parseInt(actualHome),aa=parseInt(actualAway);
  // Exact score
  if(ph===ah&&pa===aa)return 10;
  const predResult=ph>pa?'H':ph<pa?'A':'D';
  const actualResult=ah>aa?'H':ah<aa?'A':'D';
  // Correct result
  if(predResult===actualResult){
    // Correct draw, different score
    if(predResult==='D')return 8;
    // Correct result + correct GD
    if((ph-pa)===(ah-aa))return 8;
    return 6;
  }
  return 0;
}

function calcKOPoints(round, pickedTeam, actualWinner, isDarkHorse){
  if(!actualWinner||!pickedTeam)return 0;
  if(pickedTeam!==actualWinner)return 0;
  const base={r32:12,r16:14,qf:16,sf:18,final:25,third:12}[round]||0;
  const darkBonus=isDarkHorse?{qf:5,sf:10,final:15}[round]||0:0;
  return base+darkBonus;
}

function getKORoundFromId(matchId){
  if(!matchId)return null;
  const parts=matchId.split('-');
  // Format: OF-2026-MM-DD-...
  const month=parseInt(parts[2]);
  const day=parseInt(parts[3]);
  if(month===6||(month===7&&day<=3))return 'r32';
  if(month===7&&day<=7)return 'r16';
  if(month===7&&day<=11)return 'qf';
  if(month===7&&day<=15)return 'sf';
  if(month===7&&day===18)return 'third';
  if(month===7&&day===19)return 'final';
  return null;
}

function useCountdown(){
  const target=new Date("2026-06-11T18:00:00Z").getTime();
  const calc=()=>{
    const diff=Math.max(0,target-Date.now());
    return{d:Math.floor(diff/86400000),h:Math.floor((diff%86400000)/3600000),m:Math.floor((diff%3600000)/60000),s:Math.floor((diff%60000)/1000)};
  };
  const [time,setTime]=useState(calc);
  useEffect(()=>{const id=setInterval(()=>setTime(calc()),1000);return()=>clearInterval(id);},[]);
  return time;
}

const card={background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,overflow:"hidden"};
const inp={width:"100%",boxSizing:"border-box",padding:"10px 12px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,fontSize:14,background:"var(--color-background-primary)",color:"var(--color-text-primary)",outline:"none"};

function AdSlot(){return(<div style={{width:"100%",height:72,background:"var(--color-background-secondary)",border:"0.5px dashed var(--color-border-tertiary)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"1.5rem"}}><span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Advertisement — sponsor@mundialist.com</span></div>);}
function LockBanner(){return(<div style={{display:"flex",gap:10,padding:"11px 14px",background:C.goldLt,border:`0.5px solid ${C.gold}`,borderRadius:10,marginBottom:"1.25rem",fontSize:13,color:"#7a5c10",lineHeight:1.5}}><span>🔒</span><div><strong>All predictions lock at tournament kickoff — June 11, 2026.</strong></div></div>);}

function PlayerSearch({search,setSearch,pick,setPick,filtered,label,pts,color,locked,setLocked,emoji,actualWinner=null}){
  const isCorrect=actualWinner&&pick?.name===actualWinner;
  const isWrong=actualWinner&&pick?.name!==actualWinner;
  if(locked){
    const borderCol=isCorrect?C.green:isWrong?"#ef4444":color;
    const bgCol=isCorrect?C.greenLt:isWrong?"#fef2f2":color+"11";
    return(
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:bgCol,border:`0.5px solid ${borderCol}`,borderRadius:10}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
          <span style={{fontSize:28}}>{pick?.flag||emoji}</span>
          <span style={{fontSize:9,color:"var(--color-text-tertiary)",textAlign:"center"}}>{pick?.nation}</span>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{pick?.name}</div>
          {actualWinner?(
            <div style={{fontSize:12,color:isCorrect?C.green:"#ef4444",fontWeight:500}}>
              {isCorrect?`✓ Correct! +${pts} pts`:`✗ Winner was ${actualWinner}`}
            </div>
          ):(
            <div style={{fontSize:12,color}}>{pts} pts if correct</div>
          )}
        </div>
        {!actualWinner&&<button onClick={()=>setLocked(false)} style={{padding:"4px 10px",background:"none",border:`0.5px solid ${color}`,borderRadius:6,fontSize:11,color,cursor:"pointer"}}>Change</button>}
      </div>
    );
  }
  return(
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${label.toLowerCase()} name...`} style={{width:"100%",boxSizing:"border-box",padding:"10px 12px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,fontSize:14,background:"var(--color-background-primary)",color:"var(--color-text-primary)",outline:"none",marginBottom:8}}/>
      {search.length>0&&(
        <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,overflow:"hidden",marginBottom:10}}>
          {filtered.length>0?filtered.slice(0,6).map(p=>(
            <div key={p.name} onClick={()=>{setPick(p);setSearch(p.name);}} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",gap:10,background:pick?.name===p.name?color+"11":"transparent"}}>
              <span style={{fontSize:20}}>{p.flag}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{p.name}</div><div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{p.nation}</div></div>
              {pick?.name===p.name&&<span style={{fontSize:11,color}}>Selected ✓</span>}
            </div>
          )):<div style={{padding:"10px 14px",fontSize:13,color:"var(--color-text-tertiary)"}}>No results</div>}
        </div>
      )}
      {pick&&(
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:color+"11",border:`0.5px solid ${color}`,borderRadius:8,marginBottom:10}}>
          <span style={{fontSize:22}}>{pick.flag}</span>
          <div><div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{pick.name}</div><div style={{fontSize:11,color}}>{pick.nation} · {pts} pts if correct</div></div>
          <button onClick={()=>{setPick(null);setSearch("");}} style={{marginLeft:"auto",padding:"4px 8px",background:"none",border:`0.5px solid ${color}`,borderRadius:6,fontSize:11,color,cursor:"pointer"}}>Change</button>
        </div>
      )}
      <button onClick={()=>pick&&setLocked(true)} disabled={!pick} style={{width:"100%",padding:"11px",background:pick?color:"var(--color-background-secondary)",color:pick?"#fff":"var(--color-text-tertiary)",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:pick?"pointer":"not-allowed"}}>Lock in pick →</button>
    </div>
  );
}
const NAV=[{label:"Home",page:"home"},{label:"Group Stage",page:"predict"},{label:"Knockout",page:"bracket"},{label:"Bonuses",page:"bonuses"},{label:"My League",page:"league"},{label:"Instructions",page:"points"}];

export default function App(){
  const [page,setPage]=useState("home");
  const [user,setUser]=useState(null);
  const [formName,setFormName]=useState("");
  const [formHandle,setFormHandle]=useState("");
  const [formEmail,setFormEmail]=useState("");
  const [formAgree,setFormAgree]=useState(false);
  const [emailError,setEmailError]=useState("");
  const [agreeError,setAgreeError]=useState(false);
  const [waitlistEmail,setWaitlistEmail]=useState("");
  const [matchdayView,setMatchdayView]=useState(false);
  const [matchdayData,setMatchdayData]=useState([]);
  const [matchdayLoading,setMatchdayLoading]=useState(false);
  const [tournamentAwards,setTournamentAwards]=useState({golden_boot:null,top_assist:null,golden_glove:null});
  const [actualResults,setActualResults]=useState({}); // {matchId: {home, away, status}}
  const [totalPoints,setTotalPoints]=useState(0);
  const [saveStatus,setSaveStatus]=useState(null); // null | 'saving' | 'saved' | 'error'
  const [authMode,setAuthMode]=useState("signup");
  const [pendingJoinCode,setPendingJoinCode]=useState(()=>new URLSearchParams(window.location.search).get('join')||null);
  const [pendingLeagueName,setPendingLeagueName]=useState(null);
  const [googleSession,setGoogleSession]=useState(null);
  const [onboardName,setOnboardName]=useState("");
  const [onboardHandle,setOnboardHandle]=useState(""); // 'signup' | 'signin'
  const [authLoading,setAuthLoading]=useState(false);
  const [authError,setAuthError]=useState("");
  const [formPassword,setFormPassword]=useState("");
  const [waitlistDone,setWaitlistDone]=useState(false);
  const [memberCount,setMemberCount]=useState(0);
  const [simulateStyle,setSimulateStyle]=useState("balanced");
  const [groupMatches,setGroupMatches]=useState(()=>{
    const all={};Object.entries(GROUPS).forEach(([g,teams])=>{all[g]=generateGroupMatches(teams);});return all;
  });
  const [activeGroup,setActiveGroup]=useState("A");
  const [doubleDown,setDoubleDown]=useState({r1:null,r2:null,r3:null});
  const [goldenBootPick,setGoldenBootPick]=useState(null);
  const [goldenBootLocked,setGoldenBootLocked]=useState(false);
  const [bootSearch,setBootSearch]=useState("");
  const [topAssistPick,setTopAssistPick]=useState(null);
  const [topAssistLocked,setTopAssistLocked]=useState(false);
  const [assistSearch,setAssistSearch]=useState("");
  const [goldenGlovePick,setGoldenGlovePick]=useState(null);
  const [goldenGloveLocked,setGoldenGloveLocked]=useState(false);
  const [gloveSearch,setGloveSearch]=useState("");
  const [koPicks,setKoPicks]=useState({r32:{},r16:{},qf:{},sf:{},final:{},third:null});
  const [leagueStep,setLeagueStep]=useState("overview");
  const [leagueCode,setLeagueCode]=useState("");
  const [leagueName,setLeagueName]=useState("");
  const [joinedLeagues,setJoinedLeagues]=useState([]);
  const [activeLeague,setActiveLeague]=useState(null);
  const [viewingUser,setViewingUser]=useState(null);
  const [viewingUserBreakdown,setViewingUserBreakdown]=useState({match:0,ko:0,bonus:0,total:0});
  const [createdCode]=useState("MND26-"+Math.random().toString(36).substring(2,7).toUpperCase());
  const countdown=useCountdown();

  const allStandings=useMemo(()=>{
    const s={};Object.keys(GROUPS).forEach(g=>{s[g]=getGroupStandings(GROUPS[g],groupMatches[g]);});return s;
  },[groupMatches]);

  const r32Bracket=useMemo(()=>buildR32Bracket(allStandings),[allStandings]);
  const r16Matchups=useMemo(()=>R32_TO_R16.map(([i,j],idx)=>({id:idx,home:koPicks.r32[i]||"TBD",away:koPicks.r32[j]||"TBD"})),[koPicks.r32]);
  const qfMatchups=useMemo(()=>[0,1,2,3].map(i=>({id:i,home:koPicks.r16[i*2]||"TBD",away:koPicks.r16[i*2+1]||"TBD"})),[koPicks.r16]);
  const sfMatchups=useMemo(()=>[{id:0,home:koPicks.qf[0]||"TBD",away:koPicks.qf[2]||"TBD"},{id:1,home:koPicks.qf[1]||"TBD",away:koPicks.qf[3]||"TBD"}],[koPicks.qf]);
  const finalMatchup=useMemo(()=>({home:koPicks.sf[0]||"TBD",away:koPicks.sf[1]||"TBD"}),[koPicks.sf]);
  const thirdPlaceMatchup=useMemo(()=>({
    home:sfMatchups[0]&&koPicks.sf[0]?([sfMatchups[0].home,sfMatchups[0].away].find(t=>t!==koPicks.sf[0])||"TBD"):"TBD",
    away:sfMatchups[1]&&koPicks.sf[1]?([sfMatchups[1].home,sfMatchups[1].away].find(t=>t!==koPicks.sf[1])||"TBD"):"TBD",
  }),[sfMatchups,koPicks.sf]);
  const champion=koPicks.final[0]||"TBD";

  const pickKO=(round,id,team)=>{
    setKoPicks(prev=>{
      const isUnselect=prev[round][id]===team;
      const u={...prev,[round]:{...prev[round],[id]:isUnselect?undefined:team}};
      if(isUnselect){delete u[round][id];}
      if(round==="r32"||isUnselect){u.r16={};u.qf={};u.sf={};u.final={};u.third=null;}
      if(round==="r16"){u.qf={};u.sf={};u.final={};}
      if(round==="qf"){u.sf={};u.final={};}
      if(round==="sf"){u.final={};u.third=null;}
      return u;
    });
    saveKOPick(round,id,team);
  };

  const totalPredicted=Object.values(groupMatches).flat().filter(m=>m.homeScore!==""&&m.awayScore!=="").length;
  const doublesSelected=Object.values(doubleDown).filter(Boolean).length;
  const koPicked=Object.values(koPicks).reduce((s,r)=>s+(r===null?0:typeof r==='string'?1:Object.keys(r).length),0);
  const adventScore=useMemo(()=>calcAdventurousness(groupMatches,allStandings),[groupMatches,allStandings]);

  // Recalculate total points whenever relevant state changes
  useEffect(()=>{
    if(user&&Object.keys(actualResults).length>0){
      calcTotalPoints(groupMatches,koPicks,doubleDown,actualResults,goldenBootPick,topAssistPick,goldenGlovePick,tournamentAwards);
    }
  },[groupMatches,koPicks,doubleDown,actualResults,goldenBootPick,topAssistPick,goldenGlovePick,tournamentAwards,user]);
  const adventInfo=adventLabel(adventScore);

  const updateScore=(group,idx,side,val)=>{
    if(val!==""&&(isNaN(val)||parseInt(val)<0||parseInt(val)>99))return;
    setGroupMatches(prev=>{
      const u=[...prev[group]];
      u[idx]={...u[idx],[side]:val};
      const updated={...prev,[group]:u};
      // Auto-save when both scores are filled
      const m=u[idx];
      const home=side==="homeScore"?val:m.homeScore;
      const away=side==="awayScore"?val:m.awayScore;
      if(home!==""&&away!=="")saveGroupPick(group,idx,home,away);
      return updated;
    });
  };
  const setDouble=(rk,gk,idx)=>{
    const id=`${gk}-${idx}`;
    setDoubleDown(prev=>{
      const newVal=prev[rk]===id?null:id;
      const updates={};
      if(rk==="r1")updates.double_down_r1=newVal;
      if(rk==="r2")updates.double_down_r2=newVal;
      if(rk==="r3")updates.double_down_r3=newVal;
      saveBonusPicks(updates);
      return{...prev,[rk]:newVal};
    });
  };
  const simulateAll=async()=>{
    const simMatches=simulateAllMatches(simulateStyle);
    setGroupMatches(simMatches);
    setKoPicks({r32:{},r16:{},qf:{},sf:{},final:{},third:null});
    // Save all simulated scores to Supabase
    if(user?.id){
      const saves=[];
      Object.entries(simMatches).forEach(([group,matches])=>{
        matches.forEach((m,idx)=>{
          if(m.homeScore!==''&&m.awayScore!==''){
            saves.push(saveGroupPick(group,idx,m.homeScore,m.awayScore));
          }
        });
      });
      await Promise.all(saves);
    }
  };
  const [showClearConfirm,setShowClearConfirm]=useState(false);
  const [showClearKOConfirm,setShowClearKOConfirm]=useState(false);
  const [showBracketChanged,setShowBracketChanged]=useState(false);
  const prevR32Ref=useRef(null);
  const bracketInitializedRef=useRef(false);
  const sessionLoadedRef=useRef(false);
  const clearKO=async()=>{
    setKoPicks({r32:{},r16:{},qf:{},sf:{},final:{},third:null});
    setShowClearKOConfirm(false);
    showSaving();
    await supabase.from('predictions').delete().eq('user_id',user.id).like('match_id','KO-%');
    showSaved();
  };
  const clearAll=async()=>{
    const all={};Object.entries(GROUPS).forEach(([g,teams])=>{all[g]=generateGroupMatches(teams);});
    setGroupMatches(all);
    setDoubleDown({r1:null,r2:null,r3:null});
    setKoPicks({r32:{},r16:{},qf:{},sf:{},final:{},third:null});
    setGoldenBootPick(null);setGoldenBootLocked(false);setBootSearch("");
    setTopAssistPick(null);setTopAssistLocked(false);setAssistSearch("");
    setGoldenGlovePick(null);setGoldenGloveLocked(false);setGloveSearch("");
    setShowClearConfirm(false);
    showSaving();
    await supabase.from('predictions').delete().eq('user_id',user.id);
    await supabase.from('bonus_picks').delete().eq('user_id',user.id);
    showSaved();
  };
  const validateEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const handleCreate=async()=>{
    let ok=true;
    if(!formName.trim()||!formHandle.trim())return;
    if(!validateEmail(formEmail)){setEmailError("Please enter a valid email");ok=false;}
    if(!formAgree){setAgreeError(true);ok=false;}
    if(!ok)return;
    setEmailError("");setAgreeError(false);setAuthLoading(true);setAuthError("");
    try {
      // Sign up with Supabase auth
      const {data,error}=await supabase.auth.signUp({
        email:formEmail,
        password:formPassword||formEmail+formName, // temp password if not set
        options:{data:{name:formName,handle:formHandle.replace("@","")}}
      });
      if(error)throw error;
      // Insert user profile
      if(data.user){
        await supabase.from("users").upsert({
          id:data.user.id,
          name:formName,
          handle:formHandle.replace("@",""),
          email:formEmail,
          avatar_letter:formName[0].toUpperCase(),
        });
        // Auto-join global league
        await supabase.from("league_members").upsert({league_id:"00000000-0000-0000-0000-000000000001",user_id:data.user.id,total_points:0},{onConflict:"league_id,user_id"});
      }
      setUser({name:formName,handle:"@"+formHandle.replace("@",""),email:formEmail,avatar:formName[0].toUpperCase(),id:data.user?.id});
      setJoinedLeagues([{id:"global",name:"Global League",members:leagueMembers.length||memberCount||0,rank:1,code:null}]);
      setPage("predict");window.scrollTo(0,0);
    } catch(err){
      setAuthError(err.message||"Sign up failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn=async()=>{
    try{
      const {error}=await supabase.auth.signInWithOAuth({
        provider:'google',
        options:{redirectTo:window.location.origin}
      });
      if(error)throw error;
    }catch(e){setAuthError(e.message||"Google sign in failed");}
  };

  const handleGoogleOnboard=async()=>{
    if(!onboardName.trim()||!onboardHandle.trim()||!googleSession)return;
    const uid=googleSession.user.id;
    const avatarLetter=onboardName[0].toUpperCase();
    const handle=onboardHandle.toLowerCase().replace(/[^a-z0-9_]/g,"");
    try{
      await supabase.from("users").upsert({id:uid,name:onboardName,handle,email:googleSession.user.email,avatar_letter:avatarLetter});
      await supabase.from("league_members").upsert({league_id:"00000000-0000-0000-0000-000000000001",user_id:uid,total_points:0},{onConflict:"league_id,user_id"});
      setUser({name:onboardName,handle:"@"+handle,email:googleSession.user.email,avatar:avatarLetter,id:uid});
      setJoinedLeagues([{id:"global",name:"Global League",members:leagueMembers.length||memberCount||0,rank:1,code:null}]);
      loadUserData(uid);loadActualResults();loadJoinedLeagues(uid);
      setAuthMode("signup");setGoogleSession(null);setPage("predict");
    }catch(e){setAuthError(e.message||"Failed to create profile");}
  };

    const handleSignIn=async()=>{
    if(!validateEmail(formEmail)){setEmailError("Please enter a valid email");return;}
    setAuthLoading(true);setAuthError("");
    try {
      const {data,error}=await supabase.auth.signInWithPassword({
        email:formEmail,
        password:formPassword,
      });
      if(error)throw error;
      // Load user profile
      const {data:profile}=await supabase.from("users").select("*").eq("id",data.user.id).single();
      if(profile){
        setUser({name:profile.name,handle:"@"+profile.handle,email:profile.email,avatar:profile.avatar_letter||profile.name[0].toUpperCase(),id:data.user.id});
        setJoinedLeagues([{id:"global",name:"Global League",members:leagueMembers.length||memberCount||0,rank:1,code:null}]);
        loadUserData(data.user.id);
        loadActualResults();
        setPage("predict");setTimeout(()=>window.scrollTo({top:0,behavior:"instant"}),100);
      }
    } catch(err){
      setAuthError(err.message||"Sign in failed. Please check your email and password.");
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Save helpers ──────────────────────────────────────────────────────────
  const showSaved=()=>{setSaveStatus('saved');setTimeout(()=>setSaveStatus(null),2000);};
  const showSaving=()=>{setSaveStatus('saving');setTimeout(()=>setSaveStatus(s=>s==='saving'?null:s),5000);};
  const showError=()=>{setSaveStatus('error');setTimeout(()=>setSaveStatus(null),3000);};

  const saveGroupPick=async(group,idx,homeScore,awayScore)=>{
    if(!user?.id)return;
    showSaving();
    const {error}=await supabase.from('predictions').upsert({
      user_id:user.id,
      match_id:`GS-${group}-${idx}`,
      home_score:parseInt(homeScore)||0,
      away_score:parseInt(awayScore)||0,
    },{onConflict:'user_id,match_id'});
    if(error){console.error('saveGroupPick error:',error);showError();}
    else showSaved();
  };

  const saveKOPick=async(round,id,team)=>{
    if(!user?.id)return;
    showSaving();
    const {error}=await supabase.from('predictions').upsert({
      user_id:user.id,
      match_id:`KO-${round}-${id}`,
      advancing_team:team,
    },{onConflict:'user_id,match_id'});
    if(error){console.error('saveKOPick error:',error);showError();}
    else showSaved();
  };

  const saveBonusPicks=async(updates)=>{
    if(!user?.id)return;
    showSaving();
    const {error}=await supabase.from('bonus_picks').upsert({
      user_id:user.id,
      ...updates,
    },{onConflict:'user_id'});
    if(error){console.error('saveBonusPicks error:',error);showError();}
    else showSaved();
  };

  const saveWaitlistEmail=async(email)=>{
    try{
      await supabase.from('waitlist').upsert({email},{onConflict:'email'});
    }catch(e){console.error('Waitlist save failed',e);}
  };

  // ── Load actual match results from DB ────────────────────────────────────
  const loadTournamentAwards=async()=>{
    const {data}=await supabase.from('tournament_awards').select('*').eq('id','wc2026').maybeSingle();
    if(data) setTournamentAwards({golden_boot:data.golden_boot,top_assist:data.top_assist,golden_glove:data.golden_glove});
  };

  const loadActualResults=async()=>{
    const {data}=await supabase.from('matches').select('id,home_team,away_team,actual_home,actual_away,status,stage,group_name,match_day');
    if(data){
      const map={};
      data.forEach(m=>{map[m.id]=m;});
      setActualResults(map);
    }
  };

  // ── Calculate total points ────────────────────────────────────────────────
  const calcTotalPoints=useCallback((groupMatchesData, koPicked, doubleDownData, actualResultsData, goldenBootPickData, topAssistPickData, goldenGlovePickData, tournamentAwardsData)=>{
    let total=0;
    const actualArr=Object.values(actualResultsData);

    // 1. Group stage match points
    Object.entries(GROUPS).forEach(([g])=>{
      const matches=groupMatchesData[g]||[];
      matches.forEach((m,idx)=>{
        const actual=actualArr.find(r=>r.home_team===m.home&&r.away_team===m.away&&r.status==='finished');
        if(!actual)return;
        let pts=calcMatchPoints(m.homeScore,m.awayScore,actual.actual_home,actual.actual_away);
        const doubleId=`${g}-${idx}`;
        if(Object.values(doubleDownData).includes(doubleId))pts*=2;
        total+=pts;
      });
    });

    // 2. Group standings points (5/3 for top 2, 2 for correct 3rd place qualifier)
    Object.entries(GROUPS).forEach(([g,teams])=>{
      const groupActual=actualArr.filter(r=>r.status==='finished'&&r.group_name===g);
      if(groupActual.length<6)return;
      // Build actual standings
      const ap={};teams.forEach(t=>{ap[t]={pts:0,gd:0,gf:0};});
      groupActual.forEach(r=>{
        const h=r.actual_home,a=r.actual_away;
        if(h>a){ap[r.home_team].pts+=3;}else if(h<a){ap[r.away_team].pts+=3;}else{ap[r.home_team].pts+=1;ap[r.away_team].pts+=1;}
        ap[r.home_team].gd+=h-a;ap[r.away_team].gd+=a-h;
        ap[r.home_team].gf+=h;ap[r.away_team].gf+=a;
      });
      const actualStandings=teams.slice().sort((a,b)=>ap[b].pts-ap[a].pts||ap[b].gd-ap[a].gd||ap[b].gf-ap[a].gf);
      // Build user predicted standings
      const up={};teams.forEach(t=>{up[t]={pts:0,gd:0,gf:0};});
      (groupMatchesData[g]||[]).forEach(m=>{
        if(m.homeScore===''||m.awayScore==='')return;
        const h=parseInt(m.homeScore),a=parseInt(m.awayScore);
        if(h>a){up[m.home].pts+=3;}else if(h<a){up[m.away].pts+=3;}else{up[m.home].pts+=1;up[m.away].pts+=1;}
        up[m.home].gd+=h-a;up[m.away].gd+=a-h;
        up[m.home].gf+=h;up[m.away].gf+=a;
      });
      const userStandings=teams.slice().sort((a,b)=>up[b].pts-up[a].pts||up[b].gd-up[a].gd||up[b].gf-up[a].gf);
      // 5/3 pts for top 2
      const a1=actualStandings[0],a2=actualStandings[1],u1=userStandings[0],u2=userStandings[1];
      if(u1===a1&&u2===a2)total+=5;
      else if(u1===a2&&u2===a1)total+=3;
      // 2 pts for correct 3rd place if they qualify (handled by tournament data)
      // We award 2 pts if user predicted 3rd matches actual 3rd AND they qualified
      if(userStandings[2]&&actualStandings[2]&&userStandings[2]===actualStandings[2]){
        // Check if this 3rd place team actually qualified (in actualResults as a KO team)
        const qualified=actualArr.some(r=>r.stage==='r32'&&r.status==='finished'&&(r.home_team===actualStandings[2]||r.away_team===actualStandings[2]));
        if(qualified)total+=2;
      }
    });

    // 3. KO round points - derive round from match ID date
    ['r32','r16','qf','sf'].forEach(round=>{
      Object.entries(koPicked[round]||{}).forEach(([,team])=>{
        const actual=actualArr.find(r=>{
          if(r.status!=='finished'||r.stage!=='knockout')return false;
          const roundFromId=getKORoundFromId(r.id);
          return roundFromId===round&&(r.home_team===team||r.away_team===team);
        });
        if(!actual)return;
        const winner=actual.actual_home>actual.actual_away?actual.home_team:actual.away_team;
        if(team===winner)total+=calcKOPoints(round,team,winner,!SEEDED.has(team));
      });
    });

    // Final - champion (25pts) and runner-up (20pts)
    const finalActual=actualArr.find(r=>r.stage==='knockout'&&r.status==='finished'&&getKORoundFromId(r.id)==='final');
    if(finalActual){
      const champion=finalActual.actual_home>finalActual.actual_away?finalActual.home_team:finalActual.away_team;
      const runnerUp=champion===finalActual.home_team?finalActual.away_team:finalActual.home_team;
      if(koPicked.final?.[0]===champion)total+=calcKOPoints('final',champion,champion,!SEEDED.has(champion));
      const sfWinners=Object.values(koPicked.sf||{});
      const pickedRunnerUp=sfWinners.find(t=>t!==koPicked.final?.[0])||null;
      if(pickedRunnerUp===runnerUp)total+=20;
    }

    // Third place match
    const thirdActual=actualArr.find(r=>r.stage==='knockout'&&r.status==='finished'&&getKORoundFromId(r.id)==='third');
    if(thirdActual&&koPicked.third){
      const thirdWinner=thirdActual.actual_home>thirdActual.actual_away?thirdActual.home_team:thirdActual.away_team;
      if(koPicked.third===thirdWinner)total+=calcKOPoints('third',koPicked.third,thirdWinner,!SEEDED.has(koPicked.third));
    }

    // 4. Bonus picks (15pts each)
    if(tournamentAwardsData?.golden_boot&&goldenBootPickData?.name===tournamentAwardsData.golden_boot)total+=15;
    if(tournamentAwardsData?.top_assist&&topAssistPickData?.name===tournamentAwardsData.top_assist)total+=15;
    if(tournamentAwardsData?.golden_glove&&goldenGlovePickData?.name===tournamentAwardsData.golden_glove)total+=15;

    setTotalPoints(total);
    return total;
  },[]);

  // ── Load existing predictions on sign in ──────────────────────────────────
  const loadUserData=async(userId)=>{
    try{
      // Load group predictions
      const {data:preds}=await supabase.from('predictions')
        .select('*').eq('user_id',userId);
      if(preds?.length){
        const newMatches={};
        Object.entries(GROUPS).forEach(([g,teams])=>{
          newMatches[g]=generateGroupMatches(teams);
        });
        const newKO={r32:{},r16:{},qf:{},sf:{},final:{},third:null};
        preds.forEach(p=>{
          if(p.match_id?.startsWith('GS-')){
            const [,g,idx]=p.match_id.split('-');
            if(newMatches[g]?.[parseInt(idx)]){
              newMatches[g][parseInt(idx)].homeScore=String(p.home_score??'');
              newMatches[g][parseInt(idx)].awayScore=String(p.away_score??'');
            }
          }
          if(p.match_id?.startsWith('KO-')&&p.advancing_team){
            const parts=p.match_id.split('-');
            const round=parts[1];
            const id=parts[2];
            if(round==='third') newKO.third=p.advancing_team;
            else if(newKO[round]!==undefined) newKO[round][parseInt(id)]=p.advancing_team;
          }
        });
        setGroupMatches(newMatches);
        setKoPicks(newKO);
      }
      // Load bonus picks
      const {data:bonus}=await supabase.from('bonus_picks')
        .select('*').eq('user_id',userId).single();
      if(bonus){
        if(bonus.golden_boot_player){setGoldenBootPick({name:bonus.golden_boot_player,nation:'',flag:'⚽'});setGoldenBootLocked(bonus.golden_boot_locked||false);}
        if(bonus.top_assist_player){setTopAssistPick({name:bonus.top_assist_player,nation:'',flag:'🎯'});setTopAssistLocked(bonus.top_assist_locked||false);}
        if(bonus.golden_glove_player){setGoldenGlovePick({name:bonus.golden_glove_player,nation:'',flag:'🧤'});setGoldenGloveLocked(bonus.golden_glove_locked||false);}
        if(bonus.double_down_r1)setDoubleDown(prev=>({...prev,r1:bonus.double_down_r1}));
        if(bonus.double_down_r2)setDoubleDown(prev=>({...prev,r2:bonus.double_down_r2}));
        if(bonus.double_down_r3)setDoubleDown(prev=>({...prev,r3:bonus.double_down_r3}));
      }
    }catch(e){console.error('Load failed',e);}
  };

  // Listen for auth state changes (handles OAuth redirects)
  useEffect(()=>{
    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
      if((event==="SIGNED_IN"||event==="INITIAL_SESSION")&&session?.user){
        const uid=session.user.id;
        const meta=session.user.user_metadata;
        const {data:profile}=await supabase.from("users").select("*").eq("id",uid).single();
        if(profile){
          setUser({name:profile.name,handle:"@"+profile.handle,email:profile.email,avatar:profile.avatar_letter||profile.name?.[0]?.toUpperCase()||"?",id:uid});
          setJoinedLeagues([{id:"global",name:"Global League",members:leagueMembers.length||memberCount||0,rank:1,code:null}]);
          sessionLoadedRef.current=true;
          loadUserData(uid);loadActualResults();loadJoinedLeagues(uid);
          setPage("predict");
        } else if(meta?.full_name||session.user.email){
          setGoogleSession(session);
          setOnboardName(meta?.full_name||"");
          setOnboardHandle((meta?.full_name||"user").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,12));
          setAuthMode("google_onboard");
        }
      }
    });
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(pendingJoinCode){supabase.from('leagues').select('name').eq('invite_code',pendingJoinCode).single().then(({data})=>{if(data?.name)setPendingLeagueName(data.name);});}
  },[pendingJoinCode]);

  // Detect when R32 bracket changes due to group score edits
  useEffect(()=>{
    const prev=prevR32Ref.current;
    if(prev&&bracketInitializedRef.current){
      const changed=r32Bracket.some((m,i)=>m.home!==prev[i]?.home||m.away!==prev[i]?.away);
      const hasKOPicks=Object.keys(koPicks.r32).length>0||Object.keys(koPicks.r16).length>0;
      if(changed&&hasKOPicks)setShowBracketChanged(true);
    }
    prevR32Ref.current=r32Bracket.map(m=>({home:m.home,away:m.away}));
    // Mark as initialized after first render with real data
    if(r32Bracket.some(m=>m.home!=="TBD")){
      bracketInitializedRef.current=true;
    }
  },[r32Bracket]);

  // Check for existing session on load
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        supabase.from("users").select("*").eq("id",session.user.id).single().then(({data:profile})=>{
          if(profile){
            setUser({name:profile.name,handle:"@"+profile.handle,email:profile.email,avatar:profile.avatar_letter||profile.name[0].toUpperCase(),id:session.user.id});
            setJoinedLeagues([{id:"global",name:"Global League",members:leagueMembers.length||memberCount||0,rank:1,code:null}]);
            if(sessionLoadedRef.current)return;
            loadUserData(session.user.id);
            loadActualResults();
            // Pre-load global league member count
            supabase.from('league_members').select('user_id').eq('league_id','00000000-0000-0000-0000-000000000001').then(({data})=>{
              if(data?.length)setJoinedLeagues(prev=>prev.map(l=>l.id==="global"?{...l,members:data.length}:l));
            });
            setTimeout(()=>window.scrollTo({top:0,behavior:"instant"}),200);
          }
        });
      }
    });
  },[]);

  // Reload actual results whenever user logs in + scroll to top
  useEffect(()=>{
    if(user?.id){
      loadActualResults();
      loadTournamentAwards();
      window.scrollTo(0,0);document.documentElement.scrollTop=0;document.body.scrollTop=0;
    }
  },[user?.id]);

  // ── Load matchday picks ──────────────────────────────────────────────────
  const loadJoinedLeagues=async(userId)=>{
    try{
      const {data}=await supabase
        .from('league_members')
        .select('league_id, leagues(id,name,invite_code)')
        .eq('user_id',userId);
      if(!data?.length)return;
      const leagueIds=data.map(d=>d.leagues.id);
      // Get member counts for all leagues in one query
      const {data:counts}=await supabase
        .from('league_members')
        .select('league_id')
        .in('league_id',leagueIds);
      const countMap={};
      (counts||[]).forEach(r=>{countMap[r.league_id]=(countMap[r.league_id]||0)+1;});
      const leagues=data.map(d=>({
        id:d.leagues.id,
        name:d.leagues.name,
        code:d.leagues.invite_code==='MND26-GLOBAL'?null:d.leagues.invite_code,
        members:countMap[d.leagues.id]||0,
        rank:1,
      }));
      // Always put global first
      const global=leagues.find(l=>l.id==='00000000-0000-0000-0000-000000000001');
      const others=leagues.filter(l=>l.id!=='00000000-0000-0000-0000-000000000001');
      setJoinedLeagues(global?[global,...others]:others);
    }catch(e){console.error('loadJoinedLeagues error:',e);}
  };

  const loadMatchdayPicks=async(leagueId)=>{
    setMatchdayLoading(true);
    try{
      const lid=leagueId==='global'?'00000000-0000-0000-0000-000000000001':leagueId;
      const {data:members}=await supabase.from('league_members').select('user_id').eq('league_id',lid);
      if(!members?.length){setMatchdayData([]);return;}
      const memberIds=members.map(m=>m.user_id);

      // Get today's matches from DB
      const today=new Date().toISOString().split('T')[0];
      const {data:todayMatches}=await supabase.from('matches')
        .select('id,home_team,away_team,actual_home,actual_away,status,stage,group_name,venue,city,kickoff')
        .eq('stage','group')
        .gte('kickoff',today+'T00:00:00Z')
        .lte('kickoff',today+'T23:59:59Z')
        .order('kickoff');

      // Fallback: if no matches today use all group matches that are finished or upcoming
      const matches=todayMatches?.length?todayMatches:
        Object.values(actualResults).filter(r=>r.stage==='group').slice(0,4);

      // Get all predictions for these members
      const [{data:profiles},{data:preds}]=await Promise.all([
        supabase.from('users').select('id,name,handle,avatar_letter').in('id',memberIds),
        supabase.from('predictions').select('user_id,match_id,home_score,away_score,is_double_down')
          .in('user_id',memberIds),
      ]);

      const profileMap={};
      (profiles||[]).forEach(p=>{profileMap[p.id]=p;});
      const predMap={};
      (preds||[]).forEach(p=>{
        if(!predMap[p.user_id])predMap[p.user_id]={};
        predMap[p.user_id][p.match_id]={home:p.home_score,away:p.away_score,dd:p.is_double_down};
      });

      // Build member rows with their picks for today's matches
      const rows=memberIds.map(uid=>{
        const profile=profileMap[uid]||{};
        const picks={};
        (matches||[]).forEach((m,i)=>{
          // Find match ID in predictions
          const grp=m.group_name;
          const teams=GROUPS[grp]||[];
          const gMatches=generateGroupMatches(teams);
          const idx=gMatches.findIndex(gm=>gm.home===m.home_team&&gm.away===m.away_team);
          const matchId=idx>=0?`GS-${grp}-${idx}`:null;
          picks[i]=matchId&&predMap[uid]?.[matchId]?predMap[uid][matchId]:null;
        });
        return{
          id:uid,
          name:profile.name||'Unknown',
          handle:'@'+(profile.handle||'?'),
          avatar:profile.avatar_letter||profile.name?.[0]?.toUpperCase()||'?',
          isMe:uid===user?.id,
          picks,
        };
      }).sort((a,b)=>a.isMe?-1:b.isMe?1:0);

      setMatchdayData({matches:matches||[],rows});
    }catch(e){
      console.error('loadMatchdayPicks error:',e);
    }finally{
      setMatchdayLoading(false);
    }
  };

  // Load league members when active league changes
  useEffect(()=>{
    if(activeLeague?.id&&Object.keys(actualResults).length>=0){
      loadLeagueMembers(activeLeague.id);
    }
  },[activeLeague?.id, JSON.stringify(Object.keys(actualResults))]);

  const filteredBoot=bootSearch.length>0?GOLDEN_BOOT_PLAYERS.filter(p=>p.name.toLowerCase().includes(bootSearch.toLowerCase())||p.nation.toLowerCase().includes(bootSearch.toLowerCase())):[];
  const filteredAssist=assistSearch.length>0?GOLDEN_BOOT_PLAYERS.filter(p=>p.name.toLowerCase().includes(assistSearch.toLowerCase())||p.nation.toLowerCase().includes(assistSearch.toLowerCase())):[];
  const filteredGlove=gloveSearch.length>0?GOLDEN_GLOVE_PLAYERS.filter(p=>p.name.toLowerCase().includes(gloveSearch.toLowerCase())||p.nation.toLowerCase().includes(gloveSearch.toLowerCase())):[];

  const [leagueMembers,setLeagueMembers]=useState([]);
  const [leagueMembersLoading,setLeagueMembersLoading]=useState(false);

  const loadLeagueMembers=async(leagueId)=>{
    setLeagueMembersLoading(true);
    try{
      // Get all members of this league
      const {data:members}=await supabase
        .from('league_members')
        .select('user_id, total_points')
        .eq('league_id', leagueId==='global'?'00000000-0000-0000-0000-000000000001':leagueId);
      if(!members?.length){setLeagueMembers([]);setLeagueMembersLoading(false);return;}

      // Load profiles and bonus picks for each member
      const memberIds=members.map(m=>m.user_id);
      const [{data:profiles},{data:bonuses},{data:preds}]=await Promise.all([
        supabase.from('users').select('id,name,handle,avatar_letter').in('id',memberIds),
        supabase.from('bonus_picks').select('user_id,golden_boot_player,top_assist_player,golden_glove_player,ko_picks').in('user_id',memberIds),
        supabase.from('predictions').select('user_id,match_id,home_score,away_score,is_double_down,advancing_team').in('user_id',memberIds),
      ]);

      const profileMap={};
      (profiles||[]).forEach(p=>{profileMap[p.id]=p;});
      const bonusMap={};
      (bonuses||[]).forEach(b=>{bonusMap[b.user_id]=b;});
      const predMap={};
      (preds||[]).forEach(p=>{
        if(!predMap[p.user_id])predMap[p.user_id]=[];
        predMap[p.user_id].push(p);
      });

      // Calculate points for each member
      const withPoints=members.map(m=>{
        const profile=profileMap[m.user_id]||{};
        const bonus=bonusMap[m.user_id]||{};
        const userPreds=predMap[m.user_id]||[];

        // Count group picks
        const groupDone=userPreds.filter(p=>p.match_id?.startsWith('GS-')&&p.home_score!==null).length;

        // Calculate points from predictions vs actual results
        let pts=0;
        userPreds.forEach(p=>{
          if(p.match_id?.startsWith('GS-')){
            const parts=p.match_id.split('-');
            const grp=parts[1];
            const idx=parseInt(parts[2]);
            const teams=GROUPS[grp];
            if(!teams)return;
            const matchDef=generateGroupMatches(teams)[idx];
            if(!matchDef)return;
            const actual=Object.values(actualResults).find(r=>
              r.home_team===matchDef.home&&r.away_team===matchDef.away&&r.status==='finished'
            );
            if(actual){
              let matchPts=calcMatchPoints(p.home_score,p.away_score,actual.actual_home,actual.actual_away);
              if(p.is_double_down)matchPts*=2;
              pts+=matchPts;
            }
          }
        });

        // Get champion pick from predictions (KO-final-0)
        const finalPred=userPreds.find(p=>p.match_id==='KO-final-0');
        const championPick=finalPred?.advancing_team||null;



        // Get champion, runner-up and 3rd place from KO predictions
        const finalPred2=userPreds.find(p=>p.match_id==='KO-final-0');
        const championPick2=finalPred2?.advancing_team||null;
        const thirdPred=userPreds.find(p=>p.match_id==='KO-third'||p.match_id==='KO-third-0');
        // Runner-up: both SF winners go to final, the one who doesn't win is runner-up
        const sfWinners=userPreds.filter(p=>p.match_id?.startsWith('KO-sf-')&&p.advancing_team).map(p=>p.advancing_team);
        const runnerUpPick=championPick2&&sfWinners.length===2?sfWinners.find(t=>t!==championPick2)||null:null;

        // Double-down matches
        const doubleDowns=[];
        if(bonus.double_down_r1){
          const parts=bonus.double_down_r1.split('-');
          const grp=parts[0],idx=parseInt(parts[1]);
          const teams=GROUPS[grp];
          if(teams){const m2=generateGroupMatches(teams)[idx];if(m2)doubleDowns.push(`MD1: ${m2.home} vs ${m2.away}`);}
        }
        if(bonus.double_down_r2){
          const parts=bonus.double_down_r2.split('-');
          const grp=parts[0],idx=parseInt(parts[1]);
          const teams=GROUPS[grp];
          if(teams){const m2=generateGroupMatches(teams)[idx];if(m2)doubleDowns.push(`MD2: ${m2.home} vs ${m2.away}`);}
        }
        if(bonus.double_down_r3){
          const parts=bonus.double_down_r3.split('-');
          const grp=parts[0],idx=parseInt(parts[1]);
          const teams=GROUPS[grp];
          if(teams){const m2=generateGroupMatches(teams)[idx];if(m2)doubleDowns.push(`MD3: ${m2.home} vs ${m2.away}`);}
        }

        return{
          id:m.user_id,
          name:profile.name||"Unknown",
          handle:"@"+(profile.handle||"unknown"),
          avatar:profile.avatar_letter||profile.name?.[0]?.toUpperCase()||"?",
          pts,
          picks:{
            groupDone,
            champion:championPick2||championPick,
            runnerUp:runnerUpPick,
            thirdPlace:thirdPred?.advancing_team||null,
            goldenBoot:bonus.golden_boot_player||null,
            topAssist:bonus.top_assist_player||null,
            goldenGlove:bonus.golden_glove_player||null,
            doubleDowns,
          },
          isMe:m.user_id===user?.id,
        };
      }).sort((a,b)=>b.pts-a.pts||b.picks.groupDone-a.picks.groupDone);

      setLeagueMembers(withPoints);
      // Update member count in joinedLeagues
      setJoinedLeagues(prev=>prev.map(l=>{
        const lid=l.id==="global"?"00000000-0000-0000-0000-000000000001":l.id;
        return lid===leagueId?{...l,members:withPoints.length}:l;
      }));
    }catch(e){
      console.error('loadLeagueMembers error:',e);
    }finally{
      setLeagueMembersLoading(false);
    }
  };

  // ── Shared match card for knockout ──
  function KOCard({home,away,picked,onPick,label,gold=false,actualWinner=null,roundKey=null,venue=null,city=null}){
    const isFinished=actualWinner!==null;
    const pickedCorrect=isFinished&&picked&&picked===actualWinner;
    const pickedWrong=isFinished&&picked&&picked!==actualWinner;
    const ptMap={r32:12,r16:14,qf:16,sf:18,final:25,third:12};
    const ptsEarned=pickedCorrect?(ptMap[roundKey]||0):0;
    const borderColor=pickedCorrect?C.green:pickedWrong?"#ef4444":picked?C.blue:gold?C.gold:"var(--color-border-tertiary)";
    return(
      <div style={{background:"var(--color-background-primary)",border:`${gold?"2px":"1.5px"} solid ${borderColor}`,borderRadius:8,overflow:"hidden",width:"100%",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
        {label&&<div style={{padding:"3px 8px",background:pickedCorrect?C.greenLt:pickedWrong?"#fef2f2":"var(--color-background-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:9,color:pickedCorrect?C.green:pickedWrong?"#ef4444":"var(--color-text-tertiary)",fontWeight:500,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{label}{venue?` · ${venue}, ${city}`:""}</span>
          {isFinished&&picked&&<span style={{fontWeight:600}}>{pickedCorrect?"+"+ptsEarned+" pts ✓":"0 pts ✗"}</span>}
        </div>}
        {[home,away].map((team,ti)=>{
          const isWinner=isFinished&&team===actualWinner;
          const isLoser=isFinished&&team!==actualWinner&&team!=="TBD";
          return(
            <div key={ti} onClick={()=>!isFinished&&team!=="TBD"&&onPick&&onPick(team)}
              style={{padding:"5px 7px",display:"flex",alignItems:"center",gap:5,
                cursor:!isFinished&&team!=="TBD"&&onPick?"pointer":"default",
                background:picked===team?(gold?C.goldLt:C.blueLt):"transparent",
                borderBottom:ti===0?"0.5px solid var(--color-border-tertiary)":"none",
                opacity:isLoser?0.45:1}}>
              <span style={{fontSize:13}}>{FLAGS[team]||"❓"}</span>
              <span style={{flex:1,fontSize:10,fontWeight:picked===team||isWinner?600:400,
                color:isWinner?C.green:picked===team?(gold?"#7a5c10":C.blue):"var(--color-text-primary)",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team}</span>
              {isWinner&&<span style={{fontSize:9,color:C.green,fontWeight:700}}>✓</span>}
              {!isFinished&&!SEEDED.has(team)&&team!=="TBD"&&roundKey!=="r32"&&<span style={{fontSize:8,color:C.gold}}>★</span>}
              {picked===team&&!isFinished&&<span style={{fontSize:9,color:gold?"#7a5c10":C.blue,fontWeight:700}}>✓</span>}
            </div>
          );
        })}
      </div>
    );
  }

  const r32AllTBD=r32Bracket.every(m=>m.home==="TBD"&&m.away==="TBD");
  const isMobile=typeof window!=="undefined"&&window.innerWidth<768;
  const [windowWidth,setWindowWidth]=useState(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{
    const handle=()=>setWindowWidth(window.innerWidth);
    window.addEventListener('resize',handle);
    return()=>window.removeEventListener('resize',handle);
  },[]);
  const mobile=windowWidth<768;
  const [koRound,setKoRound]=useState("r32");
  const [r32Open,setR32Open]=useState(false);
  const [showUserMenu,setShowUserMenu]=useState(false);

  // Get actual winner for a KO match from Supabase matches table
  const getKOWinner=(home,away)=>{
    if(home==="TBD"||away==="TBD")return null;
    const actual=Object.values(actualResults).find(r=>
      ((r.home_team===home&&r.away_team===away)||(r.home_team===away&&r.away_team===home))
      &&r.stage!=='group'&&r.status==='finished'
    );
    if(!actual||actual.actual_home===null||actual.actual_away===null)return null;
    return actual.actual_home>actual.actual_away?actual.home_team:
           actual.actual_away>actual.actual_home?actual.away_team:null;
  };

  return(
    <div style={{minHeight:"100vh",background:"var(--color-background-tertiary)",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* ── Save toast ── */}
      {saveStatus&&(
        <div style={{position:"fixed",bottom:mobile?"calc(72px + env(safe-area-inset-bottom))":24,right:24,zIndex:999,padding:"10px 16px",borderRadius:10,fontSize:13,fontWeight:500,
          background:saveStatus==="saved"?C.green:saveStatus==="error"?"#ef4444":"var(--color-background-secondary)",
          color:saveStatus==="saving"?"var(--color-text-primary)":"#fff",
          border:`0.5px solid ${saveStatus==="saved"?C.green:saveStatus==="error"?"#ef4444":"var(--color-border-tertiary)"}`,
          boxShadow:"0 4px 12px rgba(0,0,0,0.15)",transition:"all 0.2s"}}>
          {saveStatus==="saving"?"Saving...":saveStatus==="saved"?"✓ Saved":"⚠ Save failed"}
        </div>
      )}

      {/* ── Fixed Nav ── */}
      {user&&(
        <>
          {/* Desktop nav */}
          {!mobile&&(
            <nav style={{background:"#ffffff",borderBottom:"0.5px solid #e5e7eb",position:"fixed",top:0,left:0,right:0,zIndex:9999,height:56}}>
              <div style={{maxWidth:1280,margin:"0 auto",padding:"0 1.5rem",display:"flex",alignItems:"center",gap:"1rem",height:"100%"}}>
                <span style={{fontSize:18,fontWeight:700,letterSpacing:"-0.04em",color:C.blue,cursor:"pointer",marginRight:"auto"}} onClick={()=>setPage("home")}>Mundialist</span>
                {NAV.map(({label,page:p})=>(
                  <button key={p} onClick={()=>setPage(p)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,
                    fontWeight:page===p?600:400,color:page===p?C.blue:"var(--color-text-secondary)",
                    borderBottom:page===p?`2px solid ${C.blue}`:"2px solid transparent",
                    padding:"17px 2px",whiteSpace:"nowrap"}}>
                    {label}
                  </button>
                ))}
                <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:4,flexShrink:0}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff"}}>{user.avatar}</div>
                  <div style={{display:"flex",flexDirection:"column"}}>
                    <span style={{fontSize:12,color:"var(--color-text-primary)",fontWeight:500}}>{user.handle}</span>
                    <span style={{fontSize:10,color:"var(--color-text-tertiary)",fontFamily:"monospace"}}>{totalPredicted}/72 · {koPicked}/32{totalPoints>0?" · "+totalPoints+"pts":""}</span>
                  </div>
                  <button onClick={async()=>{await supabase.auth.signOut();setUser(null);setJoinedLeagues([]);setKoPicks({r32:{},r16:{},qf:{},sf:{},final:{},third:null});setGroupMatches(()=>{const all={};Object.entries(GROUPS).forEach(([g,teams])=>{all[g]=generateGroupMatches(teams);});return all;});setPage("home");}}
                    style={{padding:"4px 8px",background:"none",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,fontSize:11,color:"var(--color-text-tertiary)",cursor:"pointer",marginLeft:4}}>
                    Sign out
                  </button>
                </div>
              </div>
            </nav>
          )}

          {/* Mobile top bar */}
          {mobile&&(
            <nav style={{background:"#ffffff",borderBottom:"0.5px solid #e5e7eb",position:"fixed",top:0,left:0,right:0,zIndex:9999,height:48}}>
              <div style={{padding:"0 1rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:"100%"}}>
                <span style={{fontSize:16,fontWeight:700,letterSpacing:"-0.04em",color:C.blue,cursor:"pointer"}} onClick={()=>setPage("home")}>Mundialist</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {totalPoints>0&&<span style={{fontSize:11,fontWeight:500,color:C.green,background:C.greenLt,padding:"2px 8px",borderRadius:99,fontFamily:"monospace"}}>{totalPoints}pts</span>}
                  <div style={{position:"relative"}}>
                    <div onClick={()=>setShowUserMenu(m=>!m)} style={{width:28,height:28,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer"}}>{user.avatar}</div>
                    {showUserMenu&&(
                      <div style={{position:"absolute",right:0,top:36,background:"#fff",border:"0.5px solid #e5e7eb",borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:99999,minWidth:120,overflow:"hidden"}}>
                        <div style={{padding:"8px 12px",fontSize:12,color:"var(--color-text-secondary)",borderBottom:"0.5px solid #e5e7eb"}}>{user.handle}</div>
                        <button onClick={async()=>{await supabase.auth.signOut();setUser(null);setPage("home");setShowUserMenu(false);}} style={{width:"100%",padding:"10px 12px",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#ef4444",textAlign:"left"}}>Sign out</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </nav>
          )}

          {/* Mobile bottom tab bar */}
          {mobile&&(
            <nav style={{background:"#ffffff",borderTop:"0.5px solid #e5e7eb",position:"fixed",bottom:0,left:0,right:0,zIndex:9999,display:"flex",alignItems:"stretch",paddingBottom:"env(safe-area-inset-bottom)",minHeight:56}}>
              {[
                {p:"predict",icon:"⚽",label:"Groups"},
                {p:"bracket",icon:"🏆",label:"Knockout"},
                {p:"bonuses",icon:"⭐",label:"Bonuses"},
                {p:"league",icon:"👥",label:"League"},
                {p:"points",icon:"📖",label:"Rules"},
              ].map(({p,icon,label})=>(
                <button key={p} onClick={()=>setPage(p)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"8px 0"}}>
                  <span style={{fontSize:22,lineHeight:1}}>{icon}</span>
                  <span style={{fontSize:9,fontWeight:page===p?600:400,color:page===p?C.blue:"var(--color-text-tertiary)"}}>{label}</span>
                  {page===p&&<div style={{width:20,height:2,borderRadius:99,background:C.blue,marginTop:2}}/>}
                </button>
              ))}
            </nav>
          )}
        </>
      )}

      <div style={{paddingTop:user?(mobile?48:56):0,paddingBottom:user&&mobile?"calc(56px + env(safe-area-inset-bottom))":0}}>

      {/* ══ HOME ══ */}
      {/* Bracket changed popup */}
      {showBracketChanged&&(
        <div style={{position:"fixed",top:mobile?"calc(56px + 8px)":"calc(64px + 8px)",left:"50%",transform:"translateX(-50%)",zIndex:99998,width:"calc(100% - 2rem)",maxWidth:420,background:"#FEF9EC",border:"1px solid #F59E0B",borderRadius:10,padding:"12px 14px",boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}}>
          <div style={{fontSize:12,fontWeight:500,color:"#92400E",marginBottom:8}}>⚠️ Group standings changed — your knockout bracket may be affected.</div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={async()=>{
              setKoPicks({r32:{},r16:{},qf:{},sf:{},final:{},third:null});
              setShowBracketChanged(false);
              showSaving();
              await supabase.from('predictions').delete().eq('user_id',user.id).like('match_id','KO-%');
              showSaved();
            }} style={{flex:1,padding:"7px",background:"#F59E0B",color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:500,cursor:"pointer"}}>Reset knockout</button>
            <button onClick={()=>setShowBracketChanged(false)} style={{flex:1,padding:"7px",background:"#fff",border:"0.5px solid #F59E0B",borderRadius:6,fontSize:12,cursor:"pointer",color:"#92400E"}}>Keep my picks</button>
          </div>
        </div>
      )}
      {/* Global clear confirmation modal */}
      {showClearKOConfirm&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div style={{background:"#ffffff",borderRadius:14,padding:"1.5rem",maxWidth:340,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:28,marginBottom:8,textAlign:"center"}}>⚠️</div>
            <div style={{fontSize:16,fontWeight:600,color:"var(--color-text-primary)",marginBottom:6,textAlign:"center"}}>Reset knockout picks?</div>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1.25rem",textAlign:"center",lineHeight:1.5}}>This will clear your R32, R16, QF, SF and Final picks. Group picks and bonuses will be kept.</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowClearKOConfirm(false)} style={{flex:1,padding:"11px",background:"#f1f5f9",border:"0.5px solid #e2e8f0",borderRadius:8,fontSize:14,cursor:"pointer",color:"#1e293b",fontWeight:500}}>Cancel</button>
              <button onClick={clearKO} style={{flex:1,padding:"11px",background:"#ef4444",border:"none",borderRadius:8,fontSize:14,cursor:"pointer",color:"#fff",fontWeight:600}}>Yes, reset</button>
            </div>
          </div>
        </div>
      )}
      {showClearConfirm&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div style={{background:"#ffffff",borderRadius:14,padding:"1.5rem",maxWidth:340,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:28,marginBottom:8,textAlign:"center"}}>⚠️</div>
            <div style={{fontSize:16,fontWeight:600,color:"var(--color-text-primary)",marginBottom:6,textAlign:"center"}}>Reset all picks?</div>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1.25rem",textAlign:"center",lineHeight:1.5}}>This will clear all your group picks, knockout bracket, and bonus picks. This cannot be undone.</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowClearConfirm(false)} style={{flex:1,padding:"11px",background:"#f1f5f9",border:"0.5px solid #e2e8f0",borderRadius:8,fontSize:14,cursor:"pointer",color:"#1e293b",fontWeight:500}}>Cancel</button>
              <button onClick={clearAll} style={{flex:1,padding:"11px",background:"#ef4444",border:"none",borderRadius:8,fontSize:14,cursor:"pointer",color:"#fff",fontWeight:600}}>Yes, reset</button>
            </div>
          </div>
        </div>
      )}
      {page==="home"&&authMode==="google_onboard"&&(
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)",padding:"2rem"}}>
          <div style={{background:"rgba(255,255,255,0.08)",border:"0.5px solid rgba(255,255,255,0.15)",borderRadius:16,padding:"2rem",width:"100%",maxWidth:400}}>
            <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
              <div style={{fontSize:40,marginBottom:8}}>👋</div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#fff",margin:"0 0 6px",letterSpacing:"-0.03em"}}>Almost there!</h2>
              <p style={{fontSize:13,color:"rgba(255,255,255,0.5)",margin:0}}>Set up your Mundialist profile to start predicting</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <input value={onboardName} onChange={e=>setOnboardName(e.target.value)} placeholder="Full name"
                style={{width:"100%",boxSizing:"border-box",padding:"11px 14px",border:"0.5px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:14,background:"rgba(255,255,255,0.06)",color:"#fff",outline:"none"}}/>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.4)",fontSize:14}}>@</span>
                <input value={onboardHandle} onChange={e=>setOnboardHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))} placeholder="username"
                  style={{width:"100%",boxSizing:"border-box",padding:"11px 14px 11px 28px",border:"0.5px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:14,background:"rgba(255,255,255,0.06)",color:"#fff",outline:"none"}}/>
              </div>
              {authError&&<p style={{fontSize:12,color:"#ef4444",margin:0}}>{authError}</p>}
              <button onClick={handleGoogleOnboard} disabled={!onboardName.trim()||!onboardHandle.trim()}
                style={{padding:"13px",background:"#2a398d",color:"#fff",border:"none",borderRadius:8,fontSize:15,fontWeight:600,cursor:"pointer",marginTop:4,opacity:!onboardName.trim()||!onboardHandle.trim()?0.5:1}}>
                Start predicting →
              </button>
            </div>
          </div>
        </div>
      )}
      {page==="home"&&authMode!=="google_onboard"&&(
        <div>
          {/* Hero */}
          <div style={{background:`linear-gradient(135deg,${C.blue} 0%,#1a2566 50%,#0d1433 100%)`,minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",padding:"4rem 2rem",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,opacity:0.04,backgroundImage:"radial-gradient(circle,white 1px,transparent 1px)",backgroundSize:"60px 60px"}}/>
            <div style={{maxWidth:700,margin:"0 auto",width:"100%",position:"relative",zIndex:1}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.1)",border:"0.5px solid rgba(255,255,255,0.2)",padding:"6px 14px",borderRadius:99,marginBottom:"2rem"}}>
                <span style={{fontSize:16}}>⚽</span>
                <span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.9)",fontFamily:"monospace"}}>FIFA World Cup 2026 · June 11 – July 19</span>
              </div>
              <h1 style={{fontSize:"clamp(36px,6vw,64px)",fontWeight:700,letterSpacing:"-0.04em",lineHeight:1.1,color:"#fff",margin:"0 0 1.25rem"}}>
                The predictor<br/>that rewards<br/><span style={{color:C.gold}}>knowing your</span><br/>football.
              </h1>
              <p style={{fontSize:18,color:"rgba(255,255,255,0.7)",lineHeight:1.7,margin:"0 0 2rem",maxWidth:480}}>Predict every score. Compete in private leagues. The bolder your picks, the bigger the rewards.</p>

              {/* Points teaser */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:"2rem"}}>
                {[{pts:"10",label:"Exact score"},
                  {pts:"25",label:"Tournament champion"},
                  {pts:"×2",label:"Double-down pick"},
                  {pts:"+8",label:"Dark horse final"}].map(({pts,label})=>(
                  <div key={label} style={{background:"rgba(255,255,255,0.08)",border:"0.5px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"monospace",fontSize:15,fontWeight:600,color:C.gold}}>{pts}</span>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>{label}</span>
                  </div>
                ))}
                <div style={{display:"flex",alignItems:"center",padding:"0 4px"}}>
                  <button onClick={()=>setPage("points")} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"rgba(255,255,255,0.5)",textDecoration:"underline"}}>see all scoring →</button>
                </div>
              </div>

              {/* Countdown */}
              <div style={{display:"flex",gap:10,marginBottom:"2.5rem",flexWrap:"wrap"}}>
                {[{val:countdown.d,label:"Days"},{val:countdown.h,label:"Hours"},{val:countdown.m,label:"Mins"},{val:countdown.s,label:"Secs"}].map(({val,label})=>(
                  <div key={label} style={{background:"rgba(255,255,255,0.1)",border:"0.5px solid rgba(255,255,255,0.2)",borderRadius:12,padding:"12px 18px",textAlign:"center",minWidth:70}}>
                    <div style={{fontSize:28,fontWeight:700,color:"#fff",fontFamily:"monospace",lineHeight:1}}>{String(val).padStart(2,"0")}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</div>
                  </div>
                ))}
                <div style={{display:"flex",alignItems:"center",padding:"0 8px"}}><span style={{fontSize:13,color:"rgba(255,255,255,0.5)"}}>until kickoff</span></div>
              </div>

              {/* CTA card */}
              {pendingJoinCode&&pendingLeagueName&&!user&&(<div style={{background:"#EAF3DE",border:"0.5px solid #3B6D11",borderRadius:10,padding:"10px 14px",marginBottom:"1rem",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>🏆</span><span style={{fontSize:13,color:"#3B6D11",fontWeight:500}}>You've been invited to join <strong>{pendingLeagueName}</strong>! Sign up to join automatically.</span></div>)}
              {!user?(
                <div style={{background:"rgba(255,255,255,0.08)",border:"0.5px solid rgba(255,255,255,0.15)",borderRadius:16,padding:"1.75rem",maxWidth:460}}>

                  {authMode!=="signin"&&(
                    <>
                    <button onClick={handleGoogleSignIn} style={{width:"100%",padding:"11px",background:"#fff",color:"#3c4043",border:"1px solid #dadce0",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
                      <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg>
                      Continue with Google
                    </button>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{flex:1,height:"0.5px",background:"rgba(255,255,255,0.15)"}}/>
                      <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>or</span>
                      <div style={{flex:1,height:"0.5px",background:"rgba(255,255,255,0.15)"}}/>
                    </div>
                    <p style={{fontSize:12,color:"rgba(255,255,255,0.4)",margin:"0 0 0.75rem"}}>Create your account to start predicting</p>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <input value={formName} onChange={e=>setFormName(e.target.value.slice(0,30))} placeholder="Full name" maxLength={30}
                        style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",border:"0.5px solid rgba(255,255,255,0.15)",borderRadius:7,fontSize:13,background:"rgba(255,255,255,0.06)",color:"#fff",outline:"none"}}/>
                      <div style={{position:"relative"}}>
                        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.4)",fontSize:13}}>@</span>
                        <input value={formHandle} onChange={e=>setFormHandle(e.target.value.slice(0,20))} placeholder="username" maxLength={20}
                          style={{width:"100%",boxSizing:"border-box",padding:"9px 12px 9px 24px",border:"0.5px solid rgba(255,255,255,0.15)",borderRadius:7,fontSize:13,background:"rgba(255,255,255,0.06)",color:"#fff",outline:"none"}}/>
                      </div>
                      <input value={formEmail} onChange={e=>{setFormEmail(e.target.value);setEmailError("");}} placeholder="Email address" type="email"
                        style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",border:`0.5px solid ${emailError?"#ef4444":"rgba(255,255,255,0.15)"}`,borderRadius:7,fontSize:13,background:"rgba(255,255,255,0.06)",color:"#fff",outline:"none"}}/>
                      {emailError&&<p style={{fontSize:11,color:"#ef4444",margin:"-4px 0 0"}}>{emailError}</p>}
                      <input value={formPassword} onChange={e=>setFormPassword(e.target.value)} placeholder="Password" type="password"
                        style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",border:"0.5px solid rgba(255,255,255,0.15)",borderRadius:7,fontSize:13,background:"rgba(255,255,255,0.06)",color:"#fff",outline:"none"}}/>
                      <label style={{display:"flex",alignItems:"flex-start",gap:8,cursor:"pointer"}}>
                        <input type="checkbox" checked={formAgree} onChange={e=>{setFormAgree(e.target.checked);setAgreeError(false);}}
                          style={{marginTop:2,accentColor:C.gold,flexShrink:0}}/>
                        <span style={{fontSize:11,color:agreeError?"#ef4444":"rgba(255,255,255,0.5)",lineHeight:1.5}}>
                          I agree to the <button onClick={e=>{e.preventDefault();setPage("terms");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:agreeError?"#ef4444":C.gold,padding:0,textDecoration:"underline"}}>Terms & Conditions</button> and consent to receive prediction updates and league emails from Mundialist.
                        </span>
                      </label>
                      {agreeError&&<p style={{fontSize:11,color:"#ef4444",margin:"-4px 0 0"}}>Please agree to the terms to continue</p>}
                      {authError&&<p style={{fontSize:11,color:"#ef4444",margin:"-4px 0 0"}}>{authError}</p>}
                      <button onClick={handleCreate} disabled={authLoading}
                        style={{padding:"11px",background:authLoading?"rgba(42,57,141,0.5)":C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:600,cursor:authLoading?"not-allowed":"pointer",marginTop:4}}>
                        {authLoading?"Creating account...":"Start predicting →"}
                      </button>
                      <button onClick={()=>setAuthMode("signin")} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"rgba(255,255,255,0.4)",padding:"4px 0",textAlign:"center"}}>
                        Already have an account? Sign in →
                      </button>
                    </div>
                    </>
                  )}
                  {/* Sign in form */}
                  {authMode==="signin"&&(
                    <div style={{borderTop:"0.5px solid rgba(255,255,255,0.1)",paddingTop:"1rem",marginTop:"0.5rem"}}>
                      <h3 style={{fontSize:15,fontWeight:500,color:"#fff",margin:"0 0 1rem"}}>Sign in</h3>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <input value={formEmail} onChange={e=>{setFormEmail(e.target.value);setEmailError("");}} placeholder="Email address" type="email"
                          style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",border:`0.5px solid ${emailError?"#ef4444":"rgba(255,255,255,0.15)"}`,borderRadius:7,fontSize:13,background:"rgba(255,255,255,0.06)",color:"#fff",outline:"none"}}/>
                        {emailError&&<p style={{fontSize:11,color:"#ef4444",margin:"-4px 0 0"}}>{emailError}</p>}
                        <input value={formPassword} onChange={e=>setFormPassword(e.target.value)} placeholder="Password" type="password"
                          style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",border:"0.5px solid rgba(255,255,255,0.15)",borderRadius:7,fontSize:13,background:"rgba(255,255,255,0.06)",color:"#fff",outline:"none"}}/>
                        {authError&&<p style={{fontSize:11,color:"#ef4444",margin:"-4px 0 0"}}>{authError}</p>}
                        <button onClick={handleSignIn} disabled={authLoading}
                          style={{padding:"11px",background:authLoading?"rgba(42,57,141,0.5)":C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:600,cursor:authLoading?"not-allowed":"pointer"}}>
                          {authLoading?"Signing in...":"Sign in →"}
                        </button>
                        <button onClick={()=>setAuthMode("signup")} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"rgba(255,255,255,0.4)",padding:"4px 0",textAlign:"center"}}>
                          New here? Create an account →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ):(
                <div style={{background:"rgba(255,255,255,0.1)",border:"0.5px solid rgba(255,255,255,0.2)",borderRadius:12,padding:"1rem 1.5rem",display:"flex",alignItems:"center",gap:12,maxWidth:460}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:C.gold,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16}}>{user.avatar}</div>
                  <div><div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{user.name}</div><div style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>{totalPredicted}/72 group · {koPicked}/32 knockout</div></div>
                  <button onClick={()=>setPage("predict")} style={{marginLeft:"auto",padding:"8px 18px",background:C.gold,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>Continue →</button>
                </div>
              )}
            </div>
          </div>

          {/* Features strip */}
          <div style={{background:"var(--color-background-primary)",borderTop:`3px solid ${C.gold}`,padding:"3rem 2rem"}}>
            <div style={{maxWidth:960,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"2.5rem"}}>
              {[
                {icon:"⏰",title:"Everything locks June 11",sub:"Submit before the first whistle. No changes after kickoff."},
                {icon:"🏆",title:"Mini leagues + global rank",sub:"Private leagues with friends, plus a worldwide leaderboard."},
                {icon:"🌟",title:"Dark horse bonuses",sub:"Brave picks earn more. Non-seeded teams reaching the final earn you +8 bonus pts."},
                {icon:"📧",title:"Daily match digest",sub:"Your league standings land in your inbox every match day."},
              ].map(({icon,title,sub})=>(
                <div key={title} style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                  <div style={{width:40,height:40,borderRadius:10,background:C.blueLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:"var(--color-text-primary)",marginBottom:4}}>{title}</div>
                    <div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.6}}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div style={{background:"var(--color-background-secondary)",padding:"1.5rem 2rem",textAlign:"center",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,flexWrap:"wrap"}}>
              <div style={{display:"flex"}}>
                {[C.blue,C.red,C.green,C.gold,C.purple].map((bg,i)=>(
                  <div key={i} style={{width:32,height:32,borderRadius:"50%",background:bg,border:"2px solid var(--color-background-secondary)",marginLeft:i>0?-10:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{"ABCDE"[i]}</div>
                ))}
              </div>
              <span style={{fontSize:14,color:"var(--color-text-secondary)"}}><strong style={{color:"var(--color-text-primary)"}}>{joinedLeagues.length>0?"Join them":""}</strong> Be part of it from day one</span>
            </div>
          </div>
        </div>
      )}

      {/* ══ GROUP STAGE ══ */}
      {page==="predict"&&(
        <div style={{maxWidth:800,margin:"0 auto",padding:"2rem 1.5rem"}}>
          {/* Progress completion card */}
        {(()=>{
          const groupDone = totalPredicted === 72;
          const koDone = koPicked >= 32;
          const bonusDone = goldenBootLocked && topAssistLocked && goldenGloveLocked && doublesSelected===3;
          const allDone = groupDone && koDone && bonusDone;
          const nextAction = !groupDone ? null : !koDone ? {label:"Fill in Knockout →", page:"bracket"} : !bonusDone ? {label:"Fill in Bonuses →", page:"bonuses"} : null;
          if(allDone) return(
            <div style={{background:"#EAF3DE",border:"0.5px solid #3B6D11",borderRadius:10,padding:"10px 14px",marginBottom:"1rem",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>✅</span>
              <span style={{fontSize:13,fontWeight:500,color:"#3B6D11"}}>All picks complete — you're ready for June 11!</span>
            </div>
          );
          return(
            <div style={{background:"var(--color-background-primary)",border:"0.5px solid #185FA5",borderRadius:10,padding:"12px 14px",marginBottom:"1rem"}}>
              <div style={{fontSize:11,fontWeight:500,color:"#185FA5",marginBottom:10}}>📋 Pick completion</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  {label:"⚽ Groups", done:groupDone, current:totalPredicted, total:72},
                  {label:"🏆 Knockout", done:koDone, current:koPicked, total:32},
                  {label:"⭐ Bonuses", done:bonusDone&&doublesSelected===3, current:[goldenBootLocked,topAssistLocked,goldenGloveLocked].filter(Boolean).length+doublesSelected, total:6},
                ].map(({label,done,current,total})=>(
                  <div key={label}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,color:"var(--color-text-primary)"}}>{label}</span>
                      <span style={{fontSize:11,fontWeight:600,color:done?"#3B6D11":"#ef4444"}}>{current}/{total}{done?" ✓":""}</span>
                    </div>
                    <div style={{height:4,background:"#e5e7eb",borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.round(current/total*100)}%`,background:done?"#3B6D11":"#185FA5",borderRadius:2,transition:"width 0.3s"}}/>
                    </div>
                  </div>
                ))}
              </div>
              {nextAction&&(
                <button onClick={()=>setPage(nextAction.page)}
                  style={{width:"100%",marginTop:10,padding:"8px",background:"#185FA5",color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  {nextAction.label}
                </button>
              )}
            </div>
          );
        })()}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:"1.25rem",flexWrap:"wrap"}}>
            <div>
              <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.03em",margin:"0 0 4px",color:"var(--color-text-primary)"}}>Group Stage</h1>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:0}}>Predict scores for all 72 matches. Locks June 11, 2026.</p>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace",lineHeight:1}}>{totalPredicted}<span style={{fontSize:11,color:"var(--color-text-tertiary)",fontWeight:400}}>/72</span></div>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>picks</div>
              </div>
              <div style={{background:"var(--color-background-primary)",border:`0.5px solid ${doublesSelected===3?C.green:"var(--color-border-tertiary)"}`,borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:600,color:doublesSelected===3?C.green:"var(--color-text-primary)",fontFamily:"monospace",lineHeight:1}}>{doublesSelected}<span style={{fontSize:11,color:"var(--color-text-tertiary)",fontWeight:400}}>/3</span></div>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>doubles</div>
              </div>
              <button onClick={()=>setShowClearConfirm(true)} style={{padding:"6px 10px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-primary)",fontSize:12,cursor:"pointer",color:"var(--color-text-tertiary)",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}><span style={{fontSize:14}}>🗑️</span><span style={{fontSize:9}}>Reset</span></button>
              {showClearConfirm&&(
                <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
                  <div style={{background:"#ffffff",borderRadius:14,padding:"1.5rem",maxWidth:340,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
                    <div style={{fontSize:28,marginBottom:8,textAlign:"center"}}>⚠️</div>
                    <div style={{fontSize:16,fontWeight:600,color:"var(--color-text-primary)",marginBottom:6,textAlign:"center"}}>Reset all picks?</div>
                    <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1.25rem",textAlign:"center",lineHeight:1.5}}>This will clear all your group picks, knockout bracket, and bonus picks. This cannot be undone.</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setShowClearConfirm(false)} style={{flex:1,padding:"11px",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,fontSize:14,cursor:"pointer",color:"var(--color-text-primary)",fontWeight:500}}>Cancel</button>
                      <button onClick={clearAll} style={{flex:1,padding:"11px",background:"#ef4444",border:"none",borderRadius:8,fontSize:14,cursor:"pointer",color:"#fff",fontWeight:600}}>Yes, reset</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prediction style selector + simulate */}
          <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,padding:"12px 14px",marginBottom:"1.25rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)",marginBottom:2}}>Simulation style</div><div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:8}}>Auto-fills all 72 matches based on FIFA rankings. Pick a style to control how bold the predictions are.</div>
                <div style={{display:"flex",gap:6}}>
                  {[{k:"cautious",e:"🛡️",l:"Cautious"},{k:"balanced",e:"⚖️",l:"Balanced"},{k:"bold",e:"🔥",l:"Bold"},{k:"maverick",e:"🚀",l:"Maverick"}].map(({k,e,l})=>(
                    <button key={k} onClick={()=>setSimulateStyle(k)}
                      style={{padding:"6px 12px",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:simulateStyle===k?600:400,
                        border:`0.5px solid ${simulateStyle===k?adventInfo.color:"var(--color-border-tertiary)"}`,
                        background:simulateStyle===k?adventInfo.color+"18":"var(--color-background-secondary)",
                        color:simulateStyle===k?adventInfo.color:"var(--color-text-secondary)"}}>
                      {e} {l}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={simulateAll}
                style={{padding:"9px 18px",background:C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"}}>
                Simulate ↻
              </button>
              <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Auto-fills bracket based on FIFA rankings. Pick a style to control how bold the predictions are.</span>
            </div>
            {adventScore!==null&&(
              <div style={{marginTop:10}}>
                <div style={{height:3,background:"var(--color-background-secondary)",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                  <div style={{height:"100%",width:`${adventInfo.width||0}%`,background:adventInfo.color,borderRadius:99,transition:"width 0.3s"}}/>
                </div>
                <span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>Pick style: <strong style={{color:adventInfo.color}}>{adventInfo.emoji} {adventInfo.label}</strong></span>
              </div>
            )}
          </div>


          {/* Group tabs */}
          {/* Group tabs - 2 row grid on mobile, 6-col grid on desktop */}
          <div style={{display:"grid",gridTemplateColumns:mobile?"repeat(6,1fr)":"repeat(6,1fr)",gap:mobile?4:6,marginBottom:"1.25rem"}}>
            {Object.keys(GROUPS).map(g=>{
              const done=groupMatches[g].filter(m=>m.homeScore!==""&&m.awayScore!=="").length;
              const complete=done===6,active=activeGroup===g;
              return(<button key={g} onClick={()=>setActiveGroup(g)}
                style={{padding:mobile?"7px 2px":"9px 4px",borderRadius:8,cursor:"pointer",
                  border:`0.5px solid ${active?C.blue:complete?C.green:"var(--color-border-tertiary)"}`,
                  background:active?C.blueLt:complete?C.greenLt:"var(--color-background-primary)",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:mobile?1:2}}>
                <span style={{fontSize:mobile?11:13,fontWeight:500,color:active?C.blue:complete?C.green:"var(--color-text-primary)"}}>
                  {mobile?g:`Group ${g}`}
                </span>
                {!mobile&&<span style={{fontSize:10,color:complete?C.green:"var(--color-text-tertiary)",fontFamily:"monospace"}}>{done}/6{complete?" ✓":""}</span>}
                {mobile&&complete&&<span style={{fontSize:8,color:C.green}}>✓</span>}
              </button>);
            })}
          </div>


          {/* Match card */}
          <div style={card}>

            {ROUND_INDICES.map((indices,ri)=>{
              const roundKey=["r1","r2","r3"][ri];
              const currentDouble=doubleDown[roundKey];
              const roundHasDouble=currentDouble!==null;
              return(<div key={ri}>
                <div style={{padding:"7px 18px",background:"var(--color-background-secondary)",borderTop:ri>0?"0.5px solid var(--color-border-tertiary)":undefined,borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>Matchday {ri+1}{GROUP_DATES[activeGroup]?.[ri*2]?" · "+GROUP_DATES[activeGroup][ri*2]:""}</span>
                  {currentDouble&&currentDouble.startsWith(activeGroup+"-")&&<span style={{fontSize:11,color:C.gold,fontWeight:500}}>⚡ Double active</span>}
                </div>
                {indices.map(idx=>{
                  const match=groupMatches[activeGroup][idx];
                  const done=match.homeScore!==""&&match.awayScore!=="";
                  const isSeeded=SEEDED.has(match.home)||SEEDED.has(match.away);
                  const doubleId=`${activeGroup}-${idx}`;
                  const isMyDouble=currentDouble===doubleId;
                  const matchdayHasPicks=groupMatches[activeGroup]?.slice(ri*2,ri*2+2).some(m=>m.homeScore!=="");
                  const canDouble=!isSeeded&&(!roundHasDouble||isMyDouble)&&matchdayHasPicks;
                  // Only show dark horse label if group has picks AND team qualifies to R16
                  const groupHasPicks=groupMatches[activeGroup]?.some(m=>m.homeScore!==""&&m.awayScore!=="");
                  const homeQualifies=groupHasPicks&&allStandings[activeGroup]?.slice(0,2).some(r=>r.team===match.home);
                  const awayQualifies=groupHasPicks&&allStandings[activeGroup]?.slice(0,2).some(r=>r.team===match.away);
                  const actual=Object.values(actualResults).find(r=>(r.home_team===match.home||r.home_team===match.away)&&(r.away_team===match.away||r.away_team===match.home)&&r.status==="finished");
                  const pts=actual?calcMatchPoints(match.homeScore,match.awayScore,actual.actual_home,actual.actual_away)*(isMyDouble?2:1):null;
                  const ptCol=pts===null?C.gold:pts>=10?C.green:pts>=6?C.blue:pts>0?C.gold:"#888";
                  return(
                    <div key={idx} style={{padding:mobile?"8px 10px":"12px 18px",borderBottom:"0.5px solid var(--color-border-tertiary)",background:isMyDouble?C.goldLt:actual?"#f8faff":"transparent"}}>
                      {/* Scoreboard layout - mobile: flag above name, desktop: inline */}
                      {mobile?(
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          {/* Home team column */}
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flex:1,minWidth:0}}>
                            <span style={{fontSize:24}}>{FLAGS[match.home]||"❓"}</span>
                            <span style={{fontSize:10,fontWeight:500,color:"var(--color-text-primary)",textAlign:"center",whiteSpace:"nowrap"}}>{match.home}</span>
                          </div>
                          {/* Score centre */}
                          {actual?(
                            <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                              <span style={{fontSize:20,fontWeight:600,fontFamily:"monospace",color:"var(--color-text-primary)"}}>{match.homeScore||"–"}</span>
                              <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>–</span>
                              <span style={{fontSize:20,fontWeight:600,fontFamily:"monospace",color:"var(--color-text-primary)"}}>{match.awayScore||"–"}</span>
                            </div>
                          ):(
                            <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                              <input type="number" min="0" max="9" value={match.homeScore} onChange={e=>{const v=e.target.value.slice(-1);updateScore(activeGroup,idx,"homeScore",v);}}
                                onClick={e=>e.target.select()}
                                style={{width:38,textAlign:"center",padding:"7px 0",border:`1.5px solid ${isMyDouble?C.gold:"var(--color-border-tertiary)"}`,borderRadius:7,fontSize:18,fontWeight:600,background:isMyDouble?C.goldLt:"#f0f0f0",color:"var(--color-text-primary)",outline:"none",fontFamily:"monospace",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.08)"}}/>
                              <span style={{fontSize:13,color:"var(--color-text-tertiary)"}}>–</span>
                              <input type="number" min="0" max="9" value={match.awayScore} onChange={e=>{const v=e.target.value.slice(-1);updateScore(activeGroup,idx,"awayScore",v);}}
                                onClick={e=>e.target.select()}
                                style={{width:38,textAlign:"center",padding:"7px 0",border:`1.5px solid ${isMyDouble?C.gold:"var(--color-border-tertiary)"}`,borderRadius:7,fontSize:18,fontWeight:600,background:isMyDouble?C.goldLt:"#f0f0f0",color:"var(--color-text-primary)",outline:"none",fontFamily:"monospace",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.08)"}}/>
                            </div>
                          )}
                          {/* Away team column */}
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flex:1,minWidth:0}}>
                            <span style={{fontSize:24}}>{FLAGS[match.away]||"❓"}</span>
                            <span style={{fontSize:10,fontWeight:500,color:"var(--color-text-primary)",textAlign:"center",whiteSpace:"nowrap"}}>{match.away}</span>
                          </div>
                        </div>
                      ):(
                        /* Desktop inline layout */
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:20,flexShrink:0}}>{FLAGS[match.home]||"❓"}</span>
                          <span style={{fontSize:14,color:"var(--color-text-primary)",fontWeight:500,flex:1}}>{match.home}</span>
                          {actual?(
                            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                              <span style={{fontSize:18,fontWeight:600,fontFamily:"monospace"}}>{match.homeScore||"–"}</span>
                              <span style={{fontSize:13,color:"var(--color-text-tertiary)"}}>–</span>
                              <span style={{fontSize:18,fontWeight:600,fontFamily:"monospace"}}>{match.awayScore||"–"}</span>
                            </div>
                          ):(
                            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                              <input type="number" min="0" max="9" value={match.homeScore} onChange={e=>{const v=e.target.value.slice(-1);updateScore(activeGroup,idx,"homeScore",v);}}
                                onClick={e=>e.target.select()}
                                style={{width:48,textAlign:"center",padding:"10px 0",border:`1.5px solid ${isMyDouble?C.gold:"var(--color-border-tertiary)"}`,borderRadius:8,fontSize:20,fontWeight:600,background:isMyDouble?C.goldLt:"#f0f0f0",color:"var(--color-text-primary)",outline:"none",fontFamily:"monospace",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.08)"}}/>
                              <span style={{fontSize:14,color:"var(--color-text-tertiary)"}}>–</span>
                              <input type="number" min="0" max="9" value={match.awayScore} onChange={e=>{const v=e.target.value.slice(-1);updateScore(activeGroup,idx,"awayScore",v);}}
                                onClick={e=>e.target.select()}
                                style={{width:48,textAlign:"center",padding:"10px 0",border:`1.5px solid ${isMyDouble?C.gold:"var(--color-border-tertiary)"}`,borderRadius:8,fontSize:20,fontWeight:600,background:isMyDouble?C.goldLt:"#f0f0f0",color:"var(--color-text-primary)",outline:"none",fontFamily:"monospace",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.08)"}}/>
                            </div>
                          )}
                          <span style={{fontSize:14,color:"var(--color-text-primary)",fontWeight:500,flex:1,textAlign:"right"}}>{match.away}</span>
                          <span style={{fontSize:20,flexShrink:0}}>{FLAGS[match.away]||"❓"}</span>
                          
                        </div>
                      )}
                      {/* Actual result row - Option A */}
                      {actual&&(
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:mobile?4:6}}>
                          <span style={{fontSize:9,color:"var(--color-text-tertiary)"}}>Actual:</span>
                          <span style={{fontSize:mobile?13:14,fontWeight:600,fontFamily:"monospace",color:C.gold}}>{actual.actual_home}–{actual.actual_away}</span>
                          <span style={{fontSize:10,fontWeight:500,padding:"1px 8px",borderRadius:99,background:ptCol+"22",color:ptCol}}>{pts>0?"+"+pts+" pts":"0 pts"}</span>
                          {isMyDouble&&<span style={{fontSize:9,color:C.gold}}>⚡×2</span>}
                        </div>
                      )}
                      {/* Mobile double-down + venue */}
                      {mobile&&(
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>
                          {GROUP_VENUES[activeGroup]?.[idx]?<span style={{fontSize:8,color:"var(--color-text-tertiary)"}}>📍 {GROUP_VENUES[activeGroup][idx].city}</span>:<span/>}
                        </div>
                      )}
                      {!mobile&&GROUP_VENUES[activeGroup]?.[idx]&&<div style={{fontSize:9,color:"var(--color-text-tertiary)",marginTop:4}}>📍 {GROUP_VENUES[activeGroup][idx].city}</div>}
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

                        </div>
                      </td>
                      {[row.played,row.won,row.drawn,row.lost,row.gd>0?"+"+row.gd:row.gd].map((v,j)=><td key={j} style={{padding:"9px 12px",textAlign:"center",color:"var(--color-text-secondary)",fontFamily:"monospace"}}>{v}</td>)}
                      <td style={{padding:"9px 12px",textAlign:"center",fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace"}}>{row.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(()=>{
                const teams=GROUPS[activeGroup]||[];
                const groupActual=Object.values(actualResults).filter(r=>r.status==='finished'&&r.group_name===activeGroup);
                if(groupActual.length<6)return null;
                const ap={};teams.forEach(t=>{ap[t]={pts:0,gd:0,gf:0};});
                groupActual.forEach(r=>{
                  const h=r.actual_home,a=r.actual_away;
                  if(h>a){ap[r.home_team].pts+=3;}else if(h<a){ap[r.away_team].pts+=3;}else{ap[r.home_team].pts+=1;ap[r.away_team].pts+=1;}
                  ap[r.home_team].gd+=h-a;ap[r.away_team].gd+=a-h;
                });
                const actualStandings=teams.slice().sort((a,b)=>ap[b].pts-ap[a].pts||ap[b].gd-ap[a].gd);
                const userStandings=allStandings[activeGroup]?.map(r=>r.team)||[];
                const a1=actualStandings[0],a2=actualStandings[1],u1=userStandings[0],u2=userStandings[1];
                const correct=u1===a1&&u2===a2;
                const swapped=u1===a2&&u2===a1;
                const thirdCorrect=userStandings[2]&&actualStandings[2]&&userStandings[2]===actualStandings[2];
                const thirdQualified=Object.values(actualResults).some(r=>r.stage==='r32'&&(r.home_team===actualStandings[2]||r.away_team===actualStandings[2]));
                const standingsPts=(correct?5:swapped?3:0)+(thirdCorrect&&thirdQualified?2:0);
                if(standingsPts===0)return null;
                const isGreen=correct||(thirdCorrect&&thirdQualified&&!swapped);
                const label=correct&&thirdCorrect&&thirdQualified?`Winner & runner-up correct, right order · ${actualStandings[2]} qualified`:
                             correct?'Winner & runner-up correct, right order':
                             swapped&&thirdCorrect&&thirdQualified?`Both correct, positions swapped · ${actualStandings[2]} qualified`:
                             swapped?'Both correct, positions swapped':
                             `${actualStandings[2]} qualified`;
                return(
                  <div style={{padding:"8px 12px",background:isGreen?"#EAF3DE":"#FEF9EC",borderTop:`0.5px solid ${isGreen?"#3B6D11":"#F59E0B"}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:500,color:isGreen?"#3B6D11":"#92400E"}}>Group standings bonus</div>
                      <div style={{fontSize:10,color:isGreen?"#3B6D11":"#92400E",marginTop:2}}>{label}</div>
                    </div>
                    <span style={{fontSize:12,fontFamily:"monospace",fontWeight:600,color:isGreen?"#3B6D11":"#92400E",background:isGreen?"#D4EDBA":"#FEF3C7",padding:"2px 10px",borderRadius:99,flexShrink:0}}>+{standingsPts} pts</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ══ KNOCKOUT ══ */}
      {page==="bracket"&&(
        <div style={{maxWidth:1400,margin:"0 auto",padding:"2rem 1.5rem"}}>
        {(()=>{
          const groupDone=totalPredicted===72;
          const koDone=koPicked>=32;
          const bonusDone=goldenBootLocked&&topAssistLocked&&goldenGloveLocked&&doublesSelected===3;
          const allDone=groupDone&&koDone&&bonusDone;
          const nextAction=!groupDone?{label:"Fill in Group Stage →",page:"predict"}:!koDone?null:!bonusDone?{label:"Knockout complete! Fill in Bonuses →",page:"bonuses"}:null;
          if(allDone)return(
            <div style={{background:"#EAF3DE",border:"0.5px solid #3B6D11",borderRadius:10,padding:"10px 14px",marginBottom:"1rem",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>✅</span>
              <span style={{fontSize:13,fontWeight:500,color:"#3B6D11"}}>All picks complete — you're ready for June 11!</span>
            </div>
          );
          return(
            <div style={{background:"var(--color-background-primary)",border:"0.5px solid #185FA5",borderRadius:10,padding:"12px 14px",marginBottom:"1rem"}}>
              <div style={{fontSize:11,fontWeight:500,color:"#185FA5",marginBottom:10}}>📋 Pick completion</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  {label:"⚽ Groups",done:groupDone,current:totalPredicted,total:72},
                  {label:"🏆 Knockout",done:koDone,current:koPicked,total:32},
                  {label:"⭐ Bonuses",done:bonusDone&&doublesSelected===3,current:[goldenBootLocked,topAssistLocked,goldenGloveLocked].filter(Boolean).length+doublesSelected,total:6},
                ].map(({label,done,current,total})=>(
                  <div key={label}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,color:"var(--color-text-primary)"}}>{label}</span>
                      <span style={{fontSize:11,fontWeight:600,color:done?"#3B6D11":"#ef4444"}}>{current}/{total}{done?" ✓":""}</span>
                    </div>
                    <div style={{height:4,background:"#e5e7eb",borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.round(current/total*100)}%`,background:done?"#3B6D11":"#185FA5",borderRadius:2,transition:"width 0.3s"}}/>
                    </div>
                  </div>
                ))}
              </div>
              {nextAction&&(
                <button onClick={()=>setPage(nextAction.page)}
                  style={{width:"100%",marginTop:10,padding:"8px",background:"#185FA5",color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  {nextAction.label}
                </button>
              )}
            </div>
          );
        })()}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:"1.5rem"}}>
            <div>
              <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.03em",margin:"0 0 4px",color:"var(--color-text-primary)"}}>Knockout Stage</h1>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 6px"}}>Pick the winner of every match. Your picks cascade automatically to the next round.</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-start",flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)",marginBottom:2}}>Simulation style</div><div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:8,maxWidth:320}}>Auto-fills bracket based on FIFA rankings. Pick a style to control how bold the predictions are.</div>
              <div style={{display:"flex",gap:6}}>
                {[{k:"cautious",e:"🛡️",l:"Cautious"},{k:"balanced",e:"⚖️",l:"Balanced"},{k:"bold",e:"🔥",l:"Bold"},{k:"maverick",e:"🚀",l:"Maverick"}].map(({k,e,l})=>(
                  <button key={k} onClick={()=>setSimulateStyle(k)}
                    style={{padding:"6px 12px",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:simulateStyle===k?600:400,
                      border:`0.5px solid ${simulateStyle===k?C.blue:"var(--color-border-tertiary)"}`,
                      background:simulateStyle===k?C.blueLt:"var(--color-background-primary)",
                      color:simulateStyle===k?C.blue:"var(--color-text-secondary)"}}>
                    {e} {l}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"flex-start"}}>
                <button onClick={async()=>{
                  const simKO=simulateKnockout(r32Bracket,simulateStyle);
                  setKoPicks(simKO);
                  // Save all simulated KO picks to Supabase
                  const saves=[];
                  Object.entries(simKO.r32||{}).forEach(([id,team])=>saves.push(saveKOPick('r32',id,team)));
                  Object.entries(simKO.r16||{}).forEach(([id,team])=>saves.push(saveKOPick('r16',id,team)));
                  Object.entries(simKO.qf||{}).forEach(([id,team])=>saves.push(saveKOPick('qf',id,team)));
                  Object.entries(simKO.sf||{}).forEach(([id,team])=>saves.push(saveKOPick('sf',id,team)));
                  if(simKO.final?.[0])saves.push(saveKOPick('final',0,simKO.final[0]));
                  if(simKO.third)saves.push(saveKOPick('third',0,simKO.third));
                  await Promise.all(saves);
                }} style={{padding:"7px 14px",background:C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"}}>
                  Simulate ↻
                </button>

              </div>
            </div>
          </div>


        {r32AllTBD&&(
            <div style={{display:"flex",gap:12,padding:"14px 18px",background:C.blueLt,border:`0.5px solid ${C.blue}`,borderRadius:10,marginBottom:"1.5rem",alignItems:"center"}}>
              <span style={{fontSize:22}}>⚽</span>
              <div>
                <div style={{fontSize:14,fontWeight:500,color:C.blue,marginBottom:2}}>Fill in your group stage picks first</div>
                <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>Your R32 pairings are built automatically from your group predictions using FIFA's official Annex C bracket logic.</div>
              </div>
              <button onClick={()=>setPage("predict")} style={{marginLeft:"auto",padding:"8px 16px",background:C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Go to Group Stage →</button>
            </div>
          )}

          {/* R32 Grid - desktop collapsible */}
                    {!mobile&&(
            <div style={{marginBottom:"1.5rem"}}>
              <div style={{marginBottom:"0.75rem"}}><span style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Round of 32</span></div>
              {(
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {r32Bracket.map((match,i)=>(
                    <KOCard key={i} home={match.home} away={match.away} picked={koPicks.r32[i]} onPick={t=>pickKO("r32",i,t)} label={`${KO_VENUES.r32[i]?.city||""}${" · "+["Jun 28","Jun 29","Jun 29","Jun 29","Jun 29","Jun 30","Jun 30","Jul 1","Jul 1","Jul 1","Jul 2","Jul 2","Jul 3","Jul 3","Jul 3","Jul 3"][i]||""}`} actualWinner={getKOWinner(match.home,match.away)} roundKey="r32"/>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{borderTop:"0.5px solid var(--color-border-tertiary)",marginBottom:"1.5rem"}}/>

          {/* Mobile: tabbed rounds */}
          {mobile&&(
            <div>
              <div style={{display:"flex",background:"var(--color-background-secondary)",borderRadius:10,padding:3,gap:2,marginBottom:"1rem",overflowX:"auto"}}>
                {["r32","r16","qf","sf","final"].map(r=>(
                  <button key={r} onClick={()=>setKoRound(r)}
                    style={{flex:1,padding:"7px 4px",borderRadius:7,fontSize:11,cursor:"pointer",
                      fontWeight:koRound===r?500:400,whiteSpace:"nowrap",minWidth:40,
                      background:koRound===r?"var(--color-background-primary)":"transparent",
                      color:koRound===r?"#185FA5":"var(--color-text-tertiary)",
                      border:koRound===r?"1.5px solid #185FA5":"1.5px solid transparent"}}>
                    {r==="r32"?"R32":r==="r16"?"R16":r==="qf"?"QF":r==="sf"?"SF":"Final"}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:10,fontSize:11,alignItems:"center",marginBottom:"0.75rem"}}>
                <span style={{color:C.blue}}>🔵 Tap a team to pick the winner</span>
                <span style={{fontFamily:"monospace",color:C.gold,background:C.goldLt,padding:"2px 8px",borderRadius:99}}>{koPicked}/32 picks</span>
              </div>
              {koRound==="r32"&&(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)"}}>Round of 32 · {Object.keys(koPicks.r32).length}/16</span>
                    <button onClick={()=>setShowClearKOConfirm(true)} style={{padding:"4px 8px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,background:"var(--color-background-primary)",fontSize:11,cursor:"pointer",color:"var(--color-text-tertiary)",display:"flex",alignItems:"center",gap:4}}><span>🗑️</span><span>Reset</span></button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
                    {r32Bracket.map((match,i)=>(
                      <KOCard key={i} home={match.home} away={match.away} picked={koPicks.r32[i]} onPick={t=>pickKO("r32",i,t)} label={`${KO_VENUES.r32[i]?.city||""}${" · "+["Jun 28","Jun 29","Jun 29","Jun 29","Jun 29","Jun 30","Jun 30","Jul 1","Jul 1","Jul 1","Jul 2","Jul 2","Jul 3","Jul 3","Jul 3","Jul 3"][i]||""}`} actualWinner={getKOWinner(match.home,match.away)} roundKey="r32"/>
                    ))}
                  </div>
                </div>
              )}
              {koRound==="r16"&&(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)"}}>Round of 16 · {Object.keys(koPicks.r16).length}/8</span>
                    <button onClick={()=>setShowClearKOConfirm(true)} style={{padding:"4px 8px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,background:"var(--color-background-primary)",fontSize:11,cursor:"pointer",color:"var(--color-text-tertiary)",display:"flex",alignItems:"center",gap:4}}><span>🗑️</span><span>Reset</span></button>
                  </div>
                  {r16Matchups.map((m,i)=><KOCard key={i} home={m.home} away={m.away} picked={koPicks.r16[i]} onPick={t=>pickKO("r16",i,t)} label={`${KO_VENUES.r16[i]?.city||""} · ${KO_VENUES.r16[i]?.date||""}`} actualWinner={getKOWinner(m.home,m.away)} roundKey="r16"/>)}
                </div>
              )}
              {koRound==="qf"&&(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)"}}>Quarter-finals · {Object.keys(koPicks.qf).length}/4</span>
                    <button onClick={()=>setShowClearKOConfirm(true)} style={{padding:"4px 8px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,background:"var(--color-background-primary)",fontSize:11,cursor:"pointer",color:"var(--color-text-tertiary)",display:"flex",alignItems:"center",gap:4}}><span>🗑️</span><span>Reset</span></button>
                  </div>
                  {qfMatchups.map((m,i)=><KOCard key={i} home={m.home} away={m.away} picked={koPicks.qf[i]} onPick={t=>pickKO("qf",i,t)} label={`${KO_VENUES.qf[i]?.city||""} · ${KO_VENUES.qf[i]?.date||""}`} actualWinner={getKOWinner(m.home,m.away)} roundKey="qf"/>)}
                </div>
              )}
              {koRound==="sf"&&(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)"}}>Semi-finals · {Object.keys(koPicks.sf).length}/2</span>
                    <button onClick={()=>setShowClearKOConfirm(true)} style={{padding:"4px 8px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,background:"var(--color-background-primary)",fontSize:11,cursor:"pointer",color:"var(--color-text-tertiary)",display:"flex",alignItems:"center",gap:4}}><span>🗑️</span><span>Reset</span></button>
                  </div>
                  {sfMatchups.map((m,i)=><KOCard key={i} home={m.home} away={m.away} picked={koPicks.sf[i]} onPick={t=>pickKO("sf",i,t)} label={`${KO_VENUES.sf[i]?.city||""} · ${KO_VENUES.sf[i]?.date||""}`} actualWinner={getKOWinner(m.home,m.away)} roundKey="sf"/>)}
                </div>
              )}
              {koRound==="final"&&(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{fontSize:11,fontWeight:500,color:C.gold,marginBottom:4}}>Final · New York New Jersey Stadium</div>
                  <KOCard home={finalMatchup.home} away={finalMatchup.away} picked={koPicks.final[0]} onPick={t=>pickKO("final",0,t)} gold={true} actualWinner={getKOWinner(finalMatchup.home,finalMatchup.away)} roundKey="final"/>
                  {champion!=="TBD"&&(
                    <div style={{padding:"10px 12px",background:C.goldLt,border:`0.5px solid ${C.gold}`,borderRadius:8,textAlign:"center"}}>
                      <div style={{fontSize:22,marginBottom:2}}>🏆</div>
                      <div style={{fontSize:13,color:"#7a5c10",fontWeight:500}}>{champion}</div>
                    </div>
                  )}
                  <div style={{marginTop:8}}>
                    <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:4}}>3rd place match</div>
                    <KOCard home={thirdPlaceMatchup.home} away={thirdPlaceMatchup.away} picked={koPicks.third} onPick={t=>{setKoPicks(prev=>({...prev,third:t}));saveKOPick('third',0,t);}} label={`3rd place · ${KO_VENUES.third?.city||""} · ${KO_VENUES.third?.date||""}`} actualWinner={getKOWinner(thirdPlaceMatchup.home,thirdPlaceMatchup.away)} roundKey="third"/>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop: Centre-out bracket R16 → Final */}
          {!mobile&&(
          <div style={{overflowX:"auto",paddingBottom:8}}>
            <div style={{display:"flex",alignItems:"stretch",minWidth:1050,gap:0}}>

              {/* LEFT R16 */}
              <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around",gap:5,width:160,flexShrink:0}}>
                <div style={{fontSize:9,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",marginBottom:4}}>Round of 16</div>
                {r16Matchups.slice(0,4).map((m,i)=>(
                  <KOCard key={i} home={m.home} away={m.away} picked={koPicks.r16[i]} onPick={t=>pickKO("r16",i,t)} label={`R16 ${i+1} · ${KO_VENUES.r16[i]?.city||""} · ${KO_VENUES.r16[i]?.date||""}`} actualWinner={getKOWinner(m.home,m.away)} roundKey="r16"/>
                ))}
              </div>

              <div style={{width:14,flexShrink:0,display:"flex",flexDirection:"column",justifyContent:"space-around",padding:"18px 0"}}>
                {[0,1,2,3].map(i=><div key={i} style={{height:1,background:"var(--color-border-tertiary)"}}/>)}
              </div>

              {/* LEFT QF */}
              <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around",gap:5,width:160,flexShrink:0,padding:"22px 0"}}>
                <div style={{fontSize:9,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",marginBottom:4}}>Quarter-finals</div>
                {qfMatchups.slice(0,2).map((m,i)=>(
                  <KOCard key={i} home={m.home} away={m.away} picked={koPicks.qf[i]} onPick={t=>pickKO("qf",i,t)} label={`QF ${i+1} · ${KO_VENUES.qf[i]?.city||""} · ${KO_VENUES.qf[i]?.date||""}`} actualWinner={getKOWinner(m.home,m.away)} roundKey="qf"/>
                ))}
              </div>

              <div style={{width:14,flexShrink:0,display:"flex",flexDirection:"column",justifyContent:"space-around",padding:"60px 0"}}>
                {[0,1].map(i=><div key={i} style={{height:1,background:"var(--color-border-tertiary)"}}/>)}
              </div>

              {/* LEFT SF */}
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center",width:160,flexShrink:0,padding:"80px 0"}}>
                <div style={{fontSize:9,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",marginBottom:4}}>Semi-final</div>
                <KOCard home={sfMatchups[0]?.home||"TBD"} away={sfMatchups[0]?.away||"TBD"} picked={koPicks.sf[0]} onPick={t=>pickKO("sf",0,t)} label={`SF 1 · ${KO_VENUES.sf[0]?.city||""} · ${KO_VENUES.sf[0]?.date||""}`} actualWinner={getKOWinner(sfMatchups[0]?.home,sfMatchups[0]?.away)} roundKey="sf"/>
              </div>

              <div style={{width:14,flexShrink:0,display:"flex",alignItems:"center"}}>
                <div style={{height:1,width:"100%",background:"var(--color-border-tertiary)"}}/>
              </div>

              {/* FINAL */}
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",width:172,flexShrink:0,gap:8}}>
                <div style={{fontSize:10,fontWeight:500,color:C.gold,textTransform:"uppercase",letterSpacing:"0.06em"}}>Final</div>
                <KOCard home={finalMatchup.home} away={finalMatchup.away} picked={koPicks.final[0]} onPick={t=>pickKO("final",0,t)} gold={true} actualWinner={getKOWinner(finalMatchup.home,finalMatchup.away)} roundKey="final" label={`Final · ${KO_VENUES.final?.city||""} · ${KO_VENUES.final?.date||""}`}/>
                {champion!=="TBD"&&(
                  <div style={{padding:"10px 12px",background:C.goldLt,border:`0.5px solid ${C.gold}`,borderRadius:8,textAlign:"center",width:"100%"}}>
                    <div style={{fontSize:18,marginBottom:2}}>🏆</div>
                    <div style={{fontSize:11,color:"#7a5c10",fontWeight:500}}>{champion}</div>
                  </div>
                )}
                <div style={{marginTop:16,width:"100%"}}>
                  <div style={{fontSize:9,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",marginBottom:4}}>3rd place match</div>
                  <KOCard home={thirdPlaceMatchup.home} away={thirdPlaceMatchup.away} picked={koPicks.third} onPick={t=>{setKoPicks(prev=>({...prev,third:t}));saveKOPick('third',0,t);}} label={`3rd place · ${KO_VENUES.third?.city||""} · ${KO_VENUES.third?.date||""}`} actualWinner={getKOWinner(thirdPlaceMatchup.home,thirdPlaceMatchup.away)} roundKey="third"/>
                  {koPicks.third&&koPicks.third!=="TBD"&&(
                    <div style={{marginTop:4,padding:"6px 10px",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,textAlign:"center"}}>
                      <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>🥉 {koPicks.third}</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{width:14,flexShrink:0,display:"flex",alignItems:"center"}}>
                <div style={{height:1,width:"100%",background:"var(--color-border-tertiary)"}}/>
              </div>

              {/* RIGHT SF */}
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center",width:160,flexShrink:0,padding:"80px 0"}}>
                <div style={{fontSize:9,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",marginBottom:4}}>Semi-final</div>
                <KOCard home={sfMatchups[1]?.home||"TBD"} away={sfMatchups[1]?.away||"TBD"} picked={koPicks.sf[1]} onPick={t=>pickKO("sf",1,t)} label={`SF 2 · ${KO_VENUES.sf[1]?.city||""} · ${KO_VENUES.sf[1]?.date||""}`} actualWinner={getKOWinner(sfMatchups[1]?.home,sfMatchups[1]?.away)} roundKey="sf"/>
              </div>

              <div style={{width:14,flexShrink:0,display:"flex",flexDirection:"column",justifyContent:"space-around",padding:"60px 0"}}>
                {[0,1].map(i=><div key={i} style={{height:1,background:"var(--color-border-tertiary)"}}/>)}
              </div>

              {/* RIGHT QF */}
              <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around",gap:5,width:160,flexShrink:0,padding:"22px 0"}}>
                <div style={{fontSize:9,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",marginBottom:4}}>Quarter-finals</div>
                {qfMatchups.slice(2,4).map((m,i)=>(
                  <KOCard key={i+2} home={m.home} away={m.away} picked={koPicks.qf[i+2]} onPick={t=>pickKO("qf",i+2,t)} label={`QF ${i+3} · ${KO_VENUES.qf[i+2]?.city||""} · ${KO_VENUES.qf[i+2]?.date||""}`} actualWinner={getKOWinner(m.home,m.away)} roundKey="qf"/>
                ))}
              </div>

              <div style={{width:14,flexShrink:0,display:"flex",flexDirection:"column",justifyContent:"space-around",padding:"18px 0"}}>
                {[0,1,2,3].map(i=><div key={i} style={{height:1,background:"var(--color-border-tertiary)"}}/>)}
              </div>

              {/* RIGHT R16 */}
              <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around",gap:5,width:160,flexShrink:0}}>
                <div style={{fontSize:9,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",marginBottom:4}}>Round of 16</div>
                {r16Matchups.slice(4,8).map((m,i)=>(
                  <KOCard key={i+4} home={m.home} away={m.away} picked={koPicks.r16[i+4]} onPick={t=>pickKO("r16",i+4,t)} label={`R16 ${i+5} · ${KO_VENUES.r16[i+4]?.city||""} · ${KO_VENUES.r16[i+4]?.date||""}`} actualWinner={getKOWinner(m.home,m.away)} roundKey="r16"/>
                ))}
              </div>

            </div>
          </div>
          )}
          <p style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:"1.5rem"}}><span style={{color:C.gold}}>★</span> dark horse — non-seeded team advancing earns bonus pts: QF +5, SF +10, Final +15. R32 pairings use FIFA's official Annex C.</p>
        </div>
      )}

      {/* ══ BONUSES ══ */}
      {page==="bonuses"&&(
        <div style={{maxWidth:660,margin:"0 auto",padding:"2rem 1.5rem"}}>
          <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.03em",margin:"0 0 4px",color:"var(--color-text-primary)"}}>Bonus Picks</h1>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1.25rem"}}>Strategic extras on top of your match predictions. All editable until June 11.</p>
          {(()=>{
          const groupDone=totalPredicted===72;
          const koDone=koPicked>=32;
          const bonusDone=goldenBootLocked&&topAssistLocked&&goldenGloveLocked&&doublesSelected===3;
          const allDone=groupDone&&koDone&&bonusDone;
          const nextAction=!groupDone?{label:"Fill in Knockout →",page:"bracket"}:!koDone?{label:"Fill in Knockout →",page:"bracket"}:!bonusDone?{label:"Fill in Bonuses →",page:"bonuses"}:null;
          if(allDone)return(
            <div style={{background:"#EAF3DE",border:"0.5px solid #3B6D11",borderRadius:10,padding:"10px 14px",marginBottom:"1rem",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>✅</span>
              <span style={{fontSize:13,fontWeight:500,color:"#3B6D11"}}>All picks complete — you're ready for June 11!</span>
            </div>
          );
          return(
            <div style={{background:"var(--color-background-primary)",border:"0.5px solid #185FA5",borderRadius:10,padding:"12px 14px",marginBottom:"1rem"}}>
              <div style={{fontSize:11,fontWeight:500,color:"#185FA5",marginBottom:10}}>📋 Pick completion</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  {label:"⚽ Groups",done:groupDone,current:totalPredicted,total:72},
                  {label:"🏆 Knockout",done:koDone,current:koPicked,total:32},
                  {label:"⭐ Bonuses",done:bonusDone&&doublesSelected===3,current:[goldenBootLocked,topAssistLocked,goldenGloveLocked].filter(Boolean).length+doublesSelected,total:6},
                ].map(({label,done,current,total})=>(
                  <div key={label}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,color:"var(--color-text-primary)"}}>{label}</span>
                      <span style={{fontSize:11,fontWeight:600,color:done?"#3B6D11":"#ef4444"}}>{current}/{total}{done?" ✓":""}</span>
                    </div>
                    <div style={{height:4,background:"#e5e7eb",borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.round(current/total*100)}%`,background:done?"#3B6D11":"#185FA5",borderRadius:2,transition:"width 0.3s"}}/>
                    </div>
                  </div>
                ))}
              </div>
              {nextAction&&(
                <button onClick={()=>setPage(nextAction.page)}
                  style={{width:"100%",marginTop:10,padding:"8px",background:"#185FA5",color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  {nextAction.label}
                </button>
              )}
            </div>
          );
        })()}
          <LockBanner/>

          {/* Double-down */}
          <div style={{...card,marginBottom:"1rem",borderLeft:`3px solid ${C.gold}`,borderRadius:"0 12px 12px 0"}}>
            <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Double-down</span>
                <span style={{fontSize:12,color:"var(--color-text-secondary)",marginLeft:8}}>×2 on one match per matchday · 3 total · no seeded teams</span>
              </div>
              <span style={{fontSize:11,fontWeight:500,color:doublesSelected===3?C.green:C.gold,flexShrink:0,marginLeft:8}}>{doublesSelected}/3{doublesSelected===3?" ✓":""}</span>
            </div>
            <div style={{padding:"1rem 16px"}}>
              {["r1","r2","r3"].map((rk,ri)=>{
                const val=doubleDown[rk];
                const eligible=[];
                Object.keys(GROUPS).forEach(g=>{
                  ROUND_INDICES[ri].forEach(idx=>{
                    const m=groupMatches[g][idx];
                    eligible.push({g,idx,home:m.home,away:m.away,homeScore:m.homeScore,awayScore:m.awayScore,hasSeeded:SEEDED.has(m.home)||SEEDED.has(m.away)});
                  });
                });
                return(<div key={rk} style={{marginBottom:"1.25rem"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.04em"}}>Matchday {ri+1}</span>
                    {val?<span style={{fontSize:11,color:C.gold,fontWeight:500}}>⚡ Selected</span>:<span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>No selection yet</span>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:220,overflowY:"auto"}}>
                    {eligible.map(m=>{
                      const mid=`${m.g}-${m.idx}`;const sel=val===mid;const other=val&&val!==mid;
                      if(m.hasSeeded) return null;
                      const actual=Object.values(actualResults).find(r=>r.home_team===m.home&&r.away_team===m.away&&r.status==="finished");
                      const ddPts=actual&&sel?calcMatchPoints(m.homeScore,m.awayScore,actual.actual_home,actual.actual_away)*2:null;
                      const ddCol=ddPts===null?C.gold:ddPts>0?C.green:"#ef4444";
                      return(<button key={mid} onClick={()=>!actual&&setDouble(rk,m.g,m.idx)} disabled={false}
                        style={{padding:"9px 12px",border:`0.5px solid ${sel?ddCol:"var(--color-border-tertiary)"}`,borderRadius:8,
                          background:sel?(ddPts>0?C.greenLt:ddPts===0?"#fef2f2":C.goldLt):"var(--color-background-secondary)",
                          cursor:other||actual?"not-allowed":"pointer",
                          display:"flex",alignItems:"center",gap:10,opacity:other?0.4:1,textAlign:"left"}}>
                        <span style={{fontSize:16}}>{FLAGS[m.home]||"❓"}</span>
                        <span style={{fontSize:13,color:"var(--color-text-primary)",flex:1,fontWeight:500}}>{m.home}</span>
                        {actual?<span style={{fontSize:12,fontFamily:"monospace",color:C.blue}}>{actual.actual_home}–{actual.actual_away}</span>:
                         m.homeScore&&m.awayScore?<span style={{fontSize:12,fontFamily:"monospace",color:"var(--color-text-secondary)"}}>{m.homeScore}–{m.awayScore}</span>:null}
                        <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>vs</span>
                        <span style={{fontSize:13,color:"var(--color-text-primary)",flex:1,textAlign:"right",fontWeight:500}}>{m.away}</span>
                        <span style={{fontSize:16}}>{FLAGS[m.away]||"❓"}</span>
                        {sel&&ddPts!==null&&<span style={{fontSize:12,fontWeight:600,color:ddCol,flexShrink:0}}>{ddPts>0?"+"+ddPts+" pts ✓":"0 pts ✗"}</span>}
                        {sel&&ddPts===null&&<span style={{fontSize:12,fontWeight:600,color:C.gold,flexShrink:0}}>×2 ⚡</span>}
                      </button>);
                    })}
                  </div>
                </div>);
              })}
            </div>
          </div>

        
          {/* Golden Boot */}
          <div style={{...card,marginBottom:"1rem",borderLeft:`3px solid ${C.green}`,borderRadius:"0 12px 12px 0"}}>
            <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Golden Boot</span>
              <span style={{fontSize:11,color:C.green,background:C.greenLt,padding:"2px 8px",borderRadius:99}}>15 pts if correct</span>
            </div>
            <div style={{padding:"1rem 16px"}}>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1rem",lineHeight:1.6}}>Pick the tournament's top scorer.</p>
              <PlayerSearch search={bootSearch} setSearch={setBootSearch} pick={goldenBootPick} setPick={setGoldenBootPick} filtered={filteredBoot} label="Player" pts={15} color={C.green} locked={goldenBootLocked} setLocked={(v)=>{setGoldenBootLocked(v);if(v&&goldenBootPick)saveBonusPicks({golden_boot_player:goldenBootPick.name,golden_boot_locked:true});}} emoji="⚽" actualWinner={tournamentAwards.golden_boot}/>
            </div>
          </div>

          {/* Top Assist */}
          <div style={{...card,marginBottom:"1rem",borderLeft:`3px solid ${C.blue}`,borderRadius:"0 12px 12px 0"}}>
            <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Top Assist</span>
              <span style={{fontSize:11,color:C.blue,background:C.blueLt,padding:"2px 8px",borderRadius:99}}>15 pts if correct</span>
            </div>
            <div style={{padding:"1rem 16px"}}>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1rem",lineHeight:1.6}}>Pick the tournament's top assist provider.</p>
              <PlayerSearch search={assistSearch} setSearch={setAssistSearch} pick={topAssistPick} setPick={setTopAssistPick} filtered={filteredAssist} label="Player" pts={15} color={C.blue} locked={topAssistLocked} setLocked={(v)=>{setTopAssistLocked(v);if(v&&topAssistPick)saveBonusPicks({top_assist_player:topAssistPick.name,top_assist_locked:true});}} emoji="🎯" actualWinner={tournamentAwards.top_assist}/>
            </div>
          </div>

          {/* Golden Glove */}
          <div style={{...card,borderLeft:`3px solid ${C.gold}`,borderRadius:"0 12px 12px 0"}}>
            <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Golden Glove</span>
              <span style={{fontSize:11,color:C.gold,background:C.goldLt,padding:"2px 8px",borderRadius:99}}>15 pts if correct</span>
            </div>
            <div style={{padding:"1rem 16px"}}>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1rem",lineHeight:1.6}}>Pick the tournament's best goalkeeper.</p>
              <PlayerSearch search={gloveSearch} setSearch={setGloveSearch} pick={goldenGlovePick} setPick={setGoldenGlovePick} filtered={filteredGlove} label="Goalkeeper" pts={15} color={C.gold} locked={goldenGloveLocked} setLocked={(v)=>{setGoldenGloveLocked(v);if(v&&goldenGlovePick)saveBonusPicks({golden_glove_player:goldenGlovePick.name,golden_glove_locked:true});}} emoji="🧤" actualWinner={tournamentAwards.golden_glove}/>
            </div>
          </div>
        </div>
      )}

      {/* ══ LEAGUE ══ */}
      {page==="league"&&(
        <div style={{maxWidth:660,margin:"0 auto",padding:"2rem 1.5rem"}}>
          <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.03em",margin:"0 0 0.25rem",color:"var(--color-text-primary)"}}>My Leagues</h1>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1.5rem"}}>Compete with friends and the world.</p>

          {/* Step tabs */}
          <div style={{display:"flex",background:"var(--color-background-secondary)",borderRadius:10,padding:4,marginBottom:"1.5rem"}}>
            {["overview","join","create"].map(tab=>(<button key={tab} onClick={()=>{setLeagueStep(tab);setActiveLeague(null);setViewingUser(null);}}
              style={{flex:1,padding:"8px 12px",border:"none",borderRadius:7,
                background:leagueStep===tab&&!activeLeague?"var(--color-background-primary)":"transparent",
                color:leagueStep===tab&&!activeLeague?"var(--color-text-primary)":"var(--color-text-secondary)",
                fontWeight:leagueStep===tab&&!activeLeague?500:400,fontSize:13,cursor:"pointer"}}>
              {tab==="overview"?"My Leagues":tab==="join"?"Join a league":"Create a league"}
            </button>))}
          </div>

          {/* Viewing another user's predictions */}
          {viewingUser&&(
            <div>
              <button onClick={()=>setViewingUser(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1rem",padding:0}}>← Back to league</button>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem"}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff"}}>{viewingUser.avatar}</div>
                <div><div style={{fontSize:16,fontWeight:500,color:"var(--color-text-primary)"}}>{viewingUser.name}</div><div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{viewingUser.handle} · {viewingUser.picks.groupDone} group picks</div></div>
              </div>
              {!tournamentStarted()&&(
                <div style={{padding:"1rem",background:C.goldLt,border:`0.5px solid ${C.gold}`,borderRadius:10,textAlign:"center",marginBottom:"0.75rem"}}>
                  <div style={{fontSize:14,fontWeight:500,color:"#7a5c10",marginBottom:4}}>🔒 Picks hidden until kickoff</div>
                  <div style={{fontSize:12,color:"#7a5c10"}}>All predictions revealed June 11 at tournament start</div>
                </div>
              )}
              <div style={card}>
                {[
                  {label:"Champion",val:(tournamentStarted()||viewingUser.isMe)?viewingUser.picks.champion:null,emoji:"🏆",pts:"25 pts"},
                  {label:"Runner-up",val:(tournamentStarted()||viewingUser.isMe)?viewingUser.picks.runnerUp:null,emoji:"🥈",pts:"20 pts"},
                  {label:"3rd place",val:(tournamentStarted()||viewingUser.isMe)?viewingUser.picks.thirdPlace:null,emoji:"🥉",pts:"12 pts"},
                  {label:"Golden Boot",val:(tournamentStarted()||viewingUser.isMe)?viewingUser.picks.goldenBoot:null,emoji:"⚽",pts:"15 pts"},
                  {label:"Top Assist",val:(tournamentStarted()||viewingUser.isMe)?viewingUser.picks.topAssist:null,emoji:"🎯",pts:"15 pts"},
                  {label:"Golden Glove",val:(tournamentStarted()||viewingUser.isMe)?viewingUser.picks.goldenGlove:null,emoji:"🧤",pts:"15 pts"},
                ].map(({label,val,emoji,pts},i,arr)=>(
                  <div key={label} style={{padding:"10px 16px",borderBottom:i<arr.length-1?"0.5px solid var(--color-border-tertiary)":"none",display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:18}}>{val?FLAGS[val]||emoji:emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:1}}>{label}</div>
                      <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{val||"Not picked yet"}</div>
                    </div>
                    <span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{pts}</span>
                  </div>
                ))}
                {viewingUser.picks.doubleDowns?.length>0&&(
                  <div style={{padding:"10px 16px",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                    <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:6}}>Double-down picks</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {viewingUser.picks.doubleDowns.map((d,i)=>(
                        <div key={i} style={{fontSize:12,color:"var(--color-text-primary)",display:"flex",alignItems:"center",gap:6}}>
                          <span style={{color:C.gold,fontWeight:500}}>⚡</span>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{marginTop:"0.75rem",background:"var(--color-background-secondary)",borderRadius:8,display:"flex"}}>
                {viewingUserBreakdown&&(
                  <>
                    <div style={{flex:1,textAlign:"center",padding:"10px 8px",borderRight:"0.5px solid var(--color-border-tertiary)"}}>
                      <div style={{fontSize:16,fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace"}}>{viewingUserBreakdown.match}</div>
                      <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>⚽ Matches</div>
                    </div>
                    <div style={{flex:1,textAlign:"center",padding:"10px 8px",borderRight:"0.5px solid var(--color-border-tertiary)"}}>
                      <div style={{fontSize:16,fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace"}}>{viewingUserBreakdown.ko}</div>
                      <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>🏆 Knockout</div>
                    </div>
                    <div style={{flex:1,textAlign:"center",padding:"10px 8px",borderRight:"0.5px solid var(--color-border-tertiary)"}}>
                      <div style={{fontSize:16,fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace"}}>{viewingUserBreakdown.bonus}</div>
                      <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>⭐ Bonuses</div>
                    </div>
                    <div style={{flex:1,textAlign:"center",padding:"10px 8px"}}>
                      <div style={{fontSize:16,fontWeight:600,color:C.blue,fontFamily:"monospace"}}>{viewingUserBreakdown.total}</div>
                      <div style={{fontSize:10,color:C.blue,marginTop:2}}>Total</div>
                    </div>
                  </>
                ):(
                  <>
                    <div style={{flex:1,textAlign:"center",padding:"10px 14px",borderRight:"0.5px solid var(--color-border-tertiary)"}}>
                      <div style={{fontSize:18,fontWeight:600,color:C.blue,fontFamily:"monospace"}}>{viewingUser.pts}</div>
                      <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>points</div>
                    </div>
                    <div style={{flex:1,textAlign:"center",padding:"10px 14px"}}>
                      <div style={{fontSize:18,fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace"}}>{viewingUser.picks.groupDone}</div>
                      <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>group picks</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* League overview */}
          {!viewingUser&&!activeLeague&&leagueStep==="overview"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {joinedLeagues.length===0&&(
                <div style={{padding:"2rem",textAlign:"center",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12}}>
                  <div style={{fontSize:28,marginBottom:8}}>🏆</div>
                  <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>No leagues yet</div>
                  <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1rem"}}>Create a private league or join one with an invite code.</div>
                  <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                    <button onClick={()=>setLeagueStep("create")} style={{padding:"9px 18px",background:C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"}}>Create a league</button>
                    <button onClick={()=>setLeagueStep("join")} style={{padding:"9px 18px",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"}}>Join with code</button>
                  </div>
                </div>
              )}
              {joinedLeagues.map(league=>(<button key={league.id} onClick={()=>setActiveLeague(league)}
                style={{...card,padding:"14px 16px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12,width:"100%",background:"var(--color-background-primary)"}}>
                <div style={{width:38,height:38,borderRadius:9,background:league.id==="global"?C.blueLt:C.purpleLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{league.id==="global"?"🌍":"🏆"}</div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{league.name}</div><div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{league.members?.toLocaleString()} members</div></div>
                <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Your rank</div><div style={{fontSize:18,fontWeight:600,color:C.blue,fontFamily:"monospace"}}>#{league.rank||1}</div></div>
                <span style={{color:"var(--color-text-tertiary)",fontSize:18}}>›</span>
              </button>))}
              {joinedLeagues.length>0&&<button onClick={()=>setLeagueStep("join")} style={{padding:"12px",border:"0.5px dashed var(--color-border-tertiary)",borderRadius:12,background:"transparent",cursor:"pointer",fontSize:13,color:"var(--color-text-secondary)"}}>+ Join another league</button>}
            </div>
          )}

          {/* League detail + member predictions */}
          {!viewingUser&&activeLeague&&(
            <div>
              <button onClick={()=>{setActiveLeague(null);setMatchdayView(false);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1rem",padding:0}}>← My leagues</button>
              {!tournamentStarted()&&<div style={{display:"flex",gap:10,padding:"10px 14px",background:C.goldLt,border:`0.5px solid ${C.gold}`,borderRadius:10,marginBottom:"1rem",fontSize:12,color:"#7a5c10",alignItems:"center"}}><span>🔒</span><span>Picks are hidden until June 11 kickoff — come back then to see everyone's predictions!</span></div>}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem",flexWrap:"wrap"}}>
                <div style={{flex:1}}><div style={{fontSize:18,fontWeight:600,color:"var(--color-text-primary)"}}>{activeLeague.name}</div><div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{(leagueMembers.length||activeLeague.members||0).toLocaleString()} members</div></div>
                {activeLeague.code&&(
                  <div style={{background:C.blueLt,border:`0.5px solid ${C.blue}`,borderRadius:10,padding:"10px 12px",marginBottom:"0.75rem"}}>
                    <div style={{fontSize:11,fontWeight:500,color:C.blue,marginBottom:8}}>🔗 Invite your friends</div>
                    <div style={{fontFamily:"monospace",fontSize:13,fontWeight:500,color:"var(--color-text-primary)",background:"var(--color-background-primary)",padding:"7px 10px",borderRadius:6,marginBottom:8,textAlign:"center",border:"0.5px solid var(--color-border-tertiary)"}}>{activeLeague.code}</div>
                    <button onClick={()=>{
                      const msg = `Join my Mundialist league "${activeLeague.name}" and predict the World Cup 2026! Picks lock June 11 at kickoff.`;
                      if(navigator.share){navigator.share({title:"Mundialist - "+activeLeague.name,text:msg,url:"https://mundialist.com/?join="+activeLeague.code});}
                      else{navigator.clipboard?.writeText("https://mundialist.com/?join="+activeLeague.code);alert("Invite link copied!");}
                    }} style={{width:"100%",padding:"8px",background:C.blue,color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                      <span>📤</span> Share invite link
                    </button>
                  </div>
                )}
                <div style={{display:"flex",background:"#f1f5f9",borderRadius:10,padding:3,gap:2,boxShadow:"inset 0 1px 3px rgba(0,0,0,0.06)"}}>
                  <button onClick={()=>setMatchdayView(false)} style={{flex:1,padding:"6px 14px",borderRadius:7,border:"none",fontSize:12,cursor:"pointer",
                    background:!matchdayView?"#fff":"transparent",
                    color:!matchdayView?C.blue:"var(--color-text-secondary)",
                    fontWeight:!matchdayView?600:400,
                    boxShadow:!matchdayView?"0 1px 3px rgba(0,0,0,0.12)":"none",
                    transition:"all 0.15s"}}>Standings</button>
                  <button onClick={()=>{if(tournamentStarted()){setMatchdayView(true);loadMatchdayPicks(activeLeague.id);}}} style={{flex:1,padding:"6px 14px",borderRadius:7,border:"none",fontSize:12,cursor:tournamentStarted()?"pointer":"not-allowed",opacity:tournamentStarted()?1:0.5,
                    background:matchdayView?"#fff":"transparent",
                    color:matchdayView?C.blue:"var(--color-text-secondary)",
                    fontWeight:matchdayView?600:400,
                    boxShadow:matchdayView?"0 1px 3px rgba(0,0,0,0.12)":"none",
                    transition:"all 0.15s"}}>Matchday picks</button>
                </div>
              </div>
              <div style={card}>
                <div style={{padding:"10px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",gap:12,alignItems:"center"}}>
                  <span style={{fontSize:11,color:"var(--color-text-tertiary)",width:24,flexShrink:0}}>#</span>
                  <span style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",flex:1}}>Player</span>
                  <span style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",width:45,textAlign:"center",flexShrink:0}}>Pts</span>
                  {tournamentStarted()&&<span style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",width:80,textAlign:"center",flexShrink:0}}>Champion</span>}
                </div>
                {leagueMembers.map((m,i)=>(
                  <div key={i} onClick={()=>{setViewingUser(m);setViewingUserBreakdown({match:0,ko:0,bonus:0,total:0});loadUserBreakdown(m.id);}}
                    style={{padding:"12px 16px",borderBottom:i<leagueMembers.length-1?"0.5px solid var(--color-border-tertiary)":"none",
                      display:"flex",alignItems:"center",gap:12,cursor:"pointer",
                      background:m.name===(user?.name||"You")?C.blueLt:"transparent"}}>
                    <span style={{fontSize:13,fontWeight:600,color:i<3?C.blue:"var(--color-text-tertiary)",fontFamily:"monospace",width:24,flexShrink:0}}>{i+1}</span>
                    <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:[C.blue,C.red,C.green,C.gold,C.purple][i%5],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:"#fff"}}>{m.avatar}</div>
                      <div><div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{m.name}</div><div style={{fontSize:11,color:"var(--color-text-tertiary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:mobile?100:150}}>{m.handle}</div></div>
                    </div>
                    <span style={{fontFamily:"monospace",fontWeight:600,fontSize:14,color:m.isMe?C.blue:"var(--color-text-primary)",width:50,textAlign:"right",flexShrink:0}}>{m.pts}</span>
                    {tournamentStarted()&&<div style={{width:70,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:3,flexShrink:0,marginLeft:8}}>
                      <span style={{fontSize:14}}>{FLAGS[m.picks.champion]||"—"}</span>
                      <span style={{fontSize:10,color:"var(--color-text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:mobile?30:50}}>{m.picks.champion||""}</span>
                    </div>}
                    {!mobile&&tournamentStarted()&&<div style={{width:80,textAlign:"center",flexShrink:0}}>
                      <span style={{fontSize:11,color:"var(--color-text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{m.picks.goldenBoot||"—"}</span>
                    </div>}
                  </div>
                ))}
              </div>
              {!matchdayView&&<p style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:"0.75rem"}}>Tap any player to see their full picks.</p>}

              {matchdayView&&(
                matchdayLoading?(
                  <div style={{padding:"2rem",textAlign:"center",color:"var(--color-text-tertiary)",fontSize:13}}>Loading picks...</div>
                ):!matchdayData?.matches?.length?(
                  <div style={{padding:"2rem",textAlign:"center",color:"var(--color-text-tertiary)",fontSize:13}}>No matches scheduled today</div>
                ):(
                  <div style={{overflowX:"auto",marginTop:"0.75rem"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:400}}>
                      <thead>
                        <tr style={{background:"var(--color-background-secondary)"}}>
                          <th style={{padding:"8px 12px",textAlign:"left",fontWeight:500,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",minWidth:120}}>Member</th>
                          {(matchdayData.matches||[]).map((m,i)=>(
                            <th key={i} style={{padding:"8px 10px",textAlign:"center",borderBottom:"0.5px solid var(--color-border-tertiary)",minWidth:100,borderLeft:"0.5px solid var(--color-border-tertiary)"}}>
                              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                                <div style={{display:"flex",alignItems:"center",gap:4}}>
                                  <span style={{fontSize:14}}>{FLAGS[m.home_team]||"❓"}</span>
                                  <span style={{fontSize:9,color:"var(--color-text-tertiary)"}}>vs</span>
                                  <span style={{fontSize:14}}>{FLAGS[m.away_team]||"❓"}</span>
                                </div>
                                <span style={{fontSize:10,fontWeight:500,color:"var(--color-text-primary)"}}>{m.home_team?.split(" ")[0]} v {m.away_team?.split(" ")[0]}</span>
                                {m.status==="finished"&&m.actual_home!==null&&<span style={{fontSize:9,color:C.green,fontWeight:500}}>{m.actual_home}–{m.actual_away} FT</span>}
                                {m.city&&<span style={{fontSize:9,color:"var(--color-text-tertiary)"}}>📍 {m.city}</span>}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(matchdayData.rows||[]).map((row,ri)=>(
                          <tr key={row.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)",background:row.isMe?C.blueLt:"transparent"}}>
                            <td style={{padding:"10px 12px",borderRight:"0.5px solid var(--color-border-tertiary)"}}>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                <div style={{width:24,height:24,borderRadius:"50%",background:[C.blue,C.red,C.green,C.gold,C.purple][ri%5],display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:500,color:"#fff",flexShrink:0}}>{row.avatar}</div>
                                <div>
                                  <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)"}}>{row.name}</div>
                                  <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{row.handle}</div>
                                </div>
                              </div>
                            </td>
                            {(matchdayData.matches||[]).map((m,i)=>{
                              const pick=row.picks[i];
                              const isFinished=m.status==="finished"&&m.actual_home!==null;
                              const pts=isFinished&&pick?calcMatchPoints(pick.home,pick.away,m.actual_home,m.actual_away)*(pick.dd?2:1):null;
                              const bgCol=pts===null?"transparent":pts>=10?C.greenLt:pts>=6?"#EEF4FF":pts>0?C.goldLt:"#fef2f2";
                              const txCol=pts===null?"var(--color-text-primary)":pts>=10?C.green:pts>=6?C.blue:pts>0?C.gold:"#ef4444";
                              return(
                                <td key={i} style={{padding:"10px",textAlign:"center",background:bgCol,borderLeft:"0.5px solid var(--color-border-tertiary)"}}>
                                  {pick?(
                                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                                      <span style={{fontFamily:"monospace",fontWeight:500,fontSize:13,color:isFinished?txCol:"var(--color-text-primary)"}}>{pick.home}–{pick.away}</span>
                                      {pts!==null&&<span style={{fontSize:10,fontWeight:500,color:txCol}}>{pts>0?"+"+pts:"0"} pts</span>}
                                      {pick.dd&&<span style={{fontSize:9,color:C.gold}}>⚡×2</span>}
                                    </div>
                                  ):(
                                    <span style={{color:"var(--color-text-tertiary)",fontSize:11}}>—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}

          {/* Step: Join */}
          {!viewingUser&&!activeLeague&&leagueStep==="join"&&(
            <div style={{...card,padding:"1.5rem",overflow:"visible"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem"}}>
                <div style={{width:36,height:36,borderRadius:9,background:C.blueLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔑</div>
                <div><div style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)"}}>Join a league</div><div style={{fontSize:12,color:"var(--color-text-secondary)"}}>Enter the invite code from your league admin</div></div>
              </div>
              <input value={leagueCode} onChange={e=>setLeagueCode(e.target.value.toUpperCase())} placeholder="MND26-XXXXX"
                style={{...inp,fontFamily:"monospace",letterSpacing:"0.05em",marginBottom:10}}/>
              <button onClick={async()=>{
                if(!leagueCode.trim())return;
                showSaving();
                // Find league by invite code
                const {data:league,error}=await supabase.from("leagues").select("*").eq("invite_code",leagueCode).single();
                if(error||!league){showError();alert("League not found. Check the code and try again.");return;}
                // Join league
                await supabase.from("league_members").upsert({league_id:league.id,user_id:user.id,total_points:0},{onConflict:"league_id,user_id"});
                const nl={id:league.id,name:league.name,members:0,rank:1,code:leagueCode};
                setJoinedLeagues(p=>[...p.filter(l=>l.id!==league.id),nl]);
                setActiveLeague(nl);setLeagueStep("overview");
                showSaved();
              }} style={{width:"100%",padding:"11px",background:C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer"}}>Join league →</button>
            </div>
          )}

          {/* Step: Create */}
          {!viewingUser&&!activeLeague&&leagueStep==="create"&&(
            <div style={{...card,padding:"1.5rem",overflow:"visible"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem"}}>
                <div style={{width:36,height:36,borderRadius:9,background:C.purpleLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏆</div>
                <div><div style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)"}}>Create a league</div><div style={{fontSize:12,color:"var(--color-text-secondary)"}}>Share the code with your friends to invite them</div></div>
              </div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>League name</label>
                <input value={leagueName} onChange={e=>setLeagueName(e.target.value)} placeholder="e.g. Office Predictor 2026"
                  style={{...inp,marginBottom:0}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                <span style={{flex:1,fontFamily:"monospace",fontSize:16,fontWeight:500,letterSpacing:"0.08em",color:"var(--color-text-primary)"}}>{createdCode}</span>
                <button onClick={()=>navigator.clipboard?.writeText(createdCode)} style={{padding:"5px 10px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,fontSize:12,cursor:"pointer",color:"var(--color-text-secondary)"}}>Copy</button>
              </div>
              <button onClick={async()=>{
                if(!leagueName.trim())return;
                if(!user?.id)return;
                showSaving();
                const {data,error}=await supabase.from("leagues").insert({
                  name:leagueName,
                  invite_code:createdCode,
                  admin_id:user.id,
                }).select().single();
                if(error){showError();console.error(error.message);return;}
                await supabase.from("league_members").insert({league_id:data.id,user_id:user.id,total_points:0});
                const nl={id:data.id,name:data.name,members:1,rank:1,code:createdCode};
                setJoinedLeagues(p=>[...p.filter(l=>l.id!==data.id),nl]);
                setActiveLeague(nl);setLeagueStep("overview");
                showSaved();
              }} style={{width:"100%",padding:"11px",background:C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer"}}>Create & go to league →</button>
            </div>
          )}
        </div>
      )}

      {/* ══ INSTRUCTIONS ══ */}
      {page==="points"&&(
        <div style={{maxWidth:640,margin:"0 auto",padding:"2rem 1.5rem"}}>
          <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.03em",margin:"0 0 0.25rem",color:"var(--color-text-primary)"}}>How to Play</h1>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1.25rem"}}>Everything you need to know about scoring and bonuses.</p>
          <LockBanner/>
          {[
            {title:"Match score predictions",accent:C.blue,items:[
              {label:"Exact score",note:"e.g. predict 2–1, result 2–1",val:"10",c:C.blue},
              {label:"Correct result + correct goal difference",note:"e.g. predict 1–2, result 2–3",val:"8",c:C.blue},
              {label:"Correct draw, different score",note:"e.g. predict 1–1, result 2–2",val:"8",c:C.blue},
              {label:"Correct result only",val:"6",c:C.blue},
              {label:"Wrong result",note:"No negative scoring",val:"0",c:"#888"},
            ]},
            {title:"Group standings bonus",accent:C.purple,note:"Auto-calculated from your match scores — no separate pick needed.",items:[
              {label:"Winner & runner-up correct, right order",val:"5",c:C.purple},
              {label:"Both correct, positions swapped",val:"3",c:C.purple},
              {label:"Correct 3rd place team qualifies from group",val:"2",c:C.purple},
              {label:"Any other outcome",val:"0",c:"#888"},
            ]},
            {title:"Knockout stage",accent:C.green,note:"Points accumulate — a correct champion pick earns 12+14+16+18+25 = 85 pts total.",items:[
              {label:"R32 correct advancing team",val:"12",c:C.green},
              {label:"R16 correct advancing team",val:"14",c:C.green},
              {label:"QF correct advancing team",val:"16",c:C.green},
              {label:"SF correct advancing team",val:"18",c:C.green},
              {label:"Runner-up",val:"20",c:C.green},
              {label:"Tournament champion",val:"25",c:C.gold},
              {label:"Third place match",val:"12",c:C.green},
            ]},
            {title:"Dark horse bonus",accent:C.red,note:"On top of normal knockout pts. Non-seeded team = not one of the 12 group leaders.",items:[
              {label:"Non-seeded team reaches QF",val:"+5",c:C.red},
              {label:"Non-seeded team reaches SF",val:"+10",c:C.red},
              {label:"Non-seeded team reaches Final",val:"+15",c:C.red},
            ]},
            {title:"Bonus picks",accent:C.gold,items:[
              {label:"Double-down",note:"×2 on one match per matchday · 3 total · no seeded teams",val:"×2",c:C.gold},
              {label:"Golden Boot — correct top scorer",val:"15 pts",c:C.green},
              {label:"Top Assist — correct top assist provider",val:"15 pts",c:C.blue},
              {label:"Golden Glove — correct best goalkeeper",val:"15 pts",c:C.gold},
            ]},
          ].map(({title,accent,note,items})=>(
            <div key={title} style={{...card,marginBottom:"1rem",borderLeft:`3px solid ${accent}`,borderRadius:"0 12px 12px 0"}}>
              <div style={{padding:"11px 16px",borderBottom:"0.5px solid var(--color-border-tertiary)"}}><span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{title}</span></div>
              <div style={{padding:"0.75rem 16px"}}>
                {note&&<p style={{fontSize:12,color:"var(--color-text-secondary)",margin:items.length?"0 0 0.75rem":"0",lineHeight:1.6}}>{note}</p>}
                {items.map((r,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<items.length-1?"0.5px solid var(--color-border-tertiary)":"none"}}>
                    <div style={{flex:1,fontSize:13,color:"var(--color-text-primary)"}}>{r.label}{r.note&&<span style={{fontSize:11,color:"var(--color-text-tertiary)",marginLeft:8}}>{r.note}</span>}</div>
                    <span style={{fontFamily:"monospace",fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:99,background:r.c+"22",color:r.c,flexShrink:0}}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ TERMS ══ */}
      {page==="terms"&&(
        <div style={{maxWidth:640,margin:"0 auto",padding:"2rem 1.5rem"}}>
          <button onClick={()=>setPage("home")} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1rem",padding:0}}>← Back</button>
          <h1 style={{fontSize:22,fontWeight:600,letterSpacing:"-0.03em",margin:"0 0 1.5rem",color:"var(--color-text-primary)"}}>Terms & Conditions</h1>
          {[
            {title:"1. Service",body:"Mundialist is a free-to-play FIFA World Cup 2026 prediction game. No real money is involved."},
            {title:"2. Eligibility",body:"Open to anyone aged 18 or over. By registering you confirm you meet this requirement."},
            {title:"3. Your data",body:"We collect your name, username and email address to operate the game and send you prediction updates and league standings. We do not sell your data to third parties."},
            {title:"4. Emails",body:"By creating an account you consent to receive match digest emails and league update emails from Mundialist. You can unsubscribe at any time by emailing hello@mundialist.com."},
            {title:"5. Fair play",body:"Multiple accounts, automated submissions or any form of cheating will result in disqualification."},
            {title:"6. Changes",body:"We may update these terms at any time. Continued use of the service constitutes acceptance."},
            {title:"7. Contact",body:"Questions? Email hello@mundialist.com."},
          ].map(({title,body})=>(
            <div key={title} style={{marginBottom:"1.25rem"}}>
              <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>{title}</div>
              <div style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.7}}>{body}</div>
            </div>
          ))}
          <p style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:"2rem"}}>Last updated: May 2026</p>
        </div>
      )}

      </div>

      {/* Footer */}
      <footer style={{marginTop:"3rem",borderTop:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",paddingBottom:mobile?"calc(72px + env(safe-area-inset-bottom))":"2rem"}}>
        <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"0.75rem 2rem",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:"100%",height:52,background:"var(--color-background-secondary)",border:"0.5px dashed var(--color-border-tertiary)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Sponsor slot — sponsor@mundialist.com</span>
          </div>
        </div>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"1.25rem 2rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14,fontWeight:700,color:C.blue,letterSpacing:"-0.03em"}}>Mundialist</span>
            <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>· FIFA World Cup 2026</span>
          </div>
          <div style={{display:"flex",gap:"1.5rem"}}>
            <a href="mailto:sponsor@mundialist.com" style={{fontSize:12,color:"var(--color-text-tertiary)",textDecoration:"none"}}>Sponsor us</a>
            <a href="mailto:hello@mundialist.com" style={{fontSize:12,color:"var(--color-text-tertiary)",textDecoration:"none"}}>Contact</a>
            <button onClick={()=>setPage("terms")} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"var(--color-text-tertiary)",padding:0}}>Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
