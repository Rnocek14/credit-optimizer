import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Profile {
  id: string
  name: string
  experience_level: string
  years_experience: number
  role_title: string
  industry: string
  skills: string[]
  education: string
  career_goals: string
  interests: string[]
  learning_style: string
  availability: string
  location: string
  willing_to_relocate: boolean
  salary_expectations: number
  work_preferences: string
}

interface CareerTrack {
  title: string
  description: string
  reasoning: string
  growth_potential: string
  time_to_proficiency: string
}

interface RoadmapStep {
  title: string
  description: string
  category: string
  timeline: string
  priority: string
  estimated_duration: string
  prerequisites: string[]
  success_metrics: string
  order_index: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id } = await req.json()

    if (!user_id) {
      throw new Error('user_id is required')
    }

    console.log(`Generating roadmap for user: ${user_id}`)

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      throw new Error(`Profile not found: ${profileError?.message}`)
    }

    console.log(`Found profile for: ${profile.name}`)

    // Get relevant career paths based on user's industry and interests
    const { data: careerPaths, error: careerPathsError } = await supabaseClient
      .from('career_paths')
      .select('*')
      .or(`industry.ilike.%${profile.industry}%,title.ilike.%${profile.role_title}%`)
      .limit(20)

    if (careerPathsError) {
      throw new Error(`Error fetching career paths: ${careerPathsError.message}`)
    }

    console.log(`Found ${careerPaths?.length || 0} relevant career paths`)

    // Generate career tracks using OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    const careerTracksPrompt = `Based on the following user profile, suggest 3 specific career tracks. Focus on realistic progression paths that align with their current experience, goals, and constraints.

User Profile:
- Name: ${profile.name}
- Current Role: ${profile.role_title}
- Experience Level: ${profile.experience_level}
- Years of Experience: ${profile.years_experience}
- Industry: ${profile.industry}
- Skills: ${profile.skills?.join(', ')}
- Education: ${profile.education}
- Career Goals: ${profile.career_goals}
- Interests: ${profile.interests?.join(', ')}
- Learning Style: ${profile.learning_style}
- Availability: ${profile.availability}
- Location: ${profile.location}
- Willing to Relocate: ${profile.willing_to_relocate}
- Salary Expectations: $${profile.salary_expectations}
- Work Preferences: ${profile.work_preferences}

Available Career Paths in Database:
${careerPaths?.map(cp => `- ${cp.title}: ${cp.summary} (${cp.industry}, ${cp.level} level, avg salary: $${cp.average_salary})`).join('\n')}

Please provide exactly 3 career track recommendations in this JSON format:
{
  "career_tracks": [
    {
      "title": "Specific Career Path Title",
      "description": "Detailed description of this career path and why it fits the user",
      "reasoning": "Why this path makes sense given their background and goals",
      "growth_potential": "Expected career progression and opportunities",
      "time_to_proficiency": "Estimated time to reach proficiency in this path"
    }
  ]
}`

    const careerTracksResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a career counselor expert. Provide practical, realistic career advice based on user profiles and available career paths. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: careerTracksPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!careerTracksResponse.ok) {
      throw new Error(`OpenAI API error: ${careerTracksResponse.statusText}`)
    }

    const careerTracksData = await careerTracksResponse.json()
    const careerTracksContent = careerTracksData.choices[0].message.content

    console.log('Generated career tracks:', careerTracksContent)

    let parsedCareerTracks
    try {
      parsedCareerTracks = JSON.parse(careerTracksContent)
    } catch (e) {
      console.error('Failed to parse career tracks JSON:', e)
      throw new Error('Failed to parse career recommendations')
    }

    // Insert career tracks into database
    const careerTracksToInsert = parsedCareerTracks.career_tracks.map((track: CareerTrack) => ({
      user_id: user_id,
      title: track.title,
      description: track.description,
      reasoning: track.reasoning,
      growth_potential: track.growth_potential,
      time_to_proficiency: track.time_to_proficiency,
    }))

    const { data: insertedCareerTracks, error: careerTracksInsertError } = await supabaseClient
      .from('career_tracks')
      .insert(careerTracksToInsert)
      .select()

    if (careerTracksInsertError) {
      throw new Error(`Error inserting career tracks: ${careerTracksInsertError.message}`)
    }

    console.log(`Inserted ${insertedCareerTracks?.length || 0} career tracks`)

    // Generate roadmap steps for each career track
    const allRoadmapSteps = []

    for (const careerTrack of parsedCareerTracks.career_tracks) {
      const roadmapPrompt = `Create a detailed learning roadmap for someone pursuing this career path:

Career Track: ${careerTrack.title}
Description: ${careerTrack.description}

User Context:
- Current Level: ${profile.experience_level}
- Years Experience: ${profile.years_experience}
- Current Skills: ${profile.skills?.join(', ')}
- Availability: ${profile.availability}
- Learning Style: ${profile.learning_style}
- Career Goals: ${profile.career_goals}

Please create 6-8 actionable learning steps in this JSON format:
{
  "roadmap_steps": [
    {
      "title": "Specific, actionable step title",
      "description": "Detailed description of what to do and how",
      "category": "Learning category (e.g., Technical Skills, Soft Skills, Experience, Networking)",
      "timeline": "When to complete this (e.g., Month 1-2, Week 1-4)",
      "priority": "High, Medium, or Low",
      "estimated_duration": "Time commitment (e.g., 2-3 hours/week, 1 month)",
      "prerequisites": ["List of prerequisite steps or skills"],
      "success_metrics": "How to measure completion and success"
    }
  ]
}`

      const roadmapResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a career coach creating detailed, actionable learning roadmaps. Provide specific, measurable steps that can be completed within the user\'s time constraints. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: roadmapPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      })

      if (!roadmapResponse.ok) {
        console.error(`OpenAI API error for roadmap: ${roadmapResponse.statusText}`)
        continue
      }

      const roadmapData = await roadmapResponse.json()
      const roadmapContent = roadmapData.choices[0].message.content

      console.log(`Generated roadmap for ${careerTrack.title}:`, roadmapContent)

      let parsedRoadmap
      try {
        parsedRoadmap = JSON.parse(roadmapContent)
      } catch (e) {
        console.error('Failed to parse roadmap JSON:', e)
        continue
      }

      // Add steps with order index and user_id
      const roadmapSteps = parsedRoadmap.roadmap_steps.map((step: RoadmapStep, index: number) => ({
        user_id: user_id,
        title: step.title,
        description: step.description,
        category: step.category,
        timeline: step.timeline,
        priority: step.priority,
        estimated_duration: step.estimated_duration,
        prerequisites: step.prerequisites || [],
        success_metrics: step.success_metrics,
        order_index: index + 1,
        completed: false,
      }))

      allRoadmapSteps.push(...roadmapSteps)
    }

    // Insert all roadmap steps
    if (allRoadmapSteps.length > 0) {
      const { data: insertedRoadmapSteps, error: roadmapStepsInsertError } = await supabaseClient
        .from('roadmap_steps')
        .insert(allRoadmapSteps)
        .select()

      if (roadmapStepsInsertError) {
        throw new Error(`Error inserting roadmap steps: ${roadmapStepsInsertError.message}`)
      }

      console.log(`Inserted ${insertedRoadmapSteps?.length || 0} roadmap steps`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Roadmap generated successfully',
        data: {
          career_tracks_created: parsedCareerTracks.career_tracks.length,
          roadmap_steps_created: allRoadmapSteps.length,
          user_id: user_id,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error generating roadmap:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})