-- Fix edge type constraint and implement relationship fixes
-- 1. Drop the existing check constraint and add new edge types
ALTER TABLE career_graph_edges DROP CONSTRAINT IF EXISTS career_graph_edges_edge_type_check;

-- Add updated constraint with all semantic edge types
ALTER TABLE career_graph_edges ADD CONSTRAINT career_graph_edges_edge_type_check 
CHECK (edge_type IN (
  'teaches', 'requires', 'supports', 'qualifies_for',
  'TEACHES', 'REQUIRES_SKILL', 'NEXT_ROLE', 'QUALIFIES_FOR', 
  'PREREQUISITE', 'ENABLES', 'LEADS_TO', 'SUBSTITUTES'
));

-- 2. Remove any circular dependencies (self-references)
DELETE FROM career_graph_edges WHERE from_id = to_id;

-- 3. Connect orphaned job nodes to skills via REQUIRES_SKILL edges
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score)
SELECT 
  j.id as from_id,
  s.id as to_id,
  'job' as from_type,
  'skill' as to_type,
  'REQUIRES_SKILL' as edge_type,
  0.8 as importance_weight,
  80 as time_cost_hours,
  1.3 as roi_score
FROM career_graph_nodes j
CROSS JOIN career_graph_nodes s
WHERE j.node_type = 'job' 
  AND s.node_type = 'skill'
  AND j.active = true 
  AND s.active = true
  -- Map jobs to relevant skills
  AND ((j.title ILIKE '%ux%designer%' AND s.title ILIKE '%ux%')
    OR (j.title ILIKE '%frontend%' AND (s.title ILIKE '%javascript%' OR s.title ILIKE '%html%' OR s.title ILIKE '%css%' OR s.title ILIKE '%react%'))
    OR (j.title ILIKE '%backend%' AND (s.title ILIKE '%python%' OR s.title ILIKE '%database%' OR s.title ILIKE '%api%'))
    OR (j.title ILIKE '%data%analyst%' AND (s.title ILIKE '%sql%' OR s.title ILIKE '%data%' OR s.title ILIKE '%statistics%'))
    OR (j.title ILIKE '%product%manager%' AND (s.title ILIKE '%product%' OR s.title ILIKE '%agile%'))
    OR (j.title ILIKE '%devops%' AND (s.title ILIKE '%docker%' OR s.title ILIKE '%aws%'))
    OR (j.title ILIKE '%qa%' AND s.title ILIKE '%testing%')
    OR (j.title ILIKE '%marketing%' AND s.title ILIKE '%marketing%')
    OR (j.title ILIKE '%sales%' AND s.title ILIKE '%sales%'))
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = j.id AND e2.to_id = s.id AND e2.edge_type = 'REQUIRES_SKILL'
  )
  LIMIT 50; -- Limit to prevent timeout

-- 4. Connect courses to skills via TEACHES edges  
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score, semantic_strength)
SELECT 
  c.id as from_id,
  s.id as to_id,
  'course' as from_type,
  'skill' as to_type,
  'TEACHES' as edge_type,
  0.9 as importance_weight,
  30 as time_cost_hours,
  1.2 as roi_score,
  0.85 as semantic_strength
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' 
  AND s.node_type = 'skill'
  AND c.active = true 
  AND s.active = true
  -- Match courses to skills by content similarity
  AND ((c.title ILIKE '%javascript%' AND s.title ILIKE '%javascript%')
    OR (c.title ILIKE '%react%' AND s.title ILIKE '%react%')
    OR (c.title ILIKE '%python%' AND s.title ILIKE '%python%')
    OR (c.title ILIKE '%sql%' AND s.title ILIKE '%sql%')
    OR (c.title ILIKE '%ux%' AND s.title ILIKE '%ux%')
    OR (c.title ILIKE '%design%' AND s.title ILIKE '%design%')
    OR (c.title ILIKE '%data%' AND s.title ILIKE '%data%')
    OR (c.title ILIKE '%marketing%' AND s.title ILIKE '%marketing%'))
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = c.id AND e2.to_id = s.id AND e2.edge_type = 'TEACHES'
  )
  LIMIT 30; -- Limit to prevent timeout

-- 5. Update existing edges with meaningful ROI scores
UPDATE career_graph_edges 
SET 
  roi_score = CASE 
    WHEN edge_type = 'teaches' THEN 1.1
    WHEN edge_type = 'requires' THEN 1.2
    WHEN edge_type = 'supports' THEN 1.0
    WHEN edge_type = 'qualifies_for' THEN 1.3
    ELSE COALESCE(roi_score, 1.0)
  END,
  importance_weight = CASE 
    WHEN edge_type = 'requires' THEN 0.9
    WHEN edge_type = 'teaches' THEN 0.8
    WHEN edge_type = 'supports' THEN 0.6
    WHEN edge_type = 'qualifies_for' THEN 0.7
    ELSE COALESCE(importance_weight, 1.0)
  END
WHERE roi_score IS NULL OR roi_score = 0 OR importance_weight = 1.0;