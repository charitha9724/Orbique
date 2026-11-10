import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  activeFilterCount,
  DEFAULT_FILTERS,
  describeFilters,
  FeedFiltersSheet,
  type FeedFilterState,
} from '@/components/feed-filters';
import { ChoiceList, ErrorText, GRADIENT } from '@/components/form';
import { Icon } from '@/components/icon';
import { ListingCard, ListingCardSkeleton } from '@/components/listing-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORIES, CATEGORY_ICONS, type Category } from '@/constants/listings';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { fetchFeed } from '@/lib/listings';

const ALL = 'All';
const CATEGORY_CHOICES = [ALL, ...CATEGORIES] as const;
const CATEGORY_ICON_NAMES = { [ALL]: 'grid-outline', ...CATEGORY_ICONS } as const;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// Home: things for sale near you, newest first, with search and category filters.
export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, profileError } = useAuth();
  const { width } = useWindowDimensions();
  // More, smaller cards per row so more items fit on screen.
  const columns = width < 520 ? 2 : width < 760 ? 3 : 4;
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(ALL);
  const [filters, setFilters] = useState<FeedFilterState>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = activeFilterCount(filters);

  const feed = useQuery({
    queryKey: ['feed', search, category, filters, profile?.lat, profile?.lng, profile?.radius_km],
    queryFn: () =>
      fetchFeed({ search, category: category === ALL ? null : (category as Category), ...filters }),
    enabled: !!profile,
  });

  if (profileError) {
    return (
      <ThemedView style={styles.center}>
        <ErrorText>{`Couldn't load your profile: ${profileError}`}</ErrorText>
      </ThemedView>
    );
  }

  const firstName = profile?.display_name?.split(' ')[0];
  const count = feed.data?.length ?? 0;

  const header = (
    <View style={styles.header}>
      <Animated.View entering={FadeInDown.duration(500)}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View pointerEvents="none" style={styles.heroBubble} />
          <ThemedText style={styles.heroSmall}>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </ThemedText>
          <ThemedText style={styles.heroTitle}>What are you looking for today?</ThemedText>
          <Pressable onPress={() => router.push('/pick-city')} style={styles.areaPill} accessibilityRole="button">
            <Icon name="location" size={14} color="#EAF5F4" />
            <ThemedText style={styles.areaText} numberOfLines={1}>
              {profile?.area?.split(',')[0] ?? 'Your area'} · {profile?.radius_km ?? 10} km
            </ThemedText>
          </Pressable>
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color="#457B79" />
            <TextInput
              value={typed}
              onChangeText={setTyped}
              onSubmitEditing={() => setSearch(typed)}
              onBlur={() => setSearch(typed)}
              placeholder="Search books, phones, desks..."
              placeholderTextColor="#6E9997"
              returnKeyType="search"
              style={styles.searchInput}
            />
            {typed ? (
              <Pressable
                onPress={() => {
                  setTyped('');
                  setSearch('');
                }}
                accessibilityLabel="Clear search">
                <Icon name="close-circle" size={18} color="#457B79" />
              </Pressable>
            ) : null}
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ChoiceList
          options={CATEGORY_CHOICES}
          value={category}
          onChange={setCategory}
          icons={CATEGORY_ICON_NAMES}
          nowrap
        />
      </ScrollView>

      <View style={styles.sectionRow}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{search ? `Results for “${search}”` : 'Fresh near you'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {[feed.data ? `${count} ${count === 1 ? 'item' : 'items'}` : null, describeFilters(filters)]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => setFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Sort and filter"
          style={({ pressed }) => [
            styles.filterButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressedSmall,
          ]}>
          <Icon name="options-outline" size={18} />
          <ThemedText type="smallBold">Sort & filter</ThemedText>
          {filterCount ? (
            <View style={styles.filterBadge}>
              <ThemedText type="smallBold" style={styles.filterBadgeText}>
                {filterCount}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      </View>
      {feed.error ? <ErrorText>{(feed.error as Error).message}</ErrorText> : null}
    </View>
  );

  const loading = feed.isLoading || (!profile && !profileError);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <FlatList
          data={loading ? [] : (feed.data ?? [])}
          keyExtractor={(item) => item.id}
          key={`grid-${columns}`}
          numColumns={columns}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          renderItem={({ item, index }) => <ListingCard item={item} index={index} columns={columns} />}
          refreshControl={
            <RefreshControl
              refreshing={feed.isRefetching}
              onRefresh={() => {
                feed.refetch();
              }}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.skeletons}>
                {Array.from({ length: columns * 2 }, (_, i) => (
                  <ListingCardSkeleton key={i} columns={columns} />
                ))}
              </View>
            ) : feed.error ? undefined : (
              <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
                <Icon name={search || category !== ALL || filterCount ? 'search-outline' : 'bag-handle-outline'} size={40} color={theme.textSecondary} />
                <ThemedText type="smallBold" style={styles.centerText}>
                  {search || category !== ALL || filterCount ? 'Nothing matches yet' : 'Nothing for sale near you yet'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  {search || category !== ALL || filterCount
                    ? 'Try other words, another category, a different price, or a bigger distance in Profile.'
                    : 'Be the first! Tap Sell to post something.'}
                </ThemedText>
              </View>
            )
          }
        />
      </SafeAreaView>
      {filtersOpen ? (
        <FeedFiltersSheet
          visible
          value={filters}
          onClose={() => setFiltersOpen(false)}
          onApply={(f) => {
            setFilters(f);
            setFiltersOpen(false);
          }}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  centerText: { textAlign: 'center' },
  list: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.six + Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  hero: {
    borderRadius: 28,
    padding: Spacing.four,
    gap: Spacing.two,
    overflow: 'hidden',
  },
  heroBubble: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -70,
    top: -90,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroSmall: {
    color: 'rgba(234,245,244,0.85)',
    fontWeight: 600,
  },
  heroTitle: {
    color: '#EAF5F4',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
  },
  areaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(234,245,244,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: Spacing.two,
  },
  areaText: {
    color: '#EAF5F4',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 600,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#F6FBFB',
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    height: 50,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#011F1E',
    height: '100%',
  },
  clear: {
    color: '#457B79',
    fontSize: 14,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 18,
  },
  pressedSmall: {
    transform: [{ scale: 0.96 }],
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#457B79',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#EAF5F4',
    fontSize: 11,
    lineHeight: 14,
  },
  row: {
    gap: Spacing.two,
  },
  skeletons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: 24,
    marginTop: Spacing.two,
  },
  emptyIcon: {
    fontSize: 44,
    lineHeight: 52,
  },
});
