// AUTO-EXTRACTED verbatim from src/App.jsx — DO NOT EDIT BY HAND.
// Keep in sync with App.jsx scoring. Source of truth for the daily-rank job.

// ---- GROUPS (App.jsx lines 12-25) ----
const GROUPS = {
  A:["Mexico","South Africa","South Korea","Czechia"],
  B:["Canada","Bosnia and Herzegovina","Qatar","Switzerland"],
  C:["Brazil","Morocco","Haiti","Scotland"],
  D:["USA","Paraguay","Australia","Türkiye"],
  E:["Germany","Curaçao","Ivory Coast","Ecuador"],
  F:["Netherlands","Japan","Sweden","Tunisia"],
  G:["Belgium","Egypt","Iran","New Zealand"],
  H:["Spain","Cape Verde","Saudi Arabia","Uruguay"],
  I:["France","Senegal","Iraq","Norway"],
  J:["Argentina","Algeria","Austria","Jordan"],
  K:["Portugal","DR Congo","Uzbekistan","Colombia"],
  L:["England","Croatia","Ghana","Panama"],
};

// ---- SEEDED (App.jsx lines 30-30) ----
const SEEDED=new Set(["Mexico","USA","Brazil","Germany","Spain","France","England","Portugal","Belgium","Netherlands","Argentina"]);

// ---- normTeam (App.jsx lines 1003-1008) ----
function normTeam(s){
  return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/&/g,'and').replace(/[^a-z]/g,'')
    .replace(/^czechrepublic$/,'czechia')
    .replace(/^turkiye$/,'turkey');
}

// ---- findActualResult (App.jsx lines 1023-1026) ----
function findActualResult(resultsArr, home, away){
  const nh=normTeam(home), na=normTeam(away);
  const arr=resultsArr||[];
  let r=arr.find(x=>x.status==='finished'&&normTeam(x.home_team)===nh&&normTeam(x.away_team)===na);
  if(r)return r;
  r=arr.find(x=>x.status==='finished'&&normTeam(x.home_team)===na&&normTeam(x.away_team)===nh);
  if(r)return {...r, home_team:r.away_team, away_team:r.home_team, actual_home:r.actual_away, actual_away:r.actual_home};
  return undefined;
}

// ---- generateGroupMatches (App.jsx lines 1028-1037) ----
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

// ---- calcMatchPoints (App.jsx lines 1116-1134) ----
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

// ---- calcKOPoints (App.jsx lines 1136-1142) ----
function calcKOPoints(round, pickedTeam, actualWinner, isDarkHorse){
  if(!actualWinner||!pickedTeam)return 0;
  if(pickedTeam!==actualWinner)return 0;
  const base={r32:12,r16:14,qf:16,sf:18,final:25,third:12}[round]||0;
  if(isDarkHorse)return Math.round(base*1.5);
  return base;
}

// ---- getKORoundFromId (App.jsx lines 1144-1157) ----
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

// ---- computeUserPoints (App.jsx lines 1159-1250) ----
function computeUserPoints(userPreds, bonusRow, actualArr, tournamentAwards){
  userPreds=userPreds||[]; bonusRow=bonusRow||{}; actualArr=actualArr||[]; tournamentAwards=tournamentAwards||{};
  let match=0, ko=0, bonus=0;
  const doubleIds=[bonusRow.double_down_r1,bonusRow.double_down_r2,bonusRow.double_down_r3].filter(Boolean);
  // Reconstruct this user's group scores from GS- predictions
  const gm={};
  Object.entries(GROUPS).forEach(([g,teams])=>{ gm[g]=generateGroupMatches(teams); });
  userPreds.forEach(p=>{
    if(p.match_id&&p.match_id.indexOf('GS-')===0){
      const parts=p.match_id.split('-'); const g=parts[1]; const idx=parseInt(parts[2]);
      if(gm[g]&&gm[g][idx]){
        gm[g][idx].homeScore=p.home_score==null?'':String(p.home_score);
        gm[g][idx].awayScore=p.away_score==null?'':String(p.away_score);
      }
    }
  });
  // 1. Group match points -> MATCHES; double-down increment -> BONUS (double-down is a bonus pick)
  Object.entries(GROUPS).forEach(([g])=>{
    (gm[g]||[]).forEach((m,idx)=>{
      if(m.homeScore===''||m.awayScore==='')return;
      const actual=findActualResult(actualArr,m.home,m.away);
      if(!actual)return;
      const pts=calcMatchPoints(m.homeScore,m.awayScore,actual.actual_home,actual.actual_away);
      match+=pts;
      if(doubleIds.indexOf(g+'-'+idx)!==-1)bonus+=pts;
    });
  });
  // 2. Group standings -> BONUS category (only once all 6 group matches finished): 5/3 top-2, 2 for 3rd qualifier
  Object.entries(GROUPS).forEach(([g,teams])=>{
    const groupActual=actualArr.filter(r=>r.status==='finished'&&r.group_name===g);
    if(groupActual.length<6)return;
    const ap={};teams.forEach(t=>{ap[t]={pts:0,gd:0,gf:0};});
    groupActual.forEach(r=>{
      const h=r.actual_home,a=r.actual_away;
      if(h>a)ap[r.home_team].pts+=3;else if(h<a)ap[r.away_team].pts+=3;else{ap[r.home_team].pts+=1;ap[r.away_team].pts+=1;}
      ap[r.home_team].gd+=h-a;ap[r.away_team].gd+=a-h;ap[r.home_team].gf+=h;ap[r.away_team].gf+=a;
    });
    const aStand=teams.slice().sort((x,y)=>ap[y].pts-ap[x].pts||ap[y].gd-ap[x].gd||ap[y].gf-ap[x].gf);
    const up={};teams.forEach(t=>{up[t]={pts:0,gd:0,gf:0};});
    (gm[g]||[]).forEach(m=>{
      if(m.homeScore===''||m.awayScore==='')return;
      const h=parseInt(m.homeScore),a=parseInt(m.awayScore);
      if(h>a)up[m.home].pts+=3;else if(h<a)up[m.away].pts+=3;else{up[m.home].pts+=1;up[m.away].pts+=1;}
      up[m.home].gd+=h-a;up[m.away].gd+=a-h;up[m.home].gf+=h;up[m.away].gf+=a;
    });
    const uStand=teams.slice().sort((x,y)=>up[y].pts-up[x].pts||up[y].gd-up[x].gd||up[y].gf-up[x].gf);
    if(uStand[0]===aStand[0]&&uStand[1]===aStand[1])bonus+=5;
    else if(uStand[0]===aStand[1]&&uStand[1]===aStand[0])bonus+=3;
    if(uStand[2]&&aStand[2]&&uStand[2]===aStand[2]){
      const qualified=actualArr.some(r=>r.stage==='r32'&&r.status==='finished'&&(r.home_team===aStand[2]||r.away_team===aStand[2]));
      if(qualified)bonus+=2;
    }
  });
  // Reconstruct KO picks from KO- predictions
  const koP={r32:{},r16:{},qf:{},sf:{},final:{},third:null};
  userPreds.forEach(p=>{
    if(!p.match_id||p.match_id.indexOf('KO-')!==0)return;
    const parts=p.match_id.split('-'); const round=parts[1]; const id=parts[2];
    if(round==='third')koP.third=p.advancing_team;
    else if(koP[round]&&id!==undefined)koP[round][id]=p.advancing_team;
  });
  // 3. KO rounds r32..sf
  ['r32','r16','qf','sf'].forEach(round=>{
    Object.keys(koP[round]||{}).forEach(k=>{
      const team=koP[round][k]; if(!team)return;
      const actual=actualArr.find(r=>r.status==='finished'&&r.stage==='knockout'&&getKORoundFromId(r.id)===round&&(r.home_team===team||r.away_team===team));
      if(!actual)return;
      const winner=actual.actual_home>actual.actual_away?actual.home_team:actual.away_team;
      if(team===winner)ko+=calcKOPoints(round,team,winner,!SEEDED.has(team));
    });
  });
  // Final: champion (25, x1.5 dark horse) + Finalist (20 each correct finalist, x1.5 dark horse)
  const finalActual=actualArr.find(r=>r.stage==='knockout'&&r.status==='finished'&&getKORoundFromId(r.id)==='final');
  if(finalActual){
    const champion=finalActual.actual_home>finalActual.actual_away?finalActual.home_team:finalActual.away_team;
    const actualFinalists=[finalActual.home_team,finalActual.away_team];
    if(koP.final&&koP.final['0']===champion)ko+=calcKOPoints('final',champion,champion,!SEEDED.has(champion));
    const userFinalists=Object.keys(koP.sf||{}).map(k=>koP.sf[k]).filter(Boolean);
    userFinalists.forEach(t=>{ if(actualFinalists.indexOf(t)!==-1)ko+=(!SEEDED.has(t)?Math.round(20*1.5):20); });
  }
  // Third place
  const thirdActual=actualArr.find(r=>r.stage==='knockout'&&r.status==='finished'&&getKORoundFromId(r.id)==='third');
  if(thirdActual&&koP.third){
    const tw=thirdActual.actual_home>thirdActual.actual_away?thirdActual.home_team:thirdActual.away_team;
    if(koP.third===tw)ko+=calcKOPoints('third',koP.third,tw,!SEEDED.has(koP.third));
  }
  // 4. Bonus awards (15 each)
  if(tournamentAwards.golden_boot&&bonusRow.golden_boot_player===tournamentAwards.golden_boot)bonus+=15;
  if(tournamentAwards.top_assist&&bonusRow.top_assist_player===tournamentAwards.top_assist)bonus+=15;
  if(tournamentAwards.golden_glove&&bonusRow.golden_glove_player===tournamentAwards.golden_glove)bonus+=15;
  return {match:match,ko:ko,bonus:bonus,total:match+ko+bonus};
}

export { GROUPS, SEEDED, normTeam, findActualResult, generateGroupMatches, calcMatchPoints, calcKOPoints, getKORoundFromId, computeUserPoints };