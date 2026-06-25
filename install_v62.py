#!/usr/bin/env python3
"""
v62 — HOTFIX: group-standings crash on team-name mismatch.
Root cause: ap[]/standings maps are keyed by GROUPS names but indexed with raw
matches-table names. "Bosnia & Herzegovina" (DB) vs "Bosnia and Herzegovina"
(GROUPS) -> ap[name] undefined -> ".pts of undefined" crash once a group completes.
Fix: resolve every raw team name to the canonical GROUPS name via normTeam before
indexing, at all 3 sites, with a guard that skips (never crashes) on no-match.
Idempotent; asserts each anchor once; self-verifies.
"""
import sys, io
PATH="src/App.jsx"

# Each site: insert a resolver `const RT=(nm)=>{...}` right after `ap` is built,
# then rewrite r.home_team/r.away_team indexing to RT(r.home_team)/RT(r.away_team).
# We do targeted, unique-string replacements.

# ---------- SITE 1 (computeUserPoints ~1195) ----------
S1_OLD = """    const ap={};teams.forEach(t=>{ap[t]={pts:0,gd:0,gf:0};});
    groupActual.forEach(r=>{
      const h=r.actual_home,a=r.actual_away;
      if(h>a)ap[r.home_team].pts+=3;else if(h<a)ap[r.away_team].pts+=3;else{ap[r.home_team].pts+=1;ap[r.away_team].pts+=1;}
      ap[r.home_team].gd+=h-a;ap[r.away_team].gd+=a-h;ap[r.home_team].gf+=h;ap[r.away_team].gf+=a;
    });"""
S1_NEW = """    const ap={};teams.forEach(t=>{ap[t]={pts:0,gd:0,gf:0};});
    const RT1=(nm)=>teams.find(t=>normTeam(t)===normTeam(nm));
    groupActual.forEach(r=>{
      const h=r.actual_home,a=r.actual_away;
      const HT=RT1(r.home_team),AT=RT1(r.away_team);
      if(!HT||!AT)return;
      if(h>a)ap[HT].pts+=3;else if(h<a)ap[AT].pts+=3;else{ap[HT].pts+=1;ap[AT].pts+=1;}
      ap[HT].gd+=h-a;ap[AT].gd+=a-h;ap[HT].gf+=h;ap[AT].gf+=a;
    });"""

# ---------- SITE 2 (~1680) ----------
S2_OLD = """      const ap={};teams.forEach(t=>{ap[t]={pts:0,gd:0,gf:0};});
      groupActual.forEach(r=>{
        const h=r.actual_home,a=r.actual_away;
        if(h>a){ap[r.home_team].pts+=3;}else if(h<a){ap[r.away_team].pts+=3;}else{ap[r.home_team].pts+=1;ap[r.away_team].pts+=1;}
        ap[r.home_team].gd+=h-a;ap[r.away_team].gd+=a-h;
        ap[r.home_team].gf+=h;ap[r.away_team].gf+=a;
      });"""
S2_NEW = """      const ap={};teams.forEach(t=>{ap[t]={pts:0,gd:0,gf:0};});
      const RT2=(nm)=>teams.find(t=>normTeam(t)===normTeam(nm));
      groupActual.forEach(r=>{
        const h=r.actual_home,a=r.actual_away;
        const HT=RT2(r.home_team),AT=RT2(r.away_team);
        if(!HT||!AT)return;
        if(h>a){ap[HT].pts+=3;}else if(h<a){ap[AT].pts+=3;}else{ap[HT].pts+=1;ap[AT].pts+=1;}
        ap[HT].gd+=h-a;ap[AT].gd+=a-h;
        ap[HT].gf+=h;ap[AT].gf+=a;
      });"""

# ---------- SITE 3 (~2778, render) ----------
S3_OLD = """                const ap={};teams.forEach(t=>{ap[t]={pts:0,gd:0,gf:0};});
                groupActual.forEach(r=>{
                  const h=r.actual_home,a=r.actual_away;
                  if(h>a){ap[r.home_team].pts+=3;}else if(h<a){ap[r.away_team].pts+=3;}else{ap[r.home_team].pts+=1;ap[r.away_team].pts+=1;}
                  ap[r.home_team].gd+=h-a;ap[r.away_team].gd+=a-h;
                });"""
S3_NEW = """                const ap={};teams.forEach(t=>{ap[t]={pts:0,gd:0,gf:0};});
                const RT3=(nm)=>teams.find(t=>normTeam(t)===normTeam(nm));
                groupActual.forEach(r=>{
                  const h=r.actual_home,a=r.actual_away;
                  const HT=RT3(r.home_team),AT=RT3(r.away_team);
                  if(!HT||!AT)return;
                  if(h>a){ap[HT].pts+=3;}else if(h<a){ap[AT].pts+=3;}else{ap[HT].pts+=1;ap[AT].pts+=1;}
                  ap[HT].gd+=h-a;ap[AT].gd+=a-h;
                });"""

def die(m): print("ABORTED: "+m); sys.exit(1)

with io.open(PATH,"r",encoding="utf-8") as f: src=f.read()
orig=src
if "RT1=(nm)=>teams.find" in src:
    print("v62 already installed — nothing to do."); sys.exit(0)

for nm,old in [("site1",S1_OLD),("site2",S2_OLD),("site3",S3_OLD)]:
    c=src.count(old)
    if c!=1: die(f"anchor {nm}: expected 1 occurrence, found {c}")

src=src.replace(S1_OLD,S1_NEW,1)
src=src.replace(S2_OLD,S2_NEW,1)
src=src.replace(S3_OLD,S3_NEW,1)

for tok in ["RT1=(nm)=>teams.find","RT2=(nm)=>teams.find","RT3=(nm)=>teams.find",
            "const HT=RT1(r.home_team)","if(!HT||!AT)return;"]:
    if tok not in src: die(f"post-check failed: {tok} missing")
# ensure no raw ap[r.home_team] remains
if "ap[r.home_team]" in src or "ap[r.away_team]" in src:
    die("post-check failed: raw ap[r.home_team]/ap[r.away_team] still present")
if src==orig: die("no change written")

with io.open(PATH,"w",encoding="utf-8") as f: f.write(src)
print("v62 install: SUCCESS")
print("  - 3 group-standings sites now resolve team names via normTeam")
print("  - guarded: unmatched names skip instead of crashing")
