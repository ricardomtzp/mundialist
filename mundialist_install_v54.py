#!/usr/bin/env python3
"""
mundialist_install_v54.py
Make the matchday-picks double-down indicator (and its doubled points) actually work.

The matchday view already renders a gold "⚡×2" badge and doubles the points
(*(pick.dd?2:1)) -- but pick.dd reads predictions.is_double_down, which is NEVER
written (same dead flag v52 found). Real double-downs live in bonus_picks
double_down_r1/r2/r3 as "<group>-<idx>" keys (e.g. "A-0").

This is a DATA-ONLY fix in loadMatchdayPicks (no UI change):
  1. Also fetch each member's bonus double_down_r1/r2/r3.
  2. Build doubledMap[user] = Set of doubled "<group>-<idx>" keys.
  3. Set each pick's dd from that authoritative set (not the dead flag).

Effect: the existing ⚡×2 badge appears on doubled picks, and the doubled points
display correctly -- consistent with the leaderboard after v52. Group stage only
(all this view shows). Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

OLD_A = (
    "      const [{data:profiles},{data:preds}]=await Promise.all([\n"
    "        supabase.from('users').select('id,name,handle,avatar_letter').in('id',memberIds),\n"
    "        fetchAllPredictions('user_id,match_id,home_score,away_score,is_double_down', memberIds),\n"
    "      ]);"
)
NEW_A = (
    "      const [{data:profiles},{data:preds},{data:bonusRows}]=await Promise.all([\n"
    "        supabase.from('users').select('id,name,handle,avatar_letter').in('id',memberIds),\n"
    "        fetchAllPredictions('user_id,match_id,home_score,away_score,is_double_down', memberIds),\n"
    "        supabase.from('bonus_picks').select('user_id,double_down_r1,double_down_r2,double_down_r3').in('user_id',memberIds),\n"
    "      ]);"
)

OLD_B = (
    "        predMap[p.user_id][p.match_id]={home:p.home_score,away:p.away_score,dd:p.is_double_down};\n"
    "      });"
)
NEW_B = (
    "        predMap[p.user_id][p.match_id]={home:p.home_score,away:p.away_score,dd:p.is_double_down};\n"
    "      });\n"
    "      const doubledMap={};\n"
    "      (bonusRows||[]).forEach(b=>{\n"
    "        doubledMap[b.user_id]=new Set([b.double_down_r1,b.double_down_r2,b.double_down_r3].filter(Boolean));\n"
    "      });"
)

OLD_C = (
    "          const matchId=idx>=0?`GS-${grp}-${idx}`:null;\n"
    "          picks[i]=matchId&&predMap[uid]?.[matchId]?predMap[uid][matchId]:null;"
)
NEW_C = (
    "          const matchId=idx>=0?`GS-${grp}-${idx}`:null;\n"
    "          const base=matchId&&predMap[uid]?.[matchId]?predMap[uid][matchId]:null;\n"
    "          picks[i]=base?{home:base.home,away:base.away,dd:doubledMap[uid]?doubledMap[uid].has(`${grp}-${idx}`):false}:null;"
)

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if "const doubledMap={};" in src:
    die("doubledMap already present -- patch appears already applied. No changes made.")

for label, s in [("A promise.all", OLD_A), ("B predMap", OLD_B), ("C picks build", OLD_C)]:
    if src.count(s) != 1:
        die("expected exactly 1 occurrence of %s, found %d." % (label, src.count(s)))

src = src.replace(OLD_A, NEW_A, 1)
src = src.replace(OLD_B, NEW_B, 1)
src = src.replace(OLD_C, NEW_C, 1)

for label, s in [("bonus query", "select('user_id,double_down_r1,double_down_r2,double_down_r3')"),
                 ("doubledMap build", "doubledMap[b.user_id]=new Set([b.double_down_r1,b.double_down_r2,b.double_down_r3].filter(Boolean));"),
                 ("dd from doubledMap", "dd:doubledMap[uid]?doubledMap[uid].has(`${grp}-${idx}`):false")]:
    if s not in src:
        die("post-check failed: %s missing." % label)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v54 -- matchday double-down indicator now reads real bonus double_down columns; existing ⚡×2 badge + doubled points now work.")
