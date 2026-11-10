-- Orbique: sort and price filters for the home feed.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- Replace the feed function with one that also takes a sort order and a price range.
drop function if exists public.nearby_listings(text, text, integer, integer);

create or replace function public.nearby_listings(
  search_text text default null,
  category_filter text default null,
  max_km integer default null,
  max_results integer default 60,
  sort_by text default 'newest',   -- 'newest', 'nearest', 'price_low' or 'price_high'
  min_price integer default null,  -- in rupees, both ends included
  max_price integer default null
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
       and (min_price is null or l.price >= min_price)
       and (max_price is null or l.price <= max_price)
       and (
         nullif(trim(search_text), '') is null
         or l.search @@ websearch_to_tsquery('simple', search_text)
         or l.title ilike '%' || trim(search_text) || '%'
       )
       and not public.blocked_between(auth.uid(), l.seller_id)
  )
  select s.id, s.seller_id, pr.display_name, s.title, s.price, s.category, s.condition,
         s.photos, s.area, s.created_at, s.distance_km
    from scored s
    join public.profiles pr on pr.id = s.seller_id
   where s.distance_km <= s.radius
   order by
     case when sort_by = 'nearest' then s.distance_km end asc,
     case when sort_by = 'price_low' then s.price end asc,
     case when sort_by = 'price_high' then s.price end desc,
     s.created_at desc
   limit least(max_results, 100);
$$;

grant execute on function public.nearby_listings(text, text, integer, integer, text, integer, integer) to authenticated;
