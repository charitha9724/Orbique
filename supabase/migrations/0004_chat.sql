-- Orbique, phase 4: chat between buyers and sellers.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- 1. Tables. One conversation per item per buyer.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index if not exists conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index if not exists conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

-- 2. Safety rules: only the two people in a conversation can see it or write in it.
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "See your own conversations" on public.conversations;
create policy "See your own conversations"
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

drop policy if exists "See messages in your conversations" on public.messages;
create policy "See messages in your conversations"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
       where c.id = conversation_id
         and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  );

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
    )
  );

grant select on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

-- 3. Start (or reopen) the chat about an item. Returns the conversation id.
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

  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (item_id, me, item_seller)
  on conflict (listing_id, buyer_id) do nothing;

  select c.id into conversation
    from public.conversations c
   where c.listing_id = item_id and c.buyer_id = me;
  return conversation;
end;
$$;

grant execute on function public.start_conversation(uuid) to authenticated;

-- 4. Keep the chat list fresh: remember the latest message on its conversation.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message = left(new.body, 120),
         last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists touch_conversation on public.messages;
create trigger touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- 5. Mark the other person's messages in a conversation as read.
create or replace function public.mark_conversation_read(conversation uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.messages m
     set read_at = now()
   where m.conversation_id = conversation
     and m.read_at is null
     and m.sender_id <> auth.uid()
     and exists (
       select 1 from public.conversations c
        where c.id = conversation
          and auth.uid() in (c.buyer_id, c.seller_id)
     );
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- 6. Your chat list: the other person, the item, the latest message and unread count.
create or replace function public.my_conversations()
returns table (
  id uuid,
  listing_id uuid,
  listing_title text,
  listing_photo text,
  listing_status text,
  other_id uuid,
  other_name text,
  i_am_seller boolean,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         c.listing_id,
         l.title,
         l.photos[1],
         l.status,
         case when c.seller_id = auth.uid() then c.buyer_id else c.seller_id end,
         p.display_name,
         c.seller_id = auth.uid(),
         c.last_message,
         coalesce(c.last_message_at, c.created_at),
         (select count(*)::integer from public.messages m
           where m.conversation_id = c.id and m.read_at is null and m.sender_id <> auth.uid())
    from public.conversations c
    join public.listings l on l.id = c.listing_id
    join public.profiles p on p.id = case when c.seller_id = auth.uid() then c.buyer_id else c.seller_id end
   where auth.uid() in (c.buyer_id, c.seller_id)
   order by coalesce(c.last_message_at, c.created_at) desc;
$$;

grant execute on function public.my_conversations() to authenticated;

-- 7. Live updates: tell the app instantly when a message is sent.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end;
$$;
