import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LinkedInProfile {
  id: string
  firstName: string
  lastName: string
  headline?: string
  summary?: string
  industry?: string
  location?: string
  profilePicture?: string
  publicProfileUrl?: string
}

interface LinkedInExperience {
  title: string
  companyName: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
}

interface LinkedInEducation {
  schoolName: string
  fieldOfStudy?: string
  degree?: string
  startDate: string
  endDate?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { accessToken, userId } = await req.json()

    if (!accessToken || !userId) {
      throw new Error('Access token and user ID are required')
    }

    console.log('Starting LinkedIn import for user:', userId)

    // Fetch LinkedIn profile data
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName,headline,summary,industry,location,profilePicture(displayImage~:playableStreams),publicProfileUrl)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    })

    if (!profileResponse.ok) {
      throw new Error(`LinkedIn API error: ${profileResponse.status}`)
    }

    const profileData = await profileResponse.json()

    // Fetch LinkedIn experience
    const experienceResponse = await fetch('https://api.linkedin.com/v2/positions', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    })

    const experienceData = experienceResponse.ok ? await experienceResponse.json() : { elements: [] }

    // Fetch LinkedIn education
    const educationResponse = await fetch('https://api.linkedin.com/v2/educations', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    })

    const educationData = educationResponse.ok ? await educationResponse.json() : { elements: [] }

    // Process and normalize LinkedIn data
    const processedProfile: LinkedInProfile = {
      id: profileData.id,
      firstName: profileData.firstName?.localized?.en_US || '',
      lastName: profileData.lastName?.localized?.en_US || '',
      headline: profileData.headline?.localized?.en_US,
      summary: profileData.summary?.localized?.en_US,
      industry: profileData.industry?.localized?.en_US,
      location: profileData.location?.country?.localized?.en_US,
      profilePicture: profileData.profilePicture?.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier,
      publicProfileUrl: profileData.publicProfileUrl
    }

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('data_imports')
      .insert({
        user_id: userId,
        import_type: 'linkedin',
        import_source: 'linkedin_oauth',
        raw_data: {
          profile: profileData,
          experience: experienceData,
          education: educationData
        },
        processed_data: {
          profile: processedProfile,
          experience: experienceData.elements || [],
          education: educationData.elements || []
        },
        import_status: 'processing',
        confidence_score: 0.9,
        metadata: {
          import_timestamp: new Date().toISOString(),
          linkedin_api_version: 'v2'
        }
      })
      .select()
      .single()

    if (importError) {
      throw new Error(`Failed to create import record: ${importError.message}`)
    }

    // Update user profile with LinkedIn data
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name: `${processedProfile.firstName} ${processedProfile.lastName}`.trim(),
        linkedin_id: processedProfile.id,
        linkedin_url: processedProfile.publicProfileUrl,
        headline: processedProfile.headline,
        location: processedProfile.location,
        industry: processedProfile.industry,
        summary: processedProfile.summary,
        avatar_url: processedProfile.profilePicture,
        import_source: 'linkedin',
        last_import_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Continue processing even if profile update fails
    }

    // Extract skills from LinkedIn data using AI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    let extractedSkills = []

    if (openaiApiKey) {
      try {
        const skillsPrompt = `Extract professional skills from this LinkedIn profile data. 
        Return only a JSON array of objects with format: {"skill": "skill_name", "category": "category", "confidence": 0.8}.
        
        Profile: ${JSON.stringify(processedProfile)}
        Experience: ${JSON.stringify(experienceData.elements?.slice(0, 5) || [])}
        
        Focus on concrete technical and professional skills, not soft skills.`

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'You are a professional skills extraction AI. Extract only concrete, professional skills from LinkedIn profiles. Return valid JSON only.'
              },
              {
                role: 'user',
                content: skillsPrompt
              }
            ],
            max_tokens: 1000,
            temperature: 0.3
          })
        })

        if (openaiResponse.ok) {
          const aiResult = await openaiResponse.json()
          const skillsText = aiResult.choices[0]?.message?.content
          
          try {
            extractedSkills = JSON.parse(skillsText)
            console.log('Extracted skills:', extractedSkills.length)

            // Save extracted skills
            if (extractedSkills.length > 0) {
              const skillInserts = extractedSkills.map((skill: any) => ({
                user_id: userId,
                import_id: importRecord.id,
                skill_name: skill.skill,
                skill_category: skill.category || 'General',
                confidence_score: skill.confidence || 0.8,
                extraction_source: 'linkedin',
                context_snippet: processedProfile.headline || '',
                metadata: {
                  extracted_at: new Date().toISOString(),
                  ai_model: 'gpt-4o'
                }
              }))

              await supabase
                .from('skill_extractions')
                .insert(skillInserts)
            }
          } catch (skillParseError) {
            console.error('Failed to parse extracted skills:', skillParseError)
          }
        }
      } catch (aiError) {
        console.error('AI skill extraction failed:', aiError)
      }
    }

    // Mark import as completed
    await supabase
      .from('data_imports')
      .update({
        import_status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', importRecord.id)

    console.log('LinkedIn import completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        importId: importRecord.id,
        profile: processedProfile,
        skillsExtracted: extractedSkills.length,
        message: 'LinkedIn profile imported successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('LinkedIn import error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})