-- Fix critical security issues by adding proper RLS policies

-- Profiles table - restrict access to own data only
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Transcripts table - ensure only users can access their own data
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own transcripts" ON public.transcripts;

CREATE POLICY "Users can manage their own transcripts" ON public.transcripts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add missing age penalty curve sample data
INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor, notes) VALUES
(18, 25, 1.0, 'No age penalty for early career'),
(26, 30, 1.05, 'Minor penalty for late twenties career switches'),
(31, 35, 1.15, 'Moderate penalty for early thirties switches'),
(36, 40, 1.25, 'Higher penalty for late thirties switches'),
(41, 45, 1.4, 'Significant penalty for early forties switches'),
(46, 50, 1.6, 'Major penalty for late forties switches'),
(51, 65, 2.0, 'Maximum penalty for 50+ career switches')
ON CONFLICT DO NOTHING;

-- Service role policies for edge functions
CREATE POLICY "Service role can manage transcripts" ON public.transcripts
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage profiles" ON public.profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add sample career switch scenarios data
CREATE TABLE IF NOT EXISTS public.career_switch_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_track TEXT NOT NULL,
  to_track TEXT NOT NULL,
  skill_overlap_pct NUMERIC NOT NULL DEFAULT 0,
  time_saved_hours INTEGER NOT NULL DEFAULT 0,
  additional_learning_hours INTEGER NOT NULL DEFAULT 0,
  direct_cost NUMERIC NOT NULL DEFAULT 0,
  friction_cost NUMERIC NOT NULL DEFAULT 0,
  opportunity_cost NUMERIC NOT NULL DEFAULT 0,
  roi_3yr_pct NUMERIC NOT NULL DEFAULT 0,
  break_even_months INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE public.career_switch_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view career switch scenarios" ON public.career_switch_scenarios
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage career switch scenarios" ON public.career_switch_scenarios
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert sample career switch scenarios
INSERT INTO public.career_switch_scenarios (from_track, to_track, skill_overlap_pct, time_saved_hours, additional_learning_hours, direct_cost, friction_cost, opportunity_cost, roi_3yr_pct, break_even_months, notes) VALUES
('Software Engineer', 'Data Scientist', 65, 500, 800, 5000, 2000, 15000, 25, 18, 'Strong programming foundation helps with data science transition'),
('Marketing Manager', 'UX Designer', 40, 200, 1200, 8000, 3000, 20000, 30, 24, 'Creative and user focus skills transfer well'),
('Financial Analyst', 'Product Manager', 55, 400, 900, 6000, 2500, 18000, 35, 15, 'Analytical skills and business understanding are valuable'),
('Teacher', 'Technical Writer', 50, 300, 1000, 4000, 1500, 12000, 20, 20, 'Communication skills and subject matter expertise transfer'),
('Sales Representative', 'Customer Success Manager', 70, 600, 600, 3000, 1000, 10000, 40, 12, 'Customer relationship skills directly applicable')
ON CONFLICT DO NOTHING;