-- Create user market preferences table
CREATE TABLE public.user_market_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_locations TEXT[] DEFAULT '{}',
  preferred_industries TEXT[] DEFAULT '{}',
  salary_range_min INTEGER,
  salary_range_max INTEGER,
  growth_preference TEXT CHECK (growth_preference IN ('stability', 'growth', 'high_growth')),
  risk_tolerance TEXT CHECK (risk_tolerance IN ('low', 'medium', 'high')),
  work_style TEXT CHECK (work_style IN ('remote', 'hybrid', 'onsite', 'flexible')),
  career_stage TEXT CHECK (career_stage IN ('entry', 'mid', 'senior', 'executive')),
  learning_preferences JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create personalized recommendations table
CREATE TABLE public.personalized_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('career_move', 'location_move', 'skill_development', 'market_alert')),
  priority_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  recommendation_data JSONB NOT NULL,
  reasoning TEXT,
  action_required TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create recommendation feedback table
CREATE TABLE public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES personalized_recommendations(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'irrelevant', 'completed')),
  feedback_text TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_market_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalized_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_market_preferences
CREATE POLICY "Users can manage their own market preferences"
ON public.user_market_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all market preferences"
ON public.user_market_preferences
FOR ALL
USING (true)
WITH CHECK (true);

-- Create RLS policies for personalized_recommendations
CREATE POLICY "Users can view their own recommendations"
ON public.personalized_recommendations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
ON public.personalized_recommendations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all recommendations"
ON public.personalized_recommendations
FOR ALL
USING (true)
WITH CHECK (true);

-- Create RLS policies for recommendation_feedback
CREATE POLICY "Users can manage their own recommendation feedback"
ON public.recommendation_feedback
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all recommendation feedback"
ON public.recommendation_feedback
FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_user_market_preferences_user_id ON public.user_market_preferences(user_id);
CREATE INDEX idx_personalized_recommendations_user_id ON public.personalized_recommendations(user_id);
CREATE INDEX idx_personalized_recommendations_status ON public.personalized_recommendations(status);
CREATE INDEX idx_personalized_recommendations_priority ON public.personalized_recommendations(priority_score DESC);
CREATE INDEX idx_recommendation_feedback_user_id ON public.recommendation_feedback(user_id);
CREATE INDEX idx_recommendation_feedback_recommendation_id ON public.recommendation_feedback(recommendation_id);

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_user_market_preferences_updated_at
  BEFORE UPDATE ON public.user_market_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_personalized_recommendations_updated_at
  BEFORE UPDATE ON public.personalized_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();