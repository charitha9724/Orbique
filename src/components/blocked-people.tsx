import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, ErrorText } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchBlocked, unblockUser } from '@/lib/safety';

// "Blocked people" on the Profile tab, with an Unblock button for each.
export function BlockedPeople() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const blocked = useQuery({ queryKey: ['blocked'], queryFn: fetchBlocked });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unblock = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await unblockUser(id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['blocked'] }),
        queryClient.invalidateQueries({ queryKey: ['block-status'] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
      ]);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId(null);
  };

  if (blocked.isLoading) return <ActivityIndicator />;
  if (blocked.error) return <ErrorText>{(blocked.error as Error).message}</ErrorText>;
  if (!blocked.data?.length) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        You haven&apos;t blocked anyone.
      </ThemedText>
    );
  }
  return (
    <View style={styles.list}>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {blocked.data.map((b) => (
        <View key={b.blocked_id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={styles.flex} numberOfLines={1}>
            {b.person?.display_name || 'Someone'}
          </ThemedText>
          <View style={styles.button}>
            <Button
              title="Unblock"
              variant="secondary"
              onPress={() => unblock(b.blocked_id)}
              loading={busyId === b.blocked_id}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  flex: { flex: 1 },
  button: { width: 110 },
});
