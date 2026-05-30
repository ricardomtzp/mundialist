import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const res = await fetch(OPENFOOTBALL_URL)
    const data = await res.json()
    const matches = data.matches

    if (!matches?.length) {
      return new Response(JSON.stringify({ error: 'No matches returned' }), { status: 500 })
    }

    let updated = 0

    for (const m of matches) {
      const homeScore = m.score?.ft?.[0] ?? null
      const awayScore = m.score?.ft?.[1] ?? null
      const status = homeScore !== null ? 'finished' : 'upcoming'
      const matchId = `OF-${m.date}-${m.team1?.replace(/\s/g,'-')}-${m.team2?.replace(/\s/g,'-')}`

      const { error } = await supabase.from('matches').upsert({
        id: matchId,
        stage: m.round?.toLowerCase().includes('matchday') ? 'group' : 'knockout',
        group_name: m.group?.replace('Group ','') || null,
        home_team: m.team1,
        away_team: m.team2,
        kickoff: m.date,
        venue: m.ground || null,
        actual_home: homeScore,
        actual_away: awayScore,
        status,
      }, { onConflict: 'id' })

      if (!error) updated++
    }

    return new Response(
      JSON.stringify({ success: true, total: matches.length, updated }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
