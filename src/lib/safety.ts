import { useQuery } from '@tanstack/react-query';
import { Alert, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Report and block. These must match the checks in supabase/migrations/0006_safety.sql.

export const REPORT_REASONS = [
  'Scam or fraud',
  'Offensive or abusive',
  'Fake or misleading',
  'Prohibited item',
  'Spam',
  'Other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportTarget = { type: 'listing' | 'user' | 'message'; id: string };

export async function fileReport(target: ReportTarget, reason: ReportReason, details: string) {
  const { error } = await supabase
    .from('reports')
    .insert({ target_type: target.type, target_id: target.id, reason, details: details.trim().slice(0, 1000) });
  if (error) throw new Error(error.message);
}

export async function blockUser(userId: string) {
  const { error } = await supabase.from('blocks').insert({ blocked_id: userId });
  // Already blocked is fine.
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function unblockUser(userId: string) {
  const { error } = await supabase.from('blocks').delete().eq('blocked_id', userId);
  if (error) throw new Error(error.message);
}

export type BlockStatus = 'none' | 'i_blocked' | 'blocked_me';

/** Whether you blocked this person, they blocked you, or neither. */
export function useBlockStatus(otherId: string | undefined) {
  return useQuery({
    queryKey: ['block-status', otherId],
    enabled: !!otherId,
    queryFn: async (): Promise<BlockStatus> => {
      const { data, error } = await supabase.rpc('block_status', { other: otherId });
      if (error) throw new Error(error.message);
      return data as BlockStatus;
    },
  });
}

export type BlockedPerson = { blocked_id: string; created_at: string; person: { display_name: string } | null };

/** People you have blocked. */
export async function fetchBlocked(): Promise<BlockedPerson[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, created_at, person:profiles!blocks_blocked_id_fkey(display_name)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BlockedPerson[];
}

/** Ask a yes/no question (browser pop-up on the web, system alert on phones). */
export function confirmAction(title: string, message: string, okLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
