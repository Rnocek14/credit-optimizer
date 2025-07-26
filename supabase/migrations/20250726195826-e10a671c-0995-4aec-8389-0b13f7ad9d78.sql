-- Create personalized_recommendations table
CREATE TABLE public.personalized_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  career_path TEXT NOT NULL,
  location TEXT NOT NULL,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  impact_score INTEGER,
  effort_required TEXT,
  timeline TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  success_indicators JSONB DEFAULT '[]'::jsonb,
  related_data JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.personalized_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own recommendations" 
ON public.personalized_recommendations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recommendations" 
ON public.personalized_recommendations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations" 
ON public.personalized_recommendations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recommendations" 
ON public.personalized_recommendations 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all recommendations" 
ON public.personalized_recommendations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_personalized_recommendations_updated_at
BEFORE UPDATE ON public.personalized_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();