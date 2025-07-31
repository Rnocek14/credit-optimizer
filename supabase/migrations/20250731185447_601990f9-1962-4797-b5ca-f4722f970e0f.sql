-- Phase 2: Fix Critical Graph Issues and Populate Relationships
-- 1. Remove circular dependencies
DELETE FROM career_graph_edges 
WHERE (from_id = to_id) 
   OR (from_id = (SELECT id FROM career_graph_nodes WHERE title = 'Advanced React Development' LIMIT 1) 
       AND to_id = (SELECT id FROM career_graph_nodes WHERE title = 'Web Accessibility' LIMIT 1))
   OR (from_id = (SELECT id FROM career_graph_nodes WHERE title = 'Web Accessibility' LIMIT 1) 
       AND to_id = (SELECT id FROM career_graph_nodes WHERE title = 'Advanced React Development' LIMIT 1));

-- 2. Connect orphaned job nodes to skills via REQUIRES_SKILL edges
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score)
SELECT 
  j.id as from_id,
  s.id as to_id,
  'job' as from_type,
  'skill' as to_type,
  'REQUIRES_SKILL' as edge_type,
  CASE 
    WHEN j.title ILIKE '%senior%' OR j.title ILIKE '%lead%' THEN 0.9
    WHEN j.title ILIKE '%junior%' OR j.title ILIKE '%entry%' THEN 0.6
    ELSE 0.8
  END as importance_weight,
  CASE 
    WHEN s.title ILIKE '%advanced%' OR s.title ILIKE '%expert%' THEN 120
    WHEN s.title ILIKE '%basic%' OR s.title ILIKE '%intro%' THEN 40
    ELSE 80
  END as time_cost_hours,
  CASE 
    WHEN j.title ILIKE '%engineer%' OR j.title ILIKE '%developer%' THEN 1.3
    WHEN j.title ILIKE '%designer%' THEN 1.1
    ELSE 1.0
  END as roi_score
FROM career_graph_nodes j
CROSS JOIN career_graph_nodes s
WHERE j.node_type = 'job' 
  AND s.node_type = 'skill'
  AND j.active = true 
  AND s.active = true
  -- UX Designer requires UX skills
  AND ((j.title ILIKE '%ux%designer%' AND (s.title ILIKE '%ux%' OR s.title ILIKE '%user%interface%' OR s.title ILIKE '%prototyping%'))
    -- Frontend Developer requires frontend skills  
    OR (j.title ILIKE '%frontend%developer%' AND (s.title ILIKE '%javascript%' OR s.title ILIKE '%html%' OR s.title ILIKE '%css%' OR s.title ILIKE '%react%'))
    -- Backend Developer requires backend skills
    OR (j.title ILIKE '%backend%developer%' AND (s.title ILIKE '%python%' OR s.title ILIKE '%database%' OR s.title ILIKE '%api%' OR s.title ILIKE '%server%'))
    -- Data Analyst requires data skills
    OR (j.title ILIKE '%data%analyst%' AND (s.title ILIKE '%sql%' OR s.title ILIKE '%data%analysis%' OR s.title ILIKE '%statistics%' OR s.title ILIKE '%excel%'))
    -- Product Manager requires product skills
    OR (j.title ILIKE '%product%manager%' AND (s.title ILIKE '%product%management%' OR s.title ILIKE '%agile%' OR s.title ILIKE '%roadmap%' OR s.title ILIKE '%stakeholder%'))
    -- DevOps Engineer requires DevOps skills
    OR (j.title ILIKE '%devops%' AND (s.title ILIKE '%docker%' OR s.title ILIKE '%kubernetes%' OR s.title ILIKE '%aws%' OR s.title ILIKE '%ci/cd%'))
    -- QA Engineer requires testing skills
    OR (j.title ILIKE '%qa%' OR j.title ILIKE '%test%' AND (s.title ILIKE '%testing%' OR s.title ILIKE '%automation%' OR s.title ILIKE '%selenium%'))
    -- Marketing roles require marketing skills
    OR (j.title ILIKE '%marketing%' AND (s.title ILIKE '%marketing%' OR s.title ILIKE '%seo%' OR s.title ILIKE '%content%' OR s.title ILIKE '%analytics%'))
    -- Sales roles require sales skills
    OR (j.title ILIKE '%sales%' AND (s.title ILIKE '%sales%' OR s.title ILIKE '%crm%' OR s.title ILIKE '%negotiation%' OR s.title ILIKE '%communication%')))
  -- Avoid duplicates
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = j.id AND e2.to_id = s.id AND e2.edge_type = 'REQUIRES_SKILL'
  );

-- 3. Create NEXT_ROLE progression pathways
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score)
SELECT 
  j1.id as from_id,
  j2.id as to_id,
  'job' as from_type,
  'job' as to_type,
  'NEXT_ROLE' as edge_type,
  0.8 as importance_weight,
  2000 as time_cost_hours, -- ~1 year experience
  1.5 as roi_score
FROM career_graph_nodes j1
CROSS JOIN career_graph_nodes j2
WHERE j1.node_type = 'job' AND j2.node_type = 'job'
  AND j1.active = true AND j2.active = true
  AND j1.id != j2.id
  -- Junior → Senior progressions
  AND ((j1.title ILIKE '%junior%frontend%' AND j2.title ILIKE '%senior%frontend%')
    OR (j1.title ILIKE '%junior%backend%' AND j2.title ILIKE '%senior%backend%')
    OR (j1.title ILIKE '%junior%developer%' AND j2.title ILIKE '%senior%developer%')
    OR (j1.title ILIKE '%junior%designer%' AND j2.title ILIKE '%senior%designer%')
    -- Associate → Manager progressions
    OR (j1.title ILIKE '%associate%' AND j2.title ILIKE '%manager%')
    OR (j1.title ILIKE '%analyst%' AND j2.title ILIKE '%senior%analyst%')
    -- Developer → Lead progressions
    OR (j1.title ILIKE '%developer%' AND j2.title ILIKE '%lead%developer%')
    OR (j1.title ILIKE '%engineer%' AND j2.title ILIKE '%senior%engineer%'))
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = j1.id AND e2.to_id = j2.id AND e2.edge_type = 'NEXT_ROLE'
  );

-- 4. Connect courses to skills via TEACHES edges
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score, semantic_strength)
SELECT 
  c.id as from_id,
  s.id as to_id,
  'course' as from_type,
  'skill' as to_type,
  'TEACHES' as edge_type,
  0.9 as importance_weight,
  CASE 
    WHEN c.title ILIKE '%advanced%' THEN 60
    WHEN c.title ILIKE '%intermediate%' THEN 40
    ELSE 20
  END as time_cost_hours,
  1.2 as roi_score,
  0.85 as semantic_strength
FROM career_graph_nodes c
CROSS JOIN career_graph_nodes s
WHERE c.node_type = 'course' 
  AND s.node_type = 'skill'
  AND c.active = true 
  AND s.active = true
  -- Match course content to skills using title similarity
  AND ((c.title ILIKE '%javascript%' AND s.title ILIKE '%javascript%')
    OR (c.title ILIKE '%react%' AND s.title ILIKE '%react%')
    OR (c.title ILIKE '%python%' AND s.title ILIKE '%python%')
    OR (c.title ILIKE '%sql%' AND s.title ILIKE '%sql%')
    OR (c.title ILIKE '%css%' AND s.title ILIKE '%css%')
    OR (c.title ILIKE '%html%' AND s.title ILIKE '%html%')
    OR (c.title ILIKE '%ux%' AND s.title ILIKE '%ux%')
    OR (c.title ILIKE '%ui%' AND s.title ILIKE '%ui%')
    OR (c.title ILIKE '%design%' AND s.title ILIKE '%design%')
    OR (c.title ILIKE '%data%' AND s.title ILIKE '%data%')
    OR (c.title ILIKE '%analysis%' AND s.title ILIKE '%analysis%')
    OR (c.title ILIKE '%marketing%' AND s.title ILIKE '%marketing%')
    OR (c.title ILIKE '%agile%' AND s.title ILIKE '%agile%')
    OR (c.title ILIKE '%scrum%' AND s.title ILIKE '%scrum%')
    OR (c.title ILIKE '%docker%' AND s.title ILIKE '%docker%')
    OR (c.title ILIKE '%aws%' AND s.title ILIKE '%aws%')
    OR (c.title ILIKE '%testing%' AND s.title ILIKE '%testing%'))
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = c.id AND e2.to_id = s.id AND e2.edge_type = 'TEACHES'
  );

-- 5. Connect skills to jobs via QUALIFIES_FOR edges
INSERT INTO career_graph_edges (from_id, to_id, from_type, to_type, edge_type, importance_weight, time_cost_hours, roi_score)
SELECT 
  s.id as from_id,
  j.id as to_id,
  'skill' as from_type,
  'job' as to_type,
  'QUALIFIES_FOR' as edge_type,
  CASE 
    WHEN s.title ILIKE '%advanced%' OR s.title ILIKE '%expert%' THEN 0.9
    WHEN s.title ILIKE '%basic%' OR s.title ILIKE '%intro%' THEN 0.5
    ELSE 0.7
  END as importance_weight,
  0 as time_cost_hours, -- No additional time cost for qualification
  1.4 as roi_score
FROM career_graph_nodes s
CROSS JOIN career_graph_nodes j
WHERE s.node_type = 'skill' 
  AND j.node_type = 'job'
  AND s.active = true 
  AND j.active = true
  -- Match skills to relevant job opportunities
  AND ((s.title ILIKE '%javascript%' AND (j.title ILIKE '%frontend%' OR j.title ILIKE '%web%developer%' OR j.title ILIKE '%full%stack%'))
    OR (s.title ILIKE '%react%' AND (j.title ILIKE '%frontend%' OR j.title ILIKE '%react%developer%'))
    OR (s.title ILIKE '%python%' AND (j.title ILIKE '%backend%' OR j.title ILIKE '%data%' OR j.title ILIKE '%python%developer%'))
    OR (s.title ILIKE '%ux%' AND j.title ILIKE '%ux%designer%')
    OR (s.title ILIKE '%ui%' AND (j.title ILIKE '%ui%designer%' OR j.title ILIKE '%frontend%'))
    OR (s.title ILIKE '%sql%' AND (j.title ILIKE '%data%analyst%' OR j.title ILIKE '%backend%' OR j.title ILIKE '%database%'))
    OR (s.title ILIKE '%product%management%' AND j.title ILIKE '%product%manager%')
    OR (s.title ILIKE '%marketing%' AND j.title ILIKE '%marketing%')
    OR (s.title ILIKE '%sales%' AND j.title ILIKE '%sales%')
    OR (s.title ILIKE '%docker%' AND j.title ILIKE '%devops%')
    OR (s.title ILIKE '%testing%' AND (j.title ILIKE '%qa%' OR j.title ILIKE '%test%')))
  AND NOT EXISTS (
    SELECT 1 FROM career_graph_edges e2 
    WHERE e2.from_id = s.id AND e2.to_id = j.id AND e2.edge_type = 'QUALIFIES_FOR'
  );

-- 6. Update existing edges with better ROI scores and weights
UPDATE career_graph_edges 
SET 
  roi_score = CASE 
    WHEN edge_type = 'TEACHES' THEN 1.2
    WHEN edge_type = 'REQUIRES_SKILL' THEN 1.3
    WHEN edge_type = 'QUALIFIES_FOR' THEN 1.4
    WHEN edge_type = 'NEXT_ROLE' THEN 1.5
    ELSE COALESCE(roi_score, 1.0)
  END,
  importance_weight = CASE 
    WHEN edge_type = 'REQUIRES_SKILL' THEN 0.9
    WHEN edge_type = 'TEACHES' THEN 0.8
    WHEN edge_type = 'QUALIFIES_FOR' THEN 0.7
    WHEN edge_type = 'NEXT_ROLE' THEN 0.8
    ELSE COALESCE(importance_weight, 1.0)
  END,
  time_cost_hours = CASE 
    WHEN edge_type = 'TEACHES' AND time_cost_hours = 0 THEN 40
    WHEN edge_type = 'REQUIRES_SKILL' AND time_cost_hours = 0 THEN 80
    WHEN edge_type = 'NEXT_ROLE' AND time_cost_hours = 0 THEN 2000
    ELSE COALESCE(time_cost_hours, 0)
  END
WHERE roi_score IS NULL OR importance_weight = 1.0 OR time_cost_hours = 0;