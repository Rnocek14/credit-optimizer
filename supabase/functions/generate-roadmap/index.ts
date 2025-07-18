import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('🚀🚀🚀 GENERATE-ROADMAP FUNCTION STARTED 🚀🚀🚀')
  console.log('Timestamp:', new Date().toISOString())
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔧 Creating Supabase client...')
    
    // Check environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') 
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    console.log('Environment check:')
    console.log('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')
    console.log('- OPENAI_API_KEY:', openaiKey ? '✅ Set' : '❌ Missing')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    console.log('📝 Parsing request body...')
    const body = await req.json()
    console.log('Request body:', body)
    const { user_id } = body
    console.log('Extracted user_id:', user_id)

    if (!user_id) {
      console.error('❌ user_id is required')
      throw new Error('user_id is required')
    }

    console.log(`✅ Starting roadmap generation for user: ${user_id}`)

    // Get user profile
    console.log('📋 Fetching user profile...')
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    if (profileError) {
      console.error('❌ Profile error:', profileError)
      throw new Error(`Profile not found: ${profileError.message}`)
    }

    if (!profile) {
      console.error('❌ No profile found')
      throw new Error('Profile not found')
    }

    console.log(`✅ Found profile for: ${profile.name}`)
    console.log('Profile data:', {
      name: profile.name,
      role: profile.role_title,
      experience: profile.experience_level,
      skills: profile.skills,
      goals: profile.career_goals
    })

    // OpenAI API key already checked above
    if (!openaiKey) {
      console.error('❌ OPENAI_API_KEY not found')
      throw new Error('OPENAI_API_KEY is not configured')
    }
    console.log('✅ OpenAI API key confirmed available')

    // Get relevant career paths
    console.log('🔍 Fetching relevant career paths...')
    const { data: careerPaths, error: careerPathsError } = await supabaseClient
      .from('career_paths')
      .select('*')
      .or(`industry.ilike.%${profile.industry}%,title.ilike.%${profile.role_title}%`)
      .limit(20)

    if (careerPathsError) {
      console.error('❌ Career paths error:', careerPathsError)
      throw new Error(`Error fetching career paths: ${careerPathsError.message}`)
    }

    console.log(`✅ Found ${careerPaths?.length || 0} relevant career paths`)

    // Create a simplified prompt first to test OpenAI connection
    const simplePrompt = `Based on this UX Designer profile, suggest 3 career tracks:
- Name: ${profile.name}
- Role: ${profile.role_title}
- Experience: ${profile.experience_level} (${profile.years_experience} years)
- Skills: ${profile.skills?.join(', ')}
- Goals: ${profile.career_goals}

Return JSON format:
{
  "career_tracks": [
    {
      "title": "Career Path Title",
      "description": "Description of this path",
      "reasoning": "Why this fits",
      "growth_potential": "Growth opportunities",
      "time_to_proficiency": "Time estimate"
    }
  ]
}`

    console.log('🤖 Calling OpenAI API...')
    const careerTracksResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a career counselor. Provide practical career advice in valid JSON format.'
          },
          {
            role: 'user',
            content: simplePrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    console.log('OpenAI Response status:', careerTracksResponse.status)

    if (!careerTracksResponse.ok) {
      const errorText = await careerTracksResponse.text()
      console.error('❌ OpenAI API error:', careerTracksResponse.status, errorText)
      throw new Error(`OpenAI API error: ${careerTracksResponse.statusText}`)
    }

    const careerTracksData = await careerTracksResponse.json()
    console.log('✅ OpenAI response received')

    const careerTracksContent = careerTracksData.choices[0].message.content
    console.log('Generated content:', careerTracksContent)

    let parsedCareerTracks
    try {
      // Clean the response content - remove markdown code blocks if present
      let cleanContent = careerTracksContent.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```\s*$/, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```\s*$/, '')
      }
      
      console.log('Cleaned content for parsing:', cleanContent)
      parsedCareerTracks = JSON.parse(cleanContent)
      console.log('✅ Successfully parsed career tracks JSON')
    } catch (e) {
      console.error('❌ Failed to parse career tracks JSON:', e)
      console.error('Raw content was:', careerTracksContent)
      throw new Error('Failed to parse career recommendations')
    }

    // Insert career tracks into database
    console.log('💾 Inserting career tracks into database...')
    const careerTracksToInsert = parsedCareerTracks.career_tracks.map((track: any) => ({
      user_id: user_id,
      title: track.title,
      description: track.description,
      reasoning: track.reasoning,
      growth_potential: track.growth_potential,
      time_to_proficiency: track.time_to_proficiency,
    }))

    console.log('Career tracks to insert:', careerTracksToInsert)

    const { data: insertedCareerTracks, error: careerTracksInsertError } = await supabaseClient
      .from('career_tracks')
      .insert(careerTracksToInsert)
      .select()

    if (careerTracksInsertError) {
      console.error('❌ Error inserting career tracks:', careerTracksInsertError)
      throw new Error(`Error inserting career tracks: ${careerTracksInsertError.message}`)
    }

    console.log(`✅ Successfully inserted ${insertedCareerTracks?.length || 0} career tracks`)

    // For now, just create a simple roadmap step for each track
    console.log('💾 Creating roadmap steps...')
    const allRoadmapSteps = []

    for (let i = 0; i < parsedCareerTracks.career_tracks.length; i++) {
      const track = parsedCareerTracks.career_tracks[i]
      
      // Create 3 simple steps per track
      const steps = [
        {
          user_id: user_id,
          title: `Assess Current ${track.title} Skills`,
          description: `Evaluate your current skills and identify gaps for the ${track.title} career path`,
          category: 'Assessment',
          timeline: 'Week 1',
          priority: 'High',
          estimated_duration: '2-3 hours',
          prerequisites: [],
          success_metrics: 'Completed skills assessment and gap analysis',
          order_index: (i * 3) + 1,
          completed: false,
        },
        {
          user_id: user_id,
          title: `Build ${track.title} Portfolio`,
          description: `Create portfolio projects that demonstrate ${track.title} capabilities`,
          category: 'Portfolio Development',
          timeline: 'Month 1-2',
          priority: 'High',
          estimated_duration: '4-6 hours/week',
          prerequisites: ['Skills assessment'],
          success_metrics: 'Portfolio with 2-3 relevant projects',
          order_index: (i * 3) + 2,
          completed: false,
        },
        {
          user_id: user_id,
          title: `Network in ${track.title} Community`,
          description: `Connect with professionals and join communities related to ${track.title}`,
          category: 'Networking',
          timeline: 'Ongoing',
          priority: 'Medium',
          estimated_duration: '1-2 hours/week',
          prerequisites: [],
          success_metrics: 'Connected with 5+ professionals, joined 2+ communities',
          order_index: (i * 3) + 3,
          completed: false,
        }
      ]

      allRoadmapSteps.push(...steps)
    }

    if (allRoadmapSteps.length > 0) {
      const { data: insertedRoadmapSteps, error: roadmapStepsInsertError } = await supabaseClient
        .from('roadmap_steps')
        .insert(allRoadmapSteps)
        .select()

      if (roadmapStepsInsertError) {
        console.error('❌ Error inserting roadmap steps:', roadmapStepsInsertError)
        throw new Error(`Error inserting roadmap steps: ${roadmapStepsInsertError.message}`)
      }

      console.log(`✅ Successfully inserted ${insertedRoadmapSteps?.length || 0} roadmap steps`)
    }

    console.log('🎉 Roadmap generation completed successfully!')
    console.log('Final result summary:')
    console.log(`- Career tracks created: ${parsedCareerTracks.career_tracks.length}`)
    console.log(`- Roadmap steps created: ${allRoadmapSteps.length}`)
    console.log(`- User: ${profile.name} (${user_id})`)

    const successResponse = {
      success: true,
      message: 'Roadmap generated successfully',
      data: {
        career_tracks_created: parsedCareerTracks.career_tracks.length,
        roadmap_steps_created: allRoadmapSteps.length,
        user_id: user_id,
        profile_name: profile.name,
      }
    }
    
    console.log('Returning response:', successResponse)

    return new Response(
      JSON.stringify(successResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥💥💥 CRITICAL ERROR in generate-roadmap function 💥💥💥')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Error details:', error)
    
    const errorResponse = {
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }
    
    console.error('Returning error response:', errorResponse)
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})