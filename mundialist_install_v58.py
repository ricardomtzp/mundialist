#!/usr/bin/env python3
"""
mundialist_install_v58.py
Fix inverted scores on Matchday Picks for fixtures stored in reversed home/away
orientation relative to the GROUPS slot order.

Cause: loadMatchdayPicks displays each fixture using the matches-table orientation
(header shows m.home_team v m.away_team, and the FT result m.actual_home-m.actual_away),
but a user's stored pick is in the GROUPS *slot* orientation (generateGroupMatches).
When the matches row is reversed vs the slot (e.g. matches row "Czechia v South Africa"
while slot A-3 is "South Africa v Czechia"), the pick's two numbers render under the
wrong teams -> inverted score.

Fix: when the fixture matches its slot in reversed orientation, swap the pick's
home/away so it lines up with the displayed (matches-row) header. DISPLAY ONLY:
this only changes how picks render in the matchday table. It does NOT modify stored
predictions and does NOT affect scoring (computeUserPoints/findActualResult are a
separate, orientation-preserving path).

Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

OLD = """          const idx=gMatches.findIndex(gm=>{
            const gh=normTeam(gm.home),ga=normTeam(gm.away),mh=normTeam(m.home_team),ma=normTeam(m.away_team);
            return (gh===mh&&ga===ma)||(gh===ma&&ga===mh);
          });
          const matchId=idx>=0?`GS-${grp}-${idx}`:null;
          const base=matchId&&predMap[uid]?.[matchId]?predMap[uid][matchId]:null;
          picks[i]=base?{home:base.home,away:base.away,dd:doubledMap[uid]?doubledMap[uid].has(`${grp}-${idx}`):false}:null;"""

NEW = """          let idx=-1,reversed=false;
          for(let gi=0;gi<gMatches.length;gi++){
            const gh=normTeam(gMatches[gi].home),ga=normTeam(gMatches[gi].away),mh=normTeam(m.home_team),ma=normTeam(m.away_team);
            if(gh===mh&&ga===ma){idx=gi;reversed=false;break;}
            if(gh===ma&&ga===mh){idx=gi;reversed=true;break;}
          }
          const matchId=idx>=0?`GS-${grp}-${idx}`:null;
          const base=matchId&&predMap[uid]?.[matchId]?predMap[uid][matchId]:null;
          picks[i]=base?{home:reversed?base.away:base.home,away:reversed?base.home:base.away,dd:doubledMap[uid]?doubledMap[uid].has(`${grp}-${idx}`):false}:null;"""

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if "let idx=-1,reversed=false;" in src:
    die("orientation-aware matchday mapping already present -- patch appears already applied. No changes made.")

if src.count(OLD) != 1:
    die("expected exactly 1 occurrence of the matchday findIndex block, found %d." % src.count(OLD))

src = src.replace(OLD, NEW, 1)

for label, s in [("orientation loop", "for(let gi=0;gi<gMatches.length;gi++){"),
                 ("reversed forward branch", "if(gh===mh&&ga===ma){idx=gi;reversed=false;break;}"),
                 ("reversed branch", "if(gh===ma&&ga===mh){idx=gi;reversed=true;break;}"),
                 ("swap applied", "home:reversed?base.away:base.home,away:reversed?base.home:base.away")]:
    if s not in src:
        die("post-check failed: %s missing." % label)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v58 -- matchday pick orientation now aligns with displayed fixture (display-only).")
