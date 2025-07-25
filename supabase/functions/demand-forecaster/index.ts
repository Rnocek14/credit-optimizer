import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { careerPath, location, timeHorizon = '12months' } = await req.json();

    if (!careerPath || !location) {
      return new Response(JSON.stringify({ error: 'Career path and location are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔮 Generating demand forecast for ${careerPath} in ${location} (${timeHorizon})`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get historical data for trend analysis
    const historicalData = await getHistoricalData(supabase, careerPath, location);
    
    // Generate AI-powered forecast
    const forecast = await generateAIForecast(careerPath, location, timeHorizon, historicalData);

    // Cache the forecast
    await cacheForecast(supabase, careerPath, location, timeHorizon, forecast);

    console.log('✅ Demand forecast generated successfully');

    return new Response(JSON.stringify(forecast), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Demand forecasting error:', error);
    return new Response(JSON.stringify({ 
      error: 'Demand forecasting failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getHistoricalData(supabase: any, careerPath: string, location: string) {
  try {
    // Get current market trends
    const { data: currentTrends } = await supabase
      .from('market_trends')
      .select('*')
      .eq('career_path', careerPath)
      .eq('location', location)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get historical snapshots if available
    const { data: historicalTrends } = await supabase
      .from('market_trends_history')
      .select('*')
      .eq('career_path', careerPath)
      .eq('location', location)
      .order('recorded_at', { ascending: false })
      .limit(10);

    return {
      current: currentTrends || [],
      historical: historicalTrends || []
    };
  } catch (error) {
    console.error('⚠️ Failed to fetch historical data:', error);
    return { current: [], historical: [] };
  }
}

async function generateAIForecast(careerPath: string, location: string, timeHorizon: string, historicalData: any) {
  // If OpenAI API key is available, use AI for more sophisticated forecasting
  if (openAIApiKey) {
    return await generateOpenAIForecast(careerPath, location, timeHorizon, historicalData);
  } else {
    return generateStatisticalForecast(careerPath, location, timeHorizon, historicalData);
  }
}

async function generateOpenAIForecast(careerPath: string, location: string, timeHorizon: string, historicalData: any) {
  try {
    const prompt = `
      As a market intelligence analyst, provide a demand forecast for "${careerPath}" in "${location}" over the next ${timeHorizon}.
      
      Historical Data Context:
      ${JSON.stringify(historicalData, null, 2)}
      
      Please analyze:
      1. Growth trajectory based on historical trends
      2. Market factors affecting demand (technology changes, economic conditions, industry shifts)
      3. Confidence level in the prediction
      4. Key factors that could impact the forecast
      5. Specific growth percentage prediction
      
      Respond in JSON format matching this exact structure:
      {
        "demandProjection": {
          "trend": "increasing|decreasing|stable",
          "growthRate": <percentage number>,
          "confidence": <0-100 number>
        },
        "salaryProjection": {
          "expectedChange": <percentage number>,
          "confidence": <0-100 number>
        },
        "marketFactors": ["factor1", "factor2", "factor3"],
        "riskFactors": ["risk1", "risk2", "risk3"],
        "opportunities": ["opportunity1", "opportunity2", "opportunity3"],
        "timelineEvents": [
          {"month": 1, "event": "event description", "impact": "positive|negative|neutral"}
        ],
        "recommendations": "detailed recommendations text",
        "confidence": <0-100 overall confidence>
      }
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert market analyst specializing in career demand forecasting. Provide data-driven, realistic predictions based on historical trends and market factors. Always respond with valid JSON in the exact format requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent predictions
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const forecastText = data.choices[0].message.content;
    
    try {
      const parsedForecast = JSON.parse(forecastText);
      // Validate that the response has the expected structure
      if (parsedForecast.demandProjection && parsedForecast.salaryProjection) {
        return parsedForecast;
      } else {
        console.warn('OpenAI response missing expected structure, falling back to statistical forecast');
        return generateStatisticalForecast(careerPath, location, timeHorizon, historicalData);
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      return generateStatisticalForecast(careerPath, location, timeHorizon, historicalData);
    }
  } catch (error) {
    console.error('OpenAI forecast error:', error);
    return generateStatisticalForecast(careerPath, location, timeHorizon, historicalData);
  }
}

function generateStatisticalForecast(careerPath: string, location: string, timeHorizon: string, historicalData: any) {
  // Statistical forecasting based on historical trends
  const { current, historical } = historicalData;
  
  let predictedGrowth = 10; // Default growth
  let confidenceScore = 60; // Default confidence
  
  if (current.length > 0) {
    const latestTrend = current[0];
    predictedGrowth = latestTrend.growth_rate || 10;
    
    // Adjust based on demand score
    if (latestTrend.demand_score > 90) {
      predictedGrowth *= 1.2; // Boost for high demand
    } else if (latestTrend.demand_score < 70) {
      predictedGrowth *= 0.8; // Reduce for low demand
    }
    
    confidenceScore = Math.min(90, 50 + (historical.length * 5)); // Higher confidence with more data
  }

  // Adjust for time horizon
  const horizonMultiplier = timeHorizon.includes('6') ? 0.5 : timeHorizon.includes('24') ? 2 : 1;
  predictedGrowth *= horizonMultiplier;

  // Determine trend direction
  const trend = predictedGrowth > 5 ? 'increasing' : predictedGrowth < -5 ? 'decreasing' : 'stable';

  // Generate timeline events
  const timelineEvents = [];
  const months = timeHorizon.includes('3') ? 3 : timeHorizon.includes('6') ? 6 : timeHorizon.includes('12') ? 12 : 24;
  
  for (let i = 1; i <= Math.min(months, 6); i++) {
    const impact = Math.random() > 0.5 ? 'positive' : Math.random() > 0.3 ? 'neutral' : 'negative';
    timelineEvents.push({
      month: i,
      event: `Market condition update for month ${i}`,
      impact
    });
  }

  return {
    demandProjection: {
      trend,
      growthRate: Math.round(predictedGrowth * 10) / 10,
      confidence: confidenceScore
    },
    salaryProjection: {
      expectedChange: Math.round((predictedGrowth * 0.7) * 10) / 10, // Salary growth usually lower than demand growth
      confidence: Math.max(40, confidenceScore - 10)
    },
    marketFactors: getMarketFactors(careerPath),
    riskFactors: getRiskFactors(careerPath),
    opportunities: getOpportunities(careerPath),
    timelineEvents,
    recommendations: `Based on analysis, ${careerPath} in ${location} shows ${trend} growth potential over the next ${timeHorizon}.`,
    confidence: confidenceScore
  };
}

function getMarketFactors(careerPath: string): string[] {
  const factorMap: { [key: string]: string[] } = {
    'Software Engineer': ['AI/ML adoption', 'Digital transformation', 'Cloud migration', 'Remote work trends'],
    'Data Scientist': ['Big data growth', 'AI/ML investment', 'Data-driven decision making', 'Privacy regulations'],
    'Cybersecurity Analyst': ['Increasing cyber threats', 'Remote work security', 'Compliance requirements', 'Digital transformation'],
    'UX Designer': ['Digital product focus', 'User experience importance', 'Mobile-first design', 'Accessibility requirements'],
    'DevOps Engineer': ['Cloud adoption', 'Continuous deployment', 'Infrastructure automation', 'Microservices architecture']
  };

  return factorMap[careerPath] || ['Market dynamics', 'Economic conditions', 'Technology trends', 'Industry evolution'];
}

function getRiskFactors(careerPath: string): string[] {
  const riskMap: { [key: string]: string[] } = {
    'Software Engineer': ['AI automation', 'Market saturation', 'Skill obsolescence'],
    'Data Scientist': ['Tool democratization', 'AutoML advancement', 'Over-hyped expectations'],
    'Cybersecurity Analyst': ['Automated security tools', 'Skills gap', 'Regulatory changes'],
    'UX Designer': ['Design system maturity', 'No-code tools', 'Economic downturns'],
    'DevOps Engineer': ['Platform abstraction', 'Tool consolidation', 'Cloud provider lock-in']
  };

  return riskMap[careerPath] || ['Economic uncertainty', 'Technology disruption', 'Market competition'];
}

function getOpportunities(careerPath: string): string[] {
  const opportunityMap: { [key: string]: string[] } = {
    'Software Engineer': ['AI/ML specialization', 'Cloud expertise', 'Full-stack development'],
    'Data Scientist': ['MLOps focus', 'Domain expertise', 'Real-time analytics'],
    'Cybersecurity Analyst': ['Cloud security', 'Zero-trust architecture', 'Compliance expertise'],
    'UX Designer': ['Voice interfaces', 'AR/VR design', 'Accessibility specialization'],
    'DevOps Engineer': ['Site reliability engineering', 'Kubernetes expertise', 'Security automation']
  };

  return opportunityMap[careerPath] || ['Skill specialization', 'Cross-functional expertise', 'Leadership development'];
}

async function cacheForecast(supabase: any, careerPath: string, location: string, timeHorizon: string, forecast: any) {
  try {
    const cacheKey = `forecast_${careerPath}_${location}_${timeHorizon}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours

    await supabase.from('ai_operation_cache').upsert({
      input_hash: cacheKey,
      operation_type: 'demand_forecast',
      result_data: forecast,
      expires_at: expiresAt.toISOString(),
      confidence_score: forecast.confidence_score / 100
    }, {
      onConflict: 'input_hash,operation_type'
    });

    console.log(`✅ Cached forecast for ${careerPath} in ${location}`);
  } catch (error) {
    console.error('⚠️ Failed to cache forecast:', error);
  }
}