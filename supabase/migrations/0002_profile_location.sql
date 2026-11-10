-- Orbique, phase 2: let people pick their location on a map.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- 1. New columns on profiles.
alter table public.profiles
  add column if not exists lat double precision check (lat between -90 and 90),
  add column if not exists lng double precision check (lng between -180 and 180),
  add column if not exists area text check (area is null or char_length(area) <= 120),
  add column if not exists radius_km integer not null default 10 check (radius_km in (5, 10, 25));

-- 2. Privacy: never store an exact spot. Round to 2 decimals (about 1 km)
--    whatever the app sends.
create or replace function public.round_profile_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.lat := round(new.lat::numeric, 2)::double precision;
  new.lng := round(new.lng::numeric, 2)::double precision;
  return new;
end;
$$;

drop trigger if exists round_profile_location on public.profiles;
create trigger round_profile_location
  before insert or update of lat, lng on public.profiles
  for each row execute function public.round_profile_location();
