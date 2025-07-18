-- Create badge types table for admin-defined badges
CREATE TABLE public.badge_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  background_color TEXT,
  criteria_type TEXT, -- 'manual', 'ai_score', 'mentor_feedback', 'gallery_featured'
  criteria_value JSONB, -- flexible criteria storage
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user badges table for assigned badges
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type_id UUID NOT NULL REFERENCES public.badge_types(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_reason TEXT,
  metadata JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type_id)
);

-- Enable RLS
ALTER TABLE public.badge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badge types policies
CREATE POLICY "Anyone can view active badge types" 
ON public.badge_types 
FOR SELECT 
USING (active = true);

CREATE POLICY "Service role can manage badge types" 
ON public.badge_types 
FOR ALL 
USING (true)
WITH CHECK (true);

-- User badges policies  
CREATE POLICY "Anyone can view active user badges" 
ON public.user_badges 
FOR SELECT 
USING (active = true);

CREATE POLICY "Service role can manage user badges" 
ON public.user_badges 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their own badges" 
ON public.user_badges 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_badge_types_updated_at
BEFORE UPDATE ON public.badge_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_badges_updated_at
BEFORE UPDATE ON public.user_badges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default badge types
INSERT INTO public.badge_types (name, display_name, description, icon, color, background_color, criteria_type, criteria_value) VALUES
('top_1_percent', 'Top 1%', 'Exceptional candidates in the top 1% of all profiles', 'trophy', '#fbbf24', '#fef3c7', 'ai_score', '{"min_score": 95}'),
('innovation_expert', 'Innovation Expert', 'Recognized for innovative thinking and creative solutions', 'lightbulb', '#8b5cf6', '#ede9fe', 'manual', '{}'),
('mentor_recommended', 'Mentor Recommended', 'Highly recommended by industry mentors', 'star', '#10b981', '#d1fae5', 'mentor_feedback', '{"min_rating": 4, "recommendation": true}'),
('gallery_featured', 'Gallery Featured', 'Featured in the public resume gallery', 'eye', '#3b82f6', '#dbeafe', 'gallery_featured', '{}'),
('rapid_learner', 'Rapid Learner', 'Demonstrates exceptional learning capabilities', 'zap', '#f59e0b', '#fef3c7', 'manual', '{}'),
('leadership_potential', 'Leadership Potential', 'Shows strong leadership qualities and potential', 'users', '#ef4444', '#fee2e2', 'manual', '{}');