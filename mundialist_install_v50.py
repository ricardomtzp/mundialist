#!/usr/bin/env python3
"""
mundialist_install_v50.py
Read-only UI treatment (part 3 of 3): double-down picker.

After v47, double-down saves are blocked at kickoff (saveBonusPicks guard), but the
picker still looks clickable. This gates the picker so that once the tournament has
started it is non-interactive (no setDouble call) and shows a 'not-allowed' cursor,
preserving the existing read-only display of whatever was selected.

The picker is in the main component render, so tournamentStarted() is in scope.
Two edits, both on the double-down button. Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

OLD_1 = "onClick={()=>!actual&&setDouble(rk,m.g,m.idx)}"
NEW_1 = "onClick={()=>!tournamentStarted()&&!actual&&setDouble(rk,m.g,m.idx)}"

OLD_2 = 'cursor:other||actual?"not-allowed":"pointer",'
NEW_2 = 'cursor:tournamentStarted()||other||actual?"not-allowed":"pointer",'

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if NEW_1 in src and NEW_2 in src:
    die("double-down guards already present -- patch appears already applied. No changes made.")

if src.count(OLD_1) != 1:
    die("expected exactly 1 setDouble onClick, found %d." % src.count(OLD_1))
if src.count(OLD_2) != 1:
    die("expected exactly 1 double-down cursor line, found %d." % src.count(OLD_2))

src = src.replace(OLD_1, NEW_1, 1)
src = src.replace(OLD_2, NEW_2, 1)

if NEW_1 not in src or NEW_2 not in src:
    die("post-check failed: guards not applied.")
if OLD_1 in src or OLD_2 in src:
    die("post-check failed: an ungated double-down condition remains.")

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v50 -- double-down picker now read-only (non-interactive) after kickoff.")
