#!/usr/bin/env python3
"""
mundialist_install_v46.py
Fix: finished group-stage matches don't show actual scores / don't award points
when a team's spelling differs between GROUPS (code) and the matches table (DB).
(Same name-drift class as v44, but at the result-matching sites.)

Centralizes result matching through ONE helper so the comparison logic lives in
a single place and future code can't reintroduce the raw-=== bug.

Design choice (IMPORTANT): the helper is ORIENTATION-PRESERVING
(home matches home, away matches away, after normalization) -- NOT order-independent.
Rationale: generateGroupMatches and the DB disagree on home/away order for some
fixtures. An order-independent match would match those reversed fixtures and then
calcMatchPoints would compare the user's home prediction against the away team's
actual score -> SILENT MIS-SCORING. Orientation-preserving fixes the name drift
without that risk; reversed fixtures remain unmatched (as they are today).
The orientation mismatch is a SEPARATE issue to fix later (requires score-swapping).

Sites replaced (all group-stage actual-result lookups):
  A calcTotalPoints (group points)
  B loadLeagueMembers (leaderboard group points)
  D group-results display
  E double-down display
NOT touched: getKOWinner (knockout; entangled with advancing_team spellings; KO
not started) -- noted as a remaining same-class site for the KO phase.

Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

ANCHOR = 'function generateGroupMatches(teams){'

HELPER = (
    "function findActualResult(resultsArr, home, away){\n"
    "  const nh=normTeam(home), na=normTeam(away);\n"
    "  return (resultsArr||[]).find(r=>r.status==='finished'"
    "&&normTeam(r.home_team)===nh&&normTeam(r.away_team)===na);\n"
    "}\n\n"
)

OLD_A = "        const actual=actualArr.find(r=>r.home_team===m.home&&r.away_team===m.away&&r.status==='finished');"
NEW_A = "        const actual=findActualResult(actualArr, m.home, m.away);"

OLD_B = (
    "            const actual=Object.values(actualResults).find(r=>\n"
    "              r.home_team===matchDef.home&&r.away_team===matchDef.away&&r.status==='finished'\n"
    "            );"
)
NEW_B = "            const actual=findActualResult(Object.values(actualResults), matchDef.home, matchDef.away);"

OLD_D = '                  const actual=Object.values(actualResults).find(r=>(r.home_team===match.home||r.home_team===match.away)&&(r.away_team===match.away||r.away_team===match.home)&&r.status==="finished");'
NEW_D = "                  const actual=findActualResult(Object.values(actualResults), match.home, match.away);"

OLD_E = '                      const actual=Object.values(actualResults).find(r=>r.home_team===m.home&&r.away_team===m.away&&r.status==="finished");'
NEW_E = "                      const actual=findActualResult(Object.values(actualResults), m.home, m.away);"

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if "function findActualResult(" in src:
    die("findActualResult already present -- patch appears already applied. No changes made.")
if "function normTeam(" not in src:
    die("normTeam helper missing -- apply v44 first (findActualResult depends on it).")

# Assert each target exactly once.
for label, s in [("anchor", ANCHOR), ("A", OLD_A), ("B", OLD_B), ("D", OLD_D), ("E", OLD_E)]:
    n = src.count(s)
    if n != 1:
        die("expected exactly 1 occurrence of %s, found %d." % (label, n))

# Apply: helper first, then the four sites.
src = src.replace(ANCHOR, HELPER + ANCHOR, 1)
src = src.replace(OLD_A, NEW_A, 1)
src = src.replace(OLD_B, NEW_B, 1)
src = src.replace(OLD_D, NEW_D, 1)
src = src.replace(OLD_E, NEW_E, 1)

# Post-conditions.
if "function findActualResult(" not in src:
    die("post-check failed: helper not inserted.")
for label, s in [("A", NEW_A), ("B", NEW_B), ("D", NEW_D), ("E", NEW_E)]:
    if s not in src:
        die("post-check failed: site %s not rewritten." % label)
for label, s in [("A", OLD_A), ("B", OLD_B), ("D", OLD_D), ("E", OLD_E)]:
    if s in src:
        die("post-check failed: old site %s still present." % label)
# Expect 5 references: 1 definition + 4 call sites.
if src.count("findActualResult(") != 5:
    die("post-check failed: expected 5 findActualResult references, found %d." % src.count("findActualResult("))

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v46 -- centralized findActualResult (orientation-preserving, normalized); 4 group-stage sites rewritten.")
