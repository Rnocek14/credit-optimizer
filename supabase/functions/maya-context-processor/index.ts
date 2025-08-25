import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, contextType, contextData, sessionId } = await req.json();
    
    console.log('Maya Context Processor - Processing context:', { 
      userId, 
      contextType, 
      sessionId 
    });

    // Store the context data
    const { data: contextRecord, error: insertError } = await supabase
      .from('maya_context_tracking')
      .insert({
        user_id: userId,
        context_type: contextType,
        context_data: contextData,
        session_id: sessionId,
        tracked_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Analyze patterns based on context type
    let analysisResult = {};

    switch (contextType) {
      case 'page_visit':
        analysisResult = await analyzePageVisitPattern(supabase, userId, contextData);
        break;
      case 'course_interaction':
        analysisResult = await analyzeCourseInteraction(supabase, userId, contextData);
        break;
      case 'goal_progress':
        analysisResult = await analyzeGoalProgress(supabase, userId, contextData);
        break;
      case 'time_spent':
        analysisResult = await analyzeTimeSpent(supabase, userId, contextData);
        break;
      default:
        analysisResult = { pattern: 'general_activity', confidence: 0.5 };
    }

    // Check if we should trigger insight generation
    const shouldTriggerInsights = await checkInsightTriggers(supabase, userId, contextType, analysisResult);

    console.log('Maya Context Processor - Success:', { 
      userId, 
      contextType, 
      shouldTriggerInsights 
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        context_id: contextRecord.id,
        analysis: analysisResult,
        trigger_insights: shouldTriggerInsights
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Maya Context Processor - Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzePageVisitPattern(supabase: any, userId: string, contextData: any) {
  const { data: recentVisits } = await supabase
    .from('maya_context_tracking')
    .select('context_data, tracked_at')
    .eq('user_id', userId)
    .eq('context_type', 'page_visit')
    .gte('tracked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('tracked_at', { ascending: false })
    .limit(20);

  const pageFrequency = {};
  recentVisits?.forEach(visit => {
    const page = visit.context_data?.page;
    pageFrequency[page] = (pageFrequency[page] || 0) + 1;
  });

  const mostVisitedPage = Object.keys(pageFrequency).reduce((a, b) => 
    pageFrequency[a] > pageFrequency[b] ? a : b, Object.keys(pageFrequency)[0]
  );

  return {
    pattern: 'page_focus',
    most_visited: mostVisitedPage,
    visit_frequency: pageFrequency,
    total_visits: recentVisits?.length || 0,
    confidence: 0.8
  };
}

async function analyzeCourseInteraction(supabase: any, userId: string, contextData: any) {
  const { data: courseInteractions } = await supabase
    .from('maya_context_tracking')
    .select('context_data, tracked_at')
    .eq('user_id', userId)
    .eq('context_type', 'course_interaction')
    .gte('tracked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('tracked_at', { ascending: false });

  const completionRate = courseInteractions?.filter(
    i => i.context_data?.action === 'completed'
  ).length || 0;

  const engagementTime = courseInteractions?.reduce(
    (total, i) => total + (i.context_data?.time_spent || 0), 0
  ) || 0;

  return {
    pattern: 'learning_engagement',
    completion_rate: completionRate / (courseInteractions?.length || 1),
    avg_engagement_time: engagementTime / (courseInteractions?.length || 1),
    total_interactions: courseInteractions?.length || 0,
    confidence: 0.9
  };
}

async function analyzeGoalProgress(supabase: any, userId: string, contextData: any) {
  const { data: goalUpdates } = await supabase
    .from('maya_context_tracking')
    .select('context_data, tracked_at')
    .eq('user_id', userId)
    .eq('context_type', 'goal_progress')
    .gte('tracked_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('tracked_at', { ascending: false });

  const progressTrend = goalUpdates?.map(update => 
    update.context_data?.progress_change || 0
  ).reduce((sum, change) => sum + change, 0) || 0;

  return {
    pattern: 'goal_momentum',
    progress_trend: progressTrend,
    updates_count: goalUpdates?.length || 0,
    momentum: progressTrend > 0 ? 'positive' : progressTrend < 0 ? 'negative' : 'neutral',
    confidence: 0.85
  };
}

async function analyzeTimeSpent(supabase: any, userId: string, contextData: any) {
  const { data: timeRecords } = await supabase
    .from('maya_context_tracking')
    .select('context_data, tracked_at')
    .eq('user_id', userId)
    .eq('context_type', 'time_spent')
    .gte('tracked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('tracked_at', { ascending: false });

  const dailyTime = {};
  timeRecords?.forEach(record => {
    const day = new Date(record.tracked_at).toDateString();
    dailyTime[day] = (dailyTime[day] || 0) + (record.context_data?.minutes || 0);
  });

  const avgDailyTime = Object.values(dailyTime).reduce((sum: number, time: number) => sum + time, 0) / Object.keys(dailyTime).length || 0;

  return {
    pattern: 'time_investment',
    avg_daily_minutes: avgDailyTime,
    active_days: Object.keys(dailyTime).length,
    total_time: Object.values(dailyTime).reduce((sum: number, time: number) => sum + time, 0),
    confidence: 0.7
  };
}

async function checkInsightTriggers(supabase: any, userId: string, contextType: string, analysis: any): Promise<boolean> {
  // Check last insight generation time
  const { data: lastInsights } = await supabase
    .from('maya_proactive_insights')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const lastInsightTime = lastInsights?.[0]?.created_at;
  const hoursSinceLastInsight = lastInsightTime ? 
    (Date.now() - new Date(lastInsightTime).getTime()) / (1000 * 60 * 60) : 24;

  // Trigger conditions
  const triggers = {
    time_based: hoursSinceLastInsight >= 12, // At least 12 hours since last insight
    pattern_significant: analysis.confidence > 0.8,
    high_engagement: contextType === 'course_interaction' && analysis.engagement_time > 30,
    goal_momentum: contextType === 'goal_progress' && analysis.momentum === 'positive'
  };

  return Object.values(triggers).some(trigger => trigger);
}