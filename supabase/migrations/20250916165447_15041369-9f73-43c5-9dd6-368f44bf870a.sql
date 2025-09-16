-- Remove Cybersecurity and Mobile Development track blocks
DELETE FROM requirement_blocks 
WHERE slug IN (
  'security-fundamentals',
  'advanced-security', 
  'capstone-cybersecurity',
  'mobile-frameworks',
  'advanced-mobile',
  'capstone-mobile'
);