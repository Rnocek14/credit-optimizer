-- Create skills table for skill definitions
CREATE TABLE public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  difficulty_level INTEGER DEFAULT 1,
  xp_value INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create skill graph edges for prerequisites
CREATE TABLE public.skill_graph_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prerequisite_skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user skill progress tracking
CREATE TABLE public.user_skill_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'in_progress', 'verified')),
  cri_score NUMERIC,
  verification_source TEXT,
  verification_date TIMESTAMP WITH TIME ZONE,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Create course skill mapping
CREATE TABLE public.course_skill_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.recommended_courses(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_skill_map ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skills
CREATE POLICY "Anyone can view skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Service role can manage skills" ON public.skills FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for skill_graph_edges
CREATE POLICY "Anyone can view skill edges" ON public.skill_graph_edges FOR SELECT USING (true);
CREATE POLICY "Service role can manage skill edges" ON public.skill_graph_edges FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for user_skill_progress
CREATE POLICY "Users can view their own skill progress" ON public.user_skill_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own skill progress" ON public.user_skill_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can manage all skill progress" ON public.user_skill_progress FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for course_skill_map
CREATE POLICY "Anyone can view course skill mappings" ON public.course_skill_map FOR SELECT USING (true);
CREATE POLICY "Service role can manage course skill mappings" ON public.course_skill_map FOR ALL USING (true) WITH CHECK (true);

-- Insert sample skills for frontend development (Aisha Khan's profile)
INSERT INTO public.skills (name, slug, category, description, difficulty_level, xp_value) VALUES
('JavaScript', 'javascript', 'Programming', 'Core programming language for web development', 1, 20),
('React', 'react', 'Framework', 'Popular JavaScript library for building user interfaces', 2, 30),
('TypeScript', 'typescript', 'Programming', 'Typed superset of JavaScript', 2, 25),
('CSS', 'css', 'Styling', 'Cascading Style Sheets for web styling', 1, 15),
('HTML', 'html', 'Markup', 'HyperText Markup Language', 1, 10),
('Node.js', 'nodejs', 'Backend', 'JavaScript runtime for server-side development', 2, 25),
('GraphQL', 'graphql', 'API', 'Query language and runtime for APIs', 3, 35),
('AWS', 'aws', 'Cloud', 'Amazon Web Services cloud platform', 3, 40),
('Next.js', 'nextjs', 'Framework', 'React framework for production applications', 3, 35),
('Docker', 'docker', 'DevOps', 'Containerization platform', 3, 30),
('Testing', 'testing', 'Quality', 'Software testing with Jest and Cypress', 2, 25),
('Design Systems', 'design-systems', 'Design', 'Creating and maintaining design systems', 3, 30);

-- Insert skill prerequisites (edges)
INSERT INTO public.skill_graph_edges (prerequisite_skill_id, skill_id) VALUES
((SELECT id FROM public.skills WHERE slug = 'html'), (SELECT id FROM public.skills WHERE slug = 'css')),
((SELECT id FROM public.skills WHERE slug = 'html'), (SELECT id FROM public.skills WHERE slug = 'javascript')),
((SELECT id FROM public.skills WHERE slug = 'javascript'), (SELECT id FROM public.skills WHERE slug = 'react')),
((SELECT id FROM public.skills WHERE slug = 'javascript'), (SELECT id FROM public.skills WHERE slug = 'typescript')),
((SELECT id FROM public.skills WHERE slug = 'javascript'), (SELECT id FROM public.skills WHERE slug = 'nodejs')),
((SELECT id FROM public.skills WHERE slug = 'react'), (SELECT id FROM public.skills WHERE slug = 'nextjs')),
((SELECT id FROM public.skills WHERE slug = 'nodejs'), (SELECT id FROM public.skills WHERE slug = 'graphql')),
((SELECT id FROM public.skills WHERE slug = 'react'), (SELECT id FROM public.skills WHERE slug = 'testing')),
((SELECT id FROM public.skills WHERE slug = 'css'), (SELECT id FROM public.skills WHERE slug = 'design-systems'));

-- Insert demo progress for Aisha Khan (user_id will be replaced with actual demo user)
-- For now, we'll insert with a demo UUID that can be updated later