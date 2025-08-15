import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema definitions
const RequestSchema = z.object({
  goal: z.string(),
  skills: z.array(z.string()).optional(),
  history: z.object({
    completed_skills: z.array(z.string()).optional(),
    completed_courses: z.array(z.string()).optional()
  }).optional()
});

const RoadmapStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  cri_delta: z.number(),
  dependencies: z.array(z.string()).optional(),
  est_hours: z.number().optional()
});

const ResponseSchema = z.object({
  steps: z.array(RoadmapStepSchema),
  meta: z.object({
    total_cri_delta: z.number()
  }),
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
      .eq('function', 'roadmap-generate')
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

    // Check for OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    let response;
    
    if (!openaiKey) {
      // Soft-fail with heuristic roadmap
      const fallbackSteps = [
        {
          id: crypto.randomUUID(),
          title: "Foundation Skills Assessment",
          description: "Evaluate current knowledge and identify skill gaps for " + parsed.goal,
          cri_delta: 15,
          est_hours: 8
        },
        {
          id: crypto.randomUUID(),
          title: "Core Learning Path",
          description: "Build fundamental skills required for " + parsed.goal,
          cri_delta: 25,
          dependencies: [],
          est_hours: 40
        },
        {
          id: crypto.randomUUID(),
          title: "Practical Application",
          description: "Apply knowledge through projects and real-world scenarios",
          cri_delta: 20,
          est_hours: 60
        }
      ];

      response = {
        steps: fallbackSteps,
        meta: { total_cri_delta: 60 },
        request_id: requestId
      };
      
      // Log telemetry
      await svcClient.from('edge_invocations').insert({
        function: 'roadmap-generate',
        status: 'stub_fallback',
        ms: 0,
        user_id: user.id,
        payload_hash: '',
        tokens_in: 0,
        tokens_out: 0
      });
    } else {
      // Call OpenAI for roadmap generation
      const startTime = Date.now();
      
      try {
        const prompt = `Generate a learning roadmap for this goal: "${parsed.goal}"
        
Current skills: ${parsed.skills?.join(', ') || 'None specified'}
Completed: ${parsed.history?.completed_skills?.join(', ') || 'None'}

Create 3-5 learning steps with:
- Clear titles and descriptions
- CRI (Career Readiness Index) delta (0-50 points per step)
- Estimated hours
- Dependencies between steps

Return as JSON array of steps with: id, title, description, cri_delta, dependencies[], est_hours`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: Deno.env.get('MODEL_PLAN') || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert career planning AI. Generate practical, actionable learning roadmaps.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 1500
          }),
        });

        const data = await openaiResponse.json();
        const latency = Date.now() - startTime;
        
        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
        }

        // Parse AI response (with fallback)
        let steps;
        try {
          const aiContent = data.choices[0].message.content;
          const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
          steps = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
          
          // Ensure each step has required fields
          steps = steps.map((step: any, index: number) => ({
            id: step.id || crypto.randomUUID(),
            title: step.title || `Learning Step ${index + 1}`,
            description: step.description || '',
            cri_delta: Math.max(0, Math.min(50, step.cri_delta || 15)),
            dependencies: step.dependencies || [],
            est_hours: step.est_hours || 20
          }));
        } catch (parseError) {
          console.error('AI response parsing error:', parseError);
          // Use fallback steps
          steps = [
            {
              id: crypto.randomUUID(),
              title: "Foundation Skills",
              description: "Build core competencies for " + parsed.goal,
              cri_delta: 20,
              est_hours: 30
            }
          ];
        }

        const totalCriDelta = steps.reduce((sum: number, step: any) => sum + step.cri_delta, 0);

        response = {
          steps,
          meta: { total_cri_delta: totalCriDelta },
          request_id: requestId
        };

        // Log successful telemetry
        await svcClient.from('edge_invocations').insert({
          function: 'roadmap-generate',
          status: 'success',
          ms: latency,
          user_id: user.id,
          payload_hash: '',
          tokens_in: data.usage?.prompt_tokens || 0,
          tokens_out: data.usage?.completion_tokens || 0
        });

      } catch (openaiError) {
        console.error('OpenAI error:', openaiError);
        
        // Soft-fail with template roadmap
        const fallbackSteps = [
          {
            id: crypto.randomUUID(),
            title: "Get Started with " + parsed.goal,
            description: "Begin your learning journey with foundational concepts",
            cri_delta: 15,
            est_hours: 25
          }
        ];

        response = {
          steps: fallbackSteps,
          meta: { total_cri_delta: 15 },
          request_id: requestId
        };

        // Log error telemetry
        await svcClient.from('edge_invocations').insert({
          function: 'roadmap-generate',
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
    console.error('Roadmap generate error:', error);
    
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