# Mundialist — Claude Code Context

## What this is
A World Cup 2026 prediction game targeting the FPL (Fantasy Premier League) community in the UK and football fans globally. Users predict scores for all 104 matches, compete in private mini-leagues, and earn points based on accuracy. Think FPL but for the World Cup.

**Live URL:** Deployed on Vercel (connected to GitHub)
**Domain (pending registration):** mundialist.com
**Brand colours:** WC2026 official palette — blue #2A398D, red #E61D25, green #3CAC3B, gold #C9A84C, purple #7C3AED

---

## Tech stack
- **Frontend:** React + Vite (single file app currently in `src/App.jsx`)
- **Backend (not yet set up):** Supabase — auth, database, edge functions, cron jobs
- **Score API (not yet set up):** API-Football via RapidAPI — 4× daily sync
- **Email (not yet set up):** Resend — daily match digest to league members
- **Hosting:** Vercel — auto-deploys on GitHub push

---

## Current app structure
Everything lives in `src/App.jsx` as a single React component. No backend connected yet — all state is local/in-memory. The app has 6 pages navigated via a top nav (visible after signup):

| Page | Route state | Description |
|---|---|---|
| Home | `home` | Landing + profile creation form |
| Group Stage | `predict` | 72 match score inputs, double-down selector, adventurousness bar |
| Bracket | `bracket` | Full R32→Final bracket, interactive pick-the-winner |
| Bonuses | `bonuses` | Double-down summary, Golden Match, Golden Boot |
| My League | `league` | Global + mini leagues, invite codes, leaderboard |
| Points | `points` | Full scoring rules reference |

---

## Completed features

### Points system (fully finalised)
| Category | Points |
|---|---|
| Exact score | 10 |
| Correct result + correct GD | 8 |
| Correct draw, different score | 8 |
| Correct result only | 6 |
| Group table — both correct, right order | 5 |
| Group table — both correct, swapped | 3 |
| Any other group table outcome | 0 |
| Double-down (×2 multiplier) | mandatory, 1 per matchday, 3 total |
| Golden Match (×2 on one R16 pick) | 1 pick, R16 only |
| R32 correct advancing team | 15 |
| R16 correct advancing team | 16 |
| QF correct advancing team | 18 |
| SF correct advancing team | 20 |
| Tournament champion | 25 |
| Runner-up | 18 |
| Third place | 12 |
| Dark horse QF (non-seeded, predicted) | +3 |
| Dark horse SF (non-seeded, predicted) | +5 |
| Dark horse Final (non-seeded, predicted) | +8 |
| Golden Boot (top scorer) | 12 |
| Top Assist | 8 |
| Golden Glove (best keeper) | 8 |

### Special mechanics
- **Double-down:** One match per group stage matchday (3 total across whole tournament). Points doubled. Cannot involve any of the 12 seeded teams. Mandatory — all 3 must be selected before June 11.
- **Golden Match:** One R16 match picked upfront. Advancing team prediction worth double points. Editable until June 11.
- **Golden Boot:** Pick top scorer from player list. Editable until June 11, locks at kickoff.
- **Top Assist:** Same structure as Golden Boot — not yet built.
- **Golden Glove:** Same structure as Golden Boot — not yet built.
- **Dark horse bonus:** Auto-calculated from bracket picks. Non-seeded teams correctly predicted to reach QF/SF/Final earn bonus pts on top of normal knockout points.
- **Adventurousness bar:** Live score (0–100) showing Cautious / Balanced / Bold / Maverick based on upset predictions and dark horse picks.

### Groups (actual 2026 FIFA draw)
```javascript
const GROUPS = {
  A: ["Mexico", "South Africa", "South Korea", "Czechia"],
  B: ["Canada", "Switzerland", "Qatar", "Bosnia and Herzegovina"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["USA", "Paraguay", "Australia", "Türkiye"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Norway", "Iraq"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};
```

### Seeded teams (pot 1 — cannot be used in double-down)
Mexico, Canada, USA, Brazil, Germany, Spain, France, England, Portugal, Belgium, Netherlands, Argentina

### Bracket logic
- R32 pairings use **FIFA's official Annex C table** — 495 scenarios based on which 8 of 12 third-placed teams qualify
- Current implementation has ~45 of 495 scenarios hardcoded — TBD appears when combination not found
- Full 495-scenario table needs to be completed for e2e accuracy
- R32 picks cascade automatically to R16, QF, SF, Final
- Changing a pick at any round clears all downstream picks

### Prediction deadlines
- **Everything locks June 11, 2026** at tournament kickoff — no exceptions
- Group stage scores, double-down picks, golden match, golden boot, top assist, golden glove, full bracket picks — all locked June 11
- No mid-tournament changes

---

## Email structure (pending domain registration)
| Address | Purpose |
|---|---|
| `hello@mundialist.com` | General contact, public-facing |
| `sponsor@mundialist.com` | Sponsorship enquiries — in footer |
| `play@mundialist.com` | Transactional — daily digest, score updates |
| `admin@mundialist.com` | Internal — cron alerts, platform notifications |

### Daily league email spec
Sends once per day on any matchday. Recipients: all members of each mini-league.

Content per matchday:
- Each match playing that day
- Every league member's predicted score shown side by side
- ⚡ indicator next to any member's pick that is their double-down match for that round
- For knockout matches: shows each member's predicted qualifier for that slot (e.g. shows "Brazil" even if real match is Brazil v France, because that member predicted Brazil to advance from their earlier pick)

---

## Supabase schema (not yet set up)
```sql
-- Users
create table public.users (
  id uuid references auth.users(id) primary key,
  name text not null,
  handle text unique not null,
  email text not null,
  avatar text,
  created_at timestamptz default now()
);

-- Matches (all 104 WC2026 fixtures)
create table public.matches (
  id text primary key,          -- e.g. "GS-A-1", "R32-1", "R16-1"
  stage text not null,          -- 'group', 'r32', 'r16', 'qf', 'sf', 'final', '3rd'
  group_name text,              -- 'A'–'L', null for knockouts
  home_team text not null,
  away_team text not null,
  kickoff timestamptz,
  actual_home int,              -- null until played
  actual_away int,
  status text default 'upcoming', -- 'upcoming' | 'live' | 'finished'
  api_match_id text             -- ID from API-Football
);

-- Predictions
create table public.predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  match_id text references public.matches(id),
  home_score int,
  away_score int,
  ko_pick text,                 -- for knockout matches: team name picked to advance
  bonus_double boolean default false,
  golden_match boolean default false,
  points_earned int default 0,
  scored_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, match_id)
);

-- Leagues
create table public.leagues (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique not null,
  admin_id uuid references public.users(id),
  created_at timestamptz default now()
);

-- League membership
create table public.league_members (
  league_id uuid references public.leagues(id),
  user_id uuid references public.users(id),
  total_points int default 0,
  joined_at timestamptz default now(),
  primary key (league_id, user_id)
);

-- Bonus picks
create table public.bonus_picks (
  user_id uuid references public.users(id) primary key,
  golden_boot_pick text,        -- player name
  golden_boot_locked boolean default false,
  top_assist_pick text,         -- player name
  top_assist_locked boolean default false,
  golden_glove_pick text,       -- goalkeeper name
  golden_glove_locked boolean default false,
  bonus_r1_match_id text,       -- double-down match per round
  bonus_r2_match_id text,
  bonus_r3_match_id text,
  golden_match_id text,         -- R16 match ID for golden match
  updated_at timestamptz default now()
);
```

---

## API-Football sync (not yet set up)
- Provider: API-Football via RapidAPI
- Free tier: 100 req/day (enough for 4× daily sync during group stage)
- Paid tier ($15/mo): 7,500 req/day — upgrade when tournament starts
- Sync schedule: 09:00, 13:00, 18:00, 23:00 UTC (covers all WC2026 match windows)
- Edge function fetches finished matches, writes scores, auto-scores predictions
- See `supabase-backend.md` for full edge function code

---

## Ad slots (already in layout, swap in AdSense when ready)
| Slot | Location | Size |
|---|---|---|
| A | Group Stage page — between nav and match list | 728×90 banner |
| B | Bracket sidebar | 300×250 box |
| C | Footer strip | Full-width 60px |

Sponsor contact: `sponsor@mundialist.com` — already in footer.

---

## Monetisation notes
- **Phase 1:** Google AdSense (apply once live traffic exists)
- **Phase 2:** Direct sponsorship from football brands / betting operators
- **Target:** FPL community (UK-based, 11M+ players)
- **No payment infrastructure needed** — ad/sponsorship model only

---

## Design decisions locked in
- Language: British English throughout — "draw" not "tie", "match" not "game"
- Everything locks June 11 — no mid-tournament changes (by design, not a bug)
- No negative scoring
- No Player of the Tournament (not deterministic — always someone from winning team)
- No comeback multiplier (rejected — unfair to reward bottom players)
- No mid-tournament pick changes (rejected — undermines the locked-in philosophy)
- Third place worth 12 pts (less than runner-up 18 pts — intentional, reflects playoff's lower status)
- Dark horse bonus starts at QF not R16 (R16 has too many dark horses ~7.4 avg to be meaningful)
- Double-down is mandatory — players MUST select all 3 or leave points on the table

---

## Phase 2 features (post-launch)
- Match simulator — let users toggle results to see how mini-league standings would change
- Full Annex C table (495 scenarios) — currently ~45 hardcoded, needs completing
- Mobile responsive layout — two-column predict page needs responsive breakpoints
- Empty states — first-time user experience when nothing is filled in
- View another player's predictions from league leaderboard
- "Hot take" flag — let users tag one bold prediction per group (social, no points)

---

## Immediate TODO for Claude Code

### Priority 1 — Complete the bonuses (1–2 hours)
Add **Top Assist** and **Golden Glove** to the Bonuses page and Points guide.
- Same UX pattern as Golden Boot (search player name, select, editable until June 11)
- Top Assist: search from same `GOLDEN_BOOT_PLAYERS` list
- Golden Glove: needs a separate `GOALKEEPERS` list — add the top 20 WC2026 keepers (Courtois, Alisson, Ederson, De Gea, Pickford, Lloris, Oblak, ter Stegen, Donnarumma, Unai Simon, Yann Sommer, Manuel Neuer, Bono, Bounou, Edouard Mendy, Andre Onana, Wojciech Szczesny, David Raya, Nick Pope, Aaron Ramsdale)
- Add both to the points guide section
- Add both to the Supabase `bonus_picks` schema

### Priority 2 — Update branding (30 mins)
- Replace all instances of "Mundialist" with "Mundialist" throughout `App.jsx`
- Update nav logo: wordmark `Mundialist` + small `Predictor` badge
- Update page title, meta tags, favicon reference
- Update all email addresses from `@mundialist.com` / `@mundialist.com` to `@mundialist.com` (pending domain confirmation)
- Update footer copyright line

### Priority 3 — Complete Annex C (2–3 hours)
The R32 bracket currently shows TBD for combinations not in the partial lookup table.
- Source the full 495-scenario Annex C table from FIFA's official regulations or Wikipedia
- Hardcode all 495 rows into the `ANNEX_C` object in `App.jsx`
- Test with multiple simulated group stage outcomes to verify correct pairings
- Reference: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage

### Priority 4 — Mobile responsive layout (2–3 hours)
The app is desktop-only right now. Key breakpoints needed:
- Group Stage page: single column on mobile (match list full width, standings below)
- Bracket page: horizontal scroll on mobile (bracket is inherently wide)
- Nav: hamburger menu or simplified nav on mobile
- Score inputs: already 52px wide — good for touch, keep as-is
- Bonuses page: already single column — minimal changes needed
- Use CSS media queries or Tailwind responsive prefixes

### Priority 5 — Supabase integration
Follow the guide in `supabase-backend.md` step by step:
1. Create Supabase project
2. Run the SQL schema
3. Set up auth (email magic link — no password needed)
4. Replace local state in `App.jsx` with Supabase client calls
5. Set up edge function for API-Football sync
6. Set up pg_cron for 4× daily schedule
7. Add environment variables to Vercel

### Priority 6 — Empty states
Add empty state UI for first-time users on:
- Group Stage: "Start by predicting Group A — tap a group tab above"
- Bracket: "Complete your group stage picks first to populate the bracket"
- My League: "You haven't joined a league yet — create one or enter an invite code"
- Bonuses: "Your bonus picks are empty — all must be submitted before June 11"

---

## Key constants to know
```javascript
// Scoring
const SCORING = {
  exactScore: 10, correctResultGD: 8, correctTie: 8, correctResult: 6,
  groupTableBoth: 5, groupTableSwapped: 3,
  r32: 15, r16: 16, qf: 18, sf: 20, champion: 25, runnerUp: 18, thirdPlace: 12,
  darkHorseQF: 3, darkHorseSF: 5, darkHorseFinal: 8,
  goldenBoot: 12, topAssist: 8, goldenGlove: 8, goldenMatch: 2,
};

// Brand colours
const C = {
  blue: "#2A398D",   blueLt: "#E8EBF7",
  red: "#E61D25",    redLt: "#FDECED",
  green: "#3CAC3B",  greenLt: "#EAF7EA",
  gold: "#C9A84C",   goldLt: "#FBF5E6",
  purple: "#7C3AED", purpleLt: "#EDE9FE",
};

// Round structure (matches per group, 3 matchdays)
const ROUND_INDICES = [[0,1],[2,3],[4,5]];

// R32 to R16 cascade
const R32_TO_R16 = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]];
```

---

## Design principles (do not change without discussion)
- Stripe/Linear aesthetic — clean, minimal, no unnecessary chrome
- British English throughout
- No bullet points or numbered lists in UI copy — conversational prose
- WC2026 brand colours used semantically (blue = primary, green = success, gold = bonus/premium, red = urgent/dark horse, purple = golden match)
- Font: DM Sans (body) + DM Mono (numbers, codes, scores)
- Cards use `0.5px solid var(--color-border-tertiary)` borders — never thick borders
- All predictions lock June 11 — this is a feature, communicate it as such
