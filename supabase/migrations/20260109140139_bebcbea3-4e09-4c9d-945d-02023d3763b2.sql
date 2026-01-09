-- Seed URL templates for WGU
INSERT INTO scrape_url_templates (institution_code, url, page_type, priority) VALUES
  ('WGU', 'https://www.wgu.edu/admissions/transfers.html', 'transfer_policy', 1),
  ('WGU', 'https://www.wgu.edu/admissions/transfers/transfer-credit-estimator.html', 'transfer_faq', 2),
  ('WGU', 'https://www.wgu.edu/admissions/tuition-financial-aid.html', 'tuition', 3),
  ('WGU', 'https://www.wgu.edu/online-it-degrees.html', 'catalog', 4)
ON CONFLICT (institution_code, url) DO NOTHING;