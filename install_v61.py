#!/usr/bin/env python3
"""
v61 — Knockout matchday picks (tick-grid)
Adds a KO branch to loadMatchdayPicks + a tick-cell render branch.
Group-stage path is left byte-for-byte unchanged.
Idempotent; asserts each anchor appears exactly once; self-verifies.
"""
import sys, io

PATH = "src/App.jsx"

# ---- Anchor 1: the today-matches query (group-only). We replace the stage filter
#      block with one that ALSO fetches knockout matches for today. ----
OLD_QUERY = """      // Get today's matches from DB
      const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'});
      const {data:todayMatches}=await supabase.from('matches')
        .select('id,home_team,away_team,actual_home,actual_away,status,stage,group_name,venue,city,kickoff')
        .eq('stage','group')
        .gte('kickoff',today+'T00:00:00Z')
        .lte('kickoff',today+'T23:59:59Z')
        .order('kickoff');

      // Fallback: if no matches today use all group matches that are finished or upcoming
      const matches=todayMatches?.length?todayMatches:
        Object.values(actualResults).filter(r=>r.stage==='group').slice(0,4);"""

NEW_QUERY = """      // Get today's matches from DB (group OR knockout)
      const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'});
      const {data:todayMatches}=await supabase.from('matches')
        .select('id,home_team,away_team,actual_home,actual_away,status,stage,group_name,venue,city,kickoff')
        .gte('kickoff',today+'T00:00:00Z')
        .lte('kickoff',today+'T23:59:59Z')
        .order('kickoff');

      // Determine mode: if today's fixtures are knockout, render KO tick-grid.
      const koToday=(todayMatches||[]).filter(m=>m.stage==='knockout');
      const isKOMatchday=koToday.length>0 && (todayMatches||[]).every(m=>m.stage==='knockout');

      // Fallback (group): if no matches today use all group matches that are finished or upcoming
      const matches=todayMatches?.length?todayMatches:
        Object.values(actualResults).filter(r=>r.stage==='group').slice(0,4);"""

# ---- Anchor 2: just before building rows, branch to KO builder if KO matchday. ----
OLD_BUILD = """      // Build member rows with their picks for today's matches
      const rows=memberIds.map(uid=>{"""

NEW_BUILD = """      // ── KNOCKOUT matchday branch (v61) ───────────────────────────────────
      // KO picks store the advancing team NAME in advancing_team (no scores).
      // Columns = the two resolved teams of each KO fixture; a member is
      // "ticked" under a team if they picked it to advance in that round.
      // A member may have BOTH teams ticked (different bracket paths) — by design.
      if(isKOMatchday){
        // Resolve each KO fixture to its two real team names.
        // R32: map fixture's placeholder codes -> R32_FIXED slot index -> resolved
        //      teams via buildR32Bracket(actual standings from real results).
        const actualStandings={};
        Object.keys(GROUPS).forEach(g=>{
          const gms=generateGroupMatches(GROUPS[g]).map(m=>{
            const ar=findActualResult(Object.values(actualResults),m.home,m.away);
            return ar?{...m,homeScore:ar.actual_home,awayScore:ar.actual_away}:{...m,homeScore:"",awayScore:""};
          });
          actualStandings[g]=getGroupStandings(GROUPS[g],gms);
        });
        const resolvedR32=buildR32Bracket(actualStandings); // [{matchId,home,away}] by slot 0..15

        // Build KO column descriptors for today's fixtures.
        const koCols=koToday.map(m=>{
          const round=getKORoundFromId(m.id);
          let home=m.home_team, away=m.away_team, slot=null;
          if(round==='r32'){
            // match fixture's winner/home code (e.g. "1E","2A") to R32_FIXED slot
            const fi=R32_FIXED.findIndex(f=>f.home===m.home_team || (f.away===m.away_team && f.home===m.home_team));
            const byHome=R32_FIXED.findIndex(f=>f.home===m.home_team);
            slot=byHome>=0?byHome:fi;
            if(slot>=0&&resolvedR32[slot]){home=resolvedR32[slot].home;away=resolvedR32[slot].away;}
          }
          // For later rounds the matches table may already carry resolved names.
          return {raw:m, round, slot, home, away};
        });

        const rows=memberIds.map(uid=>{
          const profile=profileMap[uid]||{};
          const picks={};
          koCols.forEach((col,i)=>{
            // gather this member's advancing_team picks for this round
            const roundKey=col.round; // 'r32','r16',...
            const myPicks=[];
            Object.entries(predMap[uid]||{}).forEach(([mid,val])=>{
              if(mid.indexOf('KO-'+roundKey+'-')===0 && val.advancing){myPicks.push(val.advancing);}
            });
            const pickedHome=col.home&&myPicks.some(t=>normTeam(t)===normTeam(col.home));
            const pickedAway=col.away&&myPicks.some(t=>normTeam(t)===normTeam(col.away));
            picks[i]={ko:true,pickedHome,pickedAway};
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

        const koMatches=koCols.map(c=>({
          ...c.raw, home_team:c.home, away_team:c.away, _ko:true,
        }));
        setMatchdayData({matches:koMatches,rows,koMode:true});
        return;
      }

      // Build member rows with their picks for today's matches
      const rows=memberIds.map(uid=>{"""

# ---- Anchor 3: predMap must also capture advancing_team for KO picks. ----
OLD_PREDMAP = """      const predMap={};
      (preds||[]).forEach(p=>{
        if(!predMap[p.user_id])predMap[p.user_id]={};
        predMap[p.user_id][p.match_id]={home:p.home_score,away:p.away_score,dd:p.is_double_down};
      });"""

NEW_PREDMAP = """      const predMap={};
      (preds||[]).forEach(p=>{
        if(!predMap[p.user_id])predMap[p.user_id]={};
        predMap[p.user_id][p.match_id]={home:p.home_score,away:p.away_score,dd:p.is_double_down,advancing:p.advancing_team};
      });"""

# ---- Anchor 4: preds query must SELECT advancing_team. ----
OLD_PREDS_SELECT = """        fetchAllPredictions('user_id,match_id,home_score,away_score,is_double_down', memberIds),"""
NEW_PREDS_SELECT = """        fetchAllPredictions('user_id,match_id,home_score,away_score,is_double_down,advancing_team', memberIds),"""

# ---- Anchor 5: render — add KO tick-cell branch at top of cell map. ----
OLD_CELL = """                              const pick=row.picks[i];
                              const isFinished=m.status===\"finished\"&&m.actual_home!==null;"""
NEW_CELL = """                              const pick=row.picks[i];
                              if(pick&&pick.ko){
                                const tick=(on)=>on?<span style={{color:C.green,fontWeight:600,fontSize:15}}>✓</span>:<span style={{color:\"var(--color-text-tertiary)\",fontSize:11}}>·</span>;
                                return(
                                  <td key={i} style={{padding:\"10px\",textAlign:\"center\",borderLeft:\"0.5px solid var(--color-border-tertiary)\"}}>
                                    <div style={{display:\"flex\",alignItems:\"center\",justifyContent:\"center\",gap:14}}>
                                      <div style={{display:\"flex\",flexDirection:\"column\",alignItems:\"center\",gap:1}}>
                                        <span style={{fontSize:13}}>{FLAGS[m.home_team]||\"\"}</span>
                                        {tick(pick.pickedHome)}
                                      </div>
                                      <div style={{display:\"flex\",flexDirection:\"column\",alignItems:\"center\",gap:1}}>
                                        <span style={{fontSize:13}}>{FLAGS[m.away_team]||\"\"}</span>
                                        {tick(pick.pickedAway)}
                                      </div>
                                    </div>
                                  </td>
                                );
                              }
                              const isFinished=m.status===\"finished\"&&m.actual_home!==null;"""

def die(msg):
    print("ABORTED: "+msg); sys.exit(1)

with io.open(PATH,"r",encoding="utf-8") as f:
    src=f.read()
orig=src

# idempotency
if "KNOCKOUT matchday branch (v61)" in src:
    print("v61 already installed — nothing to do."); sys.exit(0)

for name,old in [("query",OLD_QUERY),("build",OLD_BUILD),("predmap",OLD_PREDMAP),
                 ("preds_select",OLD_PREDS_SELECT),("cell",OLD_CELL)]:
    if src.count(old)!=1:
        die(f"expected exactly 1 occurrence of anchor '{name}', found {src.count(old)}")

src=src.replace(OLD_QUERY,NEW_QUERY,1)
src=src.replace(OLD_BUILD,NEW_BUILD,1)
src=src.replace(OLD_PREDMAP,NEW_PREDMAP,1)
src=src.replace(OLD_PREDS_SELECT,NEW_PREDS_SELECT,1)
src=src.replace(OLD_CELL,NEW_CELL,1)

# post-checks
for token in ["KNOCKOUT matchday branch (v61)","koMode:true","pick.ko",
              "advancing:p.advancing_team","is_double_down,advancing_team"]:
    if token not in src: die(f"post-check failed: '{token}' missing after patch")
if src==orig: die("no change written")

with io.open(PATH,"w",encoding="utf-8") as f:
    f.write(src)
print("v61 install: SUCCESS")
print("  - loadMatchdayPicks: KO branch added (group path unchanged)")
print("  - preds query + predMap now include advancing_team")
print("  - render: KO tick-cell branch added")
