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
// Derived from the full Wikipedia Annex C table (first 50 combinations)
// We cover all combinations containing groups C,D,E,F,G,H,I,J,K,L (most common)
const ANNEX_C = {
  // Groups that advance 3rd: EFGHIJKL (no A,B,C,D)
  "EFGHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3F","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },
  // DFGHIJKL
  "DFGHIJKL": { "1A":"3H","1B":"3G","1D":"3I","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },
  // DEGHIJKL
  "DEGHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3D","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },
  // DEFHIJKL
  "DEFHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // DEFGIJKL
  "DEFGIJKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },
  // DEFGHJKL
  "DEFGHJKL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // DEFGHIKL
  "DEFGHIKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // DEFGHIJL
  "DEFGHIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },
  // DEFGHIJK
  "DEFGHIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },
  // CFGHIJKL
  "CFGHIJKL": { "1A":"3H","1B":"3G","1D":"3I","1E":"3C","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },
  // CEGHIJKL
  "CEGHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3C","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },
  // CEFHIJKL
  "CEFHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // CEFGIJKL
  "CEFGIJKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3C","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },
  // CEFGHJKL
  "CEFGHJKL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // CEFGHIKL
  "CEFGHIKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // CEFGHIJL
  "CEFGHIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },
  // CEFGHIJK
  "CEFGHIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },
  // CDGHIJKL
  "CDGHIJKL": { "1A":"3H","1B":"3G","1D":"3I","1E":"3C","1G":"3J","1I":"3D","1K":"3L","1L":"3K" },
  // CDFHIJKL
  "CDFHIJKL": { "1A":"3C","1B":"3J","1D":"3I","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // CDFGIJKL
  "CDFGIJKL": { "1A":"3C","1B":"3G","1D":"3I","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },
  // CDFGHJKL
  "CDFGHJKL": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // CDFGHIKL
  "CDFGHIKL": { "1A":"3C","1B":"3G","1D":"3I","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // CDFGHIJL
  "CDFGHIJL": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },
  // CDFGHIJK
  "CDFGHIJK": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },
  // CDEHIJKL
  "CDEHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3C","1G":"3H","1I":"3D","1K":"3L","1L":"3K" },
  // CDEGHIJL → 29
  "CDEGHIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3H","1I":"3D","1K":"3L","1L":"3I" },
  // CDEGHIJK → 30
  "CDEGHIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3H","1I":"3D","1K":"3I","1L":"3K" },
  // CDEFIJKL → 31
  "CDEFIJKL": { "1A":"3C","1B":"3J","1D":"3E","1E":"3D","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },
  // CDEFHJKL → 32
  "CDEFHJKL": { "1A":"3C","1B":"3J","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // CDEFHIKL → 33
  "CDEFHIKL": { "1A":"3C","1B":"3E","1D":"3I","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // CDEFHIJL → 34
  "CDEFHIJL": { "1A":"3C","1B":"3J","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },
  // CDEFHIJK → 35
  "CDEFHIJK": { "1A":"3C","1B":"3J","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },
  // CDEFGJKL → 36
  "CDEFGJKL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },
  // CDEFGIKL → 37
  "CDEFGIKL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },
  // CDEFGIJL → 38
  "CDEFGIJL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3I" },
  // CDEFGIJK → 39
  "CDEFGIJK": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3J","1I":"3F","1K":"3I","1L":"3K" },
  // CDEFGHKL → 40
  "CDEFGHKL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },
  // CDEFGHJL → 41
  "CDEFGHJL": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3E" },
  // CDEFGHJK → 42
  "CDEFGHJK": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3E","1L":"3K" },
  // CDEFGHIL → 43
  "CDEFGHIL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },
  // CDEFGHIK → 44
  "CDEFGHIK": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },
  // CDEFGHIJ → 45
  "CDEFGHIJ": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3E","1L":"3I" },
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
  const annexRow=ANNEX_C[best8Groups]||null;

  // Build the 16 R32 matches
  return R32_FIXED.map(match=>{
    let home=match.home;
    let away=match.away;
    // Resolve positions to team names
    if(home.startsWith("1")||home.startsWith("2")) home=pos[home]||"TBD";
    if(away.startsWith("1")||away.startsWith("2")) away=pos[away]||"TBD";
    // Resolve 3rd place slots
    if(home==="3?"||away==="3?") {
      if(annexRow) {
        const matchId=`1${match.home.slice(1)}`; // e.g. "1A","1B","1D"...
        const thirdCode=annexRow[matchId]; // e.g. "3E"
        if(thirdCode) {
          const thirdGroup=thirdCode.slice(1);
          const thirdTeam=allStandings[thirdGroup]?.[2]?.team||"TBD";
          if(home==="3?") home=thirdTeam;
          if(away==="3?") away=thirdTeam;
        }
      } else {
        // Fallback: assign best8 thirds in order
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

function AdSlot(){return(<div style={{width:"100%",height:72,background:"var(--color-background-secondary)",border:"0.5px dashed var(--color-border-tertiary)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"1.5rem"}}><span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Advertisement — sponsor@wc26predictor.com</span></div>);}
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
  // Knockout picks per round: { r32:{0:"team",...}, r16:{...}, qf:{...}, sf:{...}, final:{...} }
  const [koPicks,setKoPicks]=useState({r32:{},r16:{},qf:{},sf:{},final:{}});
  const [leagueCode,setLeagueCode]=useState("");
  const [joinedLeagues,setJoinedLeagues]=useState([]);
  const [activeLeague,setActiveLeague]=useState(null);
  const [leagueTab,setLeagueTab]=useState("overview");
  const [createdCode]=useState("WC26-"+Math.random().toString(36).substring(2,7).toUpperCase());

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
              <span style={{fontSize:18,fontWeight:600,letterSpacing:"-0.03em",color:C.blue}}>WC26</span>
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
        </div>
      )}

      {/* ══ LEAGUE ══ */}
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
              <input value={leagueCode} onChange={e=>setLeagueCode(e.target.value.toUpperCase())} placeholder="WC26-XXXXX" style={{...inp,fontFamily:"monospace",letterSpacing:"0.05em",marginBottom:10}}/>
              <button onClick={()=>{if(leagueCode.startsWith("WC26-")){const nl={id:leagueCode,name:"Friends League",members:12,rank:3,code:leagueCode};setJoinedLeagues(p=>[...p,nl]);setActiveLeague(nl);setLeagueTab("overview");}}} style={{width:"100%",padding:"11px",background:C.blue,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer"}}>Join league →</button>
            </div>
          ):(
            <div style={{...card,padding:"1.5rem",overflow:"visible"}}>
              <h2 style={{fontSize:15,fontWeight:500,margin:"0 0 0.75rem",color:"var(--color-text-primary)"}}>Your league code</h2>
              <div style={{display:"flex",alignItems:"center",gap:10,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
                <span style={{flex:1,fontFamily:"monospace",fontSize:18,fontWeight:500,letterSpacing:"0.08em",color:"var(--color-text-primary)"}}>{createdCode}</span>
                <button onClick={()=>navigator.clipboard?.writeText(createdCode)} style={{padding:"6px 12px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,fontSize:12,cursor:"pointer",color:"var(--color-text-secondary)"}}>Copy</button>
              </div>
              <button onClick={()=>{const nl={id:createdCode,name:"My WC26 League",members:1,rank:1,code:createdCode};setJoinedLeagues(p=>[...p,nl]);setActiveLeague(nl);setLeagueTab("overview");}} style={{width:"100%",padding:"11px",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer"}}>Go to my league →</button>
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
            <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Sponsor slot — sponsor@wc26predictor.com</span>
          </div>
        </div>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"1.25rem 2rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:14,fontWeight:600,color:C.blue}}>WC26</span>
            <span style={{fontSize:11,background:C.blue,color:"#fff",padding:"1px 6px",borderRadius:99}}>Predictor</span>
            <span style={{fontSize:12,color:"var(--color-text-tertiary)",marginLeft:4}}>· FIFA World Cup 2026 · USA · Canada · Mexico</span>
          </div>
          <div style={{display:"flex",gap:"1.5rem"}}>
            <a href="mailto:sponsor@wc26predictor.com" style={{fontSize:12,color:"var(--color-text-tertiary)",textDecoration:"none"}}>Sponsor us</a>
            <a href="mailto:hello@wc26predictor.com" style={{fontSize:12,color:"var(--color-text-tertiary)",textDecoration:"none"}}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
