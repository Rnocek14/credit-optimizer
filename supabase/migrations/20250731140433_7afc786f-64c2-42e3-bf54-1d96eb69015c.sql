-- Update start_course_progress function to handle dev mode users
CREATE OR REPLACE FUNCTION public.start_course_progress(user_id_param uuid, course_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  progress_id UUID;
  is_dev_user BOOLEAN := false;
BEGIN
  -- Check if this is a known dev user
  IF user_id_param IN (
    '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,  -- Aisha Khan
    '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,  -- Mateo Silva
    '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid   -- Jade Chen
  ) THEN
    is_dev_user := true;
  END IF;
  
  -- Security: Only allow authenticated users to start their own progress OR dev users
  IF auth.uid() IS NULL AND NOT is_dev_user THEN
    RAISE EXCEPTION 'Insufficient permissions to start course progress';
  END IF;
  
  IF auth.uid() IS NOT NULL AND auth.uid() != user_id_param THEN
    RAISE EXCEPTION 'Insufficient permissions to start course progress';
  END IF;
  
  -- Insert or update course progress
  INSERT INTO public.course_progress (user_id, course_id, status, started_at, last_accessed_at)
  VALUES (user_id_param, course_id_param, 'in_progress', now(), now())
  ON CONFLICT (user_id, course_id) 
  DO UPDATE SET 
    status = CASE 
      WHEN course_progress.status = 'not_started' THEN 'in_progress'
      ELSE course_progress.status
    END,
    started_at = CASE 
      WHEN course_progress.started_at IS NULL THEN now()
      ELSE course_progress.started_at
    END,
    last_accessed_at = now(),
    updated_at = now()
  RETURNING id INTO progress_id;
  
  -- Award XP for starting course (if first time)
  IF (SELECT started_at FROM public.course_progress WHERE id = progress_id) = now() THEN
    PERFORM public.award_xp(user_id_param, 5, 'COURSE_STARTED', 'Started learning a new course', course_id_param);
  END IF;
  
  RETURN progress_id;
END;
$function$;

-- Update complete_course_progress function to handle dev mode users
CREATE OR REPLACE FUNCTION public.complete_course_progress(user_id_param uuid, course_id_param uuid, completion_notes_param text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  progress_id UUID;
  was_already_completed BOOLEAN;
  is_dev_user BOOLEAN := false;
BEGIN
  -- Check if this is a known dev user
  IF user_id_param IN (
    '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,  -- Aisha Khan
    '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,  -- Mateo Silva
    '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid   -- Jade Chen
  ) THEN
    is_dev_user := true;
  END IF;
  
  -- Security: Only allow authenticated users to complete their own progress OR dev users
  IF auth.uid() IS NULL AND NOT is_dev_user THEN
    RAISE EXCEPTION 'Insufficient permissions to complete course progress';
  END IF;
  
  IF auth.uid() IS NOT NULL AND auth.uid() != user_id_param THEN
    RAISE EXCEPTION 'Insufficient permissions to complete course progress';
  END IF;
  
  -- Check if already completed
  SELECT (status = 'completed') INTO was_already_completed
  FROM public.course_progress 
  WHERE user_id = user_id_param AND course_id = course_id_param;
  
  -- Update course progress to completed
  INSERT INTO public.course_progress (user_id, course_id, status, started_at, completed_at, progress_percentage, completion_notes)
  VALUES (user_id_param, course_id_param, 'completed', now(), now(), 100, completion_notes_param)
  ON CONFLICT (user_id, course_id) 
  DO UPDATE SET 
    status = 'completed',
    completed_at = now(),
    progress_percentage = 100,
    completion_notes = completion_notes_param,
    updated_at = now()
  RETURNING id INTO progress_id;
  
  -- Award XP for completing course (if not already completed)
  IF NOT COALESCE(was_already_completed, false) THEN
    PERFORM public.award_xp(user_id_param, 50, 'COURSE_COMPLETED', 'Completed a course', course_id_param);
    
    -- Create learning milestone
    INSERT INTO public.learning_milestones (user_id, milestone_type, milestone_data, xp_awarded)
    VALUES (
      user_id_param, 
      'course_completion', 
      jsonb_build_object('course_id', course_id_param, 'completion_notes', completion_notes_param),
      50
    );
  END IF;
  
  RETURN progress_id;
END;
$function$;

-- Update award_xp function to handle dev mode users
CREATE OR REPLACE FUNCTION public.award_xp(user_id_param uuid, xp_amount_param integer, action_type_param text, reason_param text, source_id_param uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  is_dev_user BOOLEAN := false;
BEGIN
  -- Check if this is a known dev user
  IF user_id_param IN (
    '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,  -- Aisha Khan
    '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,  -- Mateo Silva
    '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid   -- Jade Chen
  ) THEN
    is_dev_user := true;
  END IF;
  
  -- Security: Only allow authenticated users to award XP to themselves, service role, OR dev users
  IF auth.uid() IS NULL AND NOT is_dev_user AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Insufficient permissions to award XP';
  END IF;
  
  IF auth.uid() IS NOT NULL AND auth.uid() != user_id_param AND auth.role() != 'service_role' THEN
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