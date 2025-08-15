-- PR-2: Data Integrity & Edge Normalization (Fixed)
-- First, let's create a backup and then fix edge types properly

-- Step 1: Update edge types to match the existing constraint
UPDATE career_graph_edges 
SET edge_type = CASE 
    WHEN UPPER(edge_type) = 'REQUIRES_SKILL' THEN 'REQUIRES_SKILL'
    WHEN UPPER(edge_type) = 'QUALIFIES_FOR' THEN 'QUALIFIES_FOR'
    WHEN UPPER(edge_type) = 'TEACHES' THEN 'TEACHES'
    WHEN UPPER(edge_type) = 'NEXT_ROLE' THEN 'NEXT_ROLE'
    WHEN UPPER(edge_type) = 'PIVOT_TO' THEN 'PIVOT_TO'
    WHEN UPPER(edge_type) = 'REQUIRES' THEN 'requires'
    WHEN UPPER(edge_type) = 'SUPPORTS' THEN 'supports'
    ELSE edge_type
END;

-- Step 2: Add graphHash support for layout caching  
ALTER TABLE career_graph_nodes 
ADD COLUMN IF NOT EXISTS graph_hash TEXT;

-- Step 3: Create index for faster graph lookups
CREATE INDEX IF NOT EXISTS idx_career_graph_edges_composite 
ON career_graph_edges (from_type, from_id, to_type, to_id, edge_type);