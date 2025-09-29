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

    const { current_career, user_skills, preferred_locations } = await req.json()

    console.log('🔍 Analyzing pivot paths for:', { current_career, user_skills, preferred_locations })

    // Fetch all career paths with their required skills
    const { data: careerPaths, error: pathsError } = await supabaseClient
      .from('career_paths')
      .select(`
        id,
        title,
        industry,
        summary,
        average_salary,
        required_skill_ids,
        optional_skill_ids
      `)

    if (pathsError) {
      throw new Error(`Failed to fetch career paths: ${pathsError.message}`)
    }

    // Fetch all skills for mapping
    const { data: skills, error: skillsError } = await supabaseClient
      .from('skills')
      .select('id, name, category')

    if (skillsError) {
      throw new Error(`Failed to fetch skills: ${skillsError.message}`)
    }

    // Fetch location multipliers for preferred locations
    const { data: locationMultipliers, error: multipliersError } = await supabaseClient
      .from('career_location_multipliers')
      .select(`
        career_path_id,
        salary_multiplier,
        locations!inner(label)
      `)
      .in('locations.label', preferred_locations || [])

    if (multipliersError) {
      console.warn('Failed to fetch location multipliers:', multipliersError.message)
    }

    // Create skill name to ID mapping
    const skillMap = new Map(skills?.map(s => [s.name.toLowerCase(), s]) || [])
    const skillIdMap = new Map(skills?.map(s => [s.id, s]) || [])

    // Get user skill IDs
    const userSkillIds = user_skills
      ?.map((skillName: string) => skillMap.get(skillName.toLowerCase())?.id)
      .filter(Boolean) || []

    console.log('📊 User skill IDs:', userSkillIds)

    // Use OpenAI to analyze and recommend pivot paths
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const analysisPrompt = `
You are Life Path's AI Career Pivot Analyst. Analyze career pivot opportunities based on skill overlap and ROI.

CURRENT SITUATION:
- Current Career: ${current_career}
- User Skills: ${user_skills?.join(', ') || 'None'}
- Preferred Locations: ${preferred_locations?.join(', ') || 'Any'}

AVAILABLE CAREER PATHS:
${careerPaths?.map(cp => {
  const requiredSkills = cp.required_skill_ids?.map((id: string) => skillIdMap.get(id)?.name).filter(Boolean) || []
  const optionalSkills = cp.optional_skill_ids?.map((id: string) => skillIdMap.get(id)?.name).filter(Boolean) || []
  
  return `- ${cp.title} (${cp.industry}): Required: [${requiredSkills.join(', ')}], Optional: [${optionalSkills.join(', ')}], Avg Salary: $${cp.average_salary || 'Unknown'}`
}).join('\n')}

LOCATION MULTIPLIERS:
${locationMultipliers?.map(lm => `- Career: ${lm.career_path_id}, Multiplier: ${lm.salary_multiplier}x`).join('\n') || 'No location data available'}

TASK:
Find 3-5 career pivot opportunities that:
1. Share at least 3 overlapping skills with the user's current skills
2. Are realistic career transitions from ${current_career}
3. Have good ROI potential in the user's preferred locations
4. Don't suggest the exact same career they already have

For each pivot, calculate:
- Shared skills (skills user already has)
- Missing skills (skills they need to learn)
- Estimated learning time (realistic estimate)
- Estimated cost (realistic estimate for courses/training)
- ROI score (1.0 = same salary, 1.5 = 50% increase, etc.)
- Clear reasoning why this is a good pivot

Return ONLY valid JSON in this exact format:
{
  "pivots": [
    {
      "new_career": "Product Designer",
      "shared_skills": ["Figma", "User Research", "UI Design"],
      "missing_skills": ["Business Strategy", "A/B Testing"],
      "roi_score": 1.4,
      "estimated_time": "4 months",
      "estimated_cost": "$500",
      "reasoning": "Strong overlap with design skills and higher ROI in Europe"
    }
  ]
}
`

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a career pivot analyst. Return only valid JSON responses with realistic career recommendations based on skill overlap and market demand.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    const openAIData = await openAIResponse.json()
    
    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIData.error?.message || 'Unknown error'}`)
    }

    let pivotRecommendations
    try {
      pivotRecommendations = JSON.parse(openAIData.choices[0].message.content)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', openAIData.choices[0].message.content)
      throw new Error('Failed to parse AI recommendations')
    }

    console.log('✨ Generated pivot recommendations:', pivotRecommendations)

    return new Response(
      JSON.stringify(pivotRecommendations),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Error in recommend-pivot-paths:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        pivots: []
      }),
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