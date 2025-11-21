-- Instructions to make yourself an admin:
-- 1. First, make sure you're logged in to your app
-- 2. Find your user ID by running this query:
--    SELECT id, email FROM auth.users;
-- 3. Replace 'YOUR_USER_ID_HERE' below with your actual user ID
-- 4. Run this insert statement

-- Example: Add admin role to a user
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('YOUR_USER_ID_HERE', 'admin');

-- You can also add multiple roles if needed:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES 
--   ('user-id-1', 'admin'),
--   ('user-id-2', 'moderator'),
--   ('user-id-3', 'user');

-- To check if your role was added successfully:
-- SELECT * FROM public.user_roles WHERE user_id = 'YOUR_USER_ID_HERE';

-- To remove a role:
-- DELETE FROM public.user_roles WHERE user_id = 'YOUR_USER_ID_HERE' AND role = 'admin';
