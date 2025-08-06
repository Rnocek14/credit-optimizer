-- Create mentor analytics and leaderboard tables

-- Mentor performance metrics table
CREATE TABLE public.mentor_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  courses_reviewed INTEGER DEFAULT 0,
  courses_approved INTEGER DEFAULT 0,
  courses_rejected INTEGER DEFAULT 0,
  avg_review_time_hours NUMERIC DEFAULT 0,
  impact_score NUMERIC DEFAULT 0,
  quality_score NUMERIC DEFAULT 0,
  student_engagement_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Mentor achievements and badges
CREATE TABLE public.mentor_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  badge_emoji TEXT,
  points_awarded INTEGER DEFAULT 0,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.mentor_achievements ENABLE ROW LEVEL SECURITY;

-- Mentor leaderboard rankings
CREATE TABLE public.mentor_leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  period_type TEXT NOT NULL, -- 'weekly', 'monthly', 'all_time'
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  rank_position INTEGER NOT NULL,
  total_points INTEGER DEFAULT 0,
  validation_score NUMERIC DEFAULT 0,
  impact_score NUMERIC DEFAULT 0,
  speed_score NUMERIC DEFAULT 0,
  quality_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, period_type, period_start)
);

-- Enable RLS
ALTER TABLE public.mentor_leaderboard ENABLE ROW LEVEL SECURITY;

-- Mentor collaboration and discussions
CREATE TABLE public.mentor_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  mentor_id UUID NOT NULL,
  discussion_type TEXT NOT NULL, -- 'review_discussion', 'collaborative_review', 'general'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_discussions ENABLE ROW LEVEL SECURITY;

-- Discussion replies
CREATE TABLE public.mentor_discussion_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.mentor_discussions(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_discussion_replies ENABLE ROW LEVEL SECURITY;

-- Student feedback on mentor-approved courses
CREATE TABLE public.mentor_course_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  student_id UUID NOT NULL,
  mentor_id UUID NOT NULL, -- The mentor who approved this course
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  course_quality_rating INTEGER CHECK (course_quality_rating >= 1 AND course_quality_rating <= 5),
  learning_outcome_rating INTEGER CHECK (learning_outcome_rating >= 1 AND learning_outcome_rating <= 5),
  would_recommend BOOLEAN DEFAULT true,
  completed_course BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_course_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Mentor performance metrics
CREATE POLICY "Mentors can view their own performance metrics" 
ON public.mentor_performance_metrics 
FOR SELECT 
USING (validate_mentor_operation(mentor_id) AND auth.uid() = mentor_id);

CREATE POLICY "Service role can manage performance metrics" 
ON public.mentor_performance_metrics 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Mentor achievements
CREATE POLICY "Mentors can view their own achievements" 
ON public.mentor_achievements 
FOR SELECT 
USING (validate_mentor_operation(mentor_id) AND auth.uid() = mentor_id);

CREATE POLICY "Anyone can view achievements for leaderboard" 
ON public.mentor_achievements 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage achievements" 
ON public.mentor_achievements 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Mentor leaderboard
CREATE POLICY "Anyone can view leaderboard" 
ON public.mentor_leaderboard 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage leaderboard" 
ON public.mentor_leaderboard 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Mentor discussions
CREATE POLICY "Mentors can manage discussions" 
ON public.mentor_discussions 
FOR ALL 
USING (validate_mentor_operation(auth.uid()))
WITH CHECK (validate_mentor_operation(auth.uid()));

-- Discussion replies
CREATE POLICY "Mentors can manage discussion replies" 
ON public.mentor_discussion_replies 
FOR ALL 
USING (validate_mentor_operation(auth.uid()))
WITH CHECK (validate_mentor_operation(auth.uid()));

-- Mentor course feedback
CREATE POLICY "Students can create feedback" 
ON public.mentor_course_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own feedback" 
ON public.mentor_course_feedback 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Mentors can view feedback on their approved courses" 
ON public.mentor_course_feedback 
FOR SELECT 
USING (validate_mentor_operation(auth.uid()) AND auth.uid() = mentor_id);

CREATE POLICY "Service role can manage all feedback" 
ON public.mentor_course_feedback 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to calculate mentor performance metrics
CREATE OR REPLACE FUNCTION public.calculate_mentor_performance_metrics(
  mentor_user_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
  courses_reviewed INTEGER,
  courses_approved INTEGER,
  courses_rejected INTEGER,
  approval_rate NUMERIC,
  avg_review_time_hours NUMERIC,
  impact_score NUMERIC,
  quality_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH validation_stats AS (
    SELECT 
      COUNT(*) as total_reviewed,
      COUNT(*) FILTER (WHERE mentor_validation_status = 'approved') as approved,
      COUNT(*) FILTER (WHERE mentor_validation_status = 'rejected') as rejected,
      AVG(EXTRACT(EPOCH FROM (COALESCE(validated_at, now()) - created_at)) / 3600) as avg_hours
    FROM public.course_intelligence_pipeline
    WHERE validated_by = mentor_user_id
      AND validated_at BETWEEN start_date AND end_date
  ),
  feedback_stats AS (
    SELECT 
      AVG(course_quality_rating)::NUMERIC as avg_quality,
      AVG(learning_outcome_rating)::NUMERIC as avg_outcome
    FROM public.mentor_course_feedback mcf
    JOIN public.course_intelligence_pipeline cip ON cip.course_id = mcf.course_id
    WHERE cip.validated_by = mentor_user_id
      AND mcf.created_at BETWEEN start_date AND end_date
  )
  SELECT 
    vs.total_reviewed::INTEGER,
    vs.approved::INTEGER,
    vs.rejected::INTEGER,
    CASE WHEN vs.total_reviewed > 0 THEN (vs.approved::NUMERIC / vs.total_reviewed * 100) ELSE 0 END,
    COALESCE(vs.avg_hours, 0)::NUMERIC,
    COALESCE(fs.avg_outcome * 20, 50)::NUMERIC, -- Convert 1-5 scale to 0-100
    COALESCE(fs.avg_quality * 20, 50)::NUMERIC   -- Convert 1-5 scale to 0-100
  FROM validation_stats vs
  CROSS JOIN feedback_stats fs;
END;
$$;

-- Create function to update mentor leaderboard
CREATE OR REPLACE FUNCTION public.update_mentor_leaderboard(period_type TEXT DEFAULT 'weekly')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_date TIMESTAMP WITH TIME ZONE;
  end_date TIMESTAMP WITH TIME ZONE;
  mentor_record RECORD;
  rank_counter INTEGER := 1;
BEGIN
  -- Calculate period boundaries
  IF period_type = 'weekly' THEN
    start_date := date_trunc('week', now());
    end_date := start_date + interval '1 week';
  ELSIF period_type = 'monthly' THEN
    start_date := date_trunc('month', now());
    end_date := start_date + interval '1 month';
  ELSE -- all_time
    start_date := '2024-01-01'::timestamp with time zone;
    end_date := now() + interval '1 day';
  END IF;

  -- Clear existing leaderboard for this period
  DELETE FROM public.mentor_leaderboard 
  WHERE period_type = update_mentor_leaderboard.period_type 
    AND period_start = start_date;

  -- Calculate and insert new rankings
  FOR mentor_record IN (
    WITH mentor_stats AS (
      SELECT 
        p.user_id as mentor_id,
        COUNT(cip.id) as validations_count,
        AVG(CASE WHEN cip.mentor_validation_status = 'approved' THEN 100 ELSE 0 END) as approval_rate,
        AVG(EXTRACT(EPOCH FROM (COALESCE(cip.validated_at, now()) - cip.created_at)) / 3600) as avg_review_hours,
        COALESCE(AVG(mcf.course_quality_rating), 3) as avg_quality
      FROM public.profiles p
      WHERE p.role = 'mentor'
        AND EXISTS (
          SELECT 1 FROM public.course_intelligence_pipeline cip2 
          WHERE cip2.validated_by = p.user_id 
            AND cip2.validated_at BETWEEN start_date AND end_date
        )
      LEFT JOIN public.course_intelligence_pipeline cip ON cip.validated_by = p.user_id 
        AND cip.validated_at BETWEEN start_date AND end_date
      LEFT JOIN public.mentor_course_feedback mcf ON mcf.mentor_id = p.user_id
        AND mcf.created_at BETWEEN start_date AND end_date
      GROUP BY p.user_id
    )
    SELECT 
      mentor_id,
      validations_count,
      approval_rate,
      (100 - LEAST(avg_review_hours, 24)) as speed_score, -- Faster = higher score
      (avg_quality * 20) as quality_score, -- Convert to 0-100 scale
      (validations_count * 10 + approval_rate + (100 - LEAST(avg_review_hours, 24)) + (avg_quality * 20)) as total_points
    FROM mentor_stats
    ORDER BY total_points DESC
  ) LOOP
    INSERT INTO public.mentor_leaderboard (
      mentor_id, period_type, period_start, period_end, rank_position,
      total_points, validation_score, impact_score, speed_score, quality_score
    ) VALUES (
      mentor_record.mentor_id, period_type, start_date, end_date, rank_counter,
      mentor_record.total_points, mentor_record.validations_count * 10,
      mentor_record.approval_rate, mentor_record.speed_score, mentor_record.quality_score
    );
    
    rank_counter := rank_counter + 1;
  END LOOP;
END;
$$;

-- Create function to award mentor achievements
CREATE OR REPLACE FUNCTION public.check_mentor_achievements(mentor_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  validation_count INTEGER;
  approval_rate NUMERIC;
  avg_quality NUMERIC;
BEGIN
  -- Get mentor stats
  SELECT 
    COUNT(*),
    AVG(CASE WHEN mentor_validation_status = 'approved' THEN 100 ELSE 0 END),
    COALESCE(AVG(mcf.course_quality_rating), 3)
  INTO validation_count, approval_rate, avg_quality
  FROM public.course_intelligence_pipeline cip
  LEFT JOIN public.mentor_course_feedback mcf ON mcf.mentor_id = mentor_user_id
  WHERE cip.validated_by = mentor_user_id;

  -- First Validation Achievement
  IF validation_count >= 1 AND NOT EXISTS (
    SELECT 1 FROM public.mentor_achievements 
    WHERE mentor_id = mentor_user_id AND achievement_type = 'first_validation'
  ) THEN
    INSERT INTO public.mentor_achievements (mentor_id, achievement_type, achievement_name, description, badge_emoji, points_awarded)
    VALUES (mentor_user_id, 'first_validation', 'First Steps', 'Completed your first course validation', '🚀', 10);
  END IF;

  -- Prolific Validator (10 validations)
  IF validation_count >= 10 AND NOT EXISTS (
    SELECT 1 FROM public.mentor_achievements 
    WHERE mentor_id = mentor_user_id AND achievement_type = 'prolific_validator'
  ) THEN
    INSERT INTO public.mentor_achievements (mentor_id, achievement_type, achievement_name, description, badge_emoji, points_awarded)
    VALUES (mentor_user_id, 'prolific_validator', 'Prolific Validator', 'Validated 10+ courses', '⭐', 50);
  END IF;

  -- Quality Champion (high approval rate with 5+ validations)
  IF validation_count >= 5 AND approval_rate >= 80 AND NOT EXISTS (
    SELECT 1 FROM public.mentor_achievements 
    WHERE mentor_id = mentor_user_id AND achievement_type = 'quality_champion'
  ) THEN
    INSERT INTO public.mentor_achievements (mentor_id, achievement_type, achievement_name, description, badge_emoji, points_awarded)
    VALUES (mentor_user_id, 'quality_champion', 'Quality Champion', 'Maintained 80%+ approval rate with 5+ validations', '🏆', 75);
  END IF;

  -- Student Favorite (high student ratings)
  IF avg_quality >= 4.5 AND NOT EXISTS (
    SELECT 1 FROM public.mentor_achievements 
    WHERE mentor_id = mentor_user_id AND achievement_type = 'student_favorite'
  ) THEN
    INSERT INTO public.mentor_achievements (mentor_id, achievement_type, achievement_name, description, badge_emoji, points_awarded)
    VALUES (mentor_user_id, 'student_favorite', 'Student Favorite', 'Averaged 4.5+ stars from student feedback', '💝', 100);
  END IF;
END;
$$;