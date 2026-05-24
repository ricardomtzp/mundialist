// ─────────────────────────────────────────────────────────────────────────────
// WC26 Predictor — Score Sync Edge Function
//
// Deploy to: Supabase Dashboard → Edge Functions → New Function → "sync-scores"
// Schedule:  Supabase Dashboard → Database → Cron Jobs → New Cron
//            Cron expression: 0 9,13,18,23 * * *   (09:00 / 13:00 / 18:00 / 23:00 UTC)
//            Command: select net.http_post('https://<YOUR_PROJECT>.supabase.co/functions/v1/sync-scores', '{}', 'application/json');
//
// Environment variables to set in Supabase Dashboard → Settings → Edge Functions:
//   API_FOOTBALL_KEY  — your API-Football key from rapidapi.com
//   WC2026_LEAGUE_ID  — the API-Football league ID for FIFA World Cup 2026
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // service role — bypasses RLS
const API_KEY         = Deno.env.get("API_FOOTBALL_KEY")!;
const WC_LEAGUE_ID    = Deno.env.get("WC2026_LEAGUE_ID") ?? "1"; // update once confirmed
const WC_SEASON       = "2026";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

Deno.serve(async (_req) => {
  try {
    console.log(`[sync-scores] Starting sync at ${new Date().toISOString()}`);

    // ── 1. Fetch today's finished matches from API-Football ──────────────────
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const apiRes = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}&date=${today}&status=FT`,
      {
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
        },
      }
    );

    if (!apiRes.ok) {
      throw new Error(`API-Football error: ${apiRes.status} ${apiRes.statusText}`);
    }

    const apiData = await apiRes.json();
    const fixtures = apiData?.response ?? [];
    console.log(`[sync-scores] Found ${fixtures.length} finished fixtures for ${today}`);

    if (fixtures.length === 0) {
      return new Response(JSON.stringify({ message: "No finished matches today", date: today }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 2. Update each finished match in Supabase ────────────────────────────
    const updatedMatchIds: number[] = [];

    for (const fixture of fixtures) {
      const apiId      = fixture.fixture.id;
      const homeGoals  = fixture.goals.home;
      const awayGoals  = fixture.goals.away;

      if (homeGoals === null || awayGoals === null) continue; // match not fully scored yet

      // Find the match in our DB by api_id
      const { data: match, error: findErr } = await supabase
        .from("matches")
        .select("id, status")
        .eq("api_id", apiId)
        .single();

      if (findErr || !match) {
        console.warn(`[sync-scores] Match api_id ${apiId} not found in DB — skipping`);
        continue;
      }

      // Skip if already scored to avoid re-triggering scoring function
      if (match.status === "finished") {
        console.log(`[sync-scores] Match ${match.id} already finished — skipping`);
        continue;
      }

      // Write actual score
      const { error: updateErr } = await supabase
        .from("matches")
        .update({
          actual_home: homeGoals,
          actual_away: awayGoals,
          status: "finished",
          synced_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      if (updateErr) {
        console.error(`[sync-scores] Failed to update match ${match.id}:`, updateErr.message);
        continue;
      }

      updatedMatchIds.push(match.id);
      console.log(`[sync-scores] Updated match ${match.id}: ${homeGoals}-${awayGoals}`);
    }

    // ── 3. Run scoring function for each newly finished match ────────────────
    for (const matchId of updatedMatchIds) {
      const { error: scoreErr } = await supabase.rpc("score_predictions", {
        p_match_id: matchId,
      });

      if (scoreErr) {
        console.error(`[sync-scores] Scoring failed for match ${matchId}:`, scoreErr.message);
      } else {
        console.log(`[sync-scores] Scored predictions for match ${matchId}`);
      }
    }

    // ── 4. Done ──────────────────────────────────────────────────────────────
    const summary = {
      synced_at: new Date().toISOString(),
      date: today,
      fixtures_fetched: fixtures.length,
      matches_updated: updatedMatchIds.length,
      match_ids: updatedMatchIds,
    };

    console.log("[sync-scores] Complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[sync-scores] Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
