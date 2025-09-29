import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Admin role check for dev seeding function
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Extract JWT token and validate user role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', { 
      user_uuid: user.id 
    });
    
    if (roleError || userRole !== 'admin') {
      console.warn(`SECURITY: Non-admin user ${user.email} attempted to access social-learning-seeder`, {
        userId: user.id,
        userRole,
        timestamp: new Date().toISOString()
      });
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`SECURITY: Admin ${user.email} authorized for social learning seeding`);

    console.log('Starting social learning data seeding...');

    // Demo users
    const demoUsers = [
      '2b458624-d498-4cca-a63d-9341cc20e363', // Aisha Khan
      '3c459625-e499-5ddb-b64d-a442dd21f474', // Mateo Silva  
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'  // Jade Chen
    ];

    // Seed study groups
    const studyGroups = [
      {
        name: "React Developers Circle",
        description: "A collaborative space for React enthusiasts to share knowledge and work on projects together",
        creator_id: demoUsers[0],
        career_path: "Frontend Development",
        skill_focus: ["React", "JavaScript", "TypeScript", "Redux"],
        max_members: 12,
        privacy_level: "public",
        group_type: "project_based"
      },
      {
        name: "Data Science Study Group",
        description: "Learn machine learning, data analysis, and Python together",
        creator_id: demoUsers[1],
        career_path: "Data Science",
        skill_focus: ["Python", "Machine Learning", "Data Analysis", "Statistics"],
        max_members: 8,
        privacy_level: "public",
        group_type: "study_challenge"
      },
      {
        name: "Full-Stack Bootcamp Prep",
        description: "Preparing for intensive bootcamp programs and career transitions",
        creator_id: demoUsers[2],
        career_path: "Full-Stack Development",
        skill_focus: ["HTML", "CSS", "JavaScript", "Node.js", "Databases"],
        max_members: 15,
        privacy_level: "public",
        group_type: "general"
      }
    ];

    const { data: insertedGroups, error: groupError } = await supabase
      .from('study_groups')
      .insert(studyGroups)
      .select();

    if (groupError) {
      console.error('Error inserting study groups:', groupError);
      throw groupError;
    }

    console.log(`Created ${insertedGroups.length} study groups`);

    // Add members to groups
    const groupMembers: any[] = [];
    insertedGroups.forEach(group => {
      // Add creator as leader
      groupMembers.push({
        group_id: group.id,
        user_id: group.creator_id,
        role: 'leader'
      });

      // Add other demo users as members
      demoUsers.forEach(userId => {
        if (userId !== group.creator_id) {
          groupMembers.push({
            group_id: group.id,
            user_id: userId,
            role: 'member',
            contribution_score: Math.floor(Math.random() * 50) + 10
          });
        }
      });
    });

    const { error: memberError } = await supabase
      .from('study_group_members')
      .insert(groupMembers);

    if (memberError) {
      console.error('Error inserting group members:', memberError);
      throw memberError;
    }

    console.log(`Added ${groupMembers.length} group memberships`);

    // Seed learning challenges
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const challenges = [
      {
        title: "30-Day JavaScript Mastery Challenge",
        description: "Master JavaScript fundamentals through daily coding exercises and peer collaboration",
        challenge_type: "individual",
        difficulty_level: "intermediate",
        skill_focus: ["JavaScript", "Problem Solving", "Algorithms"],
        career_paths: ["Frontend Development", "Backend Development", "Full-Stack Development"],
        start_date: now.toISOString(),
        end_date: futureDate.toISOString(),
        xp_reward: 150,
        max_participants: 50,
        entry_requirements: { min_level: 1, skills_required: ["JavaScript Basics"] },
        challenge_data: {
          daily_exercises: true,
          peer_review: true,
          final_project: true
        },
        created_by: demoUsers[0],
        status: "active"
      },
      {
        title: "Data Visualization Bootcamp",
        description: "Learn to create compelling data visualizations using Python and modern libraries",
        challenge_type: "team",
        difficulty_level: "advanced",
        skill_focus: ["Python", "Data Visualization", "Matplotlib", "Seaborn"],
        career_paths: ["Data Science", "Data Analytics"],
        start_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        xp_reward: 200,
        max_participants: 24,
        entry_requirements: { min_level: 2, skills_required: ["Python", "Data Analysis"] },
        challenge_data: {
          team_size: 3,
          weekly_checkpoints: true,
          final_presentation: true
        },
        created_by: demoUsers[1],
        status: "upcoming"
      }
    ];

    const { data: insertedChallenges, error: challengeError } = await supabase
      .from('learning_challenges')
      .insert(challenges)
      .select();

    if (challengeError) {
      console.error('Error inserting challenges:', challengeError);
      throw challengeError;
    }

    console.log(`Created ${insertedChallenges.length} learning challenges`);

    // Add challenge participants
    const challengeParticipants: any[] = [];
    insertedChallenges.forEach(challenge => {
      demoUsers.forEach(userId => {
        challengeParticipants.push({
          challenge_id: challenge.id,
          user_id: userId,
          completion_status: challenge.status === 'active' ? 'in_progress' : 'registered',
          progress_data: {
            exercises_completed: challenge.status === 'active' ? Math.floor(Math.random() * 10) : 0,
            peer_reviews_given: Math.floor(Math.random() * 3)
          }
        });
      });
    });

    const { error: participantError } = await supabase
      .from('challenge_participants')
      .insert(challengeParticipants);

    if (participantError) {
      console.error('Error inserting challenge participants:', participantError);
      throw participantError;
    }

    console.log(`Added ${challengeParticipants.length} challenge participants`);

    // Seed peer feedback
    const peerFeedback = [
      {
        from_user_id: demoUsers[1],
        to_user_id: demoUsers[0],
        feedback_type: "skill_validation",
        context_type: "study_group",
        context_id: insertedGroups[0].id,
        rating: 4.5,
        feedback_text: "Excellent React knowledge and great at explaining complex concepts to the group",
        skills_endorsed: ["React", "JavaScript", "Teaching"]
      },
      {
        from_user_id: demoUsers[2],
        to_user_id: demoUsers[0],
        feedback_type: "collaboration",
        context_type: "study_group",
        context_id: insertedGroups[0].id,
        rating: 5.0,
        feedback_text: "Amazing collaboration skills and always helpful to team members",
        skills_endorsed: ["Leadership", "Communication"]
      },
      {
        from_user_id: demoUsers[0],
        to_user_id: demoUsers[1],
        feedback_type: "project_review",
        context_type: "challenge",
        context_id: insertedChallenges[0].id,
        rating: 4.2,
        feedback_text: "Solid data analysis approach with clear documentation",
        skills_endorsed: ["Python", "Data Analysis", "Documentation"]
      }
    ];

    const { error: feedbackError } = await supabase
      .from('peer_feedback')
      .insert(peerFeedback);

    if (feedbackError) {
      console.error('Error inserting peer feedback:', feedbackError);
      throw feedbackError;
    }

    console.log(`Created ${peerFeedback.length} peer feedback entries`);

    // Generate social learning analytics
    const analytics: any[] = [];
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    demoUsers.forEach(userId => {
      analytics.push(
        {
          user_id: userId,
          metric_type: "collaboration_score",
          metric_value: Math.floor(Math.random() * 40) + 60, // 60-100
          calculation_period: "weekly",
          period_start: startOfWeek.toISOString(),
          period_end: endOfWeek.toISOString()
        },
        {
          user_id: userId,
          metric_type: "peer_engagement",
          metric_value: Math.floor(Math.random() * 30) + 20, // 20-50
          calculation_period: "weekly",
          period_start: startOfWeek.toISOString(),
          period_end: endOfWeek.toISOString()
        },
        {
          user_id: userId,
          metric_type: "social_xp_gained",
          metric_value: Math.floor(Math.random() * 200) + 100, // 100-300
          calculation_period: "weekly",
          period_start: startOfWeek.toISOString(),
          period_end: endOfWeek.toISOString()
        }
      );
    });

    const { error: analyticsError } = await supabase
      .from('social_learning_analytics')
      .insert(analytics);

    if (analyticsError) {
      console.error('Error inserting analytics:', analyticsError);
      throw analyticsError;
    }

    console.log(`Created ${analytics.length} analytics entries`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Social learning data seeded successfully',
        data: {
          study_groups: insertedGroups.length,
          group_members: groupMembers.length,
          challenges: insertedChallenges.length,
          participants: challengeParticipants.length,
          feedback_entries: peerFeedback.length,
          analytics_entries: analytics.length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in social learning seeder:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.toString() : String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});