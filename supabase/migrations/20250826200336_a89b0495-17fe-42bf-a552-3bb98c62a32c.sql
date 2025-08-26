
-- 1) Canonical view: visible insights (keeps UI filters consistent)
create or replace view public.maya_visible_insights as
select *
from public.maya_proactive_insights
where dismissed_at is null
  and (expires_at is null or expires_at > now())
  and insight_type in ('manual_generation','proactive');

comment on view public.maya_visible_insights is
'Visible Maya insights: non-dismissed, not expired (or no expiry), and of types manual_generation/proactive.';

-- 2) Performance indexes
-- Note: We intentionally avoid using now() in partial index predicates (time-dependent),
-- and instead split by NULL vs NOT NULL expiries.

-- Per-user recency for general reads
create index if not exists idx_mpi_user_created
  on public.maya_proactive_insights (user_id, created_at desc);

-- Visible: non-dismissed + no expiry
create index if not exists idx_mpi_visible_null_exp
  on public.maya_proactive_insights (user_id, created_at desc)
  where dismissed_at is null and expires_at is null;

-- Visible: non-dismissed + future expiry (planner can use expires_at > now())
create index if not exists idx_mpi_visible_future_exp
  on public.maya_proactive_insights (user_id, expires_at, created_at desc)
  where dismissed_at is null and expires_at is not null;
