-- Create saved_courses table for user course bookmarks
CREATE TABLE public.saved_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.recommended_courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure only one save per user per course
  UNIQUE(user_id, course_id)
);

-- Enable Row Level Security
ALTER TABLE public.saved_courses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own saved courses" 
ON public.saved_courses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can save courses for themselves" 
ON public.saved_courses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave their own courses" 
ON public.saved_courses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Service role can manage all saved courses
CREATE POLICY "Service role can manage all saved courses" 
ON public.saved_courses 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_saved_courses_user_id ON public.saved_courses(user_id);
CREATE INDEX idx_saved_courses_course_id ON public.saved_courses(course_id);