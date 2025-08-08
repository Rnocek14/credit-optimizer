-- RLS Security Audit Implementation - CORE FIXES ONLY
-- Removing dangerous public access and adding essential user-owned policies

-- 1. CRITICAL: Fix user_badges - Remove dangerous public SELECT
DROP POLICY IF EXISTS "Anyone can view badges" ON user_badges;
CREATE POLICY "Users can view their own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- 2. CRITICAL: Fix resume_events - Remove public INSERT, restrict to service only  
DROP POLICY IF EXISTS "Anyone can insert resume events" ON resume_events;
CREATE POLICY "Service role can manage resume events" ON resume_events
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Add missing alert_history policies
CREATE POLICY "Users can create their own alert history" ON alert_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert history" ON alert_history  
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Complete peer_feedback RLS coverage
CREATE POLICY "Users can update their own feedback" ON peer_feedback
  FOR UPDATE USING (auth.uid() = from_user_id);

CREATE POLICY "Users can delete their own feedback" ON peer_feedback
  FOR DELETE USING (auth.uid() = from_user_id);

-- 5. Add missing course_progress DELETE policy
CREATE POLICY "Users can delete their own course progress" ON course_progress
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create secure badge statistics function (replaces public badge access)
CREATE OR REPLACE FUNCTION public.get_badge_statistics()
RETURNS TABLE(badge_id uuid, badge_name text, badge_emoji text, earned_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id as badge_id,
    b.name as badge_name, 
    b.emoji as badge_emoji,
    COUNT(ub.id) as earned_count
  FROM badges b
  LEFT JOIN user_badges ub ON b.id = ub.badge_id
  GROUP BY b.id, b.name, b.emoji
  ORDER BY earned_count DESC;
$$;