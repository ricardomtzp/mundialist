#!/usr/bin/env python3
"""
mundialist_install_v60.py
A2 bonus re-bucketing: make the player-detail "Bonus" column reflect double-down
value and group-standings points, instead of everything collapsing into "Matches".

This is a DISPLAY/CATEGORY change only. It moves points between the `match` and
`bonus` accumulators inside computeUserPoints. Every user's `total` is unchanged
(total = match + ko + bonus), so leaderboard order does NOT move. daily_ranks stores
only the total, so the Edge Function needs no change for this fix.

Edit 1 (double-down): currently the doubling is applied in place and added to match:
    if(doubleIds.indexOf(g+'-'+idx)!==-1)pts*=2;
    match+=pts;
After: base points go to match, the extra (doubled) copy goes to bonus:
    match+=pts;
    if(doubleIds.indexOf(g+'-'+idx)!==-1)bonus+=pts;

Edit 2 (group standings): the 5/3/2 currently go to match; move them to bonus.

Award bonuses (golden boot/assist/glove, +15) already go to bonus -- unchanged.

Idempotent guards included.
"""
import sys, io

PATH = "src/App.jsx"

# --- Edit 1: double-down ---
OLD1 = """      let pts=calcMatchPoints(m.homeScore,m.awayScore,actual.actual_home,actual.actual_away);
      if(doubleIds.indexOf(g+'-'+idx)!==-1)pts*=2;
      match+=pts;"""

NEW1 = """      let pts=calcMatchPoints(m.homeScore,m.awayScore,actual.actual_home,actual.actual_away);
      match+=pts;
      if(doubleIds.indexOf(g+'-'+idx)!==-1)bonus+=pts;"""

# --- Edit 2: standings ---
OLD2 = """    if(uStand[0]===aStand[0]&&uStand[1]===aStand[1])match+=5;
    else if(uStand[0]===aStand[1]&&uStand[1]===aStand[0])match+=3;
    if(uStand[2]&&aStand[2]&&uStand[2]===aStand[2]){
      const qualified=actualArr.some(r=>r.stage==='r32'&&r.status==='finished'&&(r.home_team===aStand[2]||r.away_team===aStand[2]));
      if(qualified)match+=2;
    }"""

NEW2 = """    if(uStand[0]===aStand[0]&&uStand[1]===aStand[1])bonus+=5;
    else if(uStand[0]===aStand[1]&&uStand[1]===aStand[0])bonus+=3;
    if(uStand[2]&&aStand[2]&&uStand[2]===aStand[2]){
      const qualified=actualArr.some(r=>r.stage==='r32'&&r.status==='finished'&&(r.home_team===aStand[2]||r.away_team===aStand[2]));
      if(qualified)bonus+=2;
    }"""

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

# Idempotency: if the new double-down line is already present, treat as applied.
if "if(doubleIds.indexOf(g+'-'+idx)!==-1)bonus+=pts;" in src:
    die("A2 re-bucketing already present (double-down -> bonus). No changes made.")

if src.count(OLD1) != 1:
    die("Edit 1: expected exactly 1 occurrence of the deployed double-down block, found %d. "
        "Your file may differ from what was reviewed -- not modifying." % src.count(OLD1))
if src.count(OLD2) != 1:
    die("Edit 2: expected exactly 1 occurrence of the deployed standings block, found %d. "
        "Your file may differ -- not modifying." % src.count(OLD2))

src = src.replace(OLD1, NEW1, 1).replace(OLD2, NEW2, 1)

for label, s in [("double-down -> bonus", "if(doubleIds.indexOf(g+'-'+idx)!==-1)bonus+=pts;"),
                 ("standings top2 -> bonus", "uStand[1]===aStand[1])bonus+=5;"),
                 ("standings swap -> bonus", "uStand[1]===aStand[0])bonus+=3;"),
                 ("standings 3rd -> bonus", "if(qualified)bonus+=2;")]:
    if s not in src:
        die("post-check failed: %s missing." % label)
# Ensure the computeUserPoints in-place doubling specifically is gone.
# NOTE: calcTotalPoints has its own legitimate `pts*=2` (single-total preview, no
# match/bonus split) which MUST remain -- so we check only the breakdown line.
if "if(doubleIds.indexOf(g+'-'+idx)!==-1)pts*=2;" in src:
    die("post-check failed: computeUserPoints double-down still uses pts*=2.")

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v60 (A2) -- double-down and standings points now accrue to BONUS; totals unchanged.")
