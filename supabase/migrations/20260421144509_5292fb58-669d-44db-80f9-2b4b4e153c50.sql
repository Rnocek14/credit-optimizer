-- Relax policy_packs_require_caps to allow PARTIAL DRAFT packs.
--
-- Why: ASUO and similar institutions publish institution-wide max_transfer caps
-- but program-scoped residency. Blocking the pack entirely means we lose the
-- verified max_transfer signal. Partial drafts let us record what we've found
-- while flagging missing fields for backfill.
--
-- Safety: 'active' status STILL requires both caps via this constraint AND the
-- existing validate_policy_pack_active_status trigger (which additionally
-- requires ground_truth/human_override provenance). Partial packs cannot be
-- promoted to active.

ALTER TABLE public.institution_policy_packs
  DROP CONSTRAINT IF EXISTS policy_packs_require_caps;

ALTER TABLE public.institution_policy_packs
  ADD CONSTRAINT policy_packs_require_caps CHECK (
    -- Deprecated packs: no requirements (historical records)
    status = 'deprecated'
    OR
    -- Partial DRAFT packs: must be flagged partial_pack=true AND have at least
    -- max_transfer_credits with a valid positive integer. Residency may be null.
    -- Cannot be 'active'.
    (
      status = 'draft'
      AND (policy_data ->> 'partial_pack') = 'true'
      AND (policy_data ->> 'max_transfer_credits') IS NOT NULL
      AND (policy_data ->> 'max_transfer_credits') ~ '^[1-9]\d*$'
    )
    OR
    -- Full packs (any non-deprecated status): both caps required as before.
    (
      (policy_data ->> 'residency_credits') IS NOT NULL
      AND (policy_data ->> 'residency_credits') ~ '^[1-9]\d*$'
      AND (policy_data ->> 'max_transfer_credits') IS NOT NULL
      AND (policy_data ->> 'max_transfer_credits') ~ '^[1-9]\d*$'
    )
  );