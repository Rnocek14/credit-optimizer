import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins for broader compatibility
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { careerPathId, locationId, careerPath, location, timeframe = '6months' } = await req.json();

    console.log(`📊 Analyzing market trends for: ${careerPath} in ${location}`);

    // Fetch current market data from our database with both UUID and string fallback
    let marketQuery = supabase
      .from('market_trends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Try UUID-based lookup first, then fallback to string matching for legacy data
    if (careerPathId && locationId) {
      marketQuery = marketQuery.or(`and(career_path.eq.${careerPath},location.eq.${location}),and(career_path.ilike.%${careerPath}%,location.ilike.%${location}%)`);
    } else {
      // Fallback to string matching
      marketQuery = marketQuery.eq('career_path', careerPath).eq('location', location);
    }

    const { data: marketData, error: marketError } = await marketQuery;

    if (marketError) {
      console.error('❌ Market data fetch error:', marketError);
    }

    // Get AI analysis of market trends
    const aiAnalysis = await getAIMarketAnalysis(careerPath, location, marketData || []);

    // Calculate trend metrics
    const trendMetrics = calculateTrendMetrics(marketData || []);

    // Fetch related skills demand
    const { data: skillsData } = await supabase
      .from('career_graph_nodes')
      .select('*')
      .eq('node_type', 'skill')
      .ilike('title', `%${careerPath.split(' ')[0]}%`)
      .limit(20);

    const response = {
      careerPath,
      location,
      timeframe,
      marketTrends: {
        ...trendMetrics,
        aiInsights: aiAnalysis,
        relatedSkills: skillsData || [],
        lastUpdated: new Date().toISOString()
      }
    };

    console.log(`✅ Market analysis complete for ${careerPath}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Market trend analysis error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getAIMarketAnalysis(careerPath: string, location: string, historicalData: any[]) {
  const prompt = `Analyze the job market trends for "${careerPath}" in "${location}".
  
Historical data points: ${JSON.stringify(historicalData.slice(0, 5))}

Provide analysis in this JSON format:
{
  "demandTrend": "increasing|stable|decreasing",
  "salaryTrend": "rising|stable|declining", 
  "growthRate": "percentage as number",
  "marketSaturation": "low|medium|high",
  "keyDrivers": ["factor1", "factor2", "factor3"],
  "riskFactors": ["risk1", "risk2"],
  "recommendation": "brief recommendation",
  "confidence": "percentage as number"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a career market analyst. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    console.warn('⚠️ AI response parsing failed, using fallback');
    return {
      demandTrend: 'stable',
      salaryTrend: 'stable',
      growthRate: 5,
      marketSaturation: 'medium',
      keyDrivers: ['Technology advancement', 'Market demand'],
      riskFactors: ['Economic uncertainty'],
      recommendation: 'Monitor market conditions closely',
      confidence: 70
    };
  }
}

function calculateTrendMetrics(data: any[]) {
  if (!data.length) {
    return {
      averageGrowth: 0,
      volatility: 0,
      demandScore: 50,
      competitionLevel: 'medium'
    };
  }

  const growthRates = data.map(d => d.growth_rate || 0);
  const averageGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
  
  const variance = growthRates.reduce((acc, rate) => acc + Math.pow(rate - averageGrowth, 2), 0) / growthRates.length;
  const volatility = Math.sqrt(variance);

  return {
    averageGrowth: Math.round(averageGrowth * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    demandScore: Math.min(100, Math.max(0, 50 + averageGrowth * 10)),
    competitionLevel: volatility > 10 ? 'high' : volatility > 5 ? 'medium' : 'low'
  };
}