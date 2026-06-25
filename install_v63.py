#!/usr/bin/env python3
"""
v63 — Group standings bonus banner: clear zero + pending third-place states.
DISPLAY ONLY. No scoring path touched, no Edge Function, no snapshot.
- Adds `thirdPending` signal (predicted 3rd == actual 3rd, but R32 not yet resolved).
- Replaces `if(standingsPts===0)return null;` so a FINISHED group with 0 bonus shows
  a clear banner instead of nothing (which looked identical to "unfinished").
- Three states: green/amber (earned, with optional "· 3rd place pending" note),
  blue (finished, +0 so far, third-place bonus still live), grey (definitively zero).
Idempotent; asserts anchor once; self-verifies; group path otherwise untouched.
"""
import sys, io
PATH="src/App.jsx"

OLD = """                const standingsPts=(correct?5:swapped?3:0)+(thirdCorrect&&thirdQualified?2:0);
                if(standingsPts===0)return null;
                const isGreen=correct||(thirdCorrect&&thirdQualified&&!swapped);
                const label=correct&&thirdCorrect&&thirdQualified?`Winner & runner-up correct, right order · ${actualStandings[2]} qualified`:
                             correct?'Winner & runner-up correct, right order':
                             swapped&&thirdCorrect&&thirdQualified?`Both correct, positions swapped · ${actualStandings[2]} qualified`:
                             swapped?'Both correct, positions swapped':
                             `${actualStandings[2]} qualified`;
                return(
                  <div style={{padding:"8px 12px",background:isGreen?"#EAF3DE":"#FEF9EC",borderTop:`0.5px solid ${isGreen?"#3B6D11":"#F59E0B"}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:500,color:isGreen?"#3B6D11":"#92400E"}}>Group standings bonus</div>
                      <div style={{fontSize:10,color:isGreen?"#3B6D11":"#92400E",marginTop:2}}>{label}</div>
                    </div>
                    <span style={{fontSize:12,fontFamily:"monospace",fontWeight:600,color:isGreen?"#3B6D11":"#92400E",background:isGreen?"#D4EDBA":"#FEF3C7",padding:"2px 10px",borderRadius:99,flexShrink:0}}>+{standingsPts} pts</span>
                  </div>
                );"""

NEW = """                const standingsPts=(correct?5:swapped?3:0)+(thirdCorrect&&thirdQualified?2:0);
                // third-place bonus still live: predicted 3rd == actual 3rd, but that team's R32 not yet resolved
                const thirdPending=thirdCorrect&&!thirdQualified;
                // STATE: grey = finished, definitively zero (no W/RU bonus and 3rd not pending/earned)
                const isZero=standingsPts===0&&!thirdPending;
                // STATE: blue = finished, +0 so far, but +2 third-place still possible once knockouts resolve
                const isPendingOnly=standingsPts===0&&thirdPending;
                const isGreen=correct||(thirdCorrect&&thirdQualified&&!swapped);
                const pendNote=thirdPending?` · 3rd place pending`:'';
                const label=correct&&thirdCorrect&&thirdQualified?`Winner & runner-up correct, right order · ${actualStandings[2]} qualified`:
                             correct?`Winner & runner-up correct, right order${pendNote}`:
                             swapped&&thirdCorrect&&thirdQualified?`Both correct, positions swapped · ${actualStandings[2]} qualified`:
                             swapped?`Both correct, positions swapped${pendNote}`:
                             thirdCorrect&&thirdQualified?`${actualStandings[2]} qualified`:
                             isPendingOnly?`Group finished · 3rd-place bonus pending knockouts`:
                             `Group finished · no bonus earned`;
                // color set per state
                const cBg=isZero?"#F1EFE8":isPendingOnly?"#E6F1FB":isGreen?"#EAF3DE":"#FEF9EC";
                const cBorder=isZero?"#B4B2A9":isPendingOnly?"#185FA5":isGreen?"#3B6D11":"#F59E0B";
                const cText=isZero?"#5F5E5A":isPendingOnly?"#0C447C":isGreen?"#3B6D11":"#92400E";
                const cPill=isZero?"#D3D1C7":isPendingOnly?"#B5D4F4":isGreen?"#D4EDBA":"#FEF3C7";
                const pillText=isZero?`+0 pts`:isPendingOnly?`+0 so far`:`+${standingsPts} pts`;
                return(
                  <div style={{padding:"8px 12px",background:cBg,borderTop:`0.5px solid ${cBorder}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:500,color:cText}}>Group standings bonus</div>
                      <div style={{fontSize:10,color:cText,marginTop:2}}>{label}</div>
                    </div>
                    <span style={{fontSize:12,fontFamily:"monospace",fontWeight:600,color:cText,background:cPill,padding:"2px 10px",borderRadius:99,flexShrink:0}}>{pillText}</span>
                  </div>
                );"""

def die(m): print("ABORTED: "+m); sys.exit(1)
with io.open(PATH,"r",encoding="utf-8") as f: src=f.read()
orig=src
if "isPendingOnly" in src:
    print("v63 already installed — nothing to do."); sys.exit(0)
if src.count(OLD)!=1:
    die(f"anchor: expected 1 occurrence, found {src.count(OLD)}")
src=src.replace(OLD,NEW,1)
for tok in ["thirdPending=thirdCorrect&&!thirdQualified","isZero=standingsPts===0",
            "isPendingOnly=standingsPts===0&&thirdPending","Group finished · no bonus earned",
            "3rd-place bonus pending knockouts"]:
    if tok not in src: die(f"post-check failed: {tok} missing")
# ensure we did NOT touch any scoring: the +2 award lines must be unchanged & still present
if src.count("if(qualified)bonus+=2;")!=1 or src.count("if(qualified)total+=2;")!=1:
    die("post-check failed: scoring +2 lines altered — ABORT (this must be display-only)")
if src==orig: die("no change written")
with io.open(PATH,"w",encoding="utf-8") as f: f.write(src)
print("v63 install: SUCCESS")
print("  - banner now shows grey 'no bonus earned' for definitively-zero finished groups")
print("  - banner shows blue 'pending' when 3rd-place correct but R32 unresolved")
print("  - green/amber gain '· 3rd place pending' note when +2 still live")
print("  - scoring untouched (verified +2 award lines intact)")
