-- Seed URL templates for COSC (Charter Oak State College)
INSERT INTO scrape_url_templates (institution_code, url, page_type, priority) VALUES
  ('COSC', 'https://www.charteroak.edu/academics/transfer-credits/', 'transfer_policy', 1),
  ('COSC', 'https://www.charteroak.edu/academics/credit-by-exam/', 'credit_by_exam', 2),
  ('COSC', 'https://www.charteroak.edu/admissions/requirements/', 'residency', 3),
  ('COSC', 'https://catalog.charteroak.edu/', 'catalog', 4),
  ('COSC', 'https://www.charteroak.edu/tuition/', 'tuition', 5)
ON CONFLICT DO NOTHING;