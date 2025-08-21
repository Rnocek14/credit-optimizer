
-- 1) Prereqs
create extension if not exists unaccent;

-- 2) Slugify helper (idempotent)
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(unaccent(input)), '[^a-z0-9]+', '-', 'g')
$$;

-- 3) BEFORE INSERT trigger to fill/normalize slug and ensure per-user uniqueness
create or replace function public.career_tracks_set_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
  suffix int := 1;
  exists_slug boolean;
begin
  -- If app provided a slug, normalize it; else derive from title/track_name
  if new.slug is null or length(btrim(new.slug)) = 0 then
    base_slug := public.slugify(coalesce(new.title, new.track_name));
  else
    base_slug := public.slugify(new.slug);
  end if;

  candidate := base_slug;

  -- Bump suffix until unique for this user
  loop
    select exists(
      select 1 from public.career_tracks
      where user_id = new.user_id and slug = candidate
    ) into exists_slug;

    exit when not exists_slug;

    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;

  new.slug := candidate;
  return new;
end
$$;

drop trigger if exists trg_career_tracks_set_slug on public.career_tracks;

create trigger trg_career_tracks_set_slug
before insert on public.career_tracks
for each row
execute function public.career_tracks_set_slug();

-- 4) Backfill any missing/blank slugs then de-duplicate defensively
update public.career_tracks
set slug = public.slugify(coalesce(title, track_name))
where slug is null or length(btrim(slug)) = 0;

with ranked as (
  select
    id,
    user_id,
    slug,
    row_number() over (partition by user_id, slug order by created_at, id) as rn
  from public.career_tracks
)
update public.career_tracks ct
set slug = case when r.rn = 1 then ct.slug else ct.slug || '-' || r.rn end
from ranked r
where ct.id = r.id
  and r.rn > 1;

-- 5) Enforce NOT NULL on slug
alter table public.career_tracks
  alter column slug set not null;

-- 6) Ensure unique slug per user and drop legacy title index if present
create unique index if not exists uniq_user_track_slug
  on public.career_tracks (user_id, slug);

drop index if exists public.uniq_user_track_title;
