-- Add missing Tier-A institutions with required 'type' column
INSERT INTO institutions (code, name, type, institution_tier, discovery_status, catalog_base_url)
VALUES
  ('COSC', 'Charter Oak State College', 'university', 'tier_a', 'pending', 'https://www.charteroak.edu'),
  ('WGU', 'Western Governors University', 'university', 'tier_a', 'pending', 'https://www.wgu.edu')
ON CONFLICT (code) DO UPDATE SET
  institution_tier = 'tier_a',
  catalog_base_url = EXCLUDED.catalog_base_url;

-- Seed URL templates for all 20 Tier-A schools
INSERT INTO scrape_url_templates (institution_code, url, page_type, priority)
VALUES
-- TESU
('TESU', 'https://www.tesu.edu/academics/catalog', 'catalog', 1),
('TESU', 'https://www.tesu.edu/academics/transfer-credit', 'transfer_policy', 1),
('TESU', 'https://www.tesu.edu/registrar', 'transfer_info', 3),
-- COSC
('COSC', 'https://www.charteroak.edu/catalog/', 'catalog', 1),
('COSC', 'https://www.charteroak.edu/transfer/', 'transfer_policy', 1),
('COSC', 'https://www.charteroak.edu/registrar/', 'transfer_info', 3),
-- Excelsior
('EXCEL', 'https://www.excelsior.edu/catalog/', 'catalog', 1),
('EXCEL', 'https://www.excelsior.edu/support-resources/transfer-credit/', 'transfer_policy', 1),
('EXCEL', 'https://www.excelsior.edu/admissions/transfer-credit/', 'transfer_info', 2),
-- WGU
('WGU', 'https://www.wgu.edu/admissions/transfers.html', 'transfer_info', 1),
('WGU', 'https://www.wgu.edu/about/academic-catalog.html', 'catalog', 3),
('WGU', 'https://partners.wgu.edu/', 'transfer_policy', 2),
-- SNHU
('SNHU', 'https://www.snhu.edu/admission/transferring-credits', 'transfer_info', 1),
('SNHU', 'https://www.snhu.edu/consumer-information/academic-catalogs', 'catalog', 2),
('SNHU', 'https://www.snhu.edu/admission/transfer-credits', 'transfer_policy', 2),
-- UMGC
('UMGC', 'https://www.umgc.edu/catalogs', 'catalog', 1),
('UMGC', 'https://www.umgc.edu/admissions/transfer-credit', 'transfer_policy', 1),
('UMGC', 'https://www.umgc.edu/admissions', 'transfer_info', 3),
-- Purdue Global
('PURDUEG', 'https://catalog.purdueglobal.edu/', 'catalog', 1),
('PURDUEG', 'https://www.purdueglobal.edu/admissions/transfer-credits/', 'transfer_policy', 1),
('PURDUEG', 'https://www.purdueglobal.edu/admissions/', 'transfer_info', 3),
-- ASU Online
('ASUO', 'https://catalog.asu.edu/', 'catalog', 1),
('ASUO', 'https://asuonline.asu.edu/admission/transfer-credit/', 'transfer_policy', 1),
('ASUO', 'https://admission.asu.edu/transfer', 'transfer_info', 2),
-- Penn State World Campus
('PSUWC', 'https://bulletins.psu.edu/', 'catalog', 1),
('PSUWC', 'https://www.worldcampus.psu.edu/admissions/transfer-credits', 'transfer_policy', 1),
('PSUWC', 'https://admissions.psu.edu/info/future/transfer/', 'transfer_info', 2),
-- Colorado State Global
('CSUG', 'https://catalog.csuglobal.edu/', 'catalog', 1),
('CSUG', 'https://csuglobal.edu/admissions/transfer-information', 'transfer_policy', 1),
('CSUG', 'https://csuglobal.edu/admissions', 'transfer_info', 3),
-- Capella
('CAPELLA', 'https://www.capella.edu/admissions/transfer-credit/', 'transfer_policy', 1),
('CAPELLA', 'https://catalog.capella.edu/', 'catalog', 2),
('CAPELLA', 'https://www.capella.edu/admissions/', 'transfer_info', 3),
-- Walden
('WALDEN', 'https://catalog.waldenu.edu/', 'catalog', 1),
('WALDEN', 'https://www.waldenu.edu/admissions/transfer-of-credit', 'transfer_policy', 1),
('WALDEN', 'https://www.waldenu.edu/admissions', 'transfer_info', 3),
-- Strayer
('STRAYER', 'https://www.strayer.edu/admissions/transfer-credits', 'transfer_policy', 1),
('STRAYER', 'https://catalog.strayer.edu/', 'catalog', 2),
('STRAYER', 'https://www.strayer.edu/admissions', 'transfer_info', 3),
-- GCU
('GCU', 'https://catalog.gcu.edu/', 'catalog', 1),
('GCU', 'https://www.gcu.edu/admissions/transfer-students', 'transfer_policy', 1),
('GCU', 'https://www.gcu.edu/admissions', 'transfer_info', 3),
-- Phoenix
('PHOENIX', 'https://www.phoenix.edu/academics/catalog.html', 'catalog', 1),
('PHOENIX', 'https://www.phoenix.edu/admissions/transfer-information.html', 'transfer_policy', 1),
('PHOENIX', 'https://www.phoenix.edu/admissions.html', 'transfer_info', 3),
-- National University
('NU', 'https://catalog.nu.edu/', 'catalog', 1),
('NU', 'https://www.nu.edu/admissions/transfer-credits/', 'transfer_policy', 1),
('NU', 'https://www.nu.edu/admissions/', 'transfer_info', 3),
-- Franklin
('FRANKLIN', 'https://www.franklin.edu/academics/catalog', 'catalog', 1),
('FRANKLIN', 'https://www.franklin.edu/admissions/transferring-credits', 'transfer_policy', 1),
('FRANKLIN', 'https://www.franklin.edu/admissions', 'transfer_info', 3),
-- University of the People
('UPEOPLE', 'https://catalog.uopeople.edu/', 'catalog', 1),
('UPEOPLE', 'https://www.uopeople.edu/become-student/admissions/transfer-students/', 'transfer_policy', 1),
('UPEOPLE', 'https://www.uopeople.edu/become-student/admissions/', 'transfer_info', 3),
-- Liberty
('LIBERTY', 'https://catalog.liberty.edu/', 'catalog', 1),
('LIBERTY', 'https://www.liberty.edu/online/transfer-credits/', 'transfer_policy', 1),
('LIBERTY', 'https://www.liberty.edu/online/admissions/', 'transfer_info', 3),
-- UW Flexible Option
('UWFO', 'https://flex.wisconsin.edu/catalog/', 'catalog', 1),
('UWFO', 'https://flex.wisconsin.edu/admissions/transfer-credits/', 'transfer_policy', 1),
('UWFO', 'https://flex.wisconsin.edu/admissions/', 'transfer_info', 3)
ON CONFLICT DO NOTHING;