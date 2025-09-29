
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // First, let's check if all demo users exist
    const demoUserIds = [
      '2b458624-d498-4cca-a63d-9341cc20e363',
      '3c459625-e499-5ddb-b64d-a442dd21f474',
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'
    ]

    console.log('Checking demo users...')
    
    // Check profiles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*')
      .in('user_id', demoUserIds)
    
    console.log('Profiles found:', profiles?.length || 0, profiles)
    
    // Check published resumes
    const { data: resumes, error: resumesError } = await supabaseClient
      .from('ai_resume_drafts')
      .select('*')
      .in('user_id', demoUserIds)
      .eq('published_to_profile', true)
    
    console.log('Published resumes found:', resumes?.length || 0, resumes)

    // Use the existing RPC function but log the results
    const { data, error } = await supabaseClient.rpc('get_demo_resume_profiles')
    
    console.log('RPC function returned:', data?.length || 0, 'profiles')
    console.log('RPC error:', error)

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ profiles: data || [] }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error fetching demo profiles:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
