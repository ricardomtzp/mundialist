#!/usr/bin/env python3
"""
mundialist_install_v45.py
Fix: predictions silently truncated at the PostgREST row cap (~1000), causing
some league members to show blank matchday picks AND 0 points, even though
their data is fully intact in the DB.

Root cause: loadMatchdayPicks and loadLeagueMembers each fetch ALL members'
predictions in one unbounded `.in('user_id', memberIds)` query. When the total
exceeds the server row cap, the response is silently truncated and whichever
rows fall past the cap are dropped -> those users have no predictions loaded.
(Ex-Bostons alone: 12 members, 1248 prediction rows > 1000.)

This patch:
  1. Adds a module-level fetchAllPredictions(cols, memberIds) helper that
     paginates via .order('id').range(...) until all rows are retrieved.
     Correct regardless of the exact cap value.
  2. Replaces both unbounded prediction queries with calls to the helper.
     The helper returns {data: all} so the existing {data:preds} destructuring
     is unchanged.

Stable pagination requires an ORDER BY; we order by the uuid primary key 'id'.
Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

ANCHOR = 'function generateGroupMatches(teams){'

HELPER = (
    "async function fetchAllPredictions(cols, memberIds){\n"
    "  const pageSize=1000;\n"
    "  let all=[], from=0;\n"
    "  while(true){\n"
    "    const {data,error}=await supabase.from('predictions').select(cols)"
    ".in('user_id',memberIds).order('id').range(from,from+pageSize-1);\n"
    "    if(error){console.error('fetchAllPredictions error:',error);break;}\n"
    "    all=all.concat(data||[]);\n"
    "    if(!data||data.length<pageSize)break;\n"
    "    from+=pageSize;\n"
    "  }\n"
    "  return {data:all};\n"
    "}\n\n"
)

# Site 1: loadMatchdayPicks (two physical lines).
OLD_1 = (
    "        supabase.from('predictions').select('user_id,match_id,home_score,away_score,is_double_down')\n"
    "          .in('user_id',memberIds),"
)
NEW_1 = "        fetchAllPredictions('user_id,match_id,home_score,away_score,is_double_down', memberIds),"

# Site 2: loadLeagueMembers (one physical line).
OLD_2 = "        supabase.from('predictions').select('user_id,match_id,home_score,away_score,is_double_down,advancing_team').in('user_id',memberIds),"
NEW_2 = "        fetchAllPredictions('user_id,match_id,home_score,away_score,is_double_down,advancing_team', memberIds),"

def die(msg):
    print("ABORTED: " + msg)
    sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if "function fetchAllPredictions(" in src:
    die("fetchAllPredictions already present -- patch appears already applied. No changes made.")

if src.count(ANCHOR) != 1:
    die("expected exactly 1 generateGroupMatches anchor, found %d." % src.count(ANCHOR))
if src.count(OLD_1) != 1:
    die("expected exactly 1 occurrence of matchday preds query (site 1), found %d." % src.count(OLD_1))
if src.count(OLD_2) != 1:
    die("expected exactly 1 occurrence of leaderboard preds query (site 2), found %d." % src.count(OLD_2))

# Apply: helper first, then both call sites.
src = src.replace(ANCHOR, HELPER + ANCHOR, 1)
src = src.replace(OLD_1, NEW_1, 1)
src = src.replace(OLD_2, NEW_2, 1)

# Post-conditions.
if "function fetchAllPredictions(" not in src:
    die("post-check failed: helper not inserted.")
if NEW_1 not in src:
    die("post-check failed: site 1 not rewritten.")
if NEW_2 not in src:
    die("post-check failed: site 2 not rewritten.")
# Ensure no unbounded predictions query remains at either site.
if OLD_1 in src or OLD_2 in src:
    die("post-check failed: an old unbounded query still present.")

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v45 -- paginated fetchAllPredictions added; both prediction queries now fetch all rows.")
