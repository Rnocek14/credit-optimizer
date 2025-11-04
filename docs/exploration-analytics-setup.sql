-- Exploration Analytics Views Setup
-- Run these in Supabase SQL Editor to create analytics views
-- These power the /analytics/exploration dashboard

-- View 1: Bucket assignments and overrides (last 21 days)
create or replace view analytics_ab_assignments_21d as
select
  props->>'bucket' as bucket,
  (props->>'overridden')::boolean as overridden,
  count(distinct props->>'user') as users,
  count(*) as assignment_events
from analytics_events
where event = 'ab_assignment'
  and props->>'test' = 'exploration_mode'
  and ts >= now() - interval '21 days'
group by 1, 2;

-- View 2: Explore → Apply funnel by bucket (last 21 days)
create or replace view analytics_exploration_funnel_21d as
with events as (
  select 
    event, 
    ts, 
    props,
    props->>'bucket' as bucket
  from analytics_events
  where ts >= now() - interval '21 days'
    and props->>'bucket' is not null
)
select
  bucket,
  count(*) filter (where event='module_template_explored') as explored,
  count(*) filter (where event='module_replaced_with_template') as applied,
  round(
    100.0 * count(*) filter (where event='module_replaced_with_template')
    / nullif(count(*) filter (where event='module_template_explored'), 0),
    1
  ) as apply_rate_pct
from events
group by 1
order by 1;

-- View 3: Satisfied-module exploration lift (primary KPI, last 21 days)
create or replace view analytics_exploration_satisfied_21d as
with events as (
  select 
    event, 
    ts, 
    props,
    props->>'bucket' as bucket,
    (props->>'was_satisfied')::boolean as was_satisfied,
    (props->>'was_exploratory')::boolean as was_exploratory
  from analytics_events
  where ts >= now() - interval '21 days'
    and props->>'bucket' is not null
)
select
  bucket,
  count(*) filter (where event='module_template_explored' and was_satisfied) as explored_satisfied,
  count(*) filter (where event='module_replaced_with_template' and was_exploratory) as applied_exploratory,
  round(
    100.0 * count(*) filter (where event='module_replaced_with_template' and was_exploratory)
    / nullif(count(*) filter (where event='module_template_explored' and was_satisfied), 0),
    1
  ) as exploration_apply_rate_pct
from events
group by 1
order by 1;

-- Optional: Add RLS policies for admin access
-- Uncomment if you want to restrict view access
-- alter view analytics_ab_assignments_21d owner to authenticated;
-- alter view analytics_exploration_funnel_21d owner to authenticated;
-- alter view analytics_exploration_satisfied_21d owner to authenticated;

-- After creating these views, regenerate Supabase types in Lovable:
-- Go to Lovable Cloud tab → Regenerate types
