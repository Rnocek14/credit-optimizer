-- Disable stale LIBERTY templates (constraint only allows 'active' | 'disabled')
UPDATE public.scrape_url_templates
SET status = 'disabled',
    notes = COALESCE(notes, '') || ' | disabled 2026-04-17: empty extraction (404 / marketing shell / shallow root)'
WHERE institution_code = 'LIBERTY'
  AND status = 'active';

-- Insert verified policy-rich URLs
INSERT INTO public.scrape_url_templates (institution_code, url, page_type, source_type, priority, status, notes)
VALUES
  ('LIBERTY',
   'https://catalog.liberty.edu/undergraduate/academic-support/academic-information-policies-online-program/',
   'catalog_transfer_policy',
   'transfer_policy',
   1,
   'active',
   'Primary catalog source. Contains full Transfer Credit Policy section: 25% residency, grade thresholds, accepted credit-by-exam list (AP/CLEP/DSST/ECE/IB/NCCRS), military/ACE, portfolio.'),
  ('LIBERTY',
   'https://www.liberty.edu/online/transfer-credit-faqs/',
   'transfer_faq',
   'transfer_policy',
   1,
   'active',
   'LUO Transfer FAQ. Source of explicit numeric caps: 45 cr associate / 90 cr bachelor / 50% master.'),
  ('LIBERTY',
   'https://www.liberty.edu/registrar/transfer-policies/undergraduates/',
   'registrar_transfer',
   'transfer_policy',
   2,
   'active',
   'Registrar undergraduate transfer policy page. Secondary corroboration of residency and credit-source rules.');