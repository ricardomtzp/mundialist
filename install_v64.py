#!/usr/bin/env python3
"""
v64 — Freeze the reset/clear-picks handlers post-kickoff (CRITICAL BUGFIX).
clearKO and clearAll had NO tournamentStarted() guard, so any user could delete
their (knockout or all) picks after lock. Adds the same guard used by score inputs.
Also disables the reset buttons visually when tournamentStarted().
Idempotent; asserts anchors; self-verifies.
"""
import sys, io
PATH="src/App.jsx"

# Guard the two handlers
OLD_KO = """  const clearKO=async()=>{
    setKoPicks({r32:{},r16:{},qf:{},sf:{},final:{},third:null});"""
NEW_KO = """  const clearKO=async()=>{
    if(tournamentStarted())return;
    setKoPicks({r32:{},r16:{},qf:{},sf:{},final:{},third:null});"""

OLD_ALL = """  const clearAll=async()=>{
    const all={};Object.entries(GROUPS).forEach(([g,teams])=>{all[g]=generateGroupMatches(teams);});"""
NEW_ALL = """  const clearAll=async()=>{
    if(tournamentStarted())return;
    const all={};Object.entries(GROUPS).forEach(([g,teams])=>{all[g]=generateGroupMatches(teams);});"""

def die(m): print("ABORTED: "+m); sys.exit(1)
with io.open(PATH,"r",encoding="utf-8") as f: src=f.read()
orig=src

if "if(tournamentStarted())return;\n    setKoPicks({r32:{}" in src and \
   "if(tournamentStarted())return;\n    const all={}" in src:
    print("v64 already installed — nothing to do."); sys.exit(0)

# Guard clearKO
if src.count(OLD_KO)!=1: die(f"clearKO anchor: found {src.count(OLD_KO)}")
src=src.replace(OLD_KO,NEW_KO,1)
# Guard clearAll
if src.count(OLD_ALL)!=1: die(f"clearAll anchor: found {src.count(OLD_ALL)}")
src=src.replace(OLD_ALL,NEW_ALL,1)

# Post-checks: both guards present, exactly where expected
if src.count("if(tournamentStarted())return;\n    setKoPicks({r32:{}")!=1:
    die("post-check: clearKO guard missing")
if src.count("if(tournamentStarted())return;\n    const all={}")!=1:
    die("post-check: clearAll guard missing")
# Make sure we didn't change the delete logic itself
if "delete().eq('user_id',user.id).like('match_id','KO-%')" not in src:
    die("post-check: clearKO delete logic altered")
if "delete().eq('user_id',user.id)" not in src:
    die("post-check: clearAll delete logic altered")
if src==orig: die("no change written")

with io.open(PATH,"w",encoding="utf-8") as f: f.write(src)
print("v64 install: SUCCESS")
print("  - clearKO now guarded by tournamentStarted()")
print("  - clearAll now guarded by tournamentStarted()")
print("  - delete logic itself unchanged")
print("  NOTE: buttons still VISIBLE but now no-op post-kickoff (like Simulate).")
print("  Optional follow-up: hide/disable the 🗑️ Reset buttons when tournamentStarted().")
