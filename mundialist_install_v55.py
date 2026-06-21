#!/usr/bin/env python3
"""
mundialist_install_v55.py
Replace brittle "Runner-up" final scoring with a symmetric "Finalist" award.

OLD flaw: champion(25) only if you pick the winner; runner-up(20) only if you pick
the SPECIFIC team that LOSES the final. Predicting both finalists but flipping the
winner => 0 from both (you lose 45), despite getting both finalists right.

NEW model:
  - Finalist: 20 for EACH team you correctly placed in the final (your two SF winners
    that actually reached the final), regardless of who you said wins.
    Dark-horse: x1.5 -> 30 for a non-seeded finalist (Math.round).
  - Champion: unchanged -- calcKOPoints('final',...) = 25, or 38 for a non-seeded
    (dark-horse) champion, ADDITIONAL when you also pick the winner.
  Max final-specific = 40 (both finalists) + 25 (champion) = 65 (more with dark horses).

Applied to BOTH scoring functions (computeUserPoints used by leaderboard+breakdown,
and calcTotalPoints used for a user's own total) so they stay consistent, plus the
Rules-tab label and the pick-panel label.

Zero current impact: the final is weeks away, so all final-specific points are 0 today.
Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

# --- Edit 1: computeUserPoints final block ---
OLD_1 = """  // Final (champion 25 via calc, runner-up 20)
  const finalActual=actualArr.find(r=>r.stage==='knockout'&&r.status==='finished'&&getKORoundFromId(r.id)==='final');
  if(finalActual){
    const champion=finalActual.actual_home>finalActual.actual_away?finalActual.home_team:finalActual.away_team;
    const runnerUp=champion===finalActual.home_team?finalActual.away_team:finalActual.home_team;
    if(koP.final&&koP.final['0']===champion)ko+=calcKOPoints('final',champion,champion,!SEEDED.has(champion));
    const sfWinners=Object.keys(koP.sf||{}).map(k=>koP.sf[k]);
    const pickedRU=sfWinners.find(t=>t!==(koP.final&&koP.final['0']))||null;
    if(pickedRU===runnerUp)ko+=20;
  }"""
NEW_1 = """  // Final: champion (25, x1.5 dark horse) + Finalist (20 each correct finalist, x1.5 dark horse)
  const finalActual=actualArr.find(r=>r.stage==='knockout'&&r.status==='finished'&&getKORoundFromId(r.id)==='final');
  if(finalActual){
    const champion=finalActual.actual_home>finalActual.actual_away?finalActual.home_team:finalActual.away_team;
    const actualFinalists=[finalActual.home_team,finalActual.away_team];
    if(koP.final&&koP.final['0']===champion)ko+=calcKOPoints('final',champion,champion,!SEEDED.has(champion));
    const userFinalists=Object.keys(koP.sf||{}).map(k=>koP.sf[k]).filter(Boolean);
    userFinalists.forEach(t=>{ if(actualFinalists.indexOf(t)!==-1)ko+=(!SEEDED.has(t)?Math.round(20*1.5):20); });
  }"""

# --- Edit 2: calcTotalPoints final block ---
OLD_2 = """    // Final - champion (25pts) and runner-up (20pts)
    const finalActual=actualArr.find(r=>r.stage==='knockout'&&r.status==='finished'&&getKORoundFromId(r.id)==='final');
    if(finalActual){
      const champion=finalActual.actual_home>finalActual.actual_away?finalActual.home_team:finalActual.away_team;
      const runnerUp=champion===finalActual.home_team?finalActual.away_team:finalActual.home_team;
      if(koPicked.final?.[0]===champion)total+=calcKOPoints('final',champion,champion,!SEEDED.has(champion));
      const sfWinners=Object.values(koPicked.sf||{});
      const pickedRunnerUp=sfWinners.find(t=>t!==koPicked.final?.[0])||null;
      if(pickedRunnerUp===runnerUp)total+=20;
    }"""
NEW_2 = """    // Final: champion (25, x1.5 dark horse) + Finalist (20 each correct finalist, x1.5 dark horse)
    const finalActual=actualArr.find(r=>r.stage==='knockout'&&r.status==='finished'&&getKORoundFromId(r.id)==='final');
    if(finalActual){
      const champion=finalActual.actual_home>finalActual.actual_away?finalActual.home_team:finalActual.away_team;
      const actualFinalists=[finalActual.home_team,finalActual.away_team];
      if(koPicked.final?.[0]===champion)total+=calcKOPoints('final',champion,champion,!SEEDED.has(champion));
      const userFinalists=Object.values(koPicked.sf||{}).filter(Boolean);
      userFinalists.forEach(t=>{ if(actualFinalists.indexOf(t)!==-1)total+=(!SEEDED.has(t)?Math.round(20*1.5):20); });
    }"""

# --- Edit 3: Rules tab label ---
OLD_3 = '              {label:"Runner-up",val:"20",c:C.green},'
NEW_3 = '              {label:"Finalist \\u2014 each correct finalist",val:"20",c:C.green},'

# --- Edit 4: pick-panel label ---
OLD_4 = '                  {label:"Runner-up",val:(tournamentStarted()||viewingUser.isMe)?viewingUser.picks.runnerUp:null,emoji:"\U0001F948",pts:"20 pts"},'
NEW_4 = '                  {label:"Finalist",val:(tournamentStarted()||viewingUser.isMe)?viewingUser.picks.runnerUp:null,emoji:"\U0001F948",pts:"20 pts"},'

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if "const actualFinalists=" in src:
    die("Finalist logic already present -- patch appears already applied. No changes made.")

for label, s in [("E1 computeUserPoints final", OLD_1),
                 ("E2 calcTotalPoints final", OLD_2),
                 ("E3 rules label", OLD_3),
                 ("E4 panel label", OLD_4)]:
    if src.count(s) != 1:
        die("expected exactly 1 occurrence of %s, found %d." % (label, src.count(s)))

src = src.replace(OLD_1, NEW_1, 1)
src = src.replace(OLD_2, NEW_2, 1)
src = src.replace(OLD_3, NEW_3, 1)
src = src.replace(OLD_4, NEW_4, 1)

# Post-checks
if src.count("const actualFinalists=[finalActual.home_team,finalActual.away_team];") != 2:
    die("post-check: expected finalist logic in BOTH scoring functions (2), found %d." % src.count("const actualFinalists=[finalActual.home_team,finalActual.away_team];"))
if "runnerUp=champion===" in src:
    die("post-check: old runner-up derivation still present.")
if 'label:"Runner-up"' in src:
    die("post-check: a 'Runner-up' label remains.")
if src.count("Math.round(20*1.5)") != 2:
    die("post-check: finalist dark-horse not in both functions.")

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v55 -- Finalist scoring (20 each, x1.5 dark horse) replaces Runner-up in both scoring functions + Rules + panel.")
