import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, ErrorText } from '@/components/form';
import { Icon } from '@/components/icon';
import { ReportDialog } from '@/components/report-dialog';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { formatDistance, formatPrice, timeAgo } from '@/constants/listings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { startConversation } from '@/lib/chat';
import { distanceKm, fetchListing, photoUrl, setListingStatus } from '@/lib/listings';
import { blockUser, confirmAction, unblockUser, useBlockStatus } from '@/lib/safety';

// The page for one item: photos, price, details, seller.
export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { session, profile } = useAuth();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const listing = useQuery({ queryKey: ['listing', id], queryFn: () => fetchListing(id) });
  const sellerId = listing.data?.seller_id;
  const blockStatus = useBlockStatus(sellerId && sellerId !== session?.user.id ? sellerId : undefined);
  const [reporting, setReporting] = useState(false);

  const toggleBlock = async () => {
    if (!sellerId) return;
    const blocking = blockStatus.data !== 'i_blocked';
    if (blocking) {
      const ok = await confirmAction(
        'Block this seller?',
        "You won't see their items, and neither of you can message the other. You can unblock them later in Profile.",
        'Block',
      );
      if (!ok) return;
    }
    setBusy(true);
    setActionError(null);
    try {
      if (blocking) await blockUser(sellerId);
      else await unblockUser(sellerId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['block-status'] }),
        queryClient.invalidateQueries({ queryKey: ['blocked'] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
      ]);
    } catch (e) {
      setActionError((e as Error).message);
    }
    setBusy(false);
  };

  const messageSeller = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const conversationId = await startConversation(id);
      router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
    } catch (e) {
      setActionError((e as Error).message);
    }
    setBusy(false);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  if (listing.isLoading) {
    return (
      <Screen centered>
        <ActivityIndicator />
      </Screen>
    );
  }
  const item = listing.data;
  if (listing.error || !item) {
    return (
      <Screen centered>
        <ErrorText>{listing.error ? (listing.error as Error).message : 'This item is no longer available.'}</ErrorText>
        <Button title="Back" variant="secondary" onPress={goBack} />
      </Screen>
    );
  }

  const isMine = item.seller_id === session?.user.id;
  const distance =
    profile?.lat != null && profile?.lng != null && item.lat != null && item.lng != null
      ? distanceKm(profile.lat, profile.lng, item.lat, item.lng)
      : null;

  const changeStatus = async (status: 'active' | 'sold' | 'removed') => {
    setBusy(true);
    setActionError(null);
    try {
      await setListingStatus(item.id, status);
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
      await queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      if (status === 'removed') {
        goBack();
        return;
      }
      await listing.refetch();
    } catch (e) {
      setActionError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Screen>
      <Pressable onPress={goBack} accessibilityRole="button" style={styles.back}>
        <ThemedText type="linkPrimary">‹ Back</ThemedText>
      </Pressable>

      {item.photos.length ? (
        <View>
          <View style={[styles.photoBox, { backgroundColor: theme.backgroundElement }]}>
            <Image
              source={{ uri: photoUrl(item.photos[Math.min(photoIndex, item.photos.length - 1)]) }}
              style={styles.photo}
              contentFit="contain"
              transition={150}
            />
          </View>
          {item.photos.length > 1 ? (
            <ScrollView horizontal contentContainerStyle={styles.thumbs}>
              {item.photos.map((path, i) => (
                <Pressable key={path} onPress={() => setPhotoIndex(i)}>
                  <Image
                    source={{ uri: photoUrl(path) }}
                    style={[styles.thumb, i === photoIndex && styles.thumbSelected]}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      {item.status === 'sold' ? (
        <ThemedText type="smallBold" style={styles.sold}>
          SOLD
        </ThemedText>
      ) : null}
      <ThemedText type="subtitle">{formatPrice(item.price)}</ThemedText>
      <ThemedText type="default" style={styles.title}>
        {item.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {item.condition} · {item.category} · {timeAgo(item.created_at)}
      </ThemedText>
      <View style={styles.placeRow}>
        <Icon name="location-outline" size={15} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary">
          {[item.area, isMine ? null : formatDistance(distance)].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>

      {item.description ? <ThemedText>{item.description}</ThemedText> : null}

      <View style={[styles.seller, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Sold by
        </ThemedText>
        <ThemedText type="smallBold">{isMine ? 'You' : (item.seller?.display_name ?? 'Someone')}</ThemedText>
      </View>

      {actionError ? <ErrorText>{actionError}</ErrorText> : null}
      {isMine ? (
        <>
          <Button
            title="Edit listing"
            onPress={() => router.push({ pathname: '/listing/edit/[id]', params: { id: item.id } })}
          />
          {item.status === 'active' ? (
            <Button title="Mark as sold" variant="secondary" onPress={() => changeStatus('sold')} loading={busy} />
          ) : (
            <Button title="Put back on sale" onPress={() => changeStatus('active')} loading={busy} />
          )}
          <Button title="Remove this listing" variant="secondary" onPress={() => changeStatus('removed')} loading={busy} />
        </>
      ) : (
        <>
          {item.status === 'active' && blockStatus.data === 'none' ? (
            <Button title="Message seller" onPress={messageSeller} loading={busy} />
          ) : null}
          {blockStatus.data === 'i_blocked' ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              You blocked this seller.
            </ThemedText>
          ) : null}
          <View style={styles.safetyRow}>
            <Pressable onPress={() => setReporting(true)} accessibilityRole="button">
              <ThemedText type="small" themeColor="textSecondary">
                Report this item
              </ThemedText>
            </Pressable>
            <Pressable onPress={toggleBlock} accessibilityRole="button" disabled={busy || !blockStatus.data}>
              <ThemedText type="small" themeColor="textSecondary">
                {blockStatus.data === 'i_blocked' ? 'Unblock seller' : 'Block seller'}
              </ThemedText>
            </Pressable>
          </View>
          <ReportDialog
            target={reporting ? { type: 'listing', id: item.id } : null}
            label="this item"
            onClose={() => setReporting(false)}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
  },
  photoBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  thumbs: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Spacing.two,
    opacity: 0.6,
  },
  thumbSelected: {
    opacity: 1,
  },
  title: {
    fontWeight: 600,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  safetyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.five,
    paddingVertical: Spacing.two,
  },
  sold: {
    color: '#E5484D',
  },
  seller: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: 2,
  },
  center: {
    textAlign: 'center',
  },
});
