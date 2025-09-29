import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id } = await req.json()
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Testing XP and Badge system for user:', user_id)

    // 1. Get current user level and XP
    const { data: levelData, error: levelError } = await supabaseClient
      .rpc('get_user_level', { user_id_param: user_id })

    if (levelError) {
      console.error('Error getting user level:', levelError)
      return new Response(
        JSON.stringify({ error: 'Failed to get user level', details: levelError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Current user level data:', levelData)

    // 2. Get suggested badges
    const { data: suggestedBadges, error: suggestError } = await supabaseClient
      .rpc('suggest_badges_for_user', { user_uuid: user_id })

    if (suggestError) {
      console.error('Error getting suggested badges:', suggestError)
    } else {
      console.log('Suggested badges:', suggestedBadges)
    }

    // 3. Call assign-badges function
    console.log('Calling assign-badges function...')
    const { data: assignResult, error: assignError } = await supabaseClient.functions
      .invoke('assign-badges', {
        body: { user_id }
      })

    if (assignError) {
      console.error('Error calling assign-badges:', assignError)
    } else {
      console.log('Assign badges result:', assignResult)
    }

    // 4. Get XP events for the user
    const { data: xpEvents, error: xpError } = await supabaseClient
      .from('xp_events')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (xpError) {
      console.error('Error getting XP events:', xpError)
    } else {
      console.log('Recent XP events:', xpEvents)
    }

    // 5. Get current badges for the user
    const { data: currentBadges, error: badgesError } = await supabaseClient
      .from('user_badges')
      .select(`
        *,
        badges:badge_id (
          name,
          slug,
          emoji,
          description
        )
      `)
      .eq('user_id', user_id)

    if (badgesError) {
      console.error('Error getting user badges:', badgesError)
    } else {
      console.log('Current user badges:', currentBadges)
    }

    const response = {
      success: true,
      user_id,
      current_level: levelData?.[0] || null,
      suggested_badges: suggestedBadges || [],
      assign_badges_result: assignResult,
      recent_xp_events: xpEvents || [],
      current_badges: currentBadges || [],
      timestamp: new Date().toISOString()
    }

    console.log('Test completed successfully:', response)

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in test-xp-system function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})