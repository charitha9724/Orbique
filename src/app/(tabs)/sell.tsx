import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ListingForm } from '@/components/listing-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { createListing } from '@/lib/listings';

// Sell: post something for sale.
export default function SellScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, profile } = useAuth();

  return (
    <Screen>
      <View style={styles.content}>
        <ThemedText type="subtitle">Sell something</ThemedText>
        <ThemedText themeColor="textSecondary">
          People within a few km of {profile?.area ?? 'your area'} will see it.
        </ThemedText>
        <ListingForm
          submitLabel="Post it"
          submittingLabel="Posting..."
          onSubmit={async (values, photos) => {
            if (!session) return false;
            const id = await createListing(session.user.id, {
              ...values,
              photoUris: photos.flatMap((p) => (p.kind === 'new' ? [p.uri] : [])),
            });
            await queryClient.invalidateQueries({ queryKey: ['feed'] });
            await queryClient.invalidateQueries({ queryKey: ['my-listings'] });
            router.push({ pathname: '/listing/[id]', params: { id } });
            return true;
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.three,
  },
});
