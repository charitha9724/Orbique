import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, ErrorText } from '@/components/form';
import { ListingForm } from '@/components/listing-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fetchListing, updateListing } from '@/lib/listings';

// Edit one of your own items.
export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;
  const listing = useQuery({ queryKey: ['listing', id], queryFn: () => fetchListing(id) });

  const goBack = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/listing/[id]', params: { id } }));

  if (listing.isLoading) {
    return (
      <Screen centered>
        <ActivityIndicator />
      </Screen>
    );
  }
  const item = listing.data;
  if (listing.error || !item || !userId || item.seller_id !== userId) {
    return (
      <Screen centered>
        <ErrorText>
          {listing.error ? (listing.error as Error).message : "This item doesn't exist or isn't yours to edit."}
        </ErrorText>
        <Button title="Back" variant="secondary" onPress={goBack} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.content}>
        <Pressable onPress={goBack} accessibilityRole="button" style={styles.back}>
          <ThemedText type="linkPrimary">‹ Cancel</ThemedText>
        </Pressable>
        <ThemedText type="subtitle">Edit your item</ThemedText>
        <ListingForm
          initial={item}
          initialPhotos={item.photos.map((path) => ({ kind: 'stored', path }))}
          submitLabel="Save changes"
          submittingLabel="Saving..."
          onSubmit={async (values, photos) => {
            await updateListing(userId, item.id, values, photos, item.photos);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['listing', item.id] }),
              queryClient.invalidateQueries({ queryKey: ['feed'] }),
              queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
            ]);
            goBack();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  back: {
    alignSelf: 'flex-start',
  },
});
