-- Create the missing on_auth_user_created trigger
-- This trigger ensures that when a user signs up via auth.users, 
-- a corresponding profile is automatically created in public.profiles

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();