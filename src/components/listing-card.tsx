import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated as RNAnimated, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/icon';
import { CATEGORY_ICONS, formatDistance, formatPrice } from '@/constants/listings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { photoUrl, type FeedItem } from '@/lib/listings';

// One item in the home feed: photo with the price on it, title, area and distance.
/** Width of one card when there are `columns` per row (leaves room for the gaps). */
function cardWidth(columns: number) {
  return `${(100 - (columns - 1) * 2.4) / columns}%` as const;
}

export function ListingCard({ item, index = 0, columns = 3 }: { item: FeedItem; index?: number; columns?: number }) {
  const theme = useTheme();
  const cover = item.photos[0];
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(450)} style={[styles.wrap, { maxWidth: cardWidth(columns) }]}>
      <Link href={{ pathname: '/listing/[id]', params: { id: item.id } }} asChild>
        <Pressable>
          {({ pressed }) => (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
          <View style={[styles.photoBox, { backgroundColor: theme.backgroundSelected }]}>
            {cover ? (
              <Image source={{ uri: photoUrl(cover) }} style={styles.photo} contentFit="cover" transition={200} />
            ) : (
              <Icon name={CATEGORY_ICONS[item.category] ?? 'cube-outline'} size={38} color={theme.textSecondary} />
            )}
            {/* darken the bottom of photos so the price stands out */}
            {cover ? (
            <LinearGradient
              colors={['transparent', 'rgba(1,31,30,0.6)']}
              style={styles.shade}
              pointerEvents="none"
            />
            ) : null}
            <View style={styles.pricePill}>
              <ThemedText style={styles.priceText}>{formatPrice(item.price)}</ThemedText>
            </View>
            <View style={styles.conditionPill}>
              <ThemedText style={styles.conditionText}>{item.condition}</ThemedText>
            </View>
          </View>
          <View style={styles.text}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {item.title}
            </ThemedText>
            <View style={styles.placeRow}>
              <Icon name="location-outline" size={13} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flexText}>
                {[item.area?.split(',')[0], formatDistance(item.distance_km)].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
          </View>
          </View>
          )}
        </Pressable>
      </Link>
    </Animated.View>
  );
}

// A grey placeholder card that gently pulses while the feed loads.
export function ListingCardSkeleton({ columns = 3 }: { columns?: number }) {
  const theme = useTheme();
  const [pulse] = useState(() => new RNAnimated.Value(0.5));
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        RNAnimated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <RNAnimated.View style={[styles.wrap, { maxWidth: cardWidth(columns), opacity: pulse }]}>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.photoBox, { backgroundColor: theme.backgroundSelected }]} />
        <View style={styles.text}>
          <View style={[styles.line, { backgroundColor: theme.backgroundSelected, width: '80%' }]} />
          <View style={[styles.line, { backgroundColor: theme.backgroundSelected, width: '55%' }]} />
        </View>
      </View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    marginBottom: Spacing.two,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  photoBox: {
    aspectRatio: 5 / 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  noPhoto: {
    fontSize: 32,
    lineHeight: 38,
  },
  shade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  pricePill: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(234,245,244,0.95)',
  },
  priceText: {
    color: '#011F1E',
    fontWeight: 800,
    fontSize: 15,
    lineHeight: 20,
  },
  conditionPill: {
    position: 'absolute',
    right: 6,
    top: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(1,31,30,0.55)',
  },
  conditionText: {
    color: '#EAF5F4',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: 600,
  },
  text: {
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  flexText: {
    flex: 1,
  },
  line: {
    height: 12,
    borderRadius: 6,
  },
});
