-- Orbique: delete chats just for yourself (clean-up, not blocking).
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
--
-- "Deleting" a chat hides it and its old messages for you only. The other
-- person keeps their copy. If they send a new message later, the chat comes
-- back for you, starting from that new message.

-- 1. When each person last cleared the conversation.
alter table public.conversations
  add column if not exists buyer_cleared_at timestamptz,
  add column if not exists seller_cleared_at timestamptz;

-- 2. Delete one chat (for you).
create or replace function public.hide_conversation(conversation uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversations
     set buyer_cleared_at = case when buyer_id = auth.uid() then now() else buyer_cleared_at end,
         seller_cleared_at = case when seller_id = auth.uid() then now() else seller_cleared_at end
   where id = conversation
     and auth.uid() in (buyer_id, seller_id);
$$;

grant execute on function public.hide_conversation(uuid) to authenticated;

-- 3. Delete every chat you have with one person (for you).
create or replace function public.hide_conversations_with(other uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversations
     set buyer_cleared_at = case when buyer_id = auth.uid() then now() else buyer_cleared_at end,
         seller_cleared_at = case when seller_id = auth.uid() then now() else seller_cleared_at end
   where (buyer_id = auth.uid() and seller_id = other)
      or (seller_id = auth.uid() and buyer_id = other);
$$;

grant execute on function public.hide_conversations_with(uuid) to authenticated;

-- 4. Your chat list now skips chats you deleted (until a new message arrives),
--    and tells the app when you last cleared each one.
drop function if exists public.my_conversations();
create function public.my_conversations()
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
  unread_count integer,
  cleared_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select c.*,
           case when c.seller_id = auth.uid() then c.seller_cleared_at else c.buyer_cleared_at end as my_cleared_at
      from public.conversations c
     where auth.uid() in (c.buyer_id, c.seller_id)
  )
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
           where m.conversation_id = c.id
             and m.read_at is null
             and m.sender_id <> auth.uid()
             and (c.my_cleared_at is null or m.created_at > c.my_cleared_at)),
         c.my_cleared_at
    from mine c
    join public.listings l on l.id = c.listing_id
    join public.profiles p on p.id = case when c.seller_id = auth.uid() then c.buyer_id else c.seller_id end
   where c.my_cleared_at is null
      or coalesce(c.last_message_at, c.created_at) > c.my_cleared_at
   order by coalesce(c.last_message_at, c.created_at) desc;
$$;

grant execute on function public.my_conversations() to authenticated;
