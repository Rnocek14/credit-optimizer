-- Fix security warnings by adding search_path to trigger functions

-- Update enhanced_user_profiles trigger function
CREATE OR REPLACE FUNCTION update_enhanced_user_profiles_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update goal_learning_paths trigger function  
CREATE OR REPLACE FUNCTION update_goal_learning_paths_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;