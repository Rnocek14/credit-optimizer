import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertConfiguration {
  id: string;
  user_id: string;
  name: string;
  alert_type: string;
  career_path: string;
  location: string;
  metric_type: string;
  threshold_value: number;
  comparison_operator: string;
  time_window: string;
  pattern_config: any;
  is_active: boolean;
}

interface MarketDataPoint {
  career_path: string;
  location: string;
  average_salary: number;
  demand_score: number;
  growth_rate: number;
  job_postings_count: number;
  competition_level: string;
  created_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, userId, alertConfigId } = await req.json();

    switch (action) {
      case 'process_alerts':
        return await processAlerts(supabaseClient);
      
      case 'check_user_alerts':
        return await checkUserAlerts(supabaseClient, userId);
      
      case 'evaluate_alert':
        const evalResult = await evaluateAlert(supabaseClient, alertConfigId);
        return new Response(
          JSON.stringify(evalResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      case 'generate_insights':
        return await generateInsights(supabaseClient, userId);
      
      default:
        throw new Error('Invalid action specified');
    }

  } catch (error) {
    console.error('Error in alert-engine:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function processAlerts(supabase: any) {
  console.log('Processing all active alerts...');
  
  // Get all active alert configurations
  const { data: alertConfigs, error: configError } = await supabase
    .from('alert_configurations')
    .select('*')
    .eq('is_active', true);

  if (configError) {
    throw new Error(`Error fetching alert configurations: ${configError.message}`);
  }

  const results = [];
  
  for (const config of alertConfigs) {
    try {
      const alertResult = await evaluateAlert(supabase, config.id);
      if (alertResult.triggered) {
        results.push({
          configId: config.id,
          userId: config.user_id,
          triggered: true,
          message: alertResult.message
        });
      }
    } catch (error) {
      console.error(`Error processing alert ${config.id}:`, error);
      results.push({
        configId: config.id,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  return new Response(
    JSON.stringify({ 
      processed: alertConfigs.length,
      triggered: results.filter(r => r.triggered).length,
      results 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkUserAlerts(supabase: any, userId: string) {
  console.log(`Checking alerts for user: ${userId}`);
  
  const { data: userConfigs, error } = await supabase
    .from('alert_configurations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Error fetching user alerts: ${error.message}`);
  }

  const alerts = [];
  
  for (const config of userConfigs) {
    const alertResult = await evaluateAlert(supabase, config.id);
    if (alertResult.triggered) {
      alerts.push(alertResult);
    }
  }

  return new Response(
    JSON.stringify({ alerts }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function evaluateAlert(supabase: any, alertConfigId: string) {
  // Get alert configuration
  const { data: config, error: configError } = await supabase
    .from('alert_configurations')
    .select('*')
    .eq('id', alertConfigId)
    .single();

  if (configError) {
    throw new Error(`Alert config not found: ${configError.message}`);
  }

  // Get recent market data for comparison
  const timeWindow = parseTimeWindow(config.time_window);
  const { data: marketData, error: marketError } = await supabase
    .from('market_trends')
    .select('*')
    .eq('career_path', config.career_path)
    .eq('location', config.location)
    .gte('created_at', timeWindow.start.toISOString())
    .order('created_at', { ascending: false });

  if (marketError) {
    throw new Error(`Error fetching market data: ${marketError.message}`);
  }

  if (!marketData || marketData.length === 0) {
    return { triggered: false, reason: 'No market data available' };
  }

  const currentValue = getCurrentMetricValue(marketData[0], config.metric_type);
  const shouldTrigger = evaluateCondition(
    currentValue,
    config.threshold_value,
    config.comparison_operator
  );

  if (shouldTrigger) {
    // Check if we already triggered this alert recently (avoid spam)
    const { data: recentAlerts } = await supabase
      .from('alert_history')
      .select('triggered_at')
      .eq('alert_config_id', alertConfigId)
      .gte('triggered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('triggered_at', { ascending: false })
      .limit(1);

    if (recentAlerts && recentAlerts.length > 0) {
      return { triggered: false, reason: 'Already triggered recently' };
    }

    // Create alert message
    const alertMessage = generateAlertMessage(config, currentValue, marketData);
    
    // Record alert in history
    await supabase
      .from('alert_history')
      .insert({
        alert_config_id: alertConfigId,
        user_id: config.user_id,
        metric_value: currentValue,
        threshold_value: config.threshold_value,
        alert_message: alertMessage,
        confidence_score: calculateConfidenceScore(marketData, config)
      });

    return {
      triggered: true,
      message: alertMessage,
      currentValue,
      thresholdValue: config.threshold_value,
      confidence: calculateConfidenceScore(marketData, config)
    };
  }

  return { triggered: false, reason: 'Condition not met' };
}

async function generateInsights(supabase: any, userId: string) {
  console.log(`Generating insights for user: ${userId}`);
  
  // Get user's alert history
  const { data: alertHistory } = await supabase
    .from('alert_history')
    .select('*')
    .eq('user_id', userId)
    .gte('triggered_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('triggered_at', { ascending: false });

  // Get user's alert configurations
  const { data: configs } = await supabase
    .from('alert_configurations')
    .select('*')
    .eq('user_id', userId);

  const insights = {
    totalAlerts: alertHistory?.length || 0,
    avgResponseTime: calculateAvgResponseTime(alertHistory || []),
    mostActiveMetric: findMostActiveMetric(alertHistory || []),
    accuracyTrend: await calculateAccuracyTrend(supabase, userId),
    recommendations: generateRecommendations(alertHistory || [], configs || [])
  };

  return new Response(
    JSON.stringify({ insights }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Helper functions
function parseTimeWindow(timeWindow: string) {
  const now = new Date();
  const value = parseInt(timeWindow.replace(/[^\d]/g, ''));
  const unit = timeWindow.replace(/\d/g, '');
  
  let start = new Date(now);
  
  switch (unit) {
    case 'd':
      start.setDate(now.getDate() - value);
      break;
    case 'h':
      start.setHours(now.getHours() - value);
      break;
    case 'm':
      start.setMonth(now.getMonth() - value);
      break;
    default:
      start.setDate(now.getDate() - 7); // Default to 7 days
  }
  
  return { start, end: now };
}

function getCurrentMetricValue(marketData: MarketDataPoint, metricType: string): number {
  switch (metricType) {
    case 'salary':
      return marketData.average_salary || 0;
    case 'demand':
      return marketData.demand_score || 0;
    case 'growth':
      return marketData.growth_rate || 0;
    case 'jobs':
      return marketData.job_postings_count || 0;
    default:
      return 0;
  }
}

function evaluateCondition(currentValue: number, threshold: number, operator: string): boolean {
  switch (operator) {
    case '>':
      return currentValue > threshold;
    case '<':
      return currentValue < threshold;
    case '>=':
      return currentValue >= threshold;
    case '<=':
      return currentValue <= threshold;
    case '=':
      return Math.abs(currentValue - threshold) < 0.01;
    case '!=':
      return Math.abs(currentValue - threshold) >= 0.01;
    default:
      return false;
  }
}

function generateAlertMessage(config: AlertConfiguration, currentValue: number, marketData: MarketDataPoint[]): string {
  const metricName = config.metric_type === 'salary' ? 'salary' : 
                    config.metric_type === 'demand' ? 'demand score' :
                    config.metric_type === 'growth' ? 'growth rate' : 'job postings';
  
  const formattedValue = config.metric_type === 'salary' 
    ? `$${Math.round(currentValue).toLocaleString()}`
    : config.metric_type === 'jobs' 
    ? Math.round(currentValue).toString()
    : `${currentValue.toFixed(1)}%`;

  const trend = marketData.length > 1 && getCurrentMetricValue(marketData[1], config.metric_type) < currentValue ? '↗️' : '↘️';
  
  return `${trend} ${config.career_path} ${metricName} in ${config.location} is now ${formattedValue} (threshold: ${config.threshold_value})`;
}

function calculateConfidenceScore(marketData: MarketDataPoint[], config: AlertConfiguration): number {
  // Simple confidence calculation based on data recency and consistency
  if (!marketData || marketData.length === 0) return 0.1;
  
  const dataRecency = (Date.now() - new Date(marketData[0].created_at).getTime()) / (24 * 60 * 60 * 1000);
  const recencyScore = Math.max(0, 1 - dataRecency / 7); // Decay over 7 days
  
  return Math.min(0.95, Math.max(0.3, recencyScore * 0.8 + 0.2));
}

function calculateAvgResponseTime(alertHistory: any[]): number {
  const respondedAlerts = alertHistory.filter(alert => alert.read_at);
  if (respondedAlerts.length === 0) return 0;
  
  const totalTime = respondedAlerts.reduce((sum, alert) => {
    const triggerTime = new Date(alert.triggered_at).getTime();
    const readTime = new Date(alert.read_at).getTime();
    return sum + (readTime - triggerTime);
  }, 0);
  
  return totalTime / respondedAlerts.length / (60 * 60 * 1000); // Convert to hours
}

function findMostActiveMetric(alertHistory: any[]): string {
  const metricCounts = alertHistory.reduce((acc, alert) => {
    const metric = alert.alert_message.includes('salary') ? 'salary' :
                  alert.alert_message.includes('demand') ? 'demand' :
                  alert.alert_message.includes('growth') ? 'growth' : 'jobs';
    acc[metric] = (acc[metric] || 0) + 1;
    return acc;
  }, {});
  
  return Object.keys(metricCounts).reduce((a, b) => metricCounts[a] > metricCounts[b] ? a : b) || 'none';
}

async function calculateAccuracyTrend(supabase: any, userId: string): Promise<number> {
  const { data: metrics } = await supabase
    .from('alert_performance_metrics')
    .select('accuracy_rate')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (!metrics || metrics.length === 0) return 0;
  
  return metrics.reduce((sum: number, m: any) => sum + (m.accuracy_rate || 0), 0) / metrics.length;
}

function generateRecommendations(alertHistory: any[], configs: any[]): string[] {
  const recommendations = [];
  
  if (alertHistory.length === 0 && configs.length > 0) {
    recommendations.push("Your alerts are configured but haven't triggered yet. Consider adjusting thresholds.");
  }
  
  if (configs.length === 0) {
    recommendations.push("Set up your first alert to start monitoring market changes.");
  }
  
  const lowEngagement = alertHistory.filter(a => !a.read_at).length / Math.max(1, alertHistory.length) > 0.7;
  if (lowEngagement) {
    recommendations.push("Many alerts go unread. Consider reducing alert frequency or adjusting criteria.");
  }
  
  return recommendations;
}