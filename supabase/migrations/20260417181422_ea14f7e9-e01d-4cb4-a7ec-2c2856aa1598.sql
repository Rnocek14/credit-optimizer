
UPDATE public.institution_policy_packs
SET status = 'active',
    promoted_at = now()
WHERE id = 'ec135abd-4c51-430f-94a3-3524deff9eae';
