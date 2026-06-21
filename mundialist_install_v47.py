#!/usr/bin/env python3
"""
mundialist_install_v47.py
Fix: KO and bonus picks were editable AFTER tournament kickoff (integrity hole).
Group-score inputs lock at tournamentStarted(), but the KO and bonus save paths
had no such guard, so champion/bracket/golden-boot picks could be changed after
group results were known.

This patch adds `if(tournamentStarted())return;` to both saveKOPick and
saveBonusPicks, immediately after their existing `if(!user?.id)return;` guard.
This blocks all KO and bonus writes once the tournament has started, through
every UI path (manual pick, double-down, awards), matching the group-score rule.

Note: the optimistic UI state still updates client-side, so an input may appear
to change but will not persist (reverts on reload). Adding visible locked-state
to the KO/bonus UI (mirroring the group readOnly treatment) is a good follow-up;
this patch is the immediate, reliable data-level lock.

Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

OLD_KO = (
    "  const saveKOPick=async(round,id,team)=>{\n"
    "    if(!user?.id)return;"
)
NEW_KO = (
    "  const saveKOPick=async(round,id,team)=>{\n"
    "    if(!user?.id)return;\n"
    "    if(tournamentStarted())return;"
)

OLD_BONUS = (
    "  const saveBonusPicks=async(updates)=>{\n"
    "    if(!user?.id)return;"
)
NEW_BONUS = (
    "  const saveBonusPicks=async(updates)=>{\n"
    "    if(!user?.id)return;\n"
    "    if(tournamentStarted())return;"
)

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

# Idempotency: both guards already added?
if NEW_KO in src and NEW_BONUS in src:
    die("both guards already present -- patch appears already applied. No changes made.")

if src.count(OLD_KO) != 1:
    die("expected exactly 1 saveKOPick signature+guard, found %d." % src.count(OLD_KO))
if src.count(OLD_BONUS) != 1:
    die("expected exactly 1 saveBonusPicks signature+guard, found %d." % src.count(OLD_BONUS))

src = src.replace(OLD_KO, NEW_KO, 1)
src = src.replace(OLD_BONUS, NEW_BONUS, 1)

# Post-conditions.
if NEW_KO not in src:
    die("post-check failed: KO guard not added.")
if NEW_BONUS not in src:
    die("post-check failed: bonus guard not added.")

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v47 -- KO and bonus saves now locked at tournamentStarted().")
