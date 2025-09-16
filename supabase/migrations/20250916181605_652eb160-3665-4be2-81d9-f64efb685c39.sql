-- Remove problematic blocks that are causing the multi-path display issue
DELETE FROM requirement_blocks WHERE slug IN ('capstone', 'mobile-development', 'web-development');

-- Also clean up any related data for these blocks
DELETE FROM block_members WHERE block_id IN (
  SELECT id FROM requirement_blocks WHERE slug IN ('capstone', 'mobile-development', 'web-development')
);

DELETE FROM block_gates WHERE block_id IN (
  SELECT id FROM requirement_blocks WHERE slug IN ('capstone', 'mobile-development', 'web-development')  
);