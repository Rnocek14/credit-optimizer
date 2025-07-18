
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
      .or(`industry.ilike.%Technology%,title.ilike.%Data%,title.ilike.%Analyst%`)
      .limit(10)

    if (careerPathsError) {
      console.error('❌ Career paths error:', careerPathsError)
      throw new Error(`Error fetching career paths: ${careerPathsError.message}`)
    }

    console.log(`✅ Found ${careerPaths?.length || 0} relevant career paths`)

    // Create specialized prompt for Data Analyst roadmap
    const dataAnalystPrompt = `Create a comprehensive 12-month roadmap for someone to become a job-ready Data Analyst with these constraints:

PROFILE:
- Name: ${profile.name}
- Starting Point: ${profile.role_title} (${profile.experience_level})
- Current Skills: ${profile.skills?.join(', ') || 'Basic computer skills'}
- Goals: ${profile.career_goals}
- Learning Preference: ${profile.learning_style || 'Self-paced online'}
- Budget: Limited (budget-conscious)
- Timeline: 12 months maximum
- Requirements: Job-ready proof (portfolio + certifications)

Create exactly 3 DISTINCT career tracks with different approaches:

Track 1: "Certification-Heavy Path" - Focus on industry certifications (Google, Microsoft, etc.)
Track 2: "Bootcamp + Portfolio Path" - Structured bootcamp with strong portfolio development  
Track 3: "Self-Taught + Projects Path" - Free/low-cost resources with practical projects

For each track, provide:
- Strategic reasoning for this approach
- Time to job-readiness 
- Estimated total cost
- Key differentiators
- Growth potential after landing first job

Return ONLY valid JSON in this exact format:
{
  "career_tracks": [
    {
      "title": "Track Name",
      "description": "Clear description of this learning path approach",
      "reasoning": "Why this track works for Maya's constraints and goals",
      "growth_potential": "Career progression opportunities after first Data Analyst role",
      "time_to_proficiency": "Realistic timeline to job-ready status"
    }
  ]
}`

    console.log('🤖 Calling OpenAI API with specialized Data Analyst prompt...')
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
            content: 'You are a career counselor specializing in data analysis career transitions. Provide practical, budget-conscious advice for career changers. Always return valid JSON without markdown formatting.'
          },
          {
            role: 'user',
            content: dataAnalystPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
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

    // Create detailed roadmap steps for Data Analyst path
    console.log('💾 Creating specialized Data Analyst roadmap steps...')
    const allRoadmapSteps = []

    // Track 1: Certification-Heavy Path
    const certificationSteps = [
      {
        user_id: user_id,
        title: "Complete Google Data Analytics Certificate",
        description: "Earn Google's industry-recognized certificate covering data analysis fundamentals, SQL, R, Tableau, and data visualization",
        category: "Certification",
        timeline: "Months 1-4",
        priority: "High",
        estimated_duration: "3-6 months (10 hrs/week)",
        prerequisites: [],
        success_metrics: "Certificate completion + Capstone project portfolio",
        order_index: 1,
        completed: false,
      },
      {
        user_id: user_id,
        title: "Master SQL and Database Fundamentals", 
        description: "Complete SQL courses (SQLBolt, W3Schools) and practice with real datasets. Build 3 SQL-based analysis projects",
        category: "Technical Skills",
        timeline: "Months 2-5",
        priority: "High", 
        estimated_duration: "2-3 hours/week ongoing",
        prerequisites: ["Google Data Analytics basics"],
        success_metrics: "Portfolio with 3 SQL analysis projects + certification",
        order_index: 2,
        completed: false,
      },
      {
        user_id: user_id,
        title: "Apply for Entry-Level Data Analyst Roles",
        description: "Leverage certifications and portfolio to apply for junior data analyst positions. Target 50+ applications with personalized cover letters",
        category: "Job Search",
        timeline: "Months 10-12",
        priority: "High",
        estimated_duration: "15-20 hours/week",
        prerequisites: ["Completed certifications", "Strong portfolio"],
        success_metrics: "3+ interviews, 1+ job offer",
        order_index: 3,
        completed: false,
      }
    ]

    // Track 2: Bootcamp + Portfolio Path  
    const bootcampSteps = [
      {
        user_id: user_id,
        title: "Enroll in Data Analytics Bootcamp",
        description: "Join a reputable bootcamp (Springboard, Thinkful, or CareerFoundry) with career services and mentorship",
        category: "Structured Learning",
        timeline: "Months 1-6",
        priority: "High",
        estimated_duration: "20-25 hours/week",
        prerequisites: [],
        success_metrics: "Bootcamp completion certificate + capstone project",
        order_index: 4,
        completed: false,
      },
      {
        user_id: user_id,
        title: "Build Comprehensive Data Portfolio",
        description: "Create 5-7 end-to-end data projects showcasing different skills: web scraping, cleaning, analysis, visualization, and insights",
        category: "Portfolio Development", 
        timeline: "Months 4-8",
        priority: "High",
        estimated_duration: "10-15 hours/week",
        prerequisites: ["Bootcamp fundamentals"],
        success_metrics: "Professional portfolio website with documented projects",
        order_index: 5,
        completed: false,
      },
      {
        user_id: user_id,
        title: "Network and Secure Interviews",
        description: "Leverage bootcamp career services, attend data meetups, connect with alumni, and optimize LinkedIn for data analyst roles",
        category: "Career Development",
        timeline: "Months 9-12", 
        priority: "High",
        estimated_duration: "5-10 hours/week",
        prerequisites: ["Portfolio completion"],
        success_metrics: "50+ LinkedIn connections, 5+ informational interviews, 3+ job interviews",
        order_index: 6,
        completed: false,
      }
    ]

    // Track 3: Self-Taught + Projects Path
    const selfTaughtSteps = [
      {
        user_id: user_id,
        title: "Master Free Data Analysis Resources",
        description: "Complete freeCodeCamp Data Analysis with Python, Khan Academy Statistics, and YouTube Python tutorials (Corey Schafer, sentdex)",
        category: "Self-Study",
        timeline: "Months 1-6",
        priority: "High", 
        estimated_duration: "15-20 hours/week",
        prerequisites: [],
        success_metrics: "Completed 3 major free courses + practice projects",
        order_index: 7,
        completed: false,
      },
      {
        user_id: user_id,
        title: "Create Real-World Analysis Projects",
        description: "Analyze public datasets (Kaggle, government data) to solve business problems. Focus on retail, healthcare, or finance domains",
        category: "Project Development",
        timeline: "Months 4-10", 
        priority: "High",
        estimated_duration: "10-15 hours/week",
        prerequisites: ["Python/Excel fundamentals"],
        success_metrics: "5 published projects with business impact stories",
        order_index: 8,
        completed: false,
      },
      {
        user_id: user_id,
        title: "Freelance and Build Experience",
        description: "Take on small data analysis projects via Upwork/Fiverr to gain real client experience and testimonials while job searching",
        category: "Experience Building",
        timeline: "Months 8-12",
        priority: "Medium",
        estimated_duration: "5-10 hours/week",
        prerequisites: ["Strong project portfolio"],
        success_metrics: "3+ completed freelance projects + client testimonials",
        order_index: 9,
        completed: false,
      }
    ]

    allRoadmapSteps.push(...certificationSteps, ...bootcampSteps, ...selfTaughtSteps)

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

    console.log('🎉 Data Analyst roadmap generation completed successfully!')
    console.log('Final result summary:')
    console.log(`- Career tracks created: ${parsedCareerTracks.career_tracks.length}`)
    console.log(`- Roadmap steps created: ${allRoadmapSteps.length}`)
    console.log(`- User: ${profile.name} (${user_id})`)

    const successResponse = {
      success: true,
      message: 'Data Analyst roadmap generated successfully',
      data: {
        career_tracks_created: parsedCareerTracks.career_tracks.length,
        roadmap_steps_created: allRoadmapSteps.length,
        user_id: user_id,
        profile_name: profile.name,
        specialization: 'Data Analyst - 12 Month Budget-Conscious Path'
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
