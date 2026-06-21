#!/usr/bin/env python3
"""
mundialist_install_v48.py
Read-only UI treatment (part 1 of 3): bonus award picks.

After v47, KO/bonus saves are blocked at kickoff, but the UI still LOOKS editable
(a pick appears to change, then reverts on reload) -- confusing. This makes the
bonus award inputs show their existing locked (read-only) view once the tournament
has started.

PlayerSearch already renders a locked view when its `locked` prop is true, but that
view includes a "Change" button (setLocked(false)) meant for a user's OWN voluntary
lock. For the hard kickoff deadline we must (a) trigger the locked view, and
(b) suppress the "Change" button so it can't be undone.

PlayerSearch is a TOP-LEVEL component (no access to the component-scoped
tournamentStarted()), so it computes the deadline from the module-level
TOURNAMENT_START directly -- identical logic to tournamentStarted().

Two edits, both inside PlayerSearch; no call-site changes.
Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

# Edit 1: compute hardLocked and include it in the locked-view trigger.
OLD_1 = (
    "  const isWrong=actualWinner&&pick?.name!==actualWinner;\n"
    "  if(locked){"
)
NEW_1 = (
    "  const isWrong=actualWinner&&pick?.name!==actualWinner;\n"
    "  const hardLocked=Date.now()>=TOURNAMENT_START.getTime();\n"
    "  if(locked||hardLocked){"
)

# Edit 2: suppress the "Change" button once hard-locked.
OLD_2 = "        {!actualWinner&&<button onClick={()=>setLocked(false)}"
NEW_2 = "        {!actualWinner&&!hardLocked&&<button onClick={()=>setLocked(false)}"

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if "const hardLocked=Date.now()>=TOURNAMENT_START.getTime();" in src:
    die("hardLocked already present -- patch appears already applied. No changes made.")

if src.count(OLD_1) != 1:
    die("expected exactly 1 PlayerSearch locked-view anchor, found %d." % src.count(OLD_1))
if src.count(OLD_2) != 1:
    die("expected exactly 1 Change-button anchor, found %d." % src.count(OLD_2))

src = src.replace(OLD_1, NEW_1, 1)
src = src.replace(OLD_2, NEW_2, 1)

if NEW_1 not in src:
    die("post-check failed: locked-view trigger not updated.")
if NEW_2 not in src:
    die("post-check failed: Change button not gated.")

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v48 -- bonus award inputs now show read-only locked view after kickoff (Change button suppressed).")
