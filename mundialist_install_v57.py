#!/usr/bin/env python3
"""
mundialist_install_v57.py
Freeze the Simulate buttons and close the unguarded group-pick write path.

Findings:
 - Both Simulate buttons write to the *predictions* table (the clicking user's own
   picks) via saveGroupPick / saveKOPick. They do NOT touch the matches table, and
   do not affect other users.
 - saveKOPick already has `if(tournamentStarted())return;` (v47/v49), so KO simulate
   cannot persist post-kickoff.
 - saveGroupPick has NO such guard -> the group-stage Simulate overwrites the user's
   real group picks mid-tournament. This is the live data risk.

This patch adds `if(tournamentStarted())return;` in three places:
 1. saveGroupPick      -> blocks ALL group-pick writes post-kickoff (correct locking,
                          mirrors saveKOPick; defense-in-depth).
 2. simulateAll        -> group Simulate click is a no-op post-kickoff (no UI scramble,
                          no save).
 3. KO Simulate onClick-> KO Simulate click is a no-op post-kickoff.

After this, both Simulate buttons are inert once the tournament has started, and no
group pick can be overwritten via the app. Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

OLD_1 = """  const saveGroupPick=async(group,idx,homeScore,awayScore)=>{
    if(!user?.id)return;
    showSaving();"""
NEW_1 = """  const saveGroupPick=async(group,idx,homeScore,awayScore)=>{
    if(!user?.id)return;
    if(tournamentStarted())return;
    showSaving();"""

OLD_2 = """  const simulateAll=async()=>{
    const simMatches=simulateAllMatches(simulateStyle);"""
NEW_2 = """  const simulateAll=async()=>{
    if(tournamentStarted())return;
    const simMatches=simulateAllMatches(simulateStyle);"""

OLD_3 = """                <button onClick={async()=>{
                  const simKO=simulateKnockout(r32Bracket,simulateStyle);"""
NEW_3 = """                <button onClick={async()=>{
                  if(tournamentStarted())return;
                  const simKO=simulateKnockout(r32Bracket,simulateStyle);"""

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

# Idempotency: the saveGroupPick guard is the unique marker for this patch.
if """  const saveGroupPick=async(group,idx,homeScore,awayScore)=>{
    if(!user?.id)return;
    if(tournamentStarted())return;""" in src:
    die("saveGroupPick already guarded -- patch appears already applied. No changes made.")

for label, s in [("E1 saveGroupPick", OLD_1), ("E2 simulateAll", OLD_2), ("E3 KO sim onClick", OLD_3)]:
    if src.count(s) != 1:
        die("expected exactly 1 occurrence of %s, found %d." % (label, src.count(s)))

src = src.replace(OLD_1, NEW_1, 1)
src = src.replace(OLD_2, NEW_2, 1)
src = src.replace(OLD_3, NEW_3, 1)

# post-checks: three guards now present in the right spots
if src.count("if(tournamentStarted())return;") < 4:
    die("post-check: expected >=4 tournamentStarted guards (saveKOPick + 3 new), found %d." % src.count("if(tournamentStarted())return;"))
for label, s in [("saveGroupPick guarded", NEW_1),
                 ("simulateAll guarded", NEW_2),
                 ("KO sim guarded", NEW_3)]:
    if s not in src:
        die("post-check failed: %s missing." % label)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v57 -- Simulate buttons frozen + saveGroupPick guarded post-kickoff.")
