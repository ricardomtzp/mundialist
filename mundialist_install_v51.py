#!/usr/bin/env python3
"""
mundialist_install_v51.py
TEMPORARY time-boxed unlock for 10 specific users.

Lets a fixed allow-list of users edit ALL prediction surfaces (group, KO, bonus
awards, double-downs) until UNLOCK_UNTIL, then auto-relocks with no second deploy.

Design (fail-closed):
  - Module-level UNLOCKED_USERS + UNLOCK_UNTIL + a `CURRENT_USER_UNLOCKED` flag
    defaulting to FALSE.
  - Both lock computations (tournamentStarted() at module scope, and hardLocked in
    the top-level PlayerSearch) read `!CURRENT_USER_UNLOCKED`.
  - The component sets CURRENT_USER_UNLOCKED each render from the current user:
    true only if user is on the list AND now < UNLOCK_UNTIL.
  Because the flag defaults false and is only set true for listed users in-window,
  the failure mode is "the 10 can't edit" (stays locked), NOT "everyone unlocks".

Every gate in the app routes through tournamentStarted() or hardLocked (verified:
those are the only two TOURNAMENT_START lock computations), so these 3 edits cover
group inputs, saveKOPick/saveBonusPicks guards, KO koLocked, double-down, and the
bonus award PlayerSearch.

REMOVAL: this is temporary. After the window, you may revert (restore from .bak) or
leave it -- UNLOCK_UNTIL makes it inert after the expiry regardless.

Idempotent guard included.
"""
import sys, io

PATH = "src/App.jsx"

UUIDS = [
    "4b96c154-1500-4e5d-8ca4-d7344272b31e",  # Christian Hurst
    "f3e27809-46ff-40d6-aba1-1de260e01f41",  # Daniel Vela Reid
    "c7ca32a0-b122-41bc-ad0b-c9c5d87712e5",  # David Harkin
    "4b6a129f-9f2a-4a61-bdcc-443266290279",  # Graham Harkin (ohearcain)
    "1ab61bca-8937-4e62-a7c2-f6a16f81d813",  # Graham Harkin (gharkin12)
    "267be517-bfd7-415b-ac3c-0bff003fd408",  # Jose Torres
    "0311601f-a450-427c-b2c3-49794956aa27",  # Juan Carlos P
    "af8265b3-8c06-426b-b79d-d45f2e3b9402",  # Ruben Turok
    "2d88bfb4-f0bc-49d3-81d1-7ed3b264da7d",  # Rishi Kumar
    "18cab2bd-b5e1-4bd7-90a5-b8f6bb6277a6",  # Ricardo (you)
    "a06a13bc-c19f-4d44-bd09-7d1740968f79",  # Sweta Chowdhury
]
ARR = "[" + ",".join("'%s'" % u for u in UUIDS) + "]"

OLD_1 = (
    "const TOURNAMENT_START=new Date('2026-06-12T19:00:00Z');\n"
    "const tournamentStarted=()=>Date.now()>=TOURNAMENT_START.getTime();"
)
NEW_1 = (
    "const TOURNAMENT_START=new Date('2026-06-12T19:00:00Z');\n"
    "const UNLOCKED_USERS=" + ARR + ";\n"
    "const UNLOCK_UNTIL=new Date('2026-06-14T16:00:00Z');\n"
    "let CURRENT_USER_UNLOCKED=false;\n"
    "const tournamentStarted=()=>Date.now()>=TOURNAMENT_START.getTime()&&!CURRENT_USER_UNLOCKED;"
)

OLD_2 = "  const hardLocked=Date.now()>=TOURNAMENT_START.getTime();"
NEW_2 = "  const hardLocked=Date.now()>=TOURNAMENT_START.getTime()&&!CURRENT_USER_UNLOCKED;"

OLD_3 = "  const [user,setUser]=useState(null);"
NEW_3 = (
    "  const [user,setUser]=useState(null);\n"
    "  CURRENT_USER_UNLOCKED=UNLOCKED_USERS.includes(user?.id)&&Date.now()<UNLOCK_UNTIL.getTime();"
)

def die(msg):
    print("ABORTED: " + msg); sys.exit(1)

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if "CURRENT_USER_UNLOCKED" in src:
    die("CURRENT_USER_UNLOCKED already present -- patch appears already applied. No changes made.")

for label, s in [("module/tournamentStarted block", OLD_1), ("hardLocked", OLD_2), ("user state", OLD_3)]:
    if src.count(s) != 1:
        die("expected exactly 1 occurrence of %s, found %d." % (label, src.count(s)))

src = src.replace(OLD_1, NEW_1, 1)
src = src.replace(OLD_2, NEW_2, 1)
src = src.replace(OLD_3, NEW_3, 1)

# Post-conditions.
for label, s in [("UNLOCKED_USERS", "const UNLOCKED_USERS="),
                 ("UNLOCK_UNTIL", "const UNLOCK_UNTIL=new Date('2026-06-14T16:00:00Z');"),
                 ("flag default", "let CURRENT_USER_UNLOCKED=false;"),
                 ("tournamentStarted gated", "TOURNAMENT_START.getTime()&&!CURRENT_USER_UNLOCKED"),
                 ("flag set in component", "CURRENT_USER_UNLOCKED=UNLOCKED_USERS.includes(user?.id)")]:
    if s not in src:
        die("post-check failed: %s missing." % label)
# Exactly 10 uuids present.
for u in UUIDS:
    if src.count("'%s'" % u) < 1:
        die("post-check failed: uuid %s missing." % u)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: applied v51 -- time-boxed unlock for 11 users until 2026-06-14T16:00:00Z (noon EDT Jun 14). Fail-closed.")
