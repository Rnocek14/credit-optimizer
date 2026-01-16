-- Fix invalid COSC evidence URLs in existing database records
UPDATE credit_transfer_rules
SET evidence_url = 'https://www.charteroak.edu/catalog/current/transfer-credit/course-transfer-policy-undergraduate/'
WHERE target_institution = 'COSC'
  AND evidence_url IN (
    'https://www.charteroak.edu/current-students/registrar/transfer-credits.php',
    'https://www.charteroak.edu/prospective-students/transfer-credit.php'
  );