-- ASUO template repair (post source-quality-gate v1.1.0 routing)
-- 1) Remove confirmed-dead / weak ASUO templates
DELETE FROM public.scrape_url_templates
WHERE institution_code = 'ASUO'
  AND url IN (
    'https://asuonline.asu.edu/admission/transfer-credit/',
    'https://asuonline.asu.edu/newsroom/online-learning-tips/transfer-credits-explained/'
  );

-- 2) Demote bare catalog root to fallback-only
UPDATE public.scrape_url_templates
SET priority = 9
WHERE institution_code = 'ASUO'
  AND url = 'https://catalog.asu.edu/';

-- 3) Insert verified canonical ASUO transfer policy + info URLs
INSERT INTO public.scrape_url_templates (institution_code, url, page_type, priority)
VALUES
  ('ASUO', 'https://asuonline.asu.edu/admission/transfer/',                                                              'transfer_policy',     1),
  ('ASUO', 'https://asuonline.asu.edu/newsroom/online-learning-tips/choosing-best-program-transfer-credits/',           'transfer_policy',     1),
  ('ASUO', 'https://asuonline.asu.edu/admission/transfer/apply/',                                                        'transfer_info',       2),
  ('ASUO', 'https://admission.asu.edu/apply/transfer/MyPath2ASU',                                                        'transfer_info',       2),
  ('ASUO', 'https://asuonline.asu.edu/sites/default/files/2023-04/56057_TRNRecruitmentPacket_22-23_TRNtoASUGuide_WEB.pdf','transfer_policy_pdf', 3)
ON CONFLICT (institution_code, url) DO UPDATE
  SET page_type = EXCLUDED.page_type,
      priority  = EXCLUDED.priority;