
-- 0) Ensure extensions (safe if already installed)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- 1) Create table if missing (idempotent)
create table if not exists public.maya_context_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null,
  context_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2) Ensure all required columns exist (for older installs)
alter table public.maya_context_tracking
  add column if not exists id uuid default gen_random_uuid();

alter table public.maya_context_tracking
  add column if not exists user_id uuid;

alter table public.maya_context_tracking
  add column if not exists event_type text;

alter table public.maya_context_tracking
  add column if not exists context_data jsonb default '{}'::jsonb;

alter table public.maya_context_tracking
  add column if not exists created_at timestamptz default now();

-- 2a) Ensure a primary key constraint exists on id (idempotent)
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'maya_context_tracking'
      and constraint_type = 'PRIMARY KEY'
  ) then
    alter table public.maya_context_tracking
      add constraint maya_context_tracking_pkey primary key (id);
  end if;
end$$;

-- 3) If user_id is TEXT on this project, migrate to UUID safely
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'maya_context_tracking'
      and column_name  = 'user_id'
      and data_type    = 'text'
  ) then
    -- Add temp UUID column and copy valid values
    alter table public.maya_context_tracking
      add column if not exists user_id_uuid uuid;

    update public.maya_context_tracking
    set user_id_uuid = nullif(user_id, 'null')::uuid
    where user_id_uuid is null
      and user_id is not null
      and user_id <> '';

    -- Drop any rows that couldn't be converted (invalid UUIDs)
    delete from public.maya_context_tracking
    where user_id_uuid is null;

    -- Swap columns
    alter table public.maya_context_tracking drop column user_id;
    alter table public.maya_context_tracking rename column user_id_uuid to user_id;
  end if;
end$$;

-- 4) Defensive cleanup for impossible values
delete from public.maya_context_tracking
where user_id is null;

-- If already UUID-typed, casting to text is safe; remove bad sentinel values
delete from public.maya_context_tracking
where user_id::text in ('', 'null');

-- 5) Normalize context_data and ensure defaults/not nulls are enforced
update public.maya_context_tracking
set context_data = '{}'::jsonb
where context_data is null;

-- Backfill event_type if null/empty then enforce NOT NULL
update public.maya_context_tracking
set event_type = coalesce(nullif(event_type, ''), 'unknown')
where event_type is null or event_type = '';

alter table public.maya_context_tracking
  alter column context_data set default '{}'::jsonb,
  alter column context_data set not null,
  alter column created_at set default now();

-- Enforce NOT NULLs (safe after cleanup)
alter table public.maya_context_tracking
  alter column user_id set not null;

alter table public.maya_context_tracking
  alter column event_type set not null;

-- 6) RLS and policies (idempotent)
alter table public.maya_context_tracking enable row level security;

drop policy if exists "Users can view their own context events" on public.maya_context_tracking;
drop policy if exists "Users can insert their own context events" on public.maya_context_tracking;

create policy "Users can view their own context events"
  on public.maya_context_tracking
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own context events"
  on public.maya_context_tracking
  for insert
  with check (auth.uid() = user_id);

-- 7) Helpful indexes
create index if not exists idx_mct_user_time
  on public.maya_context_tracking (user_id, created_at desc);

create index if not exists idx_mct_event_type
  on public.maya_context_tracking (event_type);

-- 8) Smoke test: call the generator once with BOTH headers
--    Expect a 200 and JSON with {"success":true,...}
select net.http_post(
  url     := 'https://vzpissitddpunkpythsb.functions.supabase.co/maya-insight-generator',
  headers := jsonb_build_object(
               'content-type','application/json',
               'authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI',
               'x-cron-secret','pR1v4t3-CR0N-7f9b4a0e0a8e4d4c8cfbb1f8f7a4b9d2a3c9de9d1234abcd'
             ),
  body    := '{}'::jsonb
) as smoke_test_request_id;

-- 9) Observability: last 3 HTTP responses and insight counts
select id, status_code, created, left(content::text, 400) as content_preview, error_msg
from net._http_response
order by created desc
limit 3;

select count(*) as insights_last_5m
from public.maya_proactive_insights
where created_at > now() - interval '5 minutes';

select count(*) as insights_last_24h
from public.maya_proactive_insights
where created_at > now() - interval '24 hours';
