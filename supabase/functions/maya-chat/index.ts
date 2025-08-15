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
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })),
  tools: z.object({
    plan: z.boolean().optional(),
    next_step: z.boolean().optional(),
    summarize_progress: z.boolean().optional()
  }).optional(),
  context: z.object({
    user_goal: z.string().optional(),
    skills: z.array(z.string()).optional(),
    completed_nodes: z.array(z.string()).optional(),
    location: z.string().optional()
  }).optional()
});

const ResponseSchema = z.object({
  reply: z.string(),
  tools: z.object({
    plan: z.any().optional(),
    next_step: z.object({
      step: z.string(),
      rationale: z.string()
    }).optional(),
    summarize_progress: z.object({
      summary: z.string(),
      gaps: z.array(z.string())
    }).optional()
  }).optional(),
  usage: z.object({
    tokens_in: z.number().optional(),
    tokens_out: z.number().optional()
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

    // Rate limiting check
    const { data: recentCalls } = await svcClient
      .from('edge_invocations')
      .select('id')
      .eq('function', 'maya-chat')
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

    // Check for OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    let response;
    
    if (!openaiKey) {
      // Soft-fail with stub response
      response = {
        reply: "I'm Maya, your AI career assistant! I can help you plan your learning journey, suggest next steps, and summarize your progress. However, I'm currently running in demo mode - some advanced features may be limited.",
        usage: { tokens_in: 0, tokens_out: 0 },
        request_id: requestId
      };
      
      // Log telemetry
      await svcClient.from('edge_invocations').insert({
        function: 'maya-chat',
        status: 'stub_fallback',
        ms: 0,
        user_id: user.id,
        payload_hash: '',
        tokens_in: 0,
        tokens_out: 0
      });
    } else {
      // Call OpenAI
      const startTime = Date.now();
      
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: Deno.env.get('MODEL_MAYA') || 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: `You are Maya, an expert career guidance AI assistant for the Life Path platform. 
                Help users plan their career journeys, suggest learning paths, and provide actionable next steps.
                Keep responses practical, encouraging, and focused on career development.
                ${parsed.context ? `User context: ${JSON.stringify(parsed.context)}` : ''}`
              },
              ...parsed.messages
            ],
            max_tokens: 1000
          }),
        });

        const data = await openaiResponse.json();
        const latency = Date.now() - startTime;
        
        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
        }

        response = {
          reply: data.choices[0].message.content,
          usage: {
            tokens_in: data.usage?.prompt_tokens || 0,
            tokens_out: data.usage?.completion_tokens || 0
          },
          request_id: requestId
        };

        // Log successful telemetry
        await svcClient.from('edge_invocations').insert({
          function: 'maya-chat',
          status: 'success',
          ms: latency,
          user_id: user.id,
          payload_hash: '',
          tokens_in: data.usage?.prompt_tokens || 0,
          tokens_out: data.usage?.completion_tokens || 0
        });

      } catch (openaiError) {
        console.error('OpenAI error:', openaiError);
        
        // Soft-fail with helpful response
        response = {
          reply: "I'm having trouble connecting to my AI engine right now. Let me help you with some general career guidance: Consider breaking down your goals into smaller, actionable steps. What specific skill would you like to develop first?",
          usage: { tokens_in: 0, tokens_out: 0 },
          request_id: requestId
        };

        // Log error telemetry
        await svcClient.from('edge_invocations').insert({
          function: 'maya-chat',
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
    console.error('Maya chat error:', error);
    
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