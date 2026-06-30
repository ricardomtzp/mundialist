// Supabase Edge Function: snapshot-ranks
// Computes every member's total per league and writes one daily_ranks row per
// (league_id, user_id, snapshot_date). Mirrors loadLeagueMembers in App.jsx:
// total via computeUserPoints, tiebreak by group-picks-completed, positional rank.
//
// Scoring lives in ./scoring.js, extracted VERBATIM from src/App.jsx. If App.jsx
// scoring changes, re-extract scoring.js so ranks never drift from the leaderboard.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { computeUserPoints } from './scoring.js'

const GLOBAL_ID = '00000000-0000-0000-0000-000000000001'

// Date in US Eastern as YYYY-MM-DD (cron fires 04:00 UTC = 00:00 EDT all tournament).
function easternDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

// Pure transform — unit-tested in Node with mock data (no DB).
export function buildSnapshotRows(members, preds, bonuses, matches, awards, snapshot_date) {
  const predsByUser: Record<string, any[]> = {}
  for (const p of preds) (predsByUser[p.user_id] || (predsByUser[p.user_id] = [])).push(p)
  const bonusByUser: Record<string, any> = {}
  for (const b of bonuses) bonusByUser[b.user_id] = b

  const leagueMap: Record<string, string[]> = {}
  const userSet = new Set<string>()
  for (const m of members) {
    (leagueMap[m.league_id] || (leagueMap[m.league_id] = [])).push(m.user_id)
    userSet.add(m.user_id)
  }

  // Each user's total is league-independent — compute once.
  const stats: Record<string, { total: number; groupDone: number }> = {}
  for (const uid of userSet) {
    const up = predsByUser[uid] || []
    const bd = computeUserPoints(up, bonusByUser[uid] || {}, matches, awards)
    const groupDone = up.filter(p => p.match_id && p.match_id.startsWith('GS-') && p.home_score !== null).length
    stats[uid] = { total: bd.total, groupDone }
  }

  const rows: any[] = []
  for (const [league_id, ids] of Object.entries(leagueMap)) {
    const ranked = ids
      .map(uid => ({ uid, total: stats[uid]?.total ?? 0, gd: stats[uid]?.groupDone ?? 0 }))
      .sort((a, b) => b.total - a.total || b.gd - a.gd)
    ranked.forEach((r, i) => rows.push({ league_id, user_id: r.uid, snapshot_date, rank: i + 1, points: r.total }))
  }
  return rows
}

async function fetchAll(supabase, table, columns) {
  const all: any[] = []
  const PAGE = 1000
  let from = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    all.push(...(data || []))
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return all
}

Deno.serve(async (req) => {
  // Optional shared-secret guard: enforced only if SNAPSHOT_SECRET env is set.
  const secret = Deno.env.get('SNAPSHOT_SECRET')
  if (secret && req.headers.get('x-snapshot-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  try {
    const snapshot_date = easternDate()
    const [members, preds, bonuses, matches, awardsRes] = await Promise.all([
      fetchAll(supabase, 'league_members', 'league_id,user_id'),
      fetchAll(supabase, 'predictions', 'user_id,match_id,home_score,away_score,advancing_team'),
      fetchAll(supabase, 'bonus_picks', 'user_id,golden_boot_player,top_assist_player,golden_glove_player,double_down_r1,double_down_r2,double_down_r3'),
      fetchAll(supabase, 'matches', 'id,stage,status,group_name,home_team,away_team,actual_home,actual_away,ko_winner'),
      supabase.from('tournament_awards').select('golden_boot,top_assist,golden_glove').eq('id', 'wc2026').maybeSingle(),
    ])
    const awards = awardsRes?.data ? { ...awardsRes.data } : {}

    const rows = buildSnapshotRows(members, preds, bonuses, matches, awards, snapshot_date)

    let written = 0
    const CHUNK = 500
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const { error } = await supabase.from('daily_ranks').upsert(chunk, { onConflict: 'league_id,user_id,snapshot_date' })
      if (error) throw new Error(`upsert: ${error.message}`)
      written += chunk.length
    }

    return new Response(JSON.stringify({
      success: true, snapshot_date,
      leagues: new Set(members.map(m => m.league_id)).size,
      users: new Set(members.map(m => m.user_id)).size,
      rows_written: written,
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
