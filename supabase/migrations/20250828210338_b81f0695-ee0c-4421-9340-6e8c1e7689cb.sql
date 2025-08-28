
-- 1) Recreate referral code generator that doesn't require pgcrypto
-- Safely drop any existing trigger/function (idempotent)
DROP TRIGGER IF EXISTS trg_referrals_code ON public.referrals;
DROP FUNCTION IF EXISTS public.ensure_referral_code();

CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF NEW.referral_code IS NOT NULL AND length(NEW.referral_code) > 0 THEN
    RETURN NEW;
  END IF;

  -- 8-char code from md5 (no pgcrypto extension required)
  v_code := substr(md5(NEW.user_id::text || clock_timestamp()::text || random()::text), 1, 8);

  -- ensure uniqueness with a guarded loop
  WHILE EXISTS (SELECT 1 FROM public.referrals r WHERE r.referral_code = v_code) LOOP
    v_code := substr(md5(v_code || random()::text || clock_timestamp()::text), 1, 8);
  END LOOP;

  NEW.referral_code := v_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_referrals_code
BEFORE INSERT ON public.referrals
FOR EACH ROW EXECUTE PROCEDURE public.ensure_referral_code();

-- 2) RPC to ensure a current-month quota row exists for a user
-- Aligns to existing usage_quotas schema with (user_id UNIQUE), month_start DATE, maya_analyses_used INT
-- Resets usage to 0 when rolling into a new month
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

  INSERT INTO public.usage_quotas (user_id, month_start, maya_analyses_used)
  VALUES (p_user, ms, 0)
  ON CONFLICT (user_id) DO UPDATE
    SET month_start = GREATEST(EXCLUDED.month_start, usage_quotas.month_start),
        maya_analyses_used = CASE
          WHEN EXCLUDED.month_start > usage_quotas.month_start THEN 0
          ELSE usage_quotas.maya_analyses_used
        END,
        updated_at = now()
  RETURNING * INTO result_row;

  RETURN result_row;
END;
$function$;
