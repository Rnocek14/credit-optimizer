-- ============================================================================
-- Exploration Analytics: Slice-Aware Functions & Smart Re-Ranker Setup
-- ============================================================================
-- This file contains all SQL needed for slice analysis (module_category, year,
-- providerType) and smart recommendation weights.
--
-- Run this in Supabase SQL Editor after creating the base analytics views.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Performance Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_events_ts ON analytics_events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_event ON analytics_events (event);
CREATE INDEX IF NOT EXISTS idx_events_props_bucket ON analytics_events ((props->>'bucket'));
CREATE INDEX IF NOT EXISTS idx_events_props_module_category ON analytics_events ((props->>'module_category'));
CREATE INDEX IF NOT EXISTS idx_events_props_year_int ON analytics_events (((props->>'year')::int));
CREATE INDEX IF NOT EXISTS idx_events_props_provider_type ON analytics_events ((props->>'providerType'));

-- ----------------------------------------------------------------------------
-- 2. Base Extractor View (normalizes slice fields)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW exploration_events_v AS
SELECT
  ts,
  event,
  props,
  props->>'bucket'             AS bucket,             -- 'A' | 'B'
  (props->>'year')::int        AS plan_year,          -- nullable
  props->>'module_category'    AS module_category,    -- nullable
  props->>'providerType'       AS provider_type,      -- e.g., 'ACE','CLEP','NCCRS','other'
  (props->>'was_satisfied')::boolean    AS was_satisfied,
  (props->>'was_exploratory')::boolean  AS was_exploratory
FROM analytics_events
WHERE props ? 'bucket'; -- only events that have bucket enrichment

-- ----------------------------------------------------------------------------
-- 3. Bucket Split (by slice)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION exploration_bucket_split(
  _since INTERVAL DEFAULT '21 days',
  _module_category TEXT DEFAULT NULL,
  _plan_year INT DEFAULT NULL,
  _provider_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  bucket TEXT,
  users BIGINT,
  assignment_events BIGINT
) LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT * FROM exploration_events_v
    WHERE ts >= now() - _since
      AND (_module_category IS NULL OR module_category = _module_category)
      AND (_plan_year IS NULL OR plan_year = _plan_year)
      AND (_provider_type IS NULL OR provider_type = _provider_type)
  )
  SELECT
    props->>'bucket' AS bucket,
    COUNT(DISTINCT props->>'user')::bigint AS users,
    COUNT(*)::bigint AS assignment_events
  FROM analytics_events a
  WHERE a.event = 'ab_assignment'
    AND a.ts >= now() - _since
    AND ( _module_category IS NULL OR a.props->>'module_category' = _module_category )
    AND ( _plan_year IS NULL OR (a.props->>'year')::int = _plan_year )
    AND ( _provider_type IS NULL OR a.props->>'providerType' = _provider_type )
  GROUP BY 1
  ORDER BY 1;
$$;

-- ----------------------------------------------------------------------------
-- 4. Funnel (Explore → Apply) by bucket (with slices)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION exploration_funnel(
  _since INTERVAL DEFAULT '21 days',
  _module_category TEXT DEFAULT NULL,
  _plan_year INT DEFAULT NULL,
  _provider_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  bucket TEXT,
  explored BIGINT,
  applied BIGINT,
  apply_rate_pct NUMERIC
) LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT * FROM exploration_events_v
    WHERE ts >= now() - _since
      AND (_module_category IS NULL OR module_category = _module_category)
      AND (_plan_year IS NULL OR plan_year = _plan_year)
      AND (_provider_type IS NULL OR provider_type = _provider_type)
  )
  SELECT
    bucket,
    COUNT(*) FILTER (WHERE event = 'module_template_explored')::bigint AS explored,
    COUNT(*) FILTER (WHERE event = 'module_replaced_with_template')::bigint AS applied,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE event = 'module_replaced_with_template')
      / NULLIF( COUNT(*) FILTER (WHERE event = 'module_template_explored'), 0)
    , 1) AS apply_rate_pct
  FROM base
  GROUP BY bucket
  ORDER BY bucket;
$$;

-- ----------------------------------------------------------------------------
-- 5. Daily Rollup (for trend charts)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION exploration_daily_rollup(
  _days INT DEFAULT 30,
  _module_category TEXT DEFAULT NULL,
  _plan_year INT DEFAULT NULL,
  _provider_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  day DATE,
  bucket TEXT,
  explored BIGINT,
  applied BIGINT,
  apply_rate_pct NUMERIC
) LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT * FROM exploration_events_v
    WHERE ts >= (current_date - (_days || ' days')::interval)
      AND (_module_category IS NULL OR module_category = _module_category)
      AND (_plan_year IS NULL OR plan_year = _plan_year)
      AND (_provider_type IS NULL OR provider_type = _provider_type)
  )
  SELECT
    date_trunc('day', ts)::date AS day,
    bucket,
    COUNT(*) FILTER (WHERE event = 'module_template_explored')::bigint AS explored,
    COUNT(*) FILTER (WHERE event = 'module_replaced_with_template')::bigint AS applied,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE event = 'module_replaced_with_template')
      / NULLIF( COUNT(*) FILTER (WHERE event = 'module_template_explored'), 0)
    , 1) AS apply_rate_pct
  FROM base
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

-- ----------------------------------------------------------------------------
-- 6. Smart Re-Ranker Weights Table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS smart_rank_weights (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  version INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,

  -- base bias & feature weights
  bias               NUMERIC NOT NULL DEFAULT 0,    -- constant offset
  w_cost             NUMERIC NOT NULL DEFAULT -0.20,
  w_weeks            NUMERIC NOT NULL DEFAULT -0.10,
  w_cri              NUMERIC NOT NULL DEFAULT  0.25,
  w_transfer_ok      NUMERIC NOT NULL DEFAULT  0.30, -- 0/1

  -- provider one-hots (optional; keep small)
  w_provider_ace     NUMERIC NOT NULL DEFAULT  0.05,
  w_provider_clep    NUMERIC NOT NULL DEFAULT  0.03,
  w_provider_nccrs   NUMERIC NOT NULL DEFAULT  0.02,
  w_provider_other   NUMERIC NOT NULL DEFAULT  0.00,

  -- exploration context (optional)
  w_exploratory_bonus NUMERIC NOT NULL DEFAULT 0.00,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ
);

-- Ensure only one active row
CREATE UNIQUE INDEX IF NOT EXISTS uniq_smart_rank_weights_active
ON smart_rank_weights (active) WHERE active = TRUE;

-- ----------------------------------------------------------------------------
-- 7. Seed Default Weights
-- ----------------------------------------------------------------------------

-- Deactivate any previously active row to satisfy the unique partial index
UPDATE smart_rank_weights SET active = FALSE WHERE active = TRUE;

-- Insert a baseline (kept inactive as reference)
INSERT INTO smart_rank_weights (
  version, active, notes,
  bias, w_cost, w_weeks, w_cri, w_transfer_ok,
  w_provider_ace, w_provider_clep, w_provider_nccrs, w_provider_other,
  w_exploratory_bonus
)
VALUES (
  1, FALSE, 'Baseline v1 (reference only)',
  0, -0.20, -0.10, 0.25, 0.30,
  0.05, 0.03, 0.02, 0.00,
  0.00
)
ON CONFLICT DO NOTHING;

-- Insert & activate a provider-bump example (ACE favored + exploratory bonus)
INSERT INTO smart_rank_weights (
  version, active, notes,
  bias, w_cost, w_weeks, w_cri, w_transfer_ok,
  w_provider_ace, w_provider_clep, w_provider_nccrs, w_provider_other,
  w_exploratory_bonus, activated_at
)
VALUES (
  2, TRUE, 'Provider bump v2 — prefer ACE; small CLEP/NCCRS bump; exploration bonus',
  0, -0.20, -0.10, 0.25, 0.30,
  0.12, 0.06, 0.04, 0.00,
  0.05, now()
);

-- ----------------------------------------------------------------------------
-- 8. Getter Function for Active Weights
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_active_re_rank_weights()
RETURNS smart_rank_weights LANGUAGE sql STABLE AS $$
  SELECT * FROM smart_rank_weights
  WHERE active = TRUE
  ORDER BY activated_at DESC NULLS LAST, id DESC
  LIMIT 1;
$$;

-- ----------------------------------------------------------------------------
-- 9. Safety Check
-- ----------------------------------------------------------------------------

DO $$
DECLARE cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM smart_rank_weights WHERE active = TRUE;
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'smart_rank_weights has % active rows; expected 1', cnt;
  END IF;
END$$;

-- ============================================================================
-- Setup Complete
-- ============================================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Regenerate types in Lovable Cloud tab
-- 3. Use the TypeScript SDK in src/lib/analytics/explorationApi.ts
-- ============================================================================
