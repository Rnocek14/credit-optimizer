-- Add Maya Certified badge
INSERT INTO public.badges (name, slug, emoji, description, trigger_type, threshold)
VALUES (
  'Maya Certified',
  'maya_certified',
  '🏆',
  'Awarded for completing a workflow that meets Maya''s certification criteria with high confidence and user satisfaction',
  'workflow_certificate_count',
  1
)
ON CONFLICT (slug) DO NOTHING;