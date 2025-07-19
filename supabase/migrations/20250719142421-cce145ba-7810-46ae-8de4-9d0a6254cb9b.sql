-- Get a specific badge by slug and show user-earned status
CREATE OR REPLACE FUNCTION get_badge_for_user(badge_slug text, user_uuid uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  emoji text,
  trigger_type text,
  description text,
  threshold numeric,
  user_has_earned boolean,
  earned_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
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
$$;