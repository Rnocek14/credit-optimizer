-- Fix function search path security warnings
-- Update existing functions to have secure search_path

ALTER FUNCTION public.update_pattern_recognition_updated_at() 
SET search_path = 'public';

ALTER FUNCTION public.update_user_xp_last_updated() 
SET search_path = 'public';

ALTER FUNCTION public.update_career_graph_nodes_updated_at() 
SET search_path = 'public';

ALTER FUNCTION public.update_user_market_preferences_updated_at() 
SET search_path = 'public';