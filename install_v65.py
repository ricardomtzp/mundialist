#!/usr/bin/env python3
"""
v65 — Guard the 'Group standings changed' popup's Reset-knockout delete (CRITICAL).
This inline handler deletes all KO picks with NO tournamentStarted() guard. v64 only
guarded the clearKO/clearAll functions; this separate popup handler was missed.
It's the likely cause of accidental KO-pick loss post-kickoff (a warning popup, not a
deliberate reset). Adds the guard. Anchored on unique handler text (line-independent).
Idempotent; asserts anchor once; self-verifies; delete logic otherwise unchanged.
"""
import sys, io
PATH="src/App.jsx"

OLD = """            <button onClick={async()=>{
              setKoPicks({r32:{},r16:{},qf:{},sf:{},final:{},third:null});
              setShowBracketChanged(false);
              showSaving();
              await supabase.from('predictions').delete().eq('user_id',user.id).like('match_id','KO-%');
              showSaved();
            }}"""

NEW = """            <button onClick={async()=>{
              if(tournamentStarted()){setShowBracketChanged(false);return;}
              setKoPicks({r32:{},r16:{},qf:{},sf:{},final:{},third:null});
              setShowBracketChanged(false);
              showSaving();
              await supabase.from('predictions').delete().eq('user_id',user.id).like('match_id','KO-%');
              showSaved();
            }}"""

def die(m): print("ABORTED: "+m); sys.exit(1)
with io.open(PATH,"r",encoding="utf-8") as f: src=f.read()
orig=src

if "if(tournamentStarted()){setShowBracketChanged(false);return;}" in src:
    print("v65 already installed — nothing to do."); sys.exit(0)
if src.count(OLD)!=1:
    die(f"anchor: expected 1 occurrence of bracket-changed handler, found {src.count(OLD)}")
src=src.replace(OLD,NEW,1)

# post-checks
if "if(tournamentStarted()){setShowBracketChanged(false);return;}" not in src:
    die("post-check: guard not inserted")
# delete logic must still be present and unchanged
if src.count("delete().eq('user_id',user.id).like('match_id','KO-%')") < 1:
    die("post-check: KO delete logic altered/missing")
if src==orig: die("no change written")

with io.open(PATH,"w",encoding="utf-8") as f: f.write(src)
print("v65 install: SUCCESS")
print("  - bracket-changed popup 'Reset knockout' now guarded by tournamentStarted()")
print("  - post-kickoff: button just dismisses the popup, deletes nothing")
print("  - delete logic itself unchanged (still works pre-kickoff)")
