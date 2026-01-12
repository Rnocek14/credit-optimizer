-- Add plan tier support to usage_quotas table
-- Following the recommended approach: tier info here for MVP, 
-- but structured for future migration to dedicated entitlements table

-- Create the plan tier enum
CREATE TYPE public.user_plan_tier AS ENUM ('free', 'single_school', 'multi_compare', 'multi_optimizer');

-- Add tier columns to usage_quotas
ALTER TABLE public.usage_quotas 
ADD COLUMN plan_tier public.user_plan_tier NOT NULL DEFAULT 'free',
ADD COLUMN tier_expires_at TIMESTAMPTZ,
ADD COLUMN tier_source TEXT DEFAULT 'default';

-- Add a comment explaining the columns
COMMENT ON COLUMN public.usage_quotas.plan_tier IS 'Current subscription tier for the user';
COMMENT ON COLUMN public.usage_quotas.tier_expires_at IS 'When the current tier expires (null = never)';
COMMENT ON COLUMN public.usage_quotas.tier_source IS 'Source of tier assignment: default, manual, stripe, etc.';

-- Create index for tier lookups
CREATE INDEX idx_usage_quotas_plan_tier ON public.usage_quotas(plan_tier);

-- Update ensure_quota_row to preserve tier info on month rollover
CREATE OR REPLACE FUNCTION public.ensure_quota_row(p_user uuid)
RETURNS usage_quotas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  ms date := date_trunc('month', now())::date;
  jwt_claims jsonb := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  is_service_role boolean := COALESCE(jwt_claims->>'role', '') = 'service_role';
  result_row usage_quotas%ROWTYPE;
BEGIN
  -- Only the caller for themselves OR service role can use this
  IF NOT is_service_role AND auth.uid() IS DISTINCT FROM p_user THEN
    RAISE EXCEPTION 'Insufficient permissions to ensure quota row';
  END IF;

  INSERT INTO public.usage_quotas (user_id, month_start, maya_analyses_used, plan_tier)
  VALUES (p_user, ms, 0, 'free')
  ON CONFLICT (user_id) DO UPDATE
    SET month_start = GREATEST(EXCLUDED.month_start, usage_quotas.month_start),
        maya_analyses_used = CASE
          WHEN EXCLUDED.month_start > usage_quotas.month_start THEN 0
          ELSE usage_quotas.maya_analyses_used
        END,
        -- Preserve existing tier info (don't reset on month rollover)
        plan_tier = usage_quotas.plan_tier,
        tier_expires_at = usage_quotas.tier_expires_at,
        tier_source = usage_quotas.tier_source,
        updated_at = now()
  RETURNING * INTO result_row;

  RETURN result_row;
END;
$function$;