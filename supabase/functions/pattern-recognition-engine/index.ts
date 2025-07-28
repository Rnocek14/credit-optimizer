import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PatternAnalysisRequest {
  careerPath: string;
  location: string;
  timeframe?: string;
  analysisTypes?: string[];
}

interface SeasonalPattern {
  type: 'seasonal';
  season: string;
  averageChange: number;
  confidence: number;
  months: number[];
}

interface TrendPattern {
  type: 'trend';
  direction: 'up' | 'down' | 'stable';
  strength: number;
  duration: string;
  confidence: number;
}

interface VolatilityPattern {
  type: 'volatility';
  level: 'low' | 'medium' | 'high';
  coefficient: number;
  confidence: number;
}

interface AnomalyDetection {
  type: 'anomaly';
  anomalyType: 'spike' | 'drop' | 'trend_break' | 'volatility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
  detectedAt: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let { careerPath, location, timeframe = '90d', analysisTypes = ['seasonal', 'trend', 'volatility', 'anomaly'] }: PatternAnalysisRequest = await req.json();

    console.log("📥 Input Parameters:", JSON.stringify({ careerPath, location, timeframe, analysisTypes }));

    const cutoffDate = new Date(Date.now() - parseDuration(timeframe));
    console.log("⏱️ Calculated Cutoff Date:", cutoffDate.toISOString());

    console.log(`Analyzing patterns for ${careerPath} in ${location} over ${timeframe}`);

    // Check for existing recent analysis (within last 24 hours)
    const { data: existingAnalysis } = await supabase
      .from('pattern_recognition_results')
      .select('detected_at')
      .eq('career_path', careerPath)
      .eq('location', location)
      .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existingAnalysis && existingAnalysis.length > 0) {
      console.log('⏰ Recent analysis found, skipping to prevent duplicates');
      return new Response(JSON.stringify({
        success: false,
        message: 'Pattern analysis was already run recently. Please wait 24 hours before running again.',
        patterns: [],
        anomalies: [],
        lastAnalysis: existingAnalysis[0].detected_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch historical market data with case-insensitive matching
    const { data: marketData, error: marketError } = await supabase
      .from('market_trends_history')
      .select('*')
      .ilike('career_path', careerPath)
      .ilike('location', location)
      .gte('recorded_at', cutoffDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (marketError) {
      console.error('Error fetching market data:', marketError);
      throw marketError;
    }

    console.log("📊 Fetched Records Count:", marketData?.length || 0);
    console.log("🕒 Timestamps:", marketData?.map(d => d.recorded_at) || []);
    
    // Temporarily disabled for testing - bypass early exit
    // if (!marketData || marketData.length < 5) {
    //   console.log('Insufficient data for pattern analysis');
    //   return new Response(JSON.stringify({
    //     success: false,
    //     message: 'Insufficient historical data for pattern analysis',
    //     patterns: [],
    //     anomalies: []
    //   }), {
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //   });
    // }

    if (!marketData || marketData.length === 0) {
      console.log('❌ No data found for analysis');
      return new Response(JSON.stringify({
        success: false,
        message: 'No historical data found for pattern analysis',
        patterns: [],
        anomalies: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const patterns: Array<SeasonalPattern | TrendPattern | VolatilityPattern> = [];
    const anomalies: AnomalyDetection[] = [];

    // Seasonal Analysis
    if (analysisTypes.includes('seasonal')) {
      const seasonalPattern = analyzeSeasonalPatterns(marketData);
      console.log("🌸 Seasonal Pattern Result:", seasonalPattern);
      if (seasonalPattern) patterns.push(seasonalPattern);
    }

    // Trend Analysis
    if (analysisTypes.includes('trend')) {
      const trendPattern = analyzeTrends(marketData);
      console.log("📈 Trend Analysis Result:", trendPattern);
      if (trendPattern) patterns.push(trendPattern);
    }

    // Volatility Analysis
    if (analysisTypes.includes('volatility')) {
      const volatilityPattern = analyzeVolatility(marketData);
      console.log("📊 Volatility Pattern Result:", volatilityPattern);
      if (volatilityPattern) patterns.push(volatilityPattern);
    }

    // Anomaly Detection
    if (analysisTypes.includes('anomaly')) {
      const detectedAnomalies = detectAnomalies(marketData);
      console.log("⚠️ Anomalies Found:", detectedAnomalies);
      anomalies.push(...detectedAnomalies);
    }

    console.log("🎯 Final Results Summary:");
    console.log("  - Patterns Found:", patterns.length);
    console.log("  - Anomalies Found:", anomalies.length);

    // Store results in database
    await storePatternResults(supabase, careerPath, location, patterns);
    await storeAnomalyResults(supabase, careerPath, location, anomalies);

    // Calculate market correlations with other career paths
    const correlations = await calculateMarketCorrelations(supabase, careerPath, location);

    return new Response(JSON.stringify({
      success: true,
      careerPath,
      location,
      timeframe,
      patterns,
      anomalies,
      correlations,
      analysisCompletedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in pattern recognition engine:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseDuration(duration: string): number {
  const value = parseInt(duration);
  const unit = duration.slice(-1);
  
  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    case 'm': return value * 30 * 24 * 60 * 60 * 1000;
    case 'y': return value * 365 * 24 * 60 * 60 * 1000;
    default: return 90 * 24 * 60 * 60 * 1000; // Default 90 days
  }
}

function analyzeSeasonalPatterns(data: any[]): SeasonalPattern | null {
  if (data.length < 12) return null; // Need at least 12 data points

  const monthlyData: { [key: number]: number[] } = {};
  
  data.forEach(point => {
    const month = new Date(point.recorded_at).getMonth();
    if (!monthlyData[month]) monthlyData[month] = [];
    monthlyData[month].push(point.demand_score || 0);
  });

  // Calculate monthly averages
  const monthlyAverages: { [key: number]: number } = {};
  Object.entries(monthlyData).forEach(([month, values]) => {
    monthlyAverages[parseInt(month)] = values.reduce((a, b) => a + b, 0) / values.length;
  });

  // Find the season with highest average
  const seasons = {
    winter: [11, 0, 1], // Dec, Jan, Feb
    spring: [2, 3, 4],  // Mar, Apr, May
    summer: [5, 6, 7],  // Jun, Jul, Aug
    autumn: [8, 9, 10]  // Sep, Oct, Nov
  };

  let bestSeason = '';
  let highestAverage = 0;
  
  Object.entries(seasons).forEach(([season, months]) => {
    const seasonAverage = months
      .filter(month => monthlyAverages[month])
      .reduce((sum, month) => sum + monthlyAverages[month], 0) / months.filter(month => monthlyAverages[month]).length;
    
    if (seasonAverage > highestAverage) {
      highestAverage = seasonAverage;
      bestSeason = season;
    }
  });

  const overallAverage = Object.values(monthlyAverages).reduce((a, b) => a + b, 0) / Object.values(monthlyAverages).length;
  const seasonalChange = ((highestAverage - overallAverage) / overallAverage) * 100;

  if (Math.abs(seasonalChange) < 5) return null; // No significant seasonal pattern

  return {
    type: 'seasonal',
    season: bestSeason,
    averageChange: seasonalChange,
    confidence: Math.min(Math.abs(seasonalChange) / 20, 1), // Higher change = higher confidence
    months: seasons[bestSeason as keyof typeof seasons]
  };
}

function analyzeTrends(data: any[]): TrendPattern | null {
  if (data.length < 5) return null;

  const values = data.map(d => d.demand_score || 0);
  const n = values.length;
  
  // Calculate linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const rSquared = calculateRSquared(values, slope);
  
  let direction: 'up' | 'down' | 'stable';
  if (Math.abs(slope) < 0.1) direction = 'stable';
  else direction = slope > 0 ? 'up' : 'down';
  
  return {
    type: 'trend',
    direction,
    strength: Math.abs(slope),
    duration: `${Math.round((data.length * 7) / 30)}m`, // Approximate months
    confidence: rSquared
  };
}

function analyzeVolatility(data: any[]): VolatilityPattern | null {
  if (data.length < 3) return null;

  const values = data.map(d => d.demand_score || 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  
  const coefficientOfVariation = standardDeviation / mean;
  
  let level: 'low' | 'medium' | 'high';
  if (coefficientOfVariation < 0.1) level = 'low';
  else if (coefficientOfVariation < 0.3) level = 'medium';
  else level = 'high';
  
  return {
    type: 'volatility',
    level,
    coefficient: coefficientOfVariation,
    confidence: 0.8 // High confidence in volatility calculations
  };
}

function detectAnomalies(data: any[]): AnomalyDetection[] {
  if (data.length < 5) return [];

  const anomalies: AnomalyDetection[] = [];
  const values = data.map(d => d.demand_score || 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const standardDeviation = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
  
  data.forEach((point, index) => {
    const value = point.demand_score || 0;
    const zScore = Math.abs((value - mean) / standardDeviation);
    
    if (zScore > 2) { // Outlier detection
      let severity: 'low' | 'medium' | 'high' | 'critical';
      let anomalyType: 'spike' | 'drop' | 'trend_break' | 'volatility';
      
      if (zScore > 3) severity = 'critical';
      else if (zScore > 2.5) severity = 'high';
      else if (zScore > 2) severity = 'medium';
      else severity = 'low';
      
      anomalyType = value > mean ? 'spike' : 'drop';
      
      anomalies.push({
        type: 'anomaly',
        anomalyType,
        severity,
        score: zScore,
        description: `${anomalyType === 'spike' ? 'Unusual increase' : 'Unusual decrease'} in demand (${zScore.toFixed(2)} standard deviations from mean)`,
        detectedAt: point.recorded_at
      });
    }
  });
  
  return anomalies;
}

function calculateRSquared(values: number[], slope: number): number {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  
  let ssTotal = 0, ssResidual = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + (mean - slope * (n - 1) / 2);
    ssTotal += Math.pow(values[i] - mean, 2);
    ssResidual += Math.pow(values[i] - predicted, 2);
  }
  
  return 1 - (ssResidual / ssTotal);
}

async function storePatternResults(supabase: any, careerPath: string, location: string, patterns: any[]) {
  for (const pattern of patterns) {
    // Use upsert to prevent duplicates
    await supabase
      .from('pattern_recognition_results')
      .upsert({
        career_path: careerPath,
        location,
        pattern_type: pattern.type,
        pattern_data: pattern,
        confidence_score: pattern.confidence || 0.8,
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Valid for 7 days
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'career_path,location,pattern_type'
      });
  }
}

async function storeAnomalyResults(supabase: any, careerPath: string, location: string, anomalies: AnomalyDetection[]) {
  for (const anomaly of anomalies) {
    await supabase
      .from('anomaly_detections')
      .insert({
        career_path: careerPath,
        location,
        anomaly_type: anomaly.anomalyType,
        severity: anomaly.severity,
        anomaly_score: anomaly.score,
        detected_at: anomaly.detectedAt,
        metadata: {
          description: anomaly.description,
          analysisType: 'statistical'
        }
      });
  }
}

async function calculateMarketCorrelations(supabase: any, careerPath: string, location: string) {
  // Get market data for current career path
  const { data: currentData } = await supabase
    .from('market_trends_history')
    .select('demand_score, recorded_at')
    .eq('career_path', careerPath)
    .eq('location', location)
    .order('recorded_at', { ascending: true })
    .limit(30);

  if (!currentData || currentData.length < 10) return [];

  // Get data for other career paths in the same location
  const { data: otherCareers } = await supabase
    .from('market_trends_history')
    .select('career_path, demand_score, recorded_at')
    .eq('location', location)
    .neq('career_path', careerPath)
    .order('recorded_at', { ascending: true });

  if (!otherCareers) return [];

  const correlations: any[] = [];
  const uniqueCareers = [...new Set(otherCareers.map(d => d.career_path))];

  for (const otherCareer of uniqueCareers) {
    const otherCareerData = otherCareers
      .filter(d => d.career_path === otherCareer)
      .slice(-30); // Last 30 data points

    if (otherCareerData.length < 10) continue;

    const correlation = calculateCorrelation(
      currentData.map(d => d.demand_score || 0),
      otherCareerData.map(d => d.demand_score || 0)
    );

    if (Math.abs(correlation) > 0.3) { // Only store significant correlations
      const correlationType = correlation > 0 ? 'positive' : 'negative';
      const strength = Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.5 ? 'moderate' : 'weak';

      correlations.push({
        career_path_a: careerPath,
        career_path_b: otherCareer,
        location,
        correlation_coefficient: correlation,
        correlation_type: correlationType,
        strength,
        time_period: '30d'
      });

      // Store in database
      await supabase
        .from('market_correlations')
        .upsert({
          career_path_a: careerPath,
          career_path_b: otherCareer,
          location,
          correlation_coefficient: correlation,
          correlation_type: correlationType,
          strength,
          time_period: '30d'
        }, {
          onConflict: 'career_path_a,career_path_b,location,time_period'
        });
    }
  }

  return correlations;
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    sumSqX += diffX * diffX;
    sumSqY += diffY * diffY;
  }

  const denominator = Math.sqrt(sumSqX * sumSqY);
  return denominator === 0 ? 0 : numerator / denominator;
}