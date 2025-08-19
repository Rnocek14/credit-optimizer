-- Create institutions table for multi-institution support
CREATE TABLE public.institutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('university', 'bootcamp', 'online_platform', 'employer', 'certification_body')),
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  location TEXT,
  accreditation_level TEXT,
  established_year INTEGER,
  reputation_score NUMERIC DEFAULT 0.0,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'premium')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teachers table for instructor ratings and reviews
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  specializations TEXT[],
  profile_image_url TEXT,
  experience_years INTEGER,
  average_rating NUMERIC DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  outcome_score NUMERIC DEFAULT 0.0,
  response_rate NUMERIC DEFAULT 0.0,
  credentials JSONB DEFAULT '[]',
  social_links JSONB DEFAULT '{}',
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'expert')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user teacher ratings for decentralized rating system
CREATE TABLE public.user_teacher_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  course_id UUID,
  completion_status TEXT CHECK (completion_status IN ('completed', 'in_progress', 'dropped')),
  would_recommend BOOLEAN,
  tags TEXT[],
  helpful_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, teacher_id)
);

-- Extend transcripts table for multi-institution and multi-track support
ALTER TABLE public.transcripts 
ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id),
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id),
ADD COLUMN IF NOT EXISTS track_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'self_reported' CHECK (verification_status IN ('self_reported', 'institution_verified', 'mentor_verified')),
ADD COLUMN IF NOT EXISTS institution_grade TEXT,
ADD COLUMN IF NOT EXISTS credits_earned NUMERIC,
ADD COLUMN IF NOT EXISTS course_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_teacher_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for institutions (public read)
CREATE POLICY "Anyone can view institutions" ON public.institutions
FOR SELECT USING (true);

CREATE POLICY "Service role can manage institutions" ON public.institutions
FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for teachers (public read)
CREATE POLICY "Anyone can view teachers" ON public.teachers
FOR SELECT USING (true);

CREATE POLICY "Service role can manage teachers" ON public.teachers
FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for user teacher ratings
CREATE POLICY "Users can manage their own teacher ratings" ON public.user_teacher_ratings
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view teacher ratings" ON public.user_teacher_ratings
FOR SELECT USING (true);

CREATE POLICY "Service role can manage teacher ratings" ON public.user_teacher_ratings
FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_institutions_type ON public.institutions(type);
CREATE INDEX idx_institutions_reputation ON public.institutions(reputation_score DESC);
CREATE INDEX idx_teachers_institution ON public.teachers(institution_id);
CREATE INDEX idx_teachers_rating ON public.teachers(average_rating DESC);
CREATE INDEX idx_user_teacher_ratings_teacher ON public.user_teacher_ratings(teacher_id);
CREATE INDEX idx_user_teacher_ratings_user ON public.user_teacher_ratings(user_id);
CREATE INDEX idx_transcripts_institution ON public.transcripts(institution_id);
CREATE INDEX idx_transcripts_teacher ON public.transcripts(teacher_id);
CREATE INDEX idx_transcripts_tracks ON public.transcripts USING GIN(track_ids);

-- Insert some demo institutions
INSERT INTO public.institutions (name, type, description, website_url, reputation_score, verification_status) VALUES
('Stanford University', 'university', 'Leading research university in computer science and engineering', 'https://stanford.edu', 9.5, 'verified'),
('MIT', 'university', 'Massachusetts Institute of Technology - Premier technology education', 'https://mit.edu', 9.7, 'verified'),
('Coursera', 'online_platform', 'Online learning platform with university partnerships', 'https://coursera.org', 8.5, 'verified'),
('Lambda School', 'bootcamp', 'Intensive coding bootcamp with income share agreements', 'https://lambdaschool.com', 7.8, 'verified'),
('Google', 'employer', 'Technology company offering internal training and certifications', 'https://google.com', 9.2, 'verified'),
('freeCodeCamp', 'online_platform', 'Free online coding education platform', 'https://freecodecamp.org', 8.9, 'verified'),
('General Assembly', 'bootcamp', 'Technology and design education with global presence', 'https://generalassemb.ly', 8.1, 'verified');

-- Insert some demo teachers
INSERT INTO public.teachers (institution_id, name, title, specializations, average_rating, total_reviews, outcome_score, verification_status) VALUES
((SELECT id FROM public.institutions WHERE name = 'Stanford University'), 'Dr. Andrew Ng', 'Professor of Computer Science', ARRAY['Machine Learning', 'AI', 'Deep Learning'], 4.8, 15420, 9.2, 'expert'),
((SELECT id FROM public.institutions WHERE name = 'MIT'), 'Prof. Erik Demaine', 'Professor of Computer Science', ARRAY['Algorithms', 'Data Structures', 'Computational Geometry'], 4.9, 8930, 9.5, 'expert'),
((SELECT id FROM public.institutions WHERE name = 'Coursera'), 'Jose Portilla', 'Lead Instructor', ARRAY['Python', 'Data Science', 'Web Development'], 4.7, 89200, 8.8, 'verified'),
((SELECT id FROM public.institutions WHERE name = 'Lambda School'), 'Ryan Hamblin', 'Senior Instructor', ARRAY['React', 'Node.js', 'Full Stack'], 4.6, 2340, 8.5, 'verified'),
((SELECT id FROM public.institutions WHERE name = 'freeCodeCamp'), 'Quincy Larson', 'Founder & Teacher', ARRAY['JavaScript', 'Web Development', 'Responsive Design'], 4.8, 45600, 9.0, 'verified');