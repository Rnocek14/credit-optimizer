INSERT INTO institutions (code, name, type, location, accreditation_level, verification_status)
VALUES ('EXCELSIOR', 'Excelsior University', 'university', 'Albany, NY', 'regional', 'verified')
ON CONFLICT (code) DO NOTHING;