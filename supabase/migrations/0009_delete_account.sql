-- Orbique: let people delete their own account.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
--
-- Deleting the login removes everything linked to it automatically: the
-- profile, their items, their chats and messages, their blocks and reports.
-- (The app deletes their item photos from storage just before calling this.)

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Please log in first';
  end if;
  delete from auth.users where id = me;
end;
$$;

-- The app needs to see the list of your own item photos so it can delete them first.
drop policy if exists "List your own listing photos" on storage.objects;
create policy "List your own listing photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
