-- ─────────────────────────────────────────────────────────────────────────────
-- WC26 Predictor — Supabase Schema
-- Paste this entire file into: Supabase Dashboard → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enable UUID generation ──────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Users ───────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with public profile data
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text        not null,
  handle      text        not null unique,
  email       text        not null unique,
  country     text,
  avatar      text,                          -- initials or future avatar URL
  created_at  timestamptz not null default now()
);

-- ── Matches ─────────────────────────────────────────────────────────────────
-- Seeded once with all 104 WC2026 fixtures; scores filled in by cron job
create table public.matches (
  id            serial      primary key,
  api_id        int         unique,          -- API-Football match ID for syncing
  stage         text        not null,        -- 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  group_name    text,                        -- 'A'..'L', null for knockout
  home_team     text        not null,
  away_team     text        not null,
  kickoff_utc   timestamptz not null,
  actual_home   int,                         -- null until match is finished
  actual_away   int,
  status        text        not null default 'scheduled',  -- 'scheduled' | 'live' | 'finished'
  synced_at     timestamptz
);

-- ── Predictions ─────────────────────────────────────────────────────────────
create table public.predictions (
  id            serial      primary key,
  user_id       uuid        not null references public.users(id) on delete cascade,
  match_id      int         not null references public.matches(id) on delete cascade,
  home_score    int         not null,
  away_score    int         not null,
  bonus_double  boolean     not null default false,   -- true = this match is the round's double pick
  points_earned int         not null default 0,       -- computed after match finishes
  submitted_at  timestamptz not null default now(),
  unique(user_id, match_id)
);

-- ── Bonus picks ─────────────────────────────────────────────────────────────
create table public.bonus_picks (
  id                serial      primary key,
  user_id           uuid        not null references public.users(id) on delete cascade unique,
  golden_boot_pick  text,                    -- nation name string
  locked_at         timestamptz,
  points_earned     int         not null default 0
);

-- ── Leagues ─────────────────────────────────────────────────────────────────
create table public.leagues (
  id          serial      primary key,
  name        text        not null,
  invite_code text        not null unique,
  admin_id    uuid        not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ── League members ───────────────────────────────────────────────────────────
create table public.league_members (
  league_id     int  not null references public.leagues(id) on delete cascade,
  user_id       uuid not null references public.users(id)   on delete cascade,
  total_points  int  not null default 0,
  joined_at     timestamptz not null default now(),
  primary key (league_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Views
-- ─────────────────────────────────────────────────────────────────────────────

-- Global leaderboard
create or replace view public.global_leaderboard as
  select
    u.id,
    u.name,
    u.handle,
    u.country,
    u.avatar,
    coalesce(sum(p.points_earned), 0) + coalesce(b.points_earned, 0) as total_points
  from public.users u
  left join public.predictions p  on p.user_id = u.id
  left join public.bonus_picks b  on b.user_id = u.id
  group by u.id, u.name, u.handle, u.country, u.avatar, b.points_earned
  order by total_points desc;

-- League leaderboard (join with a specific league_id in your query)
create or replace view public.league_leaderboard as
  select
    lm.league_id,
    u.id         as user_id,
    u.name,
    u.handle,
    u.avatar,
    coalesce(sum(p.points_earned), 0) + coalesce(b.points_earned, 0) as total_points
  from public.league_members lm
  join public.users u          on u.id = lm.user_id
  left join public.predictions p on p.user_id = lm.user_id
  left join public.bonus_picks b on b.user_id = lm.user_id
  group by lm.league_id, u.id, u.name, u.handle, u.avatar, b.points_earned
  order by lm.league_id, total_points desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security (RLS)
-- Users can only read/write their own data. Leaderboards are public.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.users         enable row level security;
alter table public.predictions   enable row level security;
alter table public.bonus_picks   enable row level security;
alter table public.leagues       enable row level security;
alter table public.league_members enable row level security;

-- Users
create policy "Users can view all profiles"     on public.users for select using (true);
create policy "Users can update own profile"    on public.users for update using (auth.uid() = id);

-- Predictions
create policy "Users can view all predictions"  on public.predictions for select using (true);
create policy "Users can manage own predictions" on public.predictions for all using (auth.uid() = user_id);

-- Bonus picks
create policy "Users can view all bonus picks"  on public.bonus_picks for select using (true);
create policy "Users can manage own bonus picks" on public.bonus_picks for all using (auth.uid() = user_id);

-- Leagues
create policy "Anyone can view leagues"         on public.leagues for select using (true);
create policy "Authenticated users can create"  on public.leagues for insert with check (auth.uid() = admin_id);

-- League members
create policy "Anyone can view league members"  on public.league_members for select using (true);
create policy "Users can join/leave leagues"    on public.league_members for all using (auth.uid() = user_id);

-- Matches are public read-only (only the cron job writes to them via service role)
create policy "Anyone can view matches"         on public.matches for select using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Scoring function
-- Called by the cron job after writing actual scores to matches
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.score_predictions(p_match_id int)
returns void language plpgsql as $$
declare
  match       record;
  pred        record;
  pts         int;
  actual_res  text;
  pred_res    text;
  actual_gd   int;
  pred_gd     int;
begin
  select * into match from public.matches where id = p_match_id;
  if match.actual_home is null or match.actual_away is null then return; end if;

  actual_res := case
    when match.actual_home > match.actual_away then 'H'
    when match.actual_home < match.actual_away then 'A'
    else 'D'
  end;
  actual_gd := match.actual_home - match.actual_away;

  for pred in select * from public.predictions where match_id = p_match_id loop
    pred_res := case
      when pred.home_score > pred.away_score then 'H'
      when pred.home_score < pred.away_score then 'A'
      else 'D'
    end;
    pred_gd := pred.home_score - pred.away_score;

    if pred_res != actual_res then
      pts := 0;
    elsif pred.home_score = match.actual_home and pred.away_score = match.actual_away then
      pts := 10;  -- exact score
    elsif actual_res = 'D' then
      pts := 8;   -- correct tie, different score
    elsif pred_gd = actual_gd then
      pts := 8;   -- correct result + correct GD
    else
      pts := 6;   -- correct result only
    end if;

    -- Apply bonus double if selected
    if pred.bonus_double then pts := pts * 2; end if;

    update public.predictions set points_earned = pts where id = pred.id;
  end loop;

  -- Update league member totals
  update public.league_members lm
  set total_points = (
    select coalesce(sum(p.points_earned), 0)
    from public.predictions p where p.user_id = lm.user_id
  )
  where exists (
    select 1 from public.predictions p
    where p.user_id = lm.user_id and p.match_id = p_match_id
  );
end;
$$;
