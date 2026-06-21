#!/usr/bin/env python3
"""
v59 — findActualResult orientation fix.
Patches the 2-line forward-only lookup into an orientation-aware version that, on a
reversed-stored match, returns a re-oriented COPY (home_team/away_team/actual_home/
actual_away swapped) so all callers stay correct. Applied IDENTICALLY to:
  - src/App.jsx
  - supabase/functions/snapshot-ranks/scoring.js
Safe: asserts exact old string appears exactly once per file; idempotent; verifies after.
"""
import sys, re

OLD = """function findActualResult(resultsArr, home, away){
  const nh=normTeam(home), na=normTeam(away);
  return (resultsArr||[]).find(r=>r.status==='finished'&&normTeam(r.home_team)===nh&&normTeam(r.away_team)===na);
}"""

NEW = """function findActualResult(resultsArr, home, away){
  const nh=normTeam(home), na=normTeam(away);
  const arr=resultsArr||[];
  let r=arr.find(x=>x.status==='finished'&&normTeam(x.home_team)===nh&&normTeam(x.away_team)===na);
  if(r)return r;
  r=arr.find(x=>x.status==='finished'&&normTeam(x.home_team)===na&&normTeam(x.away_team)===nh);
  if(r)return {...r, home_team:r.away_team, away_team:r.home_team, actual_home:r.actual_away, actual_away:r.actual_home};
  return undefined;
}"""

FILES = ["src/App.jsx", "supabase/functions/snapshot-ranks/scoring.js"]
MARKER = "// reversed orientation"  # not used; rely on NEW signature for idempotency check

def patch(path):
    with open(path, "r") as f:
        src = f.read()
    # idempotency: already patched if NEW's distinctive reversed-branch line present
    if "normTeam(x.home_team)===na&&normTeam(x.away_team)===nh" in src:
        print(f"  [skip] {path}: already patched (v59 present)")
        return True
    n = src.count(OLD)
    if n == 0:
        print(f"  [FAIL] {path}: exact old findActualResult not found — ABORT (no changes written)")
        return False
    if n > 1:
        print(f"  [FAIL] {path}: old string found {n} times (expected 1) — ABORT")
        return False
    src2 = src.replace(OLD, NEW)
    with open(path, "w") as f:
        f.write(src2)
    # verify
    with open(path) as f:
        chk = f.read()
    ok = ("normTeam(x.home_team)===na&&normTeam(x.away_team)===nh" in chk
          and chk.count("function findActualResult") == 1)
    print(f"  [ok] {path}: patched and verified" if ok else f"  [FAIL] {path}: post-verify failed")
    return ok

def main():
    allok = True
    for p in FILES:
        try:
            allok &= patch(p)
        except FileNotFoundError:
            print(f"  [FAIL] {p}: file not found"); allok = False
    print("\nv59 install:", "SUCCESS" if allok else "FAILED (see above)")
    sys.exit(0 if allok else 1)

if __name__ == "__main__":
    main()
