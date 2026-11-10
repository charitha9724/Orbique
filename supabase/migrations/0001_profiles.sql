-- Orbique, phase 2: user profiles.
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

-- 1. The profiles table: one row per user, linked to Supabase's own login table.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 50),
  city text check (city is null or char_length(city) <= 60),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2. Safety rules (Row Level Security).
alter table public.profiles enable row level security;

-- Logged-in users can see profiles (needed later to show seller names).
drop policy if exists "Logged-in users can read profiles" on public.profiles;
create policy "Logged-in users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- A user can only change their own profile.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- New tables are not exposed automatically in this project, so open this one
-- to logged-in users only (the rules above still apply on top of this).
grant select, update on public.profiles to authenticated;

-- 3. Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 50)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
