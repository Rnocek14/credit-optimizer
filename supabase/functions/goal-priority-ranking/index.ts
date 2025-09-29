import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoalRankingRequest {
  user_id: string;
  goals?: any[];
  context?: {
    experience_level?: string;
    location?: string;
    career_path?: string;
    time_frame?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, goals, context }: GoalRankingRequest = await req.json();

    console.log('Goal Priority Ranking Request:', { user_id, goals_count: goals?.length, context });

    // Fetch user's smart goals if not provided
    let userGoals = goals;
    if (!userGoals) {
      const { data: goalsData, error: goalsError } = await supabaseClient
        .from('career_goals')
        .select('*')
        .eq('user_id', user_id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (goalsError) {
        console.error('Error fetching user goals:', goalsError);
        throw new Error('Failed to fetch user goals');
      }
      userGoals = goalsData || [];
    }

    if (!userGoals || userGoals.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No goals found for user',
        ranked_goals: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch market intelligence data
    const { data: marketData } = await supabaseClient
      .from('career_graph_nodes')
      .select('title, market_demand_score, trending_score, salary_data, difficulty_level')
      .eq('node_type', 'job')
      .eq('active', true);

    // Priority ranking algorithm
    const rankedGoals = userGoals.map((goal, index) => {
      let priorityScore = 50; // Base score
      
      // Market demand boost
      const marketNode = marketData?.find(node => 
        node.title.toLowerCase().includes(goal.target_role?.toLowerCase() || goal.title?.toLowerCase() || '')
      );
      
      if (marketNode) {
        priorityScore += (marketNode.market_demand_score || 0) * 20;
        priorityScore += (marketNode.trending_score || 0) * 15;
        
        // Difficulty adjustment based on experience level
        const difficultyPenalty = context?.experience_level === 'beginner' ? 
          (marketNode.difficulty_level || 1) * 5 : 
          (marketNode.difficulty_level || 1) * 2;
        priorityScore -= difficultyPenalty;
      }

      // Time sensitivity boost
      if (goal.target_date) {
        const daysUntilTarget = Math.floor(
          (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilTarget < 90) priorityScore += 15; // Urgent goals
        else if (daysUntilTarget < 180) priorityScore += 10;
      }

      // Skill gap penalty/boost
      const skillGapCount = goal.skill_gaps?.length || 0;
      if (skillGapCount <= 3) priorityScore += 10; // Achievable goals
      else if (skillGapCount > 6) priorityScore -= 10; // Very challenging goals

      // Experience level adjustments
      if (context?.experience_level === 'beginner') {
        if (goal.title?.toLowerCase().includes('basic') || goal.title?.toLowerCase().includes('fundamentals')) {
          priorityScore += 15;
        }
      }

      return {
        ...goal,
        priority_score: Math.max(0, Math.min(100, priorityScore)),
        ranking_factors: {
          market_demand: marketNode?.market_demand_score || 0,
          trending_score: marketNode?.trending_score || 0,
          difficulty_level: marketNode?.difficulty_level || 1,
          time_urgency: goal.target_date ? Math.floor(
            (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          ) : null,
          skill_gap_count: skillGapCount,
          achievability_score: skillGapCount <= 3 ? 'high' : skillGapCount <= 6 ? 'medium' : 'low'
        },
        recommended_sequence: index + 1,
        dependencies: goal.skill_gaps?.slice(0, 3) || [] // Top 3 skill dependencies
      };
    });

    // Sort by priority score
    rankedGoals.sort((a, b) => b.priority_score - a.priority_score);

    // Add sequence numbers
    rankedGoals.forEach((goal, index) => {
      goal.recommended_sequence = index + 1;
      goal.priority_tier = index < 2 ? 'high' : index < 4 ? 'medium' : 'low';
    });

    console.log('Goals ranked successfully:', rankedGoals.length);

    return new Response(JSON.stringify({
      success: true,
      ranked_goals: rankedGoals,
      ranking_summary: {
        total_goals: rankedGoals.length,
        high_priority: rankedGoals.filter(g => g.priority_tier === 'high').length,
        medium_priority: rankedGoals.filter(g => g.priority_tier === 'medium').length,
        low_priority: rankedGoals.filter(g => g.priority_tier === 'low').length,
        next_recommended: rankedGoals[0]?.title || null
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in goal-priority-ranking:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      ranked_goals: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});