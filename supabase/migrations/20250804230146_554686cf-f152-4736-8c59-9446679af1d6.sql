-- Create user roles table with proper structure
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  role app_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    'user'
  );
  
  -- Insert into user_roles  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add some sample users and roles for testing
INSERT INTO public.profiles (user_id, name, email, role) VALUES 
('2b458624-d498-4cca-a63d-9341cc20e363', 'Aisha Khan', 'aisha@demo.com', 'mentor'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'Mateo Silva', 'mateo@demo.com', 'mentor'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'Jade Chen', 'jade@demo.com', 'admin')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES 
('2b458624-d498-4cca-a63d-9341cc20e363', 'mentor'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'mentor'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'admin'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'mentor')
ON CONFLICT (user_id, role) DO NOTHING;

-- Add sample teaching courses
INSERT INTO public.teaching_courses (
  id, educator_id, title, description, course_code, status, difficulty, max_students
) VALUES 
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  '2b458624-d498-4cca-a63d-9341cc20e363',
  'Introduction to Data Science',
  'Learn the fundamentals of data science including Python, statistics, and machine learning basics.',
  'DS101',
  'published',
  'beginner',
  30
),
(
  'b2c3d4e5-f6g7-8901-bcde-f23456789012'::uuid,
  '3c459625-e499-5ddb-b64d-a442dd21f474',
  'Advanced React Development',
  'Master advanced React patterns, hooks, and state management for modern web applications.',
  'REACT301',
  'published',
  'advanced',
  25
),
(
  'c3d4e5f6-g7h8-9012-cdef-345678901234'::uuid,
  '2b458624-d498-4cca-a63d-9341cc20e363',
  'Machine Learning Fundamentals',
  'Deep dive into machine learning algorithms and practical applications.',
  'ML201',
  'draft',
  'intermediate',
  20
)
ON CONFLICT (id) DO NOTHING;

-- Add sample course enrollments
INSERT INTO public.course_enrollments (
  student_id, course_id, status, progress_percentage, enrolled_at
) VALUES 
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'active', 45, now() - interval '2 weeks'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'active', 78, now() - interval '1 month'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'active', 23, now() - interval '1 week')
ON CONFLICT DO NOTHING;

-- Add sample assignments
INSERT INTO public.course_assignments (
  course_id, title, description, assignment_type, max_points, due_date
) VALUES 
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Python Basics Project', 'Create a simple data analysis project using Python and pandas', 'project', 100, now() + interval '2 weeks'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Statistics Quiz', 'Multiple choice quiz on descriptive statistics', 'quiz', 50, now() + interval '1 week'),
('b2c3d4e5-f6g7-8901-bcde-f23456789012', 'React Component Library', 'Build a reusable component library with TypeScript', 'project', 150, now() + interval '3 weeks')
ON CONFLICT DO NOTHING;