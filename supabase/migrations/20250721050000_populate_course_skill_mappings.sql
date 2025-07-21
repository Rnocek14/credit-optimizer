
-- Populate course-skill mappings to connect existing courses with skills
INSERT INTO public.course_skill_map (course_id, skill_id) 
SELECT 
  rc.id as course_id,
  s.id as skill_id
FROM public.recommended_courses rc
JOIN public.skills s ON s.name = ANY(rc.skill_tags)
ON CONFLICT DO NOTHING;

-- Add some specific mappings for courses that might not have exact skill name matches
INSERT INTO public.course_skill_map (course_id, skill_id)
SELECT 
  rc.id as course_id,
  s.id as skill_id
FROM public.recommended_courses rc
CROSS JOIN public.skills s
WHERE 
  (rc.title ILIKE '%React%' AND s.slug = 'react') OR
  (rc.title ILIKE '%AWS%' AND s.slug = 'aws') OR
  (rc.title ILIKE '%JavaScript%' AND s.slug = 'javascript') OR
  (rc.title ILIKE '%Node%' AND s.slug = 'nodejs') OR
  (rc.title ILIKE '%Full Stack%' AND s.slug IN ('react', 'nodejs', 'javascript')) OR
  (rc.title ILIKE '%Kubernetes%' AND s.slug = 'docker') OR
  (rc.title ILIKE '%System Design%' AND s.slug IN ('aws', 'nodejs'))
ON CONFLICT DO NOTHING;
