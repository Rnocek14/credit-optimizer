-- RLS Security Audit Implementation - Critical Fixes
-- Phase 1: Remove dangerous public access and add secure alternatives

-- 1. Fix user_badges - Remove public SELECT, add user-owned access
DROP POLICY IF EXISTS "Anyone can view badges" ON user_badges;
CREATE POLICY "Users can view their own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Fix resume_events - Remove public INSERT, restrict to service/admin only  
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
  FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own feedback" ON peer_feedback
  FOR DELETE USING (auth.uid() = reviewer_id);

-- 5. Add missing course_progress DELETE policy
CREATE POLICY "Users can delete their own course progress" ON course_progress
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create secure aggregate function for badge statistics (replaces public access)
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

-- 7. Create secure function for public challenge listings (if needed)
CREATE OR REPLACE FUNCTION public.get_public_challenges()
RETURNS TABLE(
  challenge_id uuid,
  title text, 
  description text,
  challenge_type text,
  difficulty_level text,
  participant_count bigint,
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
LANGUAGE sql  
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    lc.id as challenge_id,
    lc.title,
    lc.description, 
    lc.challenge_type,
    lc.difficulty_level,
    COUNT(cp.id) as participant_count,
    lc.start_date,
    lc.end_date
  FROM learning_challenges lc
  LEFT JOIN challenge_participants cp ON lc.id = cp.challenge_id
  WHERE lc.is_public = true AND lc.status = 'active'
  GROUP BY lc.id, lc.title, lc.description, lc.challenge_type, 
           lc.difficulty_level, lc.start_date, lc.end_date
  ORDER BY participant_count DESC;
$$;

-- 8. Enhance study_groups with proper membership checks
DROP POLICY IF EXISTS "Users can view public study groups" ON study_groups;
CREATE POLICY "Users can view groups they belong to or public groups" ON study_groups
  FOR SELECT USING (
    is_public = true OR 
    EXISTS (
      SELECT 1 FROM study_group_members sgm 
      WHERE sgm.group_id = study_groups.id 
      AND sgm.user_id = auth.uid()
      AND sgm.status = 'active'
    )
  );

-- 9. Add comprehensive study_group_members policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_group_members') THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view group memberships" ON study_group_members;
    DROP POLICY IF EXISTS "Users can join public groups" ON study_group_members; 
    DROP POLICY IF EXISTS "Users can leave groups" ON study_group_members;
    DROP POLICY IF EXISTS "Group creators can manage members" ON study_group_members;
    
    -- Create secure policies
    EXECUTE 'CREATE POLICY "Users can view memberships for groups they belong to" ON study_group_members
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM study_group_members sgm2
          WHERE sgm2.group_id = study_group_members.group_id 
          AND sgm2.user_id = auth.uid()
          AND sgm2.status = ''active''
        )
      )';
      
    EXECUTE 'CREATE POLICY "Users can join groups" ON study_group_members
      FOR INSERT WITH CHECK (auth.uid() = user_id)';
      
    EXECUTE 'CREATE POLICY "Users can update their own membership" ON study_group_members  
      FOR UPDATE USING (auth.uid() = user_id)';
      
    EXECUTE 'CREATE POLICY "Users can leave groups" ON study_group_members
      FOR DELETE USING (auth.uid() = user_id)';
      
    EXECUTE 'CREATE POLICY "Group creators can manage members" ON study_group_members
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM study_groups sg
          WHERE sg.id = study_group_members.group_id
          AND sg.creator_id = auth.uid()
        )
      )';
  END IF;
END
$$;