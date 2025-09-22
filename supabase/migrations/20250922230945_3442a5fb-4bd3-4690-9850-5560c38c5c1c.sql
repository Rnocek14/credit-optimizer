-- Create student evidence tables for transcript/resume importing

-- Main documents table
CREATE TABLE public.student_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('transcript', 'resume')),
  source TEXT NOT NULL CHECK (source IN ('pdf', 'docx', 'csv', 'json')),
  storage_path TEXT NOT NULL,
  parsed_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Raw course data extracted from transcripts
CREATE TABLE public.student_courses_raw (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  doc_id UUID REFERENCES public.student_documents(id) ON DELETE CASCADE,
  institution TEXT,
  term TEXT,
  subject TEXT,
  number TEXT,
  title TEXT,
  credits DECIMAL,
  grade TEXT,
  raw_line TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mapping from raw courses to catalog courses
CREATE TABLE public.student_course_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  raw_id UUID REFERENCES public.student_courses_raw(id) ON DELETE CASCADE,
  catalog_course_id TEXT NOT NULL,
  confidence DECIMAL CHECK (confidence >= 0 AND confidence <= 1),
  method TEXT CHECK (method IN ('code', 'title', 'fuzzy', 'manual')),
  status TEXT CHECK (status IN ('auto', 'confirmed', 'rejected')) DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Skills/certs from resumes
CREATE TABLE public.student_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  doc_id UUID REFERENCES public.student_documents(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  confidence DECIMAL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Work experiences from resumes  
CREATE TABLE public.student_experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  doc_id UUID REFERENCES public.student_documents(id) ON DELETE CASCADE,
  role TEXT,
  employer TEXT,
  start_date DATE,
  end_date DATE,
  normalized_tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_courses_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_course_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_experiences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access
CREATE POLICY "Users can view their own documents" 
ON public.student_documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" 
ON public.student_documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON public.student_documents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON public.student_documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for student_courses_raw
CREATE POLICY "Users can view their own raw courses" 
ON public.student_courses_raw 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own raw courses" 
ON public.student_courses_raw 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own raw courses" 
ON public.student_courses_raw 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own raw courses" 
ON public.student_courses_raw 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for student_course_map
CREATE POLICY "Users can view their own course mappings" 
ON public.student_course_map 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own course mappings" 
ON public.student_course_map 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own course mappings" 
ON public.student_course_map 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own course mappings" 
ON public.student_course_map 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for student_skills
CREATE POLICY "Users can view their own skills" 
ON public.student_skills 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skills" 
ON public.student_skills 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills" 
ON public.student_skills 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skills" 
ON public.student_skills 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for student_experiences
CREATE POLICY "Users can view their own experiences" 
ON public.student_experiences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own experiences" 
ON public.student_experiences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own experiences" 
ON public.student_experiences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own experiences" 
ON public.student_experiences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_student_documents_user_id ON public.student_documents(user_id);
CREATE INDEX idx_student_courses_raw_user_id ON public.student_courses_raw(user_id);
CREATE INDEX idx_student_courses_raw_doc_id ON public.student_courses_raw(doc_id);
CREATE INDEX idx_student_course_map_user_id ON public.student_course_map(user_id);
CREATE INDEX idx_student_course_map_catalog_course_id ON public.student_course_map(catalog_course_id);
CREATE INDEX idx_student_skills_user_id ON public.student_skills(user_id);
CREATE INDEX idx_student_experiences_user_id ON public.student_experiences(user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_student_documents_updated_at
  BEFORE UPDATE ON public.student_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();