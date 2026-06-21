#!/usr/bin/env python3
"""
mundialist_install_v52.py
Unify scoring into ONE function used by the leaderboard AND the points breakdown.

Fixes:
  - #2 breakdown 0/0/0/0: loadUserBreakdown was called but never defined -> implement it.
  - leaderboard under-counting: loadLeagueMembers only summed group MATCH points and
    used the dead `is_double_down` flag (never written) so double-downs were ignored.
    Route it through the shared function, which uses the authoritative bonus
    double_down_r1/r2/r3 columns (same as calcTotalPoints).

New module-level computeUserPoints(userPreds, bonusRow, actualArr, tournamentAwards)
returns {match, ko, bonus, total}, mirroring calcTotalPoints exactly:
  match  = group match points (10/8/8/6/0, x2 double-down) + group standings (5/3/2,
           only once a group's 6 matches are finished)
  ko     = r32/r16/qf/sf (12/14/16/18, x1.5 dark horse) + champion(25)/runner-up(20)/third(12)
  bonus  = golden boot / top assist / golden glove, 15 each

At current tournament stage (no group complete, no KO, no awards) standings/ko/bonus
are all 0; the ONLY behavioral change today is that double-downs on already-finished
group matches now count (a correction; some totals rise).

4 edits. Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

# ---- Edit A: insert computeUserPoints before useCountdown (anchor is unique) ----
ANCHOR_A = "function useCountdown(){"
FUNC = r"""function computeUserPoints(userPreds, bonusRow, actualArr, tournamentAwards){
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
  // 1. Group match points (x2 double-down via authoritative bonus columns)
  Object.entries(GROUPS).forEach(([g])=>{
    (gm[g]||[]).forEach((m,idx)=>{
      if(m.homeScore===''||m.awayScore==='')return;
      const actual=findActualResult(actualArr,m.home,m.away);
      if(!actual)return;
      let pts=calcMatchPoints(m.homeScore,m.awayScore,actual.actual_home,actual.actual_away);
      if(doubleIds.indexOf(g+'-'+idx)!==-1)pts*=2;
      match+=pts;
    });
  });
  // 2. Group standings (only once all 6 group matches finished): 5/3 top-2, 2 for 3rd qualifier
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
    if(uStand[0]===aStand[0]&&uStand[1]===aStand[1])match+=5;
    else if(uStand[0]===aStand[1]&&uStand[1]===aStand[0])match+=3;
    if(uStand[2]&&aStand[2]&&uStand[2]===aStand[2]){
      const qualified=actualArr.some(r=>r.stage==='r32'&&r.status==='finished'&&(r.home_team===aStand[2]||r.away_team===aStand[2]));
      if(qualified)match+=2;
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
  // Final (champion 25 via calc, runner-up 20)
  const finalActual=actualArr.find(r=>r.stage==='knockout'&&r.status==='finished'&&getKORoundFromId(r.id)==='final');
  if(finalActual){
    const champion=finalActual.actual_home>finalActual.actual_away?finalActual.home_team:finalActual.away_team;
    const runnerUp=champion===finalActual.home_team?finalActual.away_team:finalActual.home_team;
    if(koP.final&&koP.final['0']===champion)ko+=calcKOPoints('final',champion,champion,!SEEDED.has(champion));
    const sfWinners=Object.keys(koP.sf||{}).map(k=>koP.sf[k]);
    const pickedRU=sfWinners.find(t=>t!==(koP.final&&koP.final['0']))||null;
    if(pickedRU===runnerUp)ko+=20;
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
}"""

# ---- Edit B: leaderboard bonus query needs double_down columns ----
OLD_B = "supabase.from('bonus_picks').select('user_id,golden_boot_player,top_assist_player,golden_glove_player,ko_picks').in('user_id',memberIds),"
NEW_B = "supabase.from('bonus_picks').select('user_id,golden_boot_player,top_assist_player,golden_glove_player,ko_picks,double_down_r1,double_down_r2,double_down_r3').in('user_id',memberIds),"

# ---- Edit C: replace leaderboard inline pts block with computeUserPoints ----
OLD_C = """        // Calculate points from predictions vs actual results
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
            const actual=findActualResult(Object.values(actualResults), matchDef.home, matchDef.away);
            if(actual){
              let matchPts=calcMatchPoints(p.home_score,p.away_score,actual.actual_home,actual.actual_away);
              if(p.is_double_down)matchPts*=2;
              pts+=matchPts;
            }
          }
        });"""
NEW_C = """        // Unified scoring (group match+standings, KO, bonus) - single source of truth
        const _bd=computeUserPoints(userPreds, bonus, Object.values(actualResults), tournamentAwards);
        const pts=_bd.total;"""

# ---- Edit D: add loadUserBreakdown before loadLeagueMembers ----
ANCHOR_D = "  const loadLeagueMembers=async(leagueId)=>{"
NEW_D = """  const loadUserBreakdown=async(userId)=>{
    try{
      const [{data:preds},{data:bonusRows}]=await Promise.all([
        fetchAllPredictions('user_id,match_id,home_score,away_score,advancing_team', [userId]),
        supabase.from('bonus_picks').select('golden_boot_player,top_assist_player,golden_glove_player,double_down_r1,double_down_r2,double_down_r3').eq('user_id',userId),
      ]);
      const bonusRow=(bonusRows&&bonusRows[0])||{};
      const bd=computeUserPoints(preds||[], bonusRow, Object.values(actualResults), tournamentAwards);
      setViewingUserBreakdown(bd);
    }catch(e){console.error('loadUserBreakdown error:',e);setViewingUserBreakdown({match:0,ko:0,bonus:0,total:0});}
  };

  const loadLeagueMembers=async(leagueId)=>{"""

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if "function computeUserPoints(" in src:
    die("computeUserPoints already present -- patch appears already applied. No changes made.")

checks = [("A computeUserPoints anchor", ANCHOR_A),
          ("B bonus query", OLD_B),
          ("C pts block", OLD_C),
          ("D loadLeagueMembers anchor", ANCHOR_D)]
for label, s in checks:
    if src.count(s) != 1:
        die("expected exactly 1 occurrence of %s, found %d." % (label, src.count(s)))

src = src.replace(ANCHOR_A, FUNC + "\n\nfunction useCountdown(){", 1)

src = src.replace(OLD_B, NEW_B, 1)
src = src.replace(OLD_C, NEW_C, 1)
src = src.replace(ANCHOR_D, NEW_D, 1)

# Post-checks
for label, s in [("computeUserPoints def", "function computeUserPoints("),
                 ("breakdown impl", "const loadUserBreakdown=async(userId)=>{"),
                 ("leaderboard uses unified", "const _bd=computeUserPoints(userPreds, bonus, Object.values(actualResults), tournamentAwards);"),
                 ("double_down cols in query", "ko_picks,double_down_r1,double_down_r2,double_down_r3")]:
    if s not in src:
        die("post-check failed: %s missing." % label)
if "if(p.is_double_down)matchPts*=2;" in src:
    die("post-check failed: old dead-flag double-down logic still present in leaderboard.")
# Ensure exactly one useCountdown remains (no duplication from the anchor swap)
if src.count("function useCountdown(){") != 1:
    die("post-check failed: useCountdown count=%d (anchor swap issue)." % src.count("function useCountdown(){"))

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v52 -- unified scoring; breakdown implemented; leaderboard routed through computeUserPoints (double-downs now counted).")
