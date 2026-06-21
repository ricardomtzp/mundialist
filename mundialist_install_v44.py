#!/usr/bin/env python3
"""
mundialist_install_v44.py
Fix: matchday picks show blank predicted scores when a team's spelling differs
between GROUPS (code) and the matches table (DB).

Root cause: loadMatchdayPicks matched code-generated fixtures to DB matches via
exact string equality on team names. Drifted spellings (Czechia/Czech Republic,
Türkiye/Turkey, Bosnia and Herzegovina/Bosnia & Herzegovina) returned findIndex
-1 -> matchId null -> pick rendered blank.

This patch:
  1. Adds a module-level normTeam() helper (accent-strip, &->and, punctuation
     strip, plus explicit aliases for the two genuine name differences).
  2. Rewrites the findIndex comparison to use normTeam() and to be
     home/away order-independent.

Read-only display fix: writes no data, changes only how existing predictions
are resolved for display. Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

OLD_IDX = '          const idx=gMatches.findIndex(gm=>gm.home===m.home_team&&gm.away===m.away_team);'

NEW_IDX = (
    '          const idx=gMatches.findIndex(gm=>{\n'
    '            const gh=normTeam(gm.home),ga=normTeam(gm.away),mh=normTeam(m.home_team),ma=normTeam(m.away_team);\n'
    '            return (gh===mh&&ga===ma)||(gh===ma&&ga===mh);\n'
    '          });'
)

ANCHOR = 'function generateGroupMatches(teams){'

HELPER = (
    "function normTeam(s){\n"
    "  return (s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')\n"
    "    .replace(/&/g,'and').replace(/[^a-z]/g,'')\n"
    "    .replace(/^czechrepublic$/,'czechia')\n"
    "    .replace(/^turkiye$/,'turkey');\n"
    "}\n\n"
)

def die(msg):
    print("ABORTED: " + msg)
    sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

# Idempotency: if normTeam already exists, assume already applied.
if "function normTeam(" in src:
    die("normTeam already present -- patch appears already applied. No changes made.")

# Assert exact, unique target for the findIndex rewrite.
n_idx = src.count(OLD_IDX)
if n_idx != 1:
    die("expected exactly 1 occurrence of the findIndex line, found %d." % n_idx)

# Assert exact, unique anchor for helper insertion.
n_anchor = src.count(ANCHOR)
if n_anchor != 1:
    die("expected exactly 1 occurrence of generateGroupMatches anchor, found %d." % n_anchor)

# Apply edits.
src = src.replace(OLD_IDX, NEW_IDX, 1)
src = src.replace(ANCHOR, HELPER + ANCHOR, 1)

# Post-conditions.
if "function normTeam(" not in src:
    die("post-check failed: normTeam helper not inserted.")
if NEW_IDX.split("\n")[0] not in src:
    die("post-check failed: findIndex rewrite not applied.")

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v44 -- normTeam helper added, matchday findIndex now normalized + order-independent.")
