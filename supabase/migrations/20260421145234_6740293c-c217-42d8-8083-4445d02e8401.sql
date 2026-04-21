UPDATE public.scrape_url_templates
SET status = 'disabled',
    notes = COALESCE(notes,'') || ' [auto-disabled 2026-04-21: returns 404 or no policy content]'
WHERE institution_code = 'UMGC'
  AND url IN (
    'https://www.umgc.edu/admissions/transfer-credit',
    'https://www.umgc.edu/current-students/learning-resources/academic-policies',
    'https://www.umgc.edu/current-students/learning-resources/undergraduate-academic-requirements',
    'https://www.umgc.edu/admissions',
    'https://www.umgc.edu/catalogs'
  );

INSERT INTO public.scrape_url_templates
  (institution_code, url, page_type, priority, status, source_type, notes)
VALUES
  ('UMGC',
   'https://www.umgc.edu/help/article/undergraduate-transfer-credits-limit',
   'transfer_policy', 100, 'active', 'transfer_policy',
   'Verified 2026-04-21: help article — 90/70/45 caps + completed-at-UMGC residency language'),
  ('UMGC',
   'https://www.umgc.edu/transfers-and-credits/credit-from-colleges/requirements',
   'transfer_policy', 95, 'active', 'transfer_policy',
   'Verified 2026-04-21: policy page — 90/70/45 caps with institutional context'),
  ('UMGC',
   'https://www.umgc.edu/administration/policies-and-reporting/policies/academic-affairs/undergraduate-transfer-credit-evaluation-and-appeal-process',
   'transfer_policy', 90, 'active', 'transfer_policy',
   'Verified 2026-04-21: official UMGC academic affairs policy doc'),
  ('UMGC',
   'https://www.umgc.edu/transfers-and-credits',
   'transfer_info', 80, 'active', 'other',
   'Verified 2026-04-21: transfers-and-credits hub page'),
  ('UMGC',
   'https://www.umgc.edu/transfers-and-credits/credit-from-colleges/community-college',
   'transfer_policy', 70, 'active', 'transfer_policy',
   'Verified 2026-04-21: 2-year college 70-credit cap source');