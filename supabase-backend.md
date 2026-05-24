# WC26 Predictor — Supabase Backend Setup

Complete copy-paste guide. No coding experience required.
Estimated time: 2–3 hours end to end.

---

## Step 1 — Create your Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click "New project"
3. Name it `wc26-predictor`, choose a strong database password, pick region closest to your users (US East or EU West)
4. Wait ~2 minutes for it to provision

---

## Step 2 — Run the database schema

In your Supabase dashboard → SQL Editor → paste and run this entire block:

```sql
-- Users (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  handle text unique not null,
  email text not null,
  avatar text,
  created_at timestamptz default now()
);

-- Matches (seeded with all 104 WC2026 fixtures)
create table public.matches (
  id text primary key,               -- e.g. "GS-A-1", "R16-1", "QF-1"
  stage text not null,               -- 'group', 'r16', 'qf', 'sf', 'final', '3rd'
  group_name text,                   -- 'A'–'L', null for knockouts
  home_team text not null,
  away_team text not null,
  kickoff timestamptz,
  actual_home int,                   -- null until played
  actual_away int,                   -- null until played
  status text default 'upcoming',    -- 'upcoming' | 'live' | 'finished'
  api_match_id text                  -- ID from API-Football for syncing
);

-- User predictions
create table public.predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  match_id text references public.matches(id),
  home_score int,
  away_score int,
  bonus_double boolean default false,
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
  league_id uuid references public.leagues(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  total_points int default 0,
  joined_at timestamptz default now(),
  primary key (league_id, user_id)
);

-- Bonus picks (one row per user)
create table public.bonus_picks (
  user_id uuid references public.users(id) on delete cascade primary key,
  golden_boot_pick text,
  golden_boot_locked boolean default false,
  bonus_r1_match_id text,            -- double-down match per round
  bonus_r2_match_id text,
  bonus_r3_match_id text,
  updated_at timestamptz default now()
);

-- Row-level security (users can only read/write their own data)
alter table public.users        enable row level security;
alter table public.predictions  enable row level security;
alter table public.bonus_picks  enable row level security;
alter table public.league_members enable row level security;

create policy "Users read own profile"
  on public.users for select using (auth.uid() = id);
create policy "Users update own profile"
  on public.users for update using (auth.uid() = id);

create policy "Users manage own predictions"
  on public.predictions for all using (auth.uid() = user_id);

create policy "Users manage own bonus picks"
  on public.bonus_picks for all using (auth.uid() = user_id);

create policy "League members visible to league"
  on public.league_members for select
  using (league_id in (
    select league_id from public.league_members where user_id = auth.uid()
  ));

-- Matches and leagues are publicly readable
create policy "Matches are public" on public.matches for select using (true);
create policy "Leagues are public" on public.leagues for select using (true);
```

---

## Step 3 — Set up the score sync edge function

In Supabase dashboard → Edge Functions → New function → name it `sync-scores`.

Paste this code:

```typescript
// supabase/functions/sync-scores/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY")!;
const WC2026_LEAGUE_ID = "1"; // API-Football league ID for WC 2026

serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Fetch today's finished matches from API-Football
  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=${WC2026_LEAGUE_ID}&season=2026&status=FT`,
    { headers: { "x-apisports-key": API_FOOTBALL_KEY } }
  );
  const data = await res.json();
  const fixtures = data.response ?? [];

  // 2. Update each finished match in our DB
  for (const fixture of fixtures) {
    const apiId = String(fixture.fixture.id);
    const homeGoals = fixture.goals.home;
    const awayGoals = fixture.goals.away;

    const { error } = await supabase
      .from("matches")
      .update({
        actual_home: homeGoals,
        actual_away: awayGoals,
        status: "finished",
      })
      .eq("api_match_id", apiId);

    if (error) console.error("Match update error:", apiId, error.message);
  }

  // 3. Score all unscored predictions for finished matches
  const { data: unscored } = await supabase
    .from("predictions")
    .select("*, matches(*)")
    .is("scored_at", null)
    .eq("matches.status", "finished");

  for (const pred of unscored ?? []) {
    const match = pred.matches;
    if (!match || match.actual_home == null) continue;

    const pts = calcPoints(pred, match);
    const finalPts = pred.bonus_double ? pts * 2 : pts;

    await supabase
      .from("predictions")
      .update({ points_earned: finalPts, scored_at: new Date().toISOString() })
      .eq("id", pred.id);

    // Update league_members totals
    await supabase.rpc("increment_member_points", {
      p_user_id: pred.user_id,
      p_points: finalPts,
    });
  }

  return new Response(
    JSON.stringify({ synced: fixtures.length, scored: unscored?.length ?? 0 }),
    { headers: { "Content-Type": "application/json" } }
  );
});

function calcPoints(pred: any, match: any): number {
  const ph = pred.home_score, pa = pred.away_score;
  const ah = match.actual_home, aa = match.actual_away;
  if (ph == null || pa == null) return 0;
  const predR = ph > pa ? "H" : ph < pa ? "A" : "D";
  const actR  = ah > aa ? "H" : ah < aa ? "A" : "D";
  if (predR !== actR) return 0;
  if (ph === ah && pa === aa) return 10;
  if (actR === "D") return 8;
  if ((ph - pa) === (ah - aa)) return 8;
  return 6;
}
```

Then add a helper SQL function in the SQL editor:

```sql
create or replace function increment_member_points(p_user_id uuid, p_points int)
returns void language sql as $$
  update public.league_members
  set total_points = total_points + p_points
  where user_id = p_user_id;
$$;
```

---

## Step 4 — Schedule the cron (4× daily)

In Supabase dashboard → Database → Extensions → enable `pg_cron`.

Then in SQL Editor:

```sql
-- Runs at 09:00, 13:00, 18:00, 23:00 UTC
-- Covers all match windows across USA/Canada/Mexico time zones
select cron.schedule('sync-scores-1', '0 9  * * *', $$ select net.http_post(url := '<YOUR_EDGE_FUNCTION_URL>/sync-scores', headers := '{"Authorization": "Bearer <YOUR_ANON_KEY>"}') $$);
select cron.schedule('sync-scores-2', '0 13 * * *', $$ select net.http_post(url := '<YOUR_EDGE_FUNCTION_URL>/sync-scores', headers := '{"Authorization": "Bearer <YOUR_ANON_KEY>"}') $$);
select cron.schedule('sync-scores-3', '0 18 * * *', $$ select net.http_post(url := '<YOUR_EDGE_FUNCTION_URL>/sync-scores', headers := '{"Authorization": "Bearer <YOUR_ANON_KEY>"}') $$);
select cron.schedule('sync-scores-4', '0 23 * * *', $$ select net.http_post(url := '<YOUR_EDGE_FUNCTION_URL>/sync-scores', headers := '{"Authorization": "Bearer <YOUR_ANON_KEY>"}') $$);
```

Replace `<YOUR_EDGE_FUNCTION_URL>` and `<YOUR_ANON_KEY>` with values from:
Supabase dashboard → Settings → API

---

## Step 5 — Environment variables to add in Supabase

Dashboard → Settings → Edge Functions → Secrets:

| Key | Where to get it |
|-----|----------------|
| `API_FOOTBALL_KEY` | rapidapi.com → API-Football → subscribe → copy key |
| `SUPABASE_URL` | Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role key (keep secret!) |

---

## Step 6 — Connect your React app

Install the Supabase client in your project:

```bash
npm install @supabase/supabase-js
```

Create `src/lib/supabase.js`:

```javascript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

Add to your `.env` file (never commit this):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Key client calls to swap into the app

**Sign up / create profile:**
```javascript
const { data: authData } = await supabase.auth.signUp({ email, password: "auto-generated-or-magic-link" });
await supabase.from("users").insert({ id: authData.user.id, name, handle, email });
```

**Save a prediction:**
```javascript
await supabase.from("predictions").upsert({
  user_id: user.id,
  match_id: "GS-A-1",
  home_score: 2,
  away_score: 1,
  bonus_double: false,
});
```

**Load leaderboard:**
```javascript
const { data } = await supabase
  .from("league_members")
  .select("total_points, users(name, handle, avatar)")
  .eq("league_id", leagueId)
  .order("total_points", { ascending: false });
```

**Create a league:**
```javascript
const code = "WC26-" + Math.random().toString(36).substring(2, 7).toUpperCase();
const { data } = await supabase.from("leagues").insert({ name, invite_code: code, admin_id: user.id }).select().single();
await supabase.from("league_members").insert({ league_id: data.id, user_id: user.id });
```

**Join a league by code:**
```javascript
const { data: league } = await supabase.from("leagues").select().eq("invite_code", code).single();
await supabase.from("league_members").insert({ league_id: league.id, user_id: user.id });
```

---

## Step 7 — Deploy to Vercel

1. Push your code to GitHub
2. Go to vercel.com → Import project → select your repo
3. Add environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
4. Deploy — done. Vercel auto-deploys on every git push.

---

## Ad integration (when ready)

Replace any `<AdSlot>` component in the app with:

```jsx
// Google AdSense
<ins className="adsbygoogle"
  style={{ display: "block", width: "100%", height: 90 }}
  data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
  data-ad-slot="XXXXXXXXXX"
  data-ad-format="auto"/>

// OR a direct sponsor banner
<a href="https://sponsor-url.com" target="_blank" rel="noopener">
  <img src="/sponsor-banner.png" alt="Sponsored by X" style={{ width: "100%", height: 90 }} />
</a>
```

Three slots are already wired into the layout: A (bracket sidebar 300×250), B (predict page banner 728×90), C (footer strip full-width).

---

## Sponsor contact

Add this to your footer — sponsors Google the product and look for this:

```
sponsor@yourdomain.com
```

When you have real traffic numbers (even 500 users during the tournament), post on LinkedIn:
> "Built a WC2026 prediction game — 500 players in week 1. Open to sponsorship from football brands."

That one post, timed during a high-profile match, is more effective than any cold outreach.
