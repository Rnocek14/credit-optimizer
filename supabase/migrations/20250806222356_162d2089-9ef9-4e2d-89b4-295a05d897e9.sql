-- Fix RLS policies for maya_feedback_correlations table
CREATE POLICY "Users can insert their own maya feedback correlations" 
ON public.maya_feedback_correlations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fix RLS policies for learning_engagement_sessions table  
CREATE POLICY "Users can insert their own learning sessions" 
ON public.learning_engagement_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning sessions" 
ON public.learning_engagement_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Fix RLS policies for motivation_interventions table
CREATE POLICY "Users can insert their own motivation interventions" 
ON public.motivation_interventions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own motivation interventions" 
ON public.motivation_interventions 
FOR UPDATE 
USING (auth.uid() = user_id);