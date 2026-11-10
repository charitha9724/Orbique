-- Orbique: photos in chat messages.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- 1. A message can now carry a photo. Text is optional when there's a photo.
alter table public.messages add column if not exists photo text;

alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages
  add constraint messages_content_check check (
    char_length(body) <= 2000
    and (char_length(trim(body)) >= 1 or photo is not null)
  );

-- 2. The chat list shows "📷 Photo" for photo-only messages.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message = coalesce(nullif(left(trim(new.body), 120), ''), '📷 Photo'),
         last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

-- 3. A PRIVATE storage space for chat photos (max 5 MB each, images only).
--    Photos are stored in a folder named after the conversation, and only
--    the two people in that conversation can upload or see them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-photos', 'chat-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.is_conversation_member(conversation_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
     where c.id::text = conversation_folder
       and auth.uid() in (c.buyer_id, c.seller_id)
  );
$$;

grant execute on function public.is_conversation_member(text) to authenticated;

drop policy if exists "Upload photos into your chats" on storage.objects;
create policy "Upload photos into your chats"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-photos'
    and public.is_conversation_member((storage.foldername(name))[1])
  );

drop policy if exists "See photos in your chats" on storage.objects;
create policy "See photos in your chats"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-photos'
    and public.is_conversation_member((storage.foldername(name))[1])
  );
