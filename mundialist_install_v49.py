#!/usr/bin/env python3
"""
mundialist_install_v49.py
Read-only UI treatment (part 2 of 3): knockout bracket picks (highest point value).

After v47, KO saves are blocked at kickoff, but KOCard still renders clickable
(a click appears to change the pick, then reverts on reload). This gates KOCard so
that once the tournament has started, the bracket cards are non-clickable and show
the user's existing pick read-only.

KOCard is NESTED in the main component, so it can call tournamentStarted() directly.
We add a local `koLocked` and fold `!koLocked` into the existing click + cursor
conditions, so:
  - before kickoff: identical to current behavior
  - after kickoff:  onClick is a no-op and cursor is 'default' (read-only)

Three edits, all inside KOCard. Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

OLD_1 = "    const isFinished=actualWinner!==null;"
NEW_1 = (
    "    const isFinished=actualWinner!==null;\n"
    "    const koLocked=tournamentStarted();"
)

OLD_2 = 'onClick={()=>!isFinished&&team!=="TBD"&&onPick&&onPick(team)}'
NEW_2 = 'onClick={()=>!koLocked&&!isFinished&&team!=="TBD"&&onPick&&onPick(team)}'

OLD_3 = 'cursor:!isFinished&&team!=="TBD"&&onPick?"pointer":"default",'
NEW_3 = 'cursor:!koLocked&&!isFinished&&team!=="TBD"&&onPick?"pointer":"default",'

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if "const koLocked=tournamentStarted();" in src:
    die("koLocked already present -- patch appears already applied. No changes made.")

for label, s in [("isFinished", OLD_1), ("onClick", OLD_2), ("cursor", OLD_3)]:
    if src.count(s) != 1:
        die("expected exactly 1 occurrence of %s anchor, found %d." % (label, src.count(s)))

src = src.replace(OLD_1, NEW_1, 1)
src = src.replace(OLD_2, NEW_2, 1)
src = src.replace(OLD_3, NEW_3, 1)

for label, s in [("koLocked def", NEW_1), ("onClick", NEW_2), ("cursor", NEW_3)]:
    if s not in src:
        die("post-check failed: %s not applied." % label)
# Old ungated conditions must be gone.
if OLD_2 in src or OLD_3 in src:
    die("post-check failed: an ungated KO condition still present.")

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v49 -- KO bracket cards now read-only (non-clickable) after kickoff.")
