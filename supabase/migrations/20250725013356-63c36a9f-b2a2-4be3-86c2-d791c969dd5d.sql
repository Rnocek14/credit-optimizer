-- Add UUID columns for foreign key relationships to market_trends table
ALTER TABLE market_trends 
ADD COLUMN career_path_id UUID,
ADD COLUMN location_id UUID;

-- Add foreign key relationship from market_trends to career_paths
ALTER TABLE market_trends
ADD CONSTRAINT fk_market_trends_career_path
FOREIGN KEY (career_path_id)
REFERENCES career_paths(id)
ON DELETE SET NULL;

-- Add foreign key relationship from market_trends to locations
ALTER TABLE market_trends
ADD CONSTRAINT fk_market_trends_location
FOREIGN KEY (location_id)
REFERENCES locations(id)
ON DELETE SET NULL;

-- Create indexes for better performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_market_trends_career_path_id ON market_trends(career_path_id);
CREATE INDEX IF NOT EXISTS idx_market_trends_location_id ON market_trends(location_id);