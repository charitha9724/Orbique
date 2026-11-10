import { supabase } from '@/lib/supabase';

/** Remove every photo in one storage folder (Supabase lists at most 100 at a time). */
async function emptyFolder(bucket: string, folder: string) {
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 100 });
    if (error) throw new Error(error.message);
    if (!data?.length) return;
    const paths = data.map((f) => `${folder}/${f.name}`);
    const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
    if (removeError) throw new Error(removeError.message);
    if (data.length < 100) return;
  }
}

/**
 * Permanently delete the logged-in person's account: their item photos,
 * then the account itself (which removes their profile, items, chats,
 * blocks and reports), then log out.
 */
export async function deleteMyAccount(userId: string): Promise<void> {
  await emptyFolder('listing-photos', userId);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);
  await supabase.auth.signOut({ scope: 'local' });
}
