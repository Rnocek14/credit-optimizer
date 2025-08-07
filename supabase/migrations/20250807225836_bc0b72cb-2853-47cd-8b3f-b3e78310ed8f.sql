-- Fix security issues from the previous migration
-- Add proper search_path to security definer functions

-- Fix the handle_new_user function to include proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email,'@',1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;