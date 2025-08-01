import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartGoal {
  id: string;
  title: string;
  description: string;
  goal_type: 'career' | 'skill' | 'certification' | 'project';
  target_date: string;
  smart_criteria: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    time_bound: string;
  };
  priority: 'high' | 'medium' | 'low';
  estimated_duration_weeks: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { user_id } = await req.json();
    console.log('Generating smart goals for user:', user_id);

    if (!user_id) {
      throw new Error('user_id is required');
    }

    // Get user preferences and experience level
    const { data: userPrefs, error: prefsError } = await supabaseClient
      .from('user_preferences')
      .select('experience_level, has_completed_onboarding')
      .eq('user_id', user_id)
      .single();

    if (prefsError) {
      console.log('No user preferences found, using defaults');
    }

    // Get user's current skill progress
    const { data: skillProgress, error: skillError } = await supabaseClient
      .from('user_skill_progress')
      .select('skill_id, confidence_level')
      .eq('user_id', user_id);

    if (skillError) {
      console.log('No skill progress found, using fallback goals');
    }

    // Get available career nodes for goal suggestions
    const { data: careerNodes, error: nodesError } = await supabaseClient
      .from('career_graph_nodes')
      .select('id, title, node_type, difficulty_level, estimated_time_hours')
      .eq('active', true)
      .in('node_type', ['skill', 'certification', 'job'])
      .limit(20);

    if (nodesError) {
      console.log('Error fetching career nodes:', nodesError);
    }

    const experienceLevel = userPrefs?.experience_level || 'beginner';
    const hasOnboarded = userPrefs?.has_completed_onboarding || false;
    const skillCount = skillProgress?.length || 0;

    console.log(`User profile: ${experienceLevel} level, ${skillCount} skills, onboarded: ${hasOnboarded}`);

    // Generate smart goals based on user profile
    const smartGoals: SmartGoal[] = [];

    // Goal 1: Skill Development (always included)
    if (experienceLevel === 'beginner') {
      smartGoals.push({
        id: crypto.randomUUID(),
        title: 'Master Frontend Fundamentals',
        description: 'Build a solid foundation in HTML, CSS, and JavaScript through hands-on projects',
        goal_type: 'skill',
        target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        smart_criteria: {
          specific: 'Complete 3 projects using HTML, CSS, and vanilla JavaScript',
          measurable: '3 deployed projects with documented code',
          achievable: 'Realistic for beginners with consistent daily practice',
          relevant: 'Essential foundation for frontend development career',
          time_bound: '90 days from start date'
        },
        priority: 'high',
        estimated_duration_weeks: 12
      });
    } else if (experienceLevel === 'intermediate') {
      smartGoals.push({
        id: crypto.randomUUID(),
        title: 'Advanced React Development',
        description: 'Master React hooks, state management, and modern development patterns',
        goal_type: 'skill',
        target_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        smart_criteria: {
          specific: 'Build 2 React applications with Redux and TypeScript',
          measurable: '2 production-ready apps with test coverage',
          achievable: 'Building on existing JavaScript knowledge',
          relevant: 'High demand skill for frontend developers',
          time_bound: '4 months completion target'
        },
        priority: 'high',
        estimated_duration_weeks: 16
      });
    }

    // Goal 2: Career Milestone
    smartGoals.push({
      id: crypto.randomUUID(),
      title: experienceLevel === 'beginner' ? 'Land First Frontend Role' : 'Advance to Senior Developer',
      description: experienceLevel === 'beginner' 
        ? 'Secure an entry-level frontend developer position at a growing company'
        : 'Transition to a senior frontend developer role with leadership responsibilities',
      goal_type: 'career',
      target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      smart_criteria: {
        specific: experienceLevel === 'beginner' 
          ? 'Apply to 20 companies, get 5 interviews, receive 1 offer'
          : 'Lead 2 projects, mentor junior developers, negotiate 20% salary increase',
        measurable: experienceLevel === 'beginner'
          ? 'Track applications, interviews, and offers'
          : 'Document leadership impact and salary progression',
        achievable: 'Realistic timeline with focused effort',
        relevant: 'Direct career advancement goal',
        time_bound: '6 months from start'
      },
      priority: 'high',
      estimated_duration_weeks: 24
    });

    // Goal 3: Certification (based on experience level)
    if (experienceLevel === 'beginner') {
      smartGoals.push({
        id: crypto.randomUUID(),
        title: 'Earn Web Development Certification',
        description: 'Complete a recognized web development certification to validate skills',
        goal_type: 'certification',
        target_date: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        smart_criteria: {
          specific: 'Complete freeCodeCamp Responsive Web Design Certification',
          measurable: 'Pass all required projects and challenges',
          achievable: 'Self-paced learning with community support',
          relevant: 'Industry-recognized credential for portfolio',
          time_bound: '5 months completion'
        },
        priority: 'medium',
        estimated_duration_weeks: 20
      });
    } else {
      smartGoals.push({
        id: crypto.randomUUID(),
        title: 'AWS Cloud Practitioner Certification',
        description: 'Gain cloud computing knowledge essential for modern web development',
        goal_type: 'certification',
        target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        smart_criteria: {
          specific: 'Pass AWS Cloud Practitioner certification exam',
          measurable: 'Achieve passing score of 700/1000',
          achievable: 'Study 1 hour daily for 3 months',
          relevant: 'Essential for full-stack development roles',
          time_bound: '90 days study and exam completion'
        },
        priority: 'medium',
        estimated_duration_weeks: 12
      });
    }

    // Goal 4: Portfolio Project
    smartGoals.push({
      id: crypto.randomUUID(),
      title: 'Build Signature Portfolio Project',
      description: 'Create a standout project that showcases your technical skills and creativity',
      goal_type: 'project',
      target_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      smart_criteria: {
        specific: experienceLevel === 'beginner'
          ? 'Build a responsive e-commerce site with cart functionality'
          : 'Create a full-stack application with real-time features',
        measurable: 'Deployed application with documented features',
        achievable: 'Scoped appropriately for skill level',
        relevant: 'Demonstrates practical application of skills',
        time_bound: '4 months from concept to deployment'
      },
      priority: 'high',
      estimated_duration_weeks: 16
    });

    // Goal 5: Networking & Community (conditional)
    if (skillCount >= 3 || hasOnboarded) {
      smartGoals.push({
        id: crypto.randomUUID(),
        title: 'Build Professional Network',
        description: 'Actively engage with the developer community and build meaningful connections',
        goal_type: 'career',
        target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        smart_criteria: {
          specific: 'Attend 6 meetups, contribute to 2 open source projects, connect with 50 developers',
          measurable: 'Track event attendance, GitHub contributions, LinkedIn connections',
          achievable: 'Mix of online and offline networking opportunities',
          relevant: 'Career advancement through professional relationships',
          time_bound: '6 months of consistent networking'
        },
        priority: 'low',
        estimated_duration_weeks: 24
      });
    }

    console.log(`Generated ${smartGoals.length} smart goals for ${experienceLevel} level user`);

    return new Response(
      JSON.stringify({
        goals: smartGoals,
        user_profile: {
          experience_level: experienceLevel,
          skill_count: skillCount,
          has_onboarded: hasOnboarded
        },
        generated_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating smart goals:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        fallback_goals: [
          {
            id: crypto.randomUUID(),
            title: 'Start Learning Web Development',
            description: 'Begin your journey with HTML, CSS, and JavaScript fundamentals',
            goal_type: 'skill',
            target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 'high',
            estimated_duration_weeks: 12
          }
        ]
      }),
      {
        status: 200, // Return 200 with fallback instead of error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});