-- Add public insert policy for credit_transfer_rules
-- This allows the run-seeds edge function to insert using anon key

-- First check if the policy already exists to avoid errors
DO $$
BEGIN
  -- Drop existing insert policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_transfer_rules' 
    AND policyname = 'Allow public insert for seeding'
  ) THEN
    DROP POLICY "Allow public insert for seeding" ON credit_transfer_rules;
  END IF;
END $$;

-- Create the insert policy for public/anon access
CREATE POLICY "Allow public insert for seeding"
  ON credit_transfer_rules
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Also ensure we have an update policy for upsert operations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_transfer_rules' 
    AND policyname = 'Allow public update for seeding'
  ) THEN
    DROP POLICY "Allow public update for seeding" ON credit_transfer_rules;
  END IF;
END $$;

CREATE POLICY "Allow public update for seeding"
  ON credit_transfer_rules
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Verify policies
SELECT 
  policyname,
  cmd as operation,
  roles
FROM pg_policies 
WHERE tablename = 'credit_transfer_rules'
ORDER BY policyname;
