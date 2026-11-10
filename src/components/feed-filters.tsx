import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, ChoiceList, ErrorText, TextField } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { FeedSort } from '@/lib/listings';

export type FeedFilterState = {
  sort: FeedSort;
  minPrice: number | null;
  maxPrice: number | null;
};

export const DEFAULT_FILTERS: FeedFilterState = { sort: 'newest', minPrice: null, maxPrice: null };

const SORTS: FeedSort[] = ['newest', 'nearest', 'price_low', 'price_high'];
const SORT_LABELS: Record<string, string> = {
  newest: 'Newest',
  nearest: 'Nearest',
  price_low: 'Price: low to high',
  price_high: 'Price: high to low',
};
const SORT_ICONS = {
  newest: 'time-outline',
  nearest: 'location-outline',
  price_low: 'trending-up',
  price_high: 'trending-down',
} as const;

const PRICE_PRESETS = ['Any price', 'Free', 'Under ₹500', '₹500 – ₹2,000', 'Over ₹2,000'] as const;
const PRESET_RANGES: Record<string, [number | null, number | null]> = {
  'Any price': [null, null],
  Free: [0, 0],
  'Under ₹500': [null, 499],
  '₹500 – ₹2,000': [500, 2000],
  'Over ₹2,000': [2001, null],
};

/** How many filters differ from the default (for the badge on the button). */
export function activeFilterCount(f: FeedFilterState) {
  return (f.sort !== 'newest' ? 1 : 0) + (f.minPrice != null || f.maxPrice != null ? 1 : 0);
}

/** Short text like "Nearest · Under ₹500" for the Home screen. */
export function describeFilters(f: FeedFilterState): string {
  const parts: string[] = [];
  if (f.sort !== 'newest') parts.push(SORT_LABELS[f.sort]);
  const preset = Object.entries(PRESET_RANGES).find(([, [a, b]]) => a === f.minPrice && b === f.maxPrice)?.[0];
  if (f.minPrice != null || f.maxPrice != null) {
    parts.push(
      preset ??
        (f.minPrice != null && f.maxPrice != null
          ? `₹${f.minPrice} – ₹${f.maxPrice}`
          : f.minPrice != null
            ? `From ₹${f.minPrice}`
            : `Up to ₹${f.maxPrice}`),
    );
  }
  return parts.join(' · ');
}

// A pop-up sheet to choose the sort order and a price range.
export function FeedFiltersSheet({
  visible,
  value,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: FeedFilterState;
  onApply: (f: FeedFilterState) => void;
  onClose: () => void;
}) {
  const [sort, setSort] = useState<FeedSort>(value.sort);
  const [min, setMin] = useState(value.minPrice != null ? String(value.minPrice) : '');
  const [max, setMax] = useState(value.maxPrice != null ? String(value.maxPrice) : '');
  const [error, setError] = useState<string | null>(null);

  const preset = Object.entries(PRESET_RANGES).find(
    ([, [a, b]]) => (a == null ? '' : String(a)) === min && (b == null ? '' : String(b)) === max,
  )?.[0];

  const pickPreset = (label: string) => {
    const [a, b] = PRESET_RANGES[label];
    setMin(a == null ? '' : String(a));
    setMax(b == null ? '' : String(b));
    setError(null);
  };

  const apply = () => {
    const parse = (s: string) => (s.trim() === '' ? null : Number(s.trim()));
    const minPrice = parse(min);
    const maxPrice = parse(max);
    if ((minPrice != null && !Number.isInteger(minPrice)) || (maxPrice != null && !Number.isInteger(maxPrice))) {
      setError('Prices must be whole rupees, e.g. 500');
      return;
    }
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      setError('The lowest price is higher than the highest price');
      return;
    }
    onApply({ sort, minPrice, maxPrice });
  };

  const resetAll = () => {
    setSort('newest');
    setMin('');
    setMax('');
    setError(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.sheetWrap}>
          <ThemedView type="backgroundElement" style={styles.sheet}>
            <View style={styles.headerRow}>
              <ThemedText type="smallBold" style={styles.heading}>
                Sort & filter
              </ThemedText>
              <Pressable onPress={resetAll} accessibilityRole="button">
                <ThemedText type="linkPrimary">Reset</ThemedText>
              </Pressable>
            </View>

            <ThemedText type="smallBold">Sort by</ThemedText>
            <ChoiceList options={SORTS} value={sort} onChange={(s) => setSort(s as FeedSort)} labels={SORT_LABELS} icons={SORT_ICONS} />

            <ThemedText type="smallBold">Price</ThemedText>
            <ChoiceList options={PRICE_PRESETS} value={preset ?? null} onChange={pickPreset} />
            <View style={styles.priceRow}>
              <View style={styles.flex}>
                <TextField label="Min ₹" placeholder="0" keyboardType="number-pad" value={min} onChangeText={setMin} />
              </View>
              <View style={styles.flex}>
                <TextField label="Max ₹" placeholder="Any" keyboardType="number-pad" value={max} onChangeText={setMax} />
              </View>
            </View>

            {error ? <ErrorText>{error}</ErrorText> : null}
            <Button title="Show items" onPress={apply} />
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: Spacing.three,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 520,
    marginBottom: Spacing.three,
  },
  sheet: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
  },
  priceRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
