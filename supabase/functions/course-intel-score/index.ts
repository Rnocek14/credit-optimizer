import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema definitions
const CourseInputSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  platform: z.string().optional(),
  instructor: z.string().optional(),
  duration_hours: z.number().optional(),
  rating: z.number().optional(),
  enrollments: z.number().optional(),
  outcomes: z.array(z.string()).optional()
});

const RequestSchema = z.object({
  courses: z.array(CourseInputSchema)
});

const CourseScoreSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  cri: z.number(),
  difficulty: z.number(),
  instructor_score: z.number(),
  outcomes_tags: z.array(z.string()),
  rationale: z.string().optional()
});

const ResponseSchema = z.object({
  scores: z.array(CourseScoreSchema),
  calibrated: z.boolean(),
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

    // Rate limiting check (200/day for read-heavy operations)
    const { data: recentCalls } = await svcClient
      .from('edge_invocations')
      .select('id')
      .eq('function', 'course-intel-score')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentCalls && recentCalls.length >= 200) {
      return new Response(JSON.stringify({ 
        error: { 
          code: 'RATE_LIMITED', 
          message: 'Daily rate limit exceeded (200 calls/day)',
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

    // Deterministic scoring function (fallback and when AI unavailable)
    const calculateDeterministicScores = (courses: any[]) => {
      return courses.map(course => {
        // CRI calculation based on available signals
        let cri = 50; // baseline
        if (course.rating) cri += (course.rating - 3) * 10; // rating boost/penalty
        if (course.enrollments) cri += Math.min(20, Math.log10(course.enrollments) * 5); // enrollment signal
        if (course.outcomes?.length) cri += course.outcomes.length * 3; // outcome signal
        if (course.duration_hours) {
          if (course.duration_hours > 40) cri += 15; // comprehensive courses
          else if (course.duration_hours < 5) cri -= 10; // too short
        }
        
        // Difficulty (1-10 scale)
        let difficulty = 5; // medium default
        if (course.duration_hours) {
          if (course.duration_hours > 80) difficulty = 8;
          else if (course.duration_hours > 40) difficulty = 6;
          else if (course.duration_hours < 10) difficulty = 3;
        }
        if (course.title.toLowerCase().includes('advanced')) difficulty += 2;
        if (course.title.toLowerCase().includes('beginner')) difficulty = Math.max(1, difficulty - 2);
        
        // Instructor score (1-10 scale)
        let instructorScore = course.rating ? Math.min(10, course.rating * 2) : 6;
        
        // Outcome tags from title/description parsing
        const outcomeTags = [];
        if (course.title.toLowerCase().includes('certification')) outcomeTags.push('certification');
        if (course.title.toLowerCase().includes('project')) outcomeTags.push('hands-on');
        if (course.outcomes?.some((o: string) => o.includes('job'))) outcomeTags.push('career-focused');
        
        return {
          id: course.id,
          title: course.title,
          cri: Math.max(0, Math.min(100, Math.round(cri))),
          difficulty: Math.max(1, Math.min(10, difficulty)),
          instructor_score: Math.max(1, Math.min(10, instructorScore)),
          outcomes_tags: outcomeTags,
          rationale: `Scored based on rating (${course.rating || 'N/A'}), duration (${course.duration_hours || 'N/A'}h), enrollments (${course.enrollments || 'N/A'})`
        };
      });
    };

    // Check for OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    let response;
    
    if (!openaiKey) {
      // Use deterministic scoring
      const scores = calculateDeterministicScores(parsed.courses);
      
      response = {
        scores,
        calibrated: false,
        request_id: requestId
      };
      
      // Log telemetry
      await svcClient.from('edge_invocations').insert({
        function: 'course-intel-score',
        status: 'stub_fallback',
        ms: 0,
        user_id: user.id,
        payload_hash: '',
        tokens_in: 0,
        tokens_out: 0
      });
    } else {
      // Use AI for enhanced scoring
      const startTime = Date.now();
      
      try {
        const prompt = `Analyze and score these courses for career readiness impact:

${parsed.courses.map((c, i) => `${i+1}. ${c.title}
   Platform: ${c.platform || 'Unknown'}
   Instructor: ${c.instructor || 'Unknown'} 
   Duration: ${c.duration_hours || 'Unknown'} hours
   Rating: ${c.rating || 'Unknown'}
   Enrollments: ${c.enrollments || 'Unknown'}
   Outcomes: ${c.outcomes?.join(', ') || 'None listed'}`).join('\n\n')}

For each course, provide scores (0-100 CRI, 1-10 difficulty, 1-10 instructor) and outcome tags.
Return JSON array with: title, cri, difficulty, instructor_score, outcomes_tags[], rationale`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert at evaluating educational content for career readiness and professional development impact.' },
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

        // Parse AI response with fallback to deterministic
        let scores;
        try {
          const aiContent = data.choices[0].message.content;
          const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
          const aiScores = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
          
          // Validate and normalize AI scores
          scores = aiScores.map((score: any, index: number) => ({
            id: parsed.courses[index]?.id,
            title: score.title || parsed.courses[index]?.title || 'Unknown Course',
            cri: Math.max(0, Math.min(100, score.cri || 50)),
            difficulty: Math.max(1, Math.min(10, score.difficulty || 5)),
            instructor_score: Math.max(1, Math.min(10, score.instructor_score || 6)),
            outcomes_tags: Array.isArray(score.outcomes_tags) ? score.outcomes_tags : [],
            rationale: score.rationale || 'AI-generated scoring'
          }));
        } catch (parseError) {
          console.error('AI response parsing error:', parseError);
          scores = calculateDeterministicScores(parsed.courses);
        }

        response = {
          scores,
          calibrated: true,
          request_id: requestId
        };

        // Log successful telemetry
        await svcClient.from('edge_invocations').insert({
          function: 'course-intel-score',
          status: 'success',
          ms: latency,
          user_id: user.id,
          payload_hash: '',
          tokens_in: data.usage?.prompt_tokens || 0,
          tokens_out: data.usage?.completion_tokens || 0
        });

      } catch (openaiError) {
        console.error('OpenAI error:', openaiError);
        
        // Fallback to deterministic scoring
        const scores = calculateDeterministicScores(parsed.courses);
        
        response = {
          scores,
          calibrated: false,
          request_id: requestId
        };

        // Log error telemetry
        await svcClient.from('edge_invocations').insert({
          function: 'course-intel-score',
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
    console.error('Course intel score error:', error);
    
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