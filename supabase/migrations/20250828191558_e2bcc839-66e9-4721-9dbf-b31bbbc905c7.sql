-- Fix: Add RLS policy for referral_events table to resolve security linter warning
-- Only allow admin/service role to read events (for analytics), no public access

CREATE POLICY "referral_events_admin_only" ON public.referral_events
FOR SELECT
USING (false);  -- Prevents all user access, only service role can access via SECURITY DEFINER functions