-- Fix Function Search Path Security Issues
-- Update all functions to use secure search_path

CREATE OR REPLACE FUNCTION public.get_user_role(user_id_param uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = user_id_param LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_badge_for_user(badge_slug text, user_uuid uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, name text, slug text, emoji text, trigger_type text, description text, threshold numeric, user_has_earned boolean, earned_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT
    b.id,
    b.name,
    b.slug,
    b.emoji,
    b.trigger_type,
    b.description,
    b.threshold,
    ub.id IS NOT NULL as user_has_earned,
    ub.earned_at
  FROM badges b
  LEFT JOIN user_badges ub
    ON b.id = ub.badge_id AND (user_uuid IS NULL OR ub.user_id = user_uuid)
  WHERE b.slug = badge_slug
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.suggest_badges_for_user(user_uuid uuid)
 RETURNS TABLE(badge_id uuid, slug text, name text, emoji text, reason text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  WITH user_stats AS (
    SELECT 
      user_uuid as user_id,
      (SELECT COUNT(*) FROM career_goals WHERE user_id = user_uuid AND active = true) as goal_count,
      (SELECT COUNT(*) FROM transcripts WHERE user_id = user_uuid) as transcript_count,
      (SELECT COUNT(*) FROM saved_courses WHERE user_id = user_uuid) as saved_courses_count,
      (SELECT COUNT(*) FROM ai_resume_drafts WHERE user_id = user_uuid AND published_to_profile = true) as published_resume_count,
      (SELECT COALESCE(MAX(cri_average), 0) FROM ai_resume_drafts WHERE user_id = user_uuid) as cri_score,
      (SELECT COALESCE(MAX(readiness_score), 0) FROM ai_resume_drafts WHERE user_id = user_uuid) as readiness_score
  ),
  earned_badges AS (
    SELECT badge_id FROM user_badges WHERE user_id = user_uuid
  )
  SELECT 
    b.id as badge_id,
    b.slug,
    b.name,
    b.emoji,
    CASE 
      WHEN b.trigger_type = 'goal_count' THEN 
        'You have completed ' || us.goal_count || ' of ' || b.threshold || ' goals needed'
      WHEN b.trigger_type = 'transcript_count' THEN 
        'You have added ' || us.transcript_count || ' of ' || b.threshold || ' transcripts needed'
      WHEN b.trigger_type = 'saved_courses_count' THEN 
        'You have saved ' || us.saved_courses_count || ' of ' || b.threshold || ' courses needed'
      WHEN b.trigger_type = 'published_resume_count' THEN 
        'You have published ' || us.published_resume_count || ' of ' || b.threshold || ' resume drafts needed'
      WHEN b.trigger_type = 'cri_score' THEN 
        'Your CRI score is ' || ROUND(us.cri_score) || '/' || b.threshold
      WHEN b.trigger_type = 'readiness_score' THEN 
        'Your readiness score is ' || ROUND(us.readiness_score) || '/' || b.threshold
      ELSE 'Progress toward this badge'
    END as reason
  FROM badges b
  CROSS JOIN user_stats us
  WHERE b.id NOT IN (SELECT badge_id FROM earned_badges)
    AND b.threshold IS NOT NULL
    AND (
      (b.trigger_type = 'goal_count' AND us.goal_count >= CEIL(b.threshold * 0.8) AND us.goal_count < b.threshold) OR
      (b.trigger_type = 'transcript_count' AND us.transcript_count >= CEIL(b.threshold * 0.8) AND us.transcript_count < b.threshold) OR
      (b.trigger_type = 'saved_courses_count' AND us.saved_courses_count >= CEIL(b.threshold * 0.8) AND us.saved_courses_count < b.threshold) OR
      (b.trigger_type = 'published_resume_count' AND us.published_resume_count >= CEIL(b.threshold * 0.8) AND us.published_resume_count < b.threshold) OR
      (b.trigger_type = 'cri_score' AND us.cri_score >= (b.threshold * 0.8) AND us.cri_score < b.threshold) OR
      (b.trigger_type = 'readiness_score' AND us.readiness_score >= (b.threshold * 0.8) AND us.readiness_score < b.threshold)
    )
  ORDER BY 
    CASE 
      WHEN b.trigger_type = 'goal_count' THEN us.goal_count::float / b.threshold
      WHEN b.trigger_type = 'transcript_count' THEN us.transcript_count::float / b.threshold
      WHEN b.trigger_type = 'saved_courses_count' THEN us.saved_courses_count::float / b.threshold
      WHEN b.trigger_type = 'published_resume_count' THEN us.published_resume_count::float / b.threshold
      WHEN b.trigger_type = 'cri_score' THEN us.cri_score::float / b.threshold
      WHEN b.trigger_type = 'readiness_score' THEN us.readiness_score::float / b.threshold
      ELSE 0
    END DESC
  LIMIT 5;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_career_step_levels(career_path_id_param uuid)
 RETURNS TABLE(id uuid, title text, description text, step_order integer, prerequisites uuid[], level integer, career_path_id uuid, is_terminal boolean, estimated_duration text, completed boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_level INTEGER := 0;
BEGIN
  -- Create temp table to store results
  CREATE TEMP TABLE IF NOT EXISTS temp_step_levels (
    id UUID,
    title TEXT,
    description TEXT,
    step_order INTEGER,
    prerequisites UUID[],
    level INTEGER,
    career_path_id UUID,
    is_terminal BOOLEAN,
    estimated_duration TEXT,
    completed BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
  );
  
  -- Clear temp table properly with WHERE clause
  DELETE FROM temp_step_levels WHERE 1=1;
  
  -- Insert steps with no prerequisites at level 0
  INSERT INTO temp_step_levels
  SELECT 
    cs.id,
    cs.title,
    cs.description,
    cs.step_order,
    cs.prerequisites,
    0 as level,
    cs.career_path_id,
    COALESCE(cs.is_terminal, false),
    cs.estimated_time,
    false as completed,
    cs.created_at,
    cs.updated_at
  FROM career_steps cs
  WHERE cs.career_path_id = career_path_id_param
    AND (cs.prerequisites IS NULL OR array_length(cs.prerequisites, 1) IS NULL);
  
  -- Iteratively assign levels to remaining steps
  WHILE current_level <= 15 LOOP
    INSERT INTO temp_step_levels
    SELECT 
      cs.id,
      cs.title,
      cs.description,
      cs.step_order,
      cs.prerequisites,
      current_level + 1 as level,
      cs.career_path_id,
      COALESCE(cs.is_terminal, false),
      cs.estimated_time,
      false as completed,
      cs.created_at,
      cs.updated_at
    FROM career_steps cs
    WHERE cs.career_path_id = career_path_id_param
      AND cs.prerequisites IS NOT NULL 
      AND array_length(cs.prerequisites, 1) > 0
      AND NOT EXISTS (SELECT 1 FROM temp_step_levels WHERE temp_step_levels.id = cs.id)
      AND (
        SELECT bool_and(temp_step_levels.id IS NOT NULL)
        FROM unnest(cs.prerequisites) as prereq_id
        LEFT JOIN temp_step_levels ON temp_step_levels.id = prereq_id
      );
    
    IF NOT FOUND THEN
      EXIT;
    END IF;
    
    current_level := current_level + 1;
  END LOOP;
  
  RETURN QUERY 
  SELECT * FROM temp_step_levels 
  ORDER BY temp_step_levels.level, temp_step_levels.step_order NULLS LAST, temp_step_levels.title;
  
  -- Clean up
  DROP TABLE IF EXISTS temp_step_levels;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_level(user_id_param uuid)
 RETURNS TABLE(user_id uuid, total_xp integer, current_level integer, xp_for_current_level integer, xp_for_next_level integer, xp_progress_in_level integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    ux.user_id,
    ux.total_xp,
    CASE 
      WHEN ux.total_xp < 100 THEN 1
      WHEN ux.total_xp < 250 THEN 2
      WHEN ux.total_xp < 500 THEN 3
      WHEN ux.total_xp < 1000 THEN 4
      ELSE 4 + ((ux.total_xp - 500) / 500)
    END as current_level,
    CASE 
      WHEN ux.total_xp < 100 THEN 0
      WHEN ux.total_xp < 250 THEN 100
      WHEN ux.total_xp < 500 THEN 250
      WHEN ux.total_xp < 1000 THEN 500
      ELSE 500 + (((ux.total_xp - 500) / 500) * 500)
    END as xp_for_current_level,
    CASE 
      WHEN ux.total_xp < 100 THEN 100
      WHEN ux.total_xp < 250 THEN 250
      WHEN ux.total_xp < 500 THEN 500
      WHEN ux.total_xp < 1000 THEN 1000
      ELSE 500 + (((ux.total_xp - 500) / 500 + 1) * 500)
    END as xp_for_next_level,
    CASE 
      WHEN ux.total_xp < 100 THEN ux.total_xp
      WHEN ux.total_xp < 250 THEN ux.total_xp - 100
      WHEN ux.total_xp < 500 THEN ux.total_xp - 250
      WHEN ux.total_xp < 1000 THEN ux.total_xp - 500
      ELSE ux.total_xp - (500 + (((ux.total_xp - 500) / 500) * 500))
    END as xp_progress_in_level
  FROM public.user_xp ux
  WHERE ux.user_id = user_id_param;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_career_steps_with_levels()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- No operation needed for regular views
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_xp(user_id_param uuid, xp_amount_param integer, action_type_param text, reason_param text, source_id_param uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Security: Only allow authenticated users to award XP to themselves or service role
  IF auth.uid() IS NULL OR (auth.uid() != user_id_param AND auth.role() != 'service_role') THEN
    RAISE EXCEPTION 'Insufficient permissions to award XP';
  END IF;
  
  -- Insert XP event record
  INSERT INTO public.xp_events (user_id, xp_amount, action_type, source_id, reason)
  VALUES (user_id_param, xp_amount_param, action_type_param, source_id_param, reason_param);
  
  -- Update or insert user_xp record
  INSERT INTO public.user_xp (user_id, total_xp, last_updated)
  VALUES (user_id_param, xp_amount_param, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_xp = user_xp.total_xp + xp_amount_param,
    last_updated = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_demo_resume_profiles()
 RETURNS TABLE(user_id uuid, name text, email text, resume_id uuid, created_at timestamp with time zone, slug text, total_xp integer, current_level integer, earned_badges jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  WITH published_resumes AS (
    SELECT DISTINCT ON (ard.user_id)
      ard.user_id,
      ard.id as resume_id,
      ard.created_at,
      ard.title
    FROM public.ai_resume_drafts ard
    WHERE ard.published_to_profile = true
    ORDER BY ard.user_id, ard.created_at DESC
    LIMIT 10 -- Limit to prevent too many results
  ),
  user_profiles AS (
    SELECT 
      pr.user_id,
      pr.resume_id,
      pr.created_at,
      COALESCE(p.name, 
        CASE 
          WHEN pr.user_id = '2b458624-d498-4cca-a63d-9341cc20e363'::uuid THEN 'Aisha Khan'
          WHEN pr.user_id = '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid THEN 'Mateo Silva'
          WHEN pr.user_id = '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid THEN 'Jade Chen'
          ELSE 'Demo User'
        END
      ) as name,
      CASE 
        WHEN pr.user_id = '2b458624-d498-4cca-a63d-9341cc20e363'::uuid THEN 'aisha@demo.com'
        WHEN pr.user_id = '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid THEN 'mateo@demo.com'
        WHEN pr.user_id = '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid THEN 'jade@demo.com'
        ELSE 'demo@example.com'
      END as email
    FROM published_resumes pr
    LEFT JOIN public.profiles p ON p.user_id = pr.user_id
  ),
  user_levels AS (
    SELECT 
      ux.user_id,
      COALESCE(ux.total_xp, 0) as total_xp,
      CASE 
        WHEN COALESCE(ux.total_xp, 0) < 100 THEN 1
        WHEN COALESCE(ux.total_xp, 0) < 250 THEN 2
        WHEN COALESCE(ux.total_xp, 0) < 500 THEN 3
        WHEN COALESCE(ux.total_xp, 0) < 1000 THEN 4
        ELSE 4 + ((COALESCE(ux.total_xp, 0) - 500) / 500)
      END as current_level
    FROM public.user_xp ux
  ),
  user_badge_data AS (
    SELECT 
      ub.user_id,
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'slug', b.slug,
          'emoji', b.emoji,
          'earned_at', ub.earned_at
        )
      ) as badges
    FROM public.user_badges ub
    JOIN public.badges b ON b.id = ub.badge_id
    GROUP BY ub.user_id
  )
  SELECT 
    up.user_id,
    up.name,
    up.email,
    up.resume_id,
    up.created_at,
    NULL::text as slug,
    COALESCE(ul.total_xp, 0) as total_xp,
    COALESCE(ul.current_level, 1) as current_level,
    COALESCE(ubd.badges, '[]'::jsonb) as earned_badges
  FROM user_profiles up
  LEFT JOIN user_levels ul ON ul.user_id = up.user_id
  LEFT JOIN user_badge_data ubd ON ubd.user_id = up.user_id
  ORDER BY up.name;
$function$;

CREATE OR REPLACE FUNCTION public.generate_user_roadmap(user_id_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  -- This function will be called by the edge function
  -- It will update the user's career tracks and roadmap steps
  -- The actual GPT-4 generation will happen in the edge function
  
  -- For now, just return a success status
  -- The edge function will handle the actual database updates
  result := json_build_object('status', 'ready_for_generation', 'user_id', user_id_param);
  
  RETURN result;
END;
$function$;

-- Remove backup table
DROP TABLE IF EXISTS public.roadmap_steps_backup;