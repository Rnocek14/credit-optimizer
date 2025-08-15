-- PR-2: Data Integrity & Edge Normalization
-- Fix edge type inconsistencies and normalize directions

-- Normalize edge type casing (idempotent)
UPDATE career_graph_edges 
SET edge_type = LOWER(TRIM(edge_type))
WHERE edge_type != LOWER(TRIM(edge_type));

-- Unify requires_skill direction: job -> skill (standardize)
UPDATE career_graph_edges
SET 
    from_id = CASE 
        WHEN edge_type = 'requires_skill' AND from_type = 'skill' AND to_type = 'job' 
        THEN to_id 
        ELSE from_id 
    END,
    to_id = CASE 
        WHEN edge_type = 'requires_skill' AND from_type = 'skill' AND to_type = 'job' 
        THEN from_id 
        ELSE to_id 
    END,
    from_type = CASE 
        WHEN edge_type = 'requires_skill' AND from_type = 'skill' AND to_type = 'job' 
        THEN to_type 
        ELSE from_type 
    END,
    to_type = CASE 
        WHEN edge_type = 'requires_skill' AND from_type = 'skill' AND to_type = 'job' 
        THEN from_type 
        ELSE to_type 
    END
WHERE edge_type = 'requires_skill' 
AND from_type = 'skill' 
AND to_type = 'job';

-- Add graphHash support for layout caching
ALTER TABLE career_graph_nodes 
ADD COLUMN IF NOT EXISTS graph_hash TEXT;

-- Create index for faster graph lookups
CREATE INDEX IF NOT EXISTS idx_career_graph_edges_composite 
ON career_graph_edges (from_type, from_id, to_type, to_id, edge_type);

-- Mark orphan nodes for special handling
UPDATE career_graph_nodes 
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"orphan": true}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM career_graph_edges e 
    WHERE e.from_id = career_graph_nodes.id OR e.to_id = career_graph_nodes.id
);