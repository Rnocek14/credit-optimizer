-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user';

-- Create an index for better performance
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Update RLS policies to allow admin role checks
CREATE OR REPLACE FUNCTION public.get_user_role(user_id_param uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_id_param LIMIT 1;
$$;