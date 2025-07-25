-- Fix the remaining function search_path security warning for the new function
ALTER FUNCTION public.update_user_market_preferences_updated_at() SET search_path TO 'public';