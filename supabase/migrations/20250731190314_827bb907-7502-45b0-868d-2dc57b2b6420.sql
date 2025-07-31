-- Fix edge type constraint to include all new semantic edge types
ALTER TABLE career_graph_edges DROP CONSTRAINT IF EXISTS career_graph_edges_edge_type_check;

-- Add comprehensive constraint with all edge types
ALTER TABLE career_graph_edges ADD CONSTRAINT career_graph_edges_edge_type_check 
CHECK (edge_type IN (
  -- Original edge types
  'teaches', 'requires', 'supports', 'qualifies_for',
  -- New semantic edge types
  'TEACHES', 'REQUIRES_SKILL', 'NEXT_ROLE', 'QUALIFIES_FOR', 
  'PREREQUISITE', 'ENABLES', 'LEADS_TO', 'SUBSTITUTES', 'PIVOT_TO'
));

-- Now run the connectivity fixes with proper edge types
-- 1. Connect orphaned job nodes to relevant skills via REQUIRES_SKILL edges
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score, semantic_strength)
SELECT DISTINCT
  j.id as from_id,
  s.id as to_id,
  'job' as from_type,
  'skill' as to_type,
  'REQUIRES_SKILL' as edge_type,
  0.8 as importance_weight,
  60 as time_cost_hours,
  1.4 as roi_score,
  0.75 as semantic_strength
FROM career_graph_nodes j
CROSS JOIN career_graph_nodes s
WHERE j.node_type = 'job' 
  AND s.node_type = 'skill'
  AND j.active = true 
  AND s.active = true
  AND (
    -- Key job-to-skill mappings
    (j.title ILIKE '%ux%' AND s.title ILIKE '%ux%')
    OR (j.title ILIKE '%design%' AND s.title ILIKE '%design%')
    OR (j.title ILIKE '%frontend%' AND (s.title ILIKE '%javascript%' OR s.title ILIKE '%react%' OR s.title ILIKE '%html%'))
    OR (j.title ILIKE '%backend%' AND (s.title ILIKE '%python%' OR s.title ILIKE '%api%' OR s.title ILIKE '%database%'))
    OR (j.title ILIKE '%data%analyst%' AND (s.title ILIKE '%sql%' OR s.title ILIKE '%data%'))
    OR (j.title ILIKE '%product%manager%' AND s.title ILIKE '%product%')
    OR (j.title ILIKE '%devops%' AND s.title ILIKE '%aws%')
    OR (j.title ILIKE '%qa%' AND s.title ILIKE '%testing%')
  )
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = j.id AND e2.to_id = s.id AND e2.edge_type = 'REQUIRES_SKILL'
  )
  LIMIT 50;

-- 2. Add course-to-skill TEACHES connections
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score, semantic_strength)
SELECT DISTINCT
  c.id as from_id,
  s.id as to_id,
  'course' as from_type,
  'skill' as to_type,
  'TEACHES' as edge_type,
  0.9 as importance_weight,
  25 as time_cost_hours,
  1.3 as roi_score,
  0.85 as semantic_strength
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' 
  AND s.node_type = 'skill'
  AND c.active = true 
  AND s.active = true
  AND (
    (c.title ILIKE '%javascript%' AND s.title ILIKE '%javascript%')
    OR (c.title ILIKE '%python%' AND s.title ILIKE '%python%')
    OR (c.title ILIKE '%react%' AND s.title ILIKE '%react%')
    OR (c.title ILIKE '%ux%' AND s.title ILIKE '%ux%')
    OR (c.title ILIKE '%design%' AND s.title ILIKE '%design%')
    OR (c.title ILIKE '%sql%' AND s.title ILIKE '%sql%')
  )
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = c.id AND e2.to_id = s.id AND e2.edge_type = 'TEACHES'
  )
  LIMIT 30;

-- 3. Create career progression paths with NEXT_ROLE edges
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score, semantic_strength)
SELECT DISTINCT
  j1.id as from_id,
  j2.id as to_id,
  'job' as from_type,
  'job' as to_type,
  'NEXT_ROLE' as edge_type,
  0.7 as importance_weight,
  2080 as time_cost_hours,
  1.5 as roi_score,
  0.8 as semantic_strength
FROM career_graph_nodes j1
CROSS JOIN career_graph_nodes j2
WHERE j1.node_type = 'job' 
  AND j2.node_type = 'job'
  AND j1.active = true 
  AND j2.active = true
  AND j1.id != j2.id
  AND (
    (j1.title ILIKE '%junior%' AND j2.title ILIKE '%senior%')
    OR (j1.title ILIKE '%analyst%' AND j2.title ILIKE '%scientist%')
    OR (j1.title ILIKE '%developer%' AND j2.title ILIKE '%lead%')
  )
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = j1.id AND e2.to_id = j2.id AND e2.edge_type = 'NEXT_ROLE'
  )
  LIMIT 20;

-- 4. Create skill-to-job QUALIFIES_FOR edges
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score, semantic_strength)
SELECT DISTINCT
  s.id as from_id,
  j.id as to_id,
  'skill' as from_type,
  'job' as to_type,
  'QUALIFIES_FOR' as edge_type,
  0.6 as importance_weight,
  40 as time_cost_hours,
  1.2 as roi_score,
  0.7 as semantic_strength
FROM career_graph_nodes s
CROSS JOIN career_graph_nodes j
WHERE s.node_type = 'skill' 
  AND j.node_type = 'job'
  AND s.active = true 
  AND j.active = true
  AND (
    (s.title ILIKE '%ux%' AND j.title ILIKE '%ux%designer%')
    OR (s.title ILIKE '%javascript%' AND j.title ILIKE '%frontend%')
    OR (s.title ILIKE '%python%' AND j.title ILIKE '%backend%')
    OR (s.title ILIKE '%sql%' AND j.title ILIKE '%analyst%')
  )
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = s.id AND e2.to_id = j.id AND e2.edge_type = 'QUALIFIES_FOR'
  )
  LIMIT 30;

-- 5. Add pivot opportunities with PIVOT_TO edges
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score, semantic_strength)
SELECT DISTINCT
  j1.id as from_id,
  j2.id as to_id,
  'job' as from_type,
  'job' as to_type,
  'PIVOT_TO' as edge_type,
  0.5 as importance_weight,
  520 as time_cost_hours,
  1.1 as roi_score,
  0.6 as semantic_strength
FROM career_graph_nodes j1
CROSS JOIN career_graph_nodes j2
WHERE j1.node_type = 'job' 
  AND j2.node_type = 'job'
  AND j1.active = true 
  AND j2.active = true
  AND j1.id != j2.id
  AND (
    (j1.title ILIKE '%frontend%' AND j2.title ILIKE '%backend%')
    OR (j1.title ILIKE '%designer%' AND j2.title ILIKE '%frontend%')
    OR (j1.title ILIKE '%analyst%' AND j2.title ILIKE '%scientist%')
  )
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = j1.id AND e2.to_id = j2.id AND e2.edge_type = 'PIVOT_TO'
  )
  LIMIT 20;

-- 6. Create basic substitution groups
UPDATE career_graph_nodes 
SET substitution_group_id = gen_random_uuid()
WHERE substitution_group_id IS NULL 
  AND node_type = 'skill'
  AND title ILIKE '%javascript%';

UPDATE career_graph_nodes 
SET substitution_group_id = (
  SELECT substitution_group_id FROM career_graph_nodes 
  WHERE title ILIKE '%javascript%' AND substitution_group_id IS NOT NULL 
  LIMIT 1
)
WHERE substitution_group_id IS NULL 
  AND node_type = 'skill'
  AND (title ILIKE '%react%' OR title ILIKE '%vue%');

UPDATE career_graph_nodes 
SET substitution_group_id = gen_random_uuid()
WHERE substitution_group_id IS NULL 
  AND node_type = 'job'
  AND title ILIKE '%designer%';