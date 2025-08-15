import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema definitions
const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string().optional(),
  bullets: z.array(z.string()).optional()
});

const EducationSchema = z.object({
  school: z.string(),
  degree: z.string().optional()
});

const ProjectSchema = z.object({
  name: z.string(),
  bullets: z.array(z.string()).optional()
});

const RequestSchema = z.object({
  target_role: z.string().optional(),
  experience: z.array(ExperienceSchema).optional(),
  skills: z.array(z.string()).optional(),
  education: z.array(EducationSchema).optional(),
  projects: z.array(ProjectSchema).optional()
});

const ResumeBulletSchema = z.object({
  section: z.string(),
  text: z.string(),
  skill_tags: z.array(z.string()).optional()
});

const ResponseSchema = z.object({
  resume: z.object({
    sections: z.record(z.any()),
    bullets: z.array(ResumeBulletSchema)
  }),
  cri_estimate: z.number().optional(),
  request_id: z.string()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  
  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ 
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Missing or invalid Authorization header',
          request_id: requestId 
        } 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const svcClient = createClient(supabaseUrl, serviceKey);

    // Verify user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ 
        error: { 
          code: 'INVALID_TOKEN', 
          message: 'Invalid JWT token',
          request_id: requestId 
        } 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting check (50/day for AI generation)
    const { data: recentCalls } = await svcClient
      .from('edge_invocations')
      .select('id')
      .eq('function', 'resume-draft')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentCalls && recentCalls.length >= 50) {
      return new Response(JSON.stringify({ 
        error: { 
          code: 'RATE_LIMITED', 
          message: 'Daily rate limit exceeded (50 calls/day)',
          request_id: requestId 
        } 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate input
    const body = await req.json();
    const parsed = RequestSchema.parse(body);

    // Fallback resume generation (when AI unavailable)
    const generateSkeletonResume = (data: any) => {
      const sections = {
        summary: data.target_role ? 
          `Professional seeking opportunities in ${data.target_role} with strong background in relevant technologies and methodologies.` :
          'Experienced professional with diverse skill set and proven track record of success.',
        experience: data.experience || [],
        education: data.education || [],
        skills: data.skills || [],
        projects: data.projects || []
      };

      const bullets = [];
      
      // Generate bullets from experience
      if (data.experience) {
        data.experience.forEach((exp: any) => {
          if (exp.bullets) {
            exp.bullets.forEach((bullet: string) => {
              bullets.push({
                section: 'experience',
                text: bullet,
                skill_tags: extractSkillTags(bullet, data.skills || [])
              });
            });
          }
        });
      }

      // Generate bullets from projects
      if (data.projects) {
        data.projects.forEach((proj: any) => {
          if (proj.bullets) {
            proj.bullets.forEach((bullet: string) => {
              bullets.push({
                section: 'projects',
                text: bullet,
                skill_tags: extractSkillTags(bullet, data.skills || [])
              });
            });
          }
        });
      }

      return { sections, bullets };
    };

    // Helper function to extract skill tags from text
    const extractSkillTags = (text: string, availableSkills: string[]) => {
      const lowerText = text.toLowerCase();
      return availableSkills.filter(skill => 
        lowerText.includes(skill.toLowerCase())
      );
    };

    // Calculate basic CRI estimate
    const calculateBasicCRI = (data: any) => {
      let cri = 40; // baseline
      
      if (data.experience?.length > 0) cri += Math.min(30, data.experience.length * 10);
      if (data.education?.length > 0) cri += Math.min(20, data.education.length * 10);
      if (data.skills?.length > 0) cri += Math.min(20, data.skills.length * 2);
      if (data.projects?.length > 0) cri += Math.min(15, data.projects.length * 5);
      
      return Math.min(100, cri);
    };

    // Check for OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    let response;
    
    if (!openaiKey) {
      // Use skeleton generation
      const resume = generateSkeletonResume(parsed);
      const criEstimate = calculateBasicCRI(parsed);
      
      response = {
        resume,
        cri_estimate: criEstimate,
        request_id: requestId
      };
      
      // Log telemetry
      await svcClient.from('edge_invocations').insert({
        function: 'resume-draft',
        status: 'stub_fallback',
        ms: 0,
        user_id: user.id,
        payload_hash: '',
        tokens_in: 0,
        tokens_out: 0
      });
    } else {
      // Use AI for enhanced resume generation
      const startTime = Date.now();
      
      try {
        const prompt = `Generate a professional resume structure for this profile:

Target Role: ${parsed.target_role || 'General professional role'}
Experience: ${parsed.experience?.map(exp => `${exp.title} at ${exp.company || 'Company'}`).join(', ') || 'None provided'}
Skills: ${parsed.skills?.join(', ') || 'None provided'}
Education: ${parsed.education?.map(edu => `${edu.degree || 'Degree'} from ${edu.school}`).join(', ') || 'None provided'}
Projects: ${parsed.projects?.map(proj => proj.name).join(', ') || 'None provided'}

Create:
1. Professional summary (2-3 sentences)
2. Enhanced bullet points for experience/projects (quantify achievements, use action verbs)
3. Skill categorization and prioritization
4. CRI (Career Readiness Index) estimate (0-100)

Return as JSON with: { summary, enhanced_bullets: [{ section, text, skill_tags[] }], cri_estimate }`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: Deno.env.get('MODEL_RESUME') || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert resume writer and career counselor. Create compelling, ATS-friendly content that highlights achievements and quantifiable results.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 2000
          }),
        });

        const data = await openaiResponse.json();
        const latency = Date.now() - startTime;
        
        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
        }

        // Parse AI response with fallback
        let resume, criEstimate;
        try {
          const aiContent = data.choices[0].message.content;
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          const aiData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
          
          resume = {
            sections: {
              summary: aiData.summary || generateSkeletonResume(parsed).sections.summary,
              experience: parsed.experience || [],
              education: parsed.education || [],
              skills: parsed.skills || [],
              projects: parsed.projects || []
            },
            bullets: aiData.enhanced_bullets || generateSkeletonResume(parsed).bullets
          };
          
          criEstimate = aiData.cri_estimate || calculateBasicCRI(parsed);
        } catch (parseError) {
          console.error('AI response parsing error:', parseError);
          resume = generateSkeletonResume(parsed);
          criEstimate = calculateBasicCRI(parsed);
        }

        response = {
          resume,
          cri_estimate: criEstimate,
          request_id: requestId
        };

        // Log successful telemetry
        await svcClient.from('edge_invocations').insert({
          function: 'resume-draft',
          status: 'success',
          ms: latency,
          user_id: user.id,
          payload_hash: '',
          tokens_in: data.usage?.prompt_tokens || 0,
          tokens_out: data.usage?.completion_tokens || 0
        });

      } catch (openaiError) {
        console.error('OpenAI error:', openaiError);
        
        // Fallback to skeleton generation
        const resume = generateSkeletonResume(parsed);
        const criEstimate = calculateBasicCRI(parsed);
        
        response = {
          resume,
          cri_estimate: criEstimate,
          request_id: requestId
        };

        // Log error telemetry
        await svcClient.from('edge_invocations').insert({
          function: 'resume-draft',
          status: 'error',
          ms: Date.now() - startTime,
          user_id: user.id,
          payload_hash: '',
          tokens_in: 0,
          tokens_out: 0
        });
      }
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Resume draft error:', error);
    
    let errorResponse;
    if (error instanceof z.ZodError) {
      errorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request format',
          details: error.errors,
          request_id: requestId
        }
      };
    } else {
      errorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          request_id: requestId
        }
      };
    }

    return new Response(JSON.stringify(errorResponse), {
      status: error instanceof z.ZodError ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});