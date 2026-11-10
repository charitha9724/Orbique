import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ErrorText } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { formatPrice } from '@/constants/listings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchMyListings, photoUrl } from '@/lib/listings';

// "Your listings" on the Profile tab.
export function MyListings({ userId }: { userId: string }) {
  const theme = useTheme();
  const mine = useQuery({ queryKey: ['my-listings', userId], queryFn: () => fetchMyListings(userId) });

  if (mine.isLoading) return <ActivityIndicator />;
  if (mine.error) return <ErrorText>{(mine.error as Error).message}</ErrorText>;
  if (!mine.data?.length) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        You haven&apos;t posted anything yet.
      </ThemedText>
    );
  }
  return (
    <View style={styles.list}>
      {mine.data.map((item) => (
        <Link key={item.id} href={{ pathname: '/listing/[id]', params: { id: item.id } }} asChild>
          <Pressable style={StyleSheet.flatten([styles.row, { backgroundColor: theme.backgroundElement }])}>
            {item.photos[0] ? (
              <Image source={{ uri: photoUrl(item.photos[0]) }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={styles.thumb} />
            )}
            <View style={styles.text}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {item.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatPrice(item.price)}
                {item.status === 'sold' ? ' · Sold' : ''}
              </ThemedText>
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Spacing.two,
  },
  text: {
    flex: 1,
  },
});
