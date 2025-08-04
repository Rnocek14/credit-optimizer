-- Create teaching courses table
CREATE TABLE public.teaching_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  educator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  course_code TEXT,
  enrollment_capacity INTEGER DEFAULT 30,
  enrollment_count INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  skill_tags TEXT[] DEFAULT '{}',
  difficulty_level TEXT DEFAULT 'beginner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course enrollments table
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.teaching_courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  progress_percentage INTEGER DEFAULT 0,
  final_grade NUMERIC,
  UNIQUE(course_id, student_id)
);

-- Create assignments table
CREATE TABLE public.course_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.teaching_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  max_points NUMERIC DEFAULT 100,
  assignment_type TEXT DEFAULT 'homework',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.course_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  submission_text TEXT,
  submission_files JSONB DEFAULT '[]',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  grade NUMERIC,
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID,
  UNIQUE(assignment_id, student_id)
);

-- Enable RLS on all tables
ALTER TABLE public.teaching_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teaching_courses
CREATE POLICY "Educators can manage their own courses"
ON public.teaching_courses
FOR ALL
USING (auth.uid() = educator_id)
WITH CHECK (auth.uid() = educator_id);

CREATE POLICY "Anyone can view published courses"
ON public.teaching_courses
FOR SELECT
USING (status = 'published');

-- RLS Policies for course_enrollments
CREATE POLICY "Educators can view enrollments for their courses"
ON public.course_enrollments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.teaching_courses tc 
  WHERE tc.id = course_enrollments.course_id 
  AND tc.educator_id = auth.uid()
));

CREATE POLICY "Students can view their own enrollments"
ON public.course_enrollments
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Educators can manage enrollments for their courses"
ON public.course_enrollments
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.teaching_courses tc 
  WHERE tc.id = course_enrollments.course_id 
  AND tc.educator_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.teaching_courses tc 
  WHERE tc.id = course_enrollments.course_id 
  AND tc.educator_id = auth.uid()
));

-- RLS Policies for course_assignments
CREATE POLICY "Educators can manage assignments for their courses"
ON public.course_assignments
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.teaching_courses tc 
  WHERE tc.id = course_assignments.course_id 
  AND tc.educator_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.teaching_courses tc 
  WHERE tc.id = course_assignments.course_id 
  AND tc.educator_id = auth.uid()
));

CREATE POLICY "Students can view assignments for enrolled courses"
ON public.course_assignments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.course_enrollments ce 
  WHERE ce.course_id = course_assignments.course_id 
  AND ce.student_id = auth.uid()
  AND ce.status = 'active'
));

-- RLS Policies for assignment_submissions
CREATE POLICY "Students can manage their own submissions"
ON public.assignment_submissions
FOR ALL
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Educators can view and grade submissions for their assignments"
ON public.assignment_submissions
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.course_assignments ca
  JOIN public.teaching_courses tc ON tc.id = ca.course_id
  WHERE ca.id = assignment_submissions.assignment_id 
  AND tc.educator_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.course_assignments ca
  JOIN public.teaching_courses tc ON tc.id = ca.course_id
  WHERE ca.id = assignment_submissions.assignment_id 
  AND tc.educator_id = auth.uid()
));

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teaching_courses_updated_at
  BEFORE UPDATE ON public.teaching_courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_assignments_updated_at
  BEFORE UPDATE ON public.course_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();