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
  role: z.string(),
  location: z.string().optional()
});

const TrendPointSchema = z.object({
  date: z.string(),
  median: z.number()
});

const DemandPointSchema = z.object({
  date: z.string(),
  index: z.number()
});

const ResponseSchema = z.object({
  salary_trend: z.array(TrendPointSchema),
  demand_trend: z.array(DemandPointSchema),
  insights: z.array(z.string()),
  source: z.enum(['external', 'stub']),
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

    // Rate limiting check (200/day for read operations)
    const { data: recentCalls } = await svcClient
      .from('edge_invocations')
      .select('id')
      .eq('function', 'market-forecast')
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

    // Generate stub data (baseline/realistic trends)
    const generateStubForecast = (role: string, location?: string) => {
      const now = new Date();
      const salaryTrend = [];
      const demandTrend = [];
      
      // Baseline salary estimates by role (in thousands)
      const roleSalaries: Record<string, number> = {
        'software engineer': 95,
        'data scientist': 110,
        'product manager': 115,
        'designer': 75,
        'marketing manager': 80,
        'sales manager': 85,
        'project manager': 85,
        'default': 70
      };
      
      const baselineSalary = roleSalaries[role.toLowerCase()] || roleSalaries.default;
      
      // Location multipliers
      const locationMultipliers: Record<string, number> = {
        'san francisco': 1.4,
        'new york': 1.3,
        'seattle': 1.25,
        'austin': 1.1,
        'chicago': 1.05,
        'denver': 1.0,
        'atlanta': 0.95,
        'phoenix': 0.9,
        'default': 1.0
      };
      
      const locationMultiplier = location ? 
        (locationMultipliers[location.toLowerCase()] || locationMultipliers.default) : 1.0;
      
      const adjustedSalary = baselineSalary * locationMultiplier;
      
      // Generate 12 months of historical + 12 months forecast
      for (let i = -12; i <= 12; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Salary trend (slight upward trend with seasonal variation)
        const trend = 1 + (i * 0.005); // 0.5% growth per month
        const seasonality = 1 + Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 0.02; // 2% seasonal variation
        const noise = 1 + (Math.random() - 0.5) * 0.05; // 5% random variation
        
        salaryTrend.push({
          date: dateStr,
          median: Math.round(adjustedSalary * trend * seasonality * noise)
        });
        
        // Demand index (0-100 scale, 50 = average)
        const demandBase = role.toLowerCase().includes('software') || role.toLowerCase().includes('data') ? 70 : 50;
        const demandTrendFactor = 1 + (i * 0.01); // 1% demand growth per month
        const demandNoise = (Math.random() - 0.5) * 10; // ±5 point variation
        
        demandTrend.push({
          date: dateStr,
          index: Math.max(0, Math.min(100, Math.round(demandBase * demandTrendFactor + demandNoise)))
        });
      }
      
      // Generate insights
      const insights = [
        `${role} roles show ${adjustedSalary > baselineSalary ? 'premium' : 'competitive'} compensation in ${location || 'this market'}`,
        `Demand trend indicates ${demandTrend[demandTrend.length - 1].index > demandTrend[0].index ? 'growing' : 'stable'} market conditions`,
        `Salary growth projected at ~6% annually for ${role} positions`,
        location ? `${location} offers ${Math.round((locationMultiplier - 1) * 100)}% salary adjustment vs. national average` : 'Remote opportunities may vary by company location'
      ];
      
      return {
        salary_trend: salaryTrend,
        demand_trend: demandTrend,
        insights,
        source: 'stub' as const
      };
    };

    // For now, always use stub data (external API integration to be added later)
    const forecastData = generateStubForecast(parsed.role, parsed.location);
    
    const response = {
      ...forecastData,
      request_id: requestId
    };

    // Log telemetry
    await svcClient.from('edge_invocations').insert({
      function: 'market-forecast',
      status: 'success',
      ms: 0, // stub response is instant
      user_id: user.id,
      payload_hash: '',
      tokens_in: 0,
      tokens_out: 0
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Market forecast error:', error);
    
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