-- A/B Test Validation Queries for Exploration Mode
-- Run these in Supabase SQL editor to validate A/B framework

-- ============================================
-- Query 1: Assignment Distribution
-- Check that users are split ~50/50 between A and B
-- ============================================
SELECT 
  props->>'bucket' AS bucket,
  COUNT(DISTINCT props->>'user') AS unique_users,
  COUNT(*) AS assignment_events
FROM analytics_events
WHERE event = 'ab_assignment'
  AND props->>'test' = 'exploration_mode'
  AND ts >= now() - interval '7 days'
GROUP BY 1
ORDER BY 1;

-- Expected: ~50% A, ~50% B with similar unique_users counts


-- ============================================
-- Query 2: Override Rate
-- See how many users manually override A/B assignment
-- ============================================
SELECT 
  props->>'bucket' AS bucket,
  (props->>'overridden')::boolean AS overridden,
  COUNT(DISTINCT props->>'user') AS users
FROM analytics_events
WHERE event = 'ab_assignment'
  AND props->>'test' = 'exploration_mode'
  AND ts >= now() - interval '7 days'
GROUP BY 1, 2
ORDER BY 1, 2;


-- ============================================
-- Query 3: Exploration → Apply Conversion by Bucket
-- Primary KPI: Does bucket B (exploration ON) have higher apply rate?
-- ============================================
WITH events AS (
  SELECT 
    event,
    ts,
    props,
    props->>'bucket' AS bucket,
    props->>'moduleId' AS module_id
  FROM analytics_events
  WHERE ts >= now() - interval '14 days'
    AND props->>'bucket' IS NOT NULL
)
SELECT
  bucket,
  COUNT(*) FILTER (WHERE event = 'module_template_explored') AS explored,
  COUNT(*) FILTER (WHERE event = 'module_replaced_with_template') AS applied,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event = 'module_replaced_with_template')
    / NULLIF(COUNT(*) FILTER (WHERE event = 'module_template_explored'), 0), 
    1
  ) AS apply_rate_pct
FROM events
GROUP BY 1
ORDER BY 1;

-- Expected: Bucket B should have higher apply_rate_pct if exploration mode drives engagement


-- ============================================
-- Query 4: Exploration for Satisfied Modules Only (Primary Experiment)
-- Does exploration mode on satisfied modules increase template adoption?
-- ============================================
WITH events AS (
  SELECT 
    event,
    ts,
    props,
    props->>'bucket' AS bucket,
    (props->>'was_satisfied')::boolean AS was_satisfied,
    (props->>'was_exploratory')::boolean AS was_exploratory
  FROM analytics_events
  WHERE ts >= now() - interval '21 days'
    AND props->>'bucket' IS NOT NULL
)
SELECT
  bucket,
  COUNT(*) FILTER (
    WHERE event = 'module_template_explored' 
    AND was_satisfied = true
  ) AS explored_satisfied,
  COUNT(*) FILTER (
    WHERE event = 'module_replaced_with_template' 
    AND was_exploratory = true
  ) AS applied_exploratory,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event = 'module_replaced_with_template' AND was_exploratory = true)
    / NULLIF(COUNT(*) FILTER (WHERE event = 'module_template_explored' AND was_satisfied = true), 0),
    1
  ) AS exploration_apply_rate_pct
FROM events
GROUP BY 1
ORDER BY 1;

-- This is the KEY metric: exploration_apply_rate_pct should be higher for bucket B
