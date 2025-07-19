-- Fix demo users visibility on /demos page

-- 1. First, ensure demo user profiles exist in the profiles table (using INSERT OR UPDATE approach)
DO $$
BEGIN
  -- Insert or update Aisha Khan
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363'::uuid) THEN
    UPDATE public.profiles SET name = 'Aisha Khan' WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363'::uuid;
  ELSE
    INSERT INTO public.profiles (user_id, name) VALUES ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Aisha Khan');
  END IF;

  -- Insert or update Mateo Silva
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid) THEN
    UPDATE public.profiles SET name = 'Mateo Silva' WHERE user_id = '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid;
  ELSE
    INSERT INTO public.profiles (user_id, name) VALUES ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'Mateo Silva');
  END IF;

  -- Insert or update Jade Chen
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid) THEN
    UPDATE public.profiles SET name = 'Jade Chen' WHERE user_id = '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid;
  ELSE
    INSERT INTO public.profiles (user_id, name) VALUES ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'Jade Chen');
  END IF;
END $$;

-- 2. Ensure demo users have some basic XP data
INSERT INTO public.user_xp (user_id, total_xp) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 150),
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 300),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 75)
ON CONFLICT (user_id) 
DO UPDATE SET total_xp = GREATEST(user_xp.total_xp, EXCLUDED.total_xp);

-- 3. Create some sample resume drafts for demo users if they don't exist
INSERT INTO public.ai_resume_drafts (user_id, title, content, published_to_profile) 
SELECT user_id, title, content::jsonb, published_to_profile
FROM (VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Software Engineer Resume', '{"sections": [{"type": "header", "content": {"name": "Aisha Khan", "title": "Software Engineer"}}]}', true),
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'Product Manager Resume', '{"sections": [{"type": "header", "content": {"name": "Mateo Silva", "title": "Product Manager"}}]}', true),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'UX Designer Resume', '{"sections": [{"type": "header", "content": {"name": "Jade Chen", "title": "UX Designer"}}]}', true)
) AS demo_data(user_id, title, content, published_to_profile)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_resume_drafts 
  WHERE ai_resume_drafts.user_id = demo_data.user_id
);

-- 4. Update existing unpublished resumes for demo users to be published
UPDATE public.ai_resume_drafts 
SET published_to_profile = true 
WHERE user_id IN (
  '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,
  '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid
);

-- 5. Recreate the get_demo_resume_profiles function with better resilience
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
  WITH demo_users AS (
    SELECT 
      p.user_id,
      p.name,
      CASE 
        WHEN p.user_id = '2b458624-d498-4cca-a63d-9341cc20e363'::uuid THEN 'aisha@demo.com'
        WHEN p.user_id = '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid THEN 'mateo@demo.com'
        WHEN p.user_id = '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid THEN 'jade@demo.com'
        ELSE 'unknown@demo.com'
      END as email
    FROM public.profiles p
    WHERE p.user_id IN (
      '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,
      '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,
      '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid
    )
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
  ),
  published_resumes AS (
    SELECT DISTINCT ON (ard.user_id)
      ard.user_id,
      ard.id as resume_id,
      ard.created_at
    FROM public.ai_resume_drafts ard
    WHERE ard.published_to_profile = true
    ORDER BY ard.user_id, ard.created_at DESC
  )
  SELECT 
    du.user_id,
    du.name,
    du.email,
    pr.resume_id,
    pr.created_at,
    NULL::text as slug, -- placeholder for future slug implementation
    COALESCE(ul.total_xp, 0) as total_xp,
    COALESCE(ul.current_level, 1) as current_level,
    COALESCE(ubd.badges, '[]'::jsonb) as earned_badges
  FROM demo_users du
  LEFT JOIN published_resumes pr ON pr.user_id = du.user_id
  LEFT JOIN user_levels ul ON ul.user_id = du.user_id
  LEFT JOIN user_badge_data ubd ON ubd.user_id = du.user_id
  WHERE pr.resume_id IS NOT NULL -- Only include users with published resumes
  ORDER BY du.name;
$$;