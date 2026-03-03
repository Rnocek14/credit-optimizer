ALTER TABLE public.user_plans
  ADD COLUMN target_career_id uuid REFERENCES public.career_paths(id);