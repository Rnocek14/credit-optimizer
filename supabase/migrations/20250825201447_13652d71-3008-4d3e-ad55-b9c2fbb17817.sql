
-- 1) Enable required extensions (safe/idempotent)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Rate limiting table used by functions (service role bypasses RLS; users can read their own rows)
create table if not exists public.maya_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  function_name text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.maya_rate_limits enable row level security;

-- Allow users to view their own rate limit records (no user writes; service role bypasses RLS)
drop policy if exists "Users can view their own rate limits" on public.maya_rate_limits;
create policy "Users can view their own rate limits"
  on public.maya_rate_limits
  for select
  using (auth.uid() = user_id);

-- Unique key to support upsert-style increments
create unique index if not exists uniq_maya_rate_limits_user_fn_window
  on public.maya_rate_limits (user_id, function_name, window_start);

-- 3) Ensure maya_proactive_insights schema is aligned
-- Create the table if it's missing
create table if not exists public.maya_proactive_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  content text not null,
  priority text not null default 'medium', -- e.g. urgent | medium | info
  kind text,                               -- e.g. suggestion | alert | reminder
  meta jsonb not null default '{}'::jsonb, -- arbitrary AI/context metadata
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  dismissed_at timestamptz,
  acted_upon_at timestamptz,
  feedback_rating integer,
  feedback_text text,
  feedback_at timestamptz
);

-- If table exists with older/newer shape, add any missing columns
alter table public.maya_proactive_insights
  add column if not exists user_id uuid not null;
alter table public.maya_proactive_insights
  add column if not exists title text;
alter table public.maya_proactive_insights
  add column if not exists content text;
alter table public.maya_proactive_insights
  add column if not exists priority text default 'medium';
alter table public.maya_proactive_insights
  add column if not exists kind text;
alter table public.maya_proactive_insights
  add column if not exists meta jsonb default '{}'::jsonb;
alter table public.maya_proactive_insights
  add column if not exists created_at timestamptz default now();
alter table public.maya_proactive_insights
  add column if not exists expires_at timestamptz;
alter table public.maya_proactive_insights
  add column if not exists dismissed_at timestamptz;
alter table public.maya_proactive_insights
  add column if not exists acted_upon_at timestamptz;
alter table public.maya_proactive_insights
  add column if not exists feedback_rating integer;
alter table public.maya_proactive_insights
  add column if not exists feedback_text text;
alter table public.maya_proactive_insights
  add column if not exists feedback_at timestamptz;

-- RLS and policies
alter table public.maya_proactive_insights enable row level security;

-- Drop and re-create policies to avoid duplicates/stale definitions
drop policy if exists "Users can view their own proactive insights" on public.maya_proactive_insights;
drop policy if exists "Users can create their own proactive insights" on public.maya_proactive_insights;
drop policy if exists "Users can update their own proactive insights" on public.maya_proactive_insights;
drop policy if exists "Users can delete their own proactive insights" on public.maya_proactive_insights;

create policy "Users can view their own proactive insights"
  on public.maya_proactive_insights
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own proactive insights"
  on public.maya_proactive_insights
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own proactive insights"
  on public.maya_proactive_insights
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own proactive insights"
  on public.maya_proactive_insights
  for delete
  using (auth.uid() = user_id);

-- Performance indexes for fast reads in UI
create index if not exists idx_mpi_user on public.maya_proactive_insights (user_id);
create index if not exists idx_mpi_user_created_at on public.maya_proactive_insights (user_id, created_at desc);

-- Active, not-dismissed, not-expired partial index
create index if not exists idx_mpi_user_active on public.maya_proactive_insights (user_id, created_at desc)
  where dismissed_at is null and (expires_at is null or expires_at > now());

-- Optional priority filter to support sorting/grouping
create index if not exists idx_mpi_priority on public.maya_proactive_insights (priority);

-- 4) Observability: make querying usage logs by user/time efficient
create index if not exists idx_ai_usage_logs_user_time
  on public.ai_model_usage_logs (user_id, created_at desc);
