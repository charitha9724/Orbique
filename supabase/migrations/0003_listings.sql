-- Orbique, phase 3: listings (things for sale) and their photos.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- 1. The listings table.
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  price integer not null check (price between 0 and 10000000), -- whole rupees
  category text not null check (category in ('Books', 'Electronics', 'Furniture', 'Clothing', 'Other')),
  condition text not null check (condition in ('New', 'Like new', 'Good', 'Fair')),
  photos text[] not null default '{}' check (cardinality(photos) <= 5), -- paths in the listing-photos bucket
  status text not null default 'active' check (status in ('active', 'sold', 'removed')),
  -- Copied from the seller's profile when the listing is posted (already rounded to about 1 km).
  lat double precision,
  lng double precision,
  area text,
  city text,
  created_at timestamptz not null default now(),
  -- Words from the title and description, for search.
  search tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored
);

create index if not exists listings_status_created_idx on public.listings (status, created_at desc);
create index if not exists listings_search_idx on public.listings using gin (search);
create index if not exists listings_seller_idx on public.listings (seller_id);

-- 2. When a listing is posted, the seller is always the logged-in person,
--    and its location is always the seller's saved area (the app can't fake either).
create or replace function public.prepare_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.seller_id := auth.uid();
  select p.lat, p.lng, p.area, p.city
    into new.lat, new.lng, new.area, new.city
    from public.profiles p
   where p.id = new.seller_id;
  if new.lat is null then
    raise exception 'Pick your area before posting';
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_listing on public.listings;
create trigger prepare_listing
  before insert on public.listings
  for each row execute function public.prepare_listing();

-- Sellers can't move a listing to another place or person afterwards.
create or replace function public.keep_listing_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.seller_id := old.seller_id;
  new.lat := old.lat;
  new.lng := old.lng;
  new.area := old.area;
  new.city := old.city;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists keep_listing_owner on public.listings;
create trigger keep_listing_owner
  before update on public.listings
  for each row execute function public.keep_listing_owner();

-- 3. Safety rules.
alter table public.listings enable row level security;

drop policy if exists "See active listings and your own" on public.listings;
create policy "See active listings and your own"
  on public.listings for select
  to authenticated
  using (status = 'active' or seller_id = (select auth.uid()));

drop policy if exists "Post your own listings" on public.listings;
create policy "Post your own listings"
  on public.listings for insert
  to authenticated
  with check (seller_id = (select auth.uid()));

drop policy if exists "Edit your own listings" on public.listings;
create policy "Edit your own listings"
  on public.listings for update
  to authenticated
  using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));

drop policy if exists "Delete your own listings" on public.listings;
create policy "Delete your own listings"
  on public.listings for delete
  to authenticated
  using (seller_id = (select auth.uid()));

grant select, insert, update, delete on public.listings to authenticated;

-- 4. The home feed: active listings near the logged-in person, newest first.
--    Optional: search words, a category, and a distance (defaults to their profile setting).
create or replace function public.nearby_listings(
  search_text text default null,
  category_filter text default null,
  max_km integer default null,
  max_results integer default 60
)
returns table (
  id uuid,
  seller_id uuid,
  seller_name text,
  title text,
  price integer,
  category text,
  condition text,
  photos text[],
  area text,
  created_at timestamptz,
  distance_km double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select p.lat, p.lng, coalesce(max_km, p.radius_km) as radius
      from public.profiles p
     where p.id = auth.uid()
  ),
  scored as (
    select l.*,
           6371 * 2 * asin(sqrt(
             power(sin(radians(l.lat - me.lat) / 2), 2)
             + cos(radians(me.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - me.lng) / 2), 2)
           )) as distance_km,
           me.radius
      from public.listings l, me
     where l.status = 'active'
       and (category_filter is null or l.category = category_filter)
       and (
         nullif(trim(search_text), '') is null
         or l.search @@ websearch_to_tsquery('simple', search_text)
         or l.title ilike '%' || trim(search_text) || '%'
       )
  )
  select s.id, s.seller_id, pr.display_name, s.title, s.price, s.category, s.condition,
         s.photos, s.area, s.created_at, s.distance_km
    from scored s
    join public.profiles pr on pr.id = s.seller_id
   where s.distance_km <= s.radius
   order by s.created_at desc
   limit least(max_results, 100);
$$;

grant execute on function public.nearby_listings(text, text, integer, integer) to authenticated;

-- 5. Photo storage: a bucket for listing photos (max 5 MB each, images only).
--    Each person can only upload into their own folder, named after their user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Upload your own listing photos" on storage.objects;
create policy "Upload your own listing photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Delete your own listing photos" on storage.objects;
create policy "Delete your own listing photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
