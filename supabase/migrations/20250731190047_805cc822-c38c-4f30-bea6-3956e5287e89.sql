-- Phase 1.5: Critical Connectivity Fixes for Unified Career Graph
-- This migration addresses orphaned nodes and missing semantic pathways

-- 1. Connect ALL orphaned job nodes to relevant skills via REQUIRES_SKILL edges
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
  -- Comprehensive job-to-skill mapping
  AND (
    -- UX/Design roles
    (j.title ILIKE '%ux%' AND (s.title ILIKE '%ux%' OR s.title ILIKE '%design%' OR s.title ILIKE '%figma%' OR s.title ILIKE '%prototyp%'))
    OR (j.title ILIKE '%design%' AND (s.title ILIKE '%design%' OR s.title ILIKE '%ux%' OR s.title ILIKE '%ui%' OR s.title ILIKE '%visual%'))
    -- Frontend roles
    OR (j.title ILIKE '%frontend%' AND (s.title ILIKE '%javascript%' OR s.title ILIKE '%react%' OR s.title ILIKE '%html%' OR s.title ILIKE '%css%' OR s.title ILIKE '%vue%' OR s.title ILIKE '%angular%'))
    OR (j.title ILIKE '%web%developer%' AND (s.title ILIKE '%html%' OR s.title ILIKE '%css%' OR s.title ILIKE '%javascript%'))
    -- Backend roles  
    OR (j.title ILIKE '%backend%' AND (s.title ILIKE '%python%' OR s.title ILIKE '%java%' OR s.title ILIKE '%node%' OR s.title ILIKE '%database%' OR s.title ILIKE '%api%'))
    OR (j.title ILIKE '%api%' AND (s.title ILIKE '%api%' OR s.title ILIKE '%rest%' OR s.title ILIKE '%backend%'))
    -- Data roles
    OR (j.title ILIKE '%data%analyst%' AND (s.title ILIKE '%sql%' OR s.title ILIKE '%data%' OR s.title ILIKE '%statistics%' OR s.title ILIKE '%excel%' OR s.title ILIKE '%tableau%'))
    OR (j.title ILIKE '%data%scientist%' AND (s.title ILIKE '%python%' OR s.title ILIKE '%machine%learning%' OR s.title ILIKE '%statistics%' OR s.title ILIKE '%data%'))
    OR (j.title ILIKE '%analyst%' AND (s.title ILIKE '%analysis%' OR s.title ILIKE '%sql%' OR s.title ILIKE '%data%'))
    -- Product/Management roles
    OR (j.title ILIKE '%product%manager%' AND (s.title ILIKE '%product%' OR s.title ILIKE '%agile%' OR s.title ILIKE '%scrum%' OR s.title ILIKE '%management%'))
    OR (j.title ILIKE '%project%manager%' AND (s.title ILIKE '%project%' OR s.title ILIKE '%agile%' OR s.title ILIKE '%management%'))
    OR (j.title ILIKE '%manager%' AND (s.title ILIKE '%management%' OR s.title ILIKE '%leadership%' OR s.title ILIKE '%communication%'))
    -- DevOps/Infrastructure
    OR (j.title ILIKE '%devops%' AND (s.title ILIKE '%docker%' OR s.title ILIKE '%aws%' OR s.title ILIKE '%kubernetes%' OR s.title ILIKE '%linux%'))
    OR (j.title ILIKE '%cloud%' AND (s.title ILIKE '%aws%' OR s.title ILIKE '%azure%' OR s.title ILIKE '%cloud%'))
    -- QA/Testing
    OR (j.title ILIKE '%qa%' AND (s.title ILIKE '%testing%' OR s.title ILIKE '%automation%' OR s.title ILIKE '%quality%'))
    OR (j.title ILIKE '%test%' AND (s.title ILIKE '%testing%' OR s.title ILIKE '%qa%'))
    -- Marketing/Sales
    OR (j.title ILIKE '%marketing%' AND (s.title ILIKE '%marketing%' OR s.title ILIKE '%content%' OR s.title ILIKE '%social%media%'))
    OR (j.title ILIKE '%sales%' AND (s.title ILIKE '%sales%' OR s.title ILIKE '%communication%' OR s.title ILIKE '%crm%'))
    -- Security
    OR (j.title ILIKE '%security%' AND (s.title ILIKE '%security%' OR s.title ILIKE '%cybersecurity%' OR s.title ILIKE '%network%'))
    -- Mobile
    OR (j.title ILIKE '%mobile%' AND (s.title ILIKE '%mobile%' OR s.title ILIKE '%ios%' OR s.title ILIKE '%android%' OR s.title ILIKE '%react%native%'))
    -- Generic tech skills for software roles
    OR (j.title ILIKE '%software%' AND (s.title ILIKE '%programming%' OR s.title ILIKE '%software%' OR s.title ILIKE '%coding%'))
    OR (j.title ILIKE '%developer%' AND (s.title ILIKE '%programming%' OR s.title ILIKE '%development%' OR s.title ILIKE '%coding%'))
    OR (j.title ILIKE '%engineer%' AND (s.title ILIKE '%engineering%' OR s.title ILIKE '%technical%' OR s.title ILIKE '%problem%solving%'))
  )
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = j.id AND e2.to_id = s.id AND e2.edge_type = 'REQUIRES_SKILL'
  );

-- 2. Add comprehensive course-to-skill TEACHES connections
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
    -- Programming languages
    (c.title ILIKE '%javascript%' AND s.title ILIKE '%javascript%')
    OR (c.title ILIKE '%python%' AND s.title ILIKE '%python%')
    OR (c.title ILIKE '%java%' AND s.title ILIKE '%java%')
    OR (c.title ILIKE '%react%' AND s.title ILIKE '%react%')
    OR (c.title ILIKE '%vue%' AND s.title ILIKE '%vue%')
    OR (c.title ILIKE '%angular%' AND s.title ILIKE '%angular%')
    -- Web technologies
    OR (c.title ILIKE '%html%' AND s.title ILIKE '%html%')
    OR (c.title ILIKE '%css%' AND s.title ILIKE '%css%')
    OR (c.title ILIKE '%web%development%' AND (s.title ILIKE '%html%' OR s.title ILIKE '%css%' OR s.title ILIKE '%javascript%'))
    -- Data & Analytics
    OR (c.title ILIKE '%sql%' AND s.title ILIKE '%sql%')
    OR (c.title ILIKE '%data%analysis%' AND (s.title ILIKE '%data%' OR s.title ILIKE '%analysis%'))
    OR (c.title ILIKE '%machine%learning%' AND s.title ILIKE '%machine%learning%')
    OR (c.title ILIKE '%statistics%' AND s.title ILIKE '%statistics%')
    -- Design
    OR (c.title ILIKE '%ux%' AND s.title ILIKE '%ux%')
    OR (c.title ILIKE '%ui%' AND s.title ILIKE '%ui%')
    OR (c.title ILIKE '%design%' AND s.title ILIKE '%design%')
    OR (c.title ILIKE '%figma%' AND s.title ILIKE '%figma%')
    -- Cloud & DevOps
    OR (c.title ILIKE '%aws%' AND s.title ILIKE '%aws%')
    OR (c.title ILIKE '%docker%' AND s.title ILIKE '%docker%')
    OR (c.title ILIKE '%kubernetes%' AND s.title ILIKE '%kubernetes%')
    -- Business & Marketing
    OR (c.title ILIKE '%marketing%' AND s.title ILIKE '%marketing%')
    OR (c.title ILIKE '%product%management%' AND s.title ILIKE '%product%')
    OR (c.title ILIKE '%project%management%' AND s.title ILIKE '%project%')
    -- Generic matches
    OR (c.title ILIKE '%programming%' AND s.title ILIKE '%programming%')
    OR (c.title ILIKE '%software%' AND s.title ILIKE '%software%')
  )
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = c.id AND e2.to_id = s.id AND e2.edge_type = 'TEACHES'
  );

-- 3. Create career progression paths with NEXT_ROLE edges
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score, semantic_strength)
SELECT DISTINCT
  j1.id as from_id,
  j2.id as to_id,
  'job' as from_type,
  'job' as to_type,
  'NEXT_ROLE' as edge_type,
  0.7 as importance_weight,
  2080 as time_cost_hours, -- ~1 year experience
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
    -- Junior to Senior progressions
    (j1.title ILIKE '%junior%developer%' AND j2.title ILIKE '%senior%developer%')
    OR (j1.title ILIKE '%junior%engineer%' AND j2.title ILIKE '%senior%engineer%')
    OR (j1.title ILIKE '%associate%' AND j2.title ILIKE '%senior%')
    -- Designer progressions
    OR (j1.title ILIKE '%junior%designer%' AND j2.title ILIKE '%senior%designer%')
    OR (j1.title ILIKE '%ux%designer%' AND j2.title ILIKE '%lead%ux%')
    -- Analyst progressions
    OR (j1.title ILIKE '%analyst%' AND j2.title ILIKE '%senior%analyst%')
    OR (j1.title ILIKE '%data%analyst%' AND j2.title ILIKE '%data%scientist%')
    -- Management progressions
    OR (j1.title ILIKE '%developer%' AND j2.title ILIKE '%lead%developer%')
    OR (j1.title ILIKE '%engineer%' AND j2.title ILIKE '%engineering%manager%')
    OR (j1.title ILIKE '%designer%' AND j2.title ILIKE '%design%manager%')
    -- Specialization progressions
    OR (j1.title ILIKE '%frontend%' AND j2.title ILIKE '%fullstack%')
    OR (j1.title ILIKE '%qa%' AND j2.title ILIKE '%qa%lead%')
  )
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = j1.id AND e2.to_id = j2.id AND e2.edge_type = 'NEXT_ROLE'
  );

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
    -- Core tech skills to jobs
    (s.title ILIKE '%javascript%' AND (j.title ILIKE '%frontend%' OR j.title ILIKE '%web%developer%'))
    OR (s.title ILIKE '%react%' AND j.title ILIKE '%frontend%')
    OR (s.title ILIKE '%python%' AND (j.title ILIKE '%backend%' OR j.title ILIKE '%data%scientist%'))
    OR (s.title ILIKE '%sql%' AND j.title ILIKE '%data%analyst%')
    OR (s.title ILIKE '%ux%' AND j.title ILIKE '%ux%designer%')
    OR (s.title ILIKE '%design%' AND j.title ILIKE '%designer%')
    OR (s.title ILIKE '%aws%' AND j.title ILIKE '%devops%')
    OR (s.title ILIKE '%testing%' AND j.title ILIKE '%qa%')
    OR (s.title ILIKE '%marketing%' AND j.title ILIKE '%marketing%')
    OR (s.title ILIKE '%product%' AND j.title ILIKE '%product%manager%')
  )
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = s.id AND e2.to_id = j.id AND e2.edge_type = 'QUALIFIES_FOR'
  )
  LIMIT 100; -- Prevent timeout

-- 5. Create basic substitution groups for similar nodes
UPDATE career_graph_nodes 
SET substitution_group_id = gen_random_uuid()
WHERE substitution_group_id IS NULL 
  AND node_type = 'skill'
  AND (title ILIKE '%javascript%' OR title ILIKE '%js%');

UPDATE career_graph_nodes 
SET substitution_group_id = (
  SELECT substitution_group_id FROM career_graph_nodes 
  WHERE title ILIKE '%javascript%' AND substitution_group_id IS NOT NULL 
  LIMIT 1
)
WHERE substitution_group_id IS NULL 
  AND node_type = 'skill'
  AND (title ILIKE '%react%' OR title ILIKE '%vue%' OR title ILIKE '%angular%');

UPDATE career_graph_nodes 
SET substitution_group_id = gen_random_uuid()
WHERE substitution_group_id IS NULL 
  AND node_type = 'skill'
  AND (title ILIKE '%python%' OR title ILIKE '%java%' OR title ILIKE '%backend%');

UPDATE career_graph_nodes 
SET substitution_group_id = gen_random_uuid()
WHERE substitution_group_id IS NULL 
  AND node_type = 'job'
  AND (title ILIKE '%ux%designer%' OR title ILIKE '%ui%designer%' OR title ILIKE '%product%designer%');

-- 6. Add pivot opportunities between related career paths
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score, semantic_strength)
SELECT DISTINCT
  j1.id as from_id,
  j2.id as to_id,
  'job' as from_type,
  'job' as to_type,
  'PIVOT_TO' as edge_type,
  0.5 as importance_weight,
  520 as time_cost_hours, -- ~3 months retraining
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
    -- Tech pivot opportunities
    (j1.title ILIKE '%frontend%' AND j2.title ILIKE '%backend%')
    OR (j1.title ILIKE '%backend%' AND j2.title ILIKE '%frontend%')
    OR (j1.title ILIKE '%developer%' AND j2.title ILIKE '%data%analyst%')
    OR (j1.title ILIKE '%designer%' AND j2.title ILIKE '%frontend%')
    OR (j1.title ILIKE '%qa%' AND j2.title ILIKE '%developer%')
    OR (j1.title ILIKE '%analyst%' AND j2.title ILIKE '%data%scientist%')
    -- Management pivots
    OR (j1.title ILIKE '%developer%' AND j2.title ILIKE '%product%manager%')
    OR (j1.title ILIKE '%designer%' AND j2.title ILIKE '%product%manager%')
  )
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = j1.id AND e2.to_id = j2.id AND e2.edge_type = 'PIVOT_TO'
  )
  LIMIT 50;