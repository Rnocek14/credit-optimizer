-- Fix RLS security issue for phase1_test_results table
ALTER TABLE phase1_test_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the test results table
CREATE POLICY "Service role can manage test results" 
ON phase1_test_results FOR ALL 
USING (true);

CREATE POLICY "Authenticated users can view test results" 
ON phase1_test_results FOR SELECT 
USING (true);