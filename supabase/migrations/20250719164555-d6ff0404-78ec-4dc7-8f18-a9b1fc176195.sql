-- Fix demo users visibility - create function that works with existing data

-- First, let's see what resume data we actually have and create a more resilient function
DROP FUNCTION IF EXISTS public.get_demo_resume_profiles();

CREATE OR REPLACE FUNCTION public.get_demo_resume_profiles()
RETURNS TABLE(
  user_id uuid,
  name text,
  email text,
  resume_id uuid,
  created_at timestamp with time zone,
  slug text,
  total_xp integer,
  current_level integer,
  earned_badges jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
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
$$;