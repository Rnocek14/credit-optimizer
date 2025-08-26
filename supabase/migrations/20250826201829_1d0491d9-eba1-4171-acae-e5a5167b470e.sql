
-- 1) Canonical view for visible insights
create or replace view public.maya_visible_insights as
select *
from public.maya_proactive_insights
where dismissed_at is null
  and (expires_at is null or expires_at > now())
  and insight_type in ('manual_generation','proactive');

comment on view public.maya_visible_insights is
  'Canonical filtered view for Maya insights: non-dismissed, unexpired, and type in (manual_generation, proactive).';

-- 2) Speed indexes on the base table (safe if already present)
-- 2a) Per-user ordered reads (supports ORDER BY priority DESC, created_at DESC)
create index if not exists idx_maya_insights_user_priority_created
  on public.maya_proactive_insights (user_id, priority desc, created_at desc);

comment on index idx_maya_insights_user_priority_created is
  'Supports per-user ordered reads by priority (desc) then created_at (desc).';

-- 2b) Partial index matching the view predicate for fast recent reads
create index if not exists idx_maya_insights_visible_user_created
  on public.maya_proactive_insights (user_id, created_at desc)
  where dismissed_at is null
    and (expires_at is null or expires_at > now())
    and insight_type in ('manual_generation','proactive');

comment on index idx_maya_insights_visible_user_created is
  'Partial index aligned with maya_visible_insights predicate for per-user recency queries.';

-- 3) Privileges for PostgREST roles (RLS still enforced on base table)
grant usage on schema public to anon, authenticated;
grant select on public.maya_visible_insights to anon, authenticated;
