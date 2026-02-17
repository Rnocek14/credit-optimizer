
-- Fix: replace wrong unique constraint (plan_id, requirement_id) with correct key (plan_id, course_id)
ALTER TABLE public.user_plan_courses
  DROP CONSTRAINT user_plan_courses_plan_req_uniq;

CREATE UNIQUE INDEX user_plan_courses_plan_course_uniq
  ON public.user_plan_courses (plan_id, course_id);
