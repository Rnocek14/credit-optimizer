import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { careerPathTitle } = await req.json()
    
    // First get the career path ID
    const { data: careerPath, error: pathError } = await supabaseClient
      .from('career_paths')
      .select('id')
      .eq('title', careerPathTitle || 'Data Analyst')
      .single()

    if (pathError || !careerPath) {
      throw new Error(`Career path not found: ${careerPathTitle}`)
    }

    // Use the existing recursive function to calculate levels
    const { data: stepsWithLevels, error: stepsError } = await supabaseClient
      .rpc('calculate_career_step_levels', { 
        career_path_id_param: careerPath.id 
      })

    if (stepsError) {
      throw new Error(`Failed to calculate step levels: ${stepsError.message}`)
    }

    // Transform the result to match frontend requirements
    const transformedSteps = stepsWithLevels.map((step: any) => ({
      id: step.id,
      title: step.title,
      prerequisites: step.prerequisites || [],
      level: step.level,
      step_order: step.order_index,
      is_terminal: step.is_terminal || false,
      estimated_time: step.estimated_duration || step.estimated_time
    }))

    console.log(`📊 Calculated levels for ${transformedSteps.length} steps in ${careerPathTitle}`)
    
    return new Response(
      JSON.stringify(transformedSteps),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Error in get-career-steps-with-levels:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})