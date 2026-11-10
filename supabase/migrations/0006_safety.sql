-- Orbique, phase 5: report and block.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- 1. Reports. Anyone logged in can file one; only you (the admin) can read them,
--    in the Supabase dashboard: Table Editor > reports.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'user', 'message')),
  target_id uuid not null,
  reason text not null check (reason in (
    'Scam or fraud', 'Offensive or abusive', 'Fake or misleading', 'Prohibited item', 'Spam', 'Other'
  )),
  details text not null default '' check (char_length(details) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "File reports as yourself" on public.reports;
create policy "File reports as yourself"
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

grant insert on public.reports to authenticated;

-- 2. Blocks. You can see, add and remove only your own blocks.
create table if not exists public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists "See your own blocks" on public.blocks;
create policy "See your own blocks"
  on public.blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

drop policy if exists "Block people" on public.blocks;
create policy "Block people"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

drop policy if exists "Unblock people" on public.blocks;
create policy "Unblock people"
  on public.blocks for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

grant select, insert, delete on public.blocks to authenticated;

-- Has either person blocked the other?
create or replace function public.blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
     where (blocker_id = a and blocked_id = b)
        or (blocker_id = b and blocked_id = a)
  );
$$;

grant execute on function public.blocked_between(uuid, uuid) to authenticated;

-- For the chat screen: 'none', 'i_blocked' or 'blocked_me'.
create or replace function public.block_status(other uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.blocks where blocker_id = auth.uid() and blocked_id = other) then 'i_blocked'
    when exists (select 1 from public.blocks where blocker_id = other and blocked_id = auth.uid()) then 'blocked_me'
    else 'none'
  end;
$$;

grant execute on function public.block_status(uuid) to authenticated;

-- 3. Blocked people can't message each other (in either direction).
drop policy if exists "Send messages in your conversations" on public.messages;
create policy "Send messages in your conversations"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
       where c.id = conversation_id
         and (select auth.uid()) in (c.buyer_id, c.seller_id)
         and not public.blocked_between(c.buyer_id, c.seller_id)
    )
  );

create or replace function public.start_conversation(item_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  item_seller uuid;
  conversation uuid;
begin
  if me is null then
    raise exception 'Please log in first';
  end if;
  select l.seller_id into item_seller
    from public.listings l
   where l.id = item_id and l.status = 'active';
  if item_seller is null then
    raise exception 'This item is no longer for sale';
  end if;
  if item_seller = me then
    raise exception 'This is your own item';
  end if;
  if public.blocked_between(me, item_seller) then
    raise exception 'You can''t message this person';
  end if;

  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (item_id, me, item_seller)
  on conflict (listing_id, buyer_id) do nothing;

  select c.id into conversation
    from public.conversations c
   where c.listing_id = item_id and c.buyer_id = me;
  return conversation;
end;
$$;

-- 4. Items from people you blocked (or who blocked you) disappear from your feed.
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
       and not public.blocked_between(auth.uid(), l.seller_id)
  )
  select s.id, s.seller_id, pr.display_name, s.title, s.price, s.category, s.condition,
         s.photos, s.area, s.created_at, s.distance_km
    from scored s
    join public.profiles pr on pr.id = s.seller_id
   where s.distance_km <= s.radius
   order by s.created_at desc
   limit least(max_results, 100);
$$;
