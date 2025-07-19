-- 1. Publish resumes for all demo users using their known user_ids
DO $$
DECLARE
    aisha_user_id uuid := '2b458624-d498-4cca-a63d-9341cc20e363'::uuid;
    mateo_user_id uuid := '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid;
    jade_user_id uuid := '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid;
BEGIN
    -- Update ai_resume_drafts to mark demo resumes as published
    UPDATE public.ai_resume_drafts
    SET published_to_profile = true
    WHERE user_id IN (aisha_user_id, mateo_user_id, jade_user_id);
END $$;

-- 2. Create helper function to get demo resume profiles
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
            ux.total_xp,
            CASE 
                WHEN ux.total_xp < 100 THEN 1
                WHEN ux.total_xp < 250 THEN 2
                WHEN ux.total_xp < 500 THEN 3
                WHEN ux.total_xp < 1000 THEN 4
                ELSE 4 + ((ux.total_xp - 500) / 500)
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
        du.user_id,
        du.name,
        du.email,
        ard.id as resume_id,
        ard.created_at,
        NULL::text as slug, -- placeholder for future slug implementation
        COALESCE(ul.total_xp, 0) as total_xp,
        COALESCE(ul.current_level, 1) as current_level,
        COALESCE(ubd.badges, '[]'::jsonb) as earned_badges
    FROM demo_users du
    LEFT JOIN public.ai_resume_drafts ard ON ard.user_id = du.user_id AND ard.published_to_profile = true
    LEFT JOIN user_levels ul ON ul.user_id = du.user_id
    LEFT JOIN user_badge_data ubd ON ubd.user_id = du.user_id
    WHERE ard.id IS NOT NULL -- Only include users with published resumes
    ORDER BY du.name;
$$;