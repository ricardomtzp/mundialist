#!/usr/bin/env python3
"""
mundialist_install_v56.py
Replace hardcoded "#1" league rank with the real rank from daily_ranks, and add
the daily rank-change indicator (chevron + number; muted dash when held).

loadJoinedLeagues currently builds every league with rank:1. This patch:
  1. Fetches this user's rows from daily_ranks (newest snapshot_date first).
  2. Per league: latest snapshot's rank, plus delta vs the previous snapshot
     (delta = prevRank - currentRank, so #3 -> #5 yields -2). delta stays null
     when only one snapshot exists (first day) and is exactly 0 when held.
  3. Sets each league's rank (fallback 1 until a snapshot exists) and rankDelta.
  4. Renders four states under the rank:
       delta > 0  -> green up-chevron + number
       delta < 0  -> red down-chevron + number
       delta == 0 -> muted dash (held)
       delta null -> nothing (no prior snapshot / first day)
Chevrons are inline SVG (render identically everywhere; the app has no icon font).
Reads only from daily_ranks. Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

OLD_1 = """      const countMap={};
      (counts||[]).forEach(r=>{countMap[r.league_id]=(countMap[r.league_id]||0)+1;});
      const leagues=data.map(d=>({
        id:d.leagues.id,
        name:d.leagues.name,
        code:d.leagues.invite_code==='MND26-GLOBAL'?null:d.leagues.invite_code,
        members:countMap[d.leagues.id]||0,
        rank:1,
      }));"""

NEW_1 = """      const countMap={};
      (counts||[]).forEach(r=>{countMap[r.league_id]=(countMap[r.league_id]||0)+1;});
      // Real rank + daily delta from daily_ranks snapshots (latest two per league)
      const {data:rankRows}=await supabase
        .from('daily_ranks')
        .select('league_id,snapshot_date,rank')
        .eq('user_id',userId)
        .order('snapshot_date',{ascending:false});
      const rankMap={};
      (rankRows||[]).forEach(r=>{
        if(!rankMap[r.league_id])rankMap[r.league_id]={rank:r.rank,delta:null,_prev:false};
        else if(!rankMap[r.league_id]._prev){rankMap[r.league_id].delta=r.rank-rankMap[r.league_id].rank;rankMap[r.league_id]._prev=true;}
      });
      const leagues=data.map(d=>({
        id:d.leagues.id,
        name:d.leagues.name,
        code:d.leagues.invite_code==='MND26-GLOBAL'?null:d.leagues.invite_code,
        members:countMap[d.leagues.id]||0,
        rank:rankMap[d.leagues.id]?rankMap[d.leagues.id].rank:1,
        rankDelta:rankMap[d.leagues.id]?rankMap[d.leagues.id].delta:null,
      }));"""

OLD_2 = (
    '                <div style={{textAlign:"right",flexShrink:0}}>'
    '<div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Your rank</div>'
    '<div style={{fontSize:18,fontWeight:600,color:C.blue,fontFamily:"monospace"}}>#{league.rank||1}</div></div>'
)

NEW_2 = (
    '                <div style={{textAlign:"right",flexShrink:0}}>'
    '<div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>Your rank</div>'
    '<div style={{fontSize:18,fontWeight:600,color:C.blue,fontFamily:"monospace"}}>#{league.rank||1}</div>'
    '{league.rankDelta!=null&&(league.rankDelta>0?'
    '<div style={{fontSize:11,fontWeight:600,color:C.green,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:2}}>'
    '<svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={C.green} strokeWidth="2"><path d="M2 8 L6 4 L10 8"/></svg>{league.rankDelta}</div>'
    ':league.rankDelta<0?'
    '<div style={{fontSize:11,fontWeight:600,color:C.red,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:2}}>'
    '<svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={C.red} strokeWidth="2"><path d="M2 4 L6 8 L10 4"/></svg>{Math.abs(league.rankDelta)}</div>'
    ':<div style={{fontSize:11,fontWeight:600,color:"var(--color-text-tertiary)"}}>\u2013</div>)}'
    '</div>'
)

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if "from('daily_ranks')" in src or "rankDelta" in src:
    die("daily_ranks rank logic already present -- patch appears already applied. No changes made.")

for label, s in [("E1 loadJoinedLeagues", OLD_1), ("E2 render", OLD_2)]:
    if src.count(s) != 1:
        die("expected exactly 1 occurrence of %s, found %d." % (label, src.count(s)))

src = src.replace(OLD_1, NEW_1, 1)
src = src.replace(OLD_2, NEW_2, 1)

for label, s in [("daily_ranks fetch", "from('daily_ranks')"),
                 ("rankMap build", "rankMap[r.league_id]={rank:r.rank,delta:null,_prev:false}"),
                 ("rank from map", "rank:rankMap[d.leagues.id]?rankMap[d.leagues.id].rank:1"),
                 ("rankDelta field", "rankDelta:rankMap[d.leagues.id]?rankMap[d.leagues.id].delta:null"),
                 ("up chevron", 'd="M2 8 L6 4 L10 8"'),
                 ("down chevron", 'd="M2 4 L6 8 L10 4"'),
                 ("held dash", '>\u2013</div>)}')]:
    if s not in src:
        die("post-check failed: %s missing." % label)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v56 -- real rank + daily delta (chevron up/down, dash when held).")
