import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type LatLng = { lat: number; lng: number };

export type LocationMapProps = {
  /** Where the map is centred (the pin is always in the middle). */
  center: LatLng;
  /** Called when the person stops moving the map. */
  onMoveEnd: (center: LatLng) => void;
};

// Phones: the map is only built for the web version for now.
// Search and "Use my location" still work on phones.
export default function LocationMap(_props: LocationMapProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.box}>
      <ThemedText type="small" themeColor="textSecondary">
        The map is available in the web version. Use search or &quot;Use my location&quot; instead.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 120,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
});
