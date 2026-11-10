import { LinearGradient } from 'expo-linear-gradient';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';

import { BRAND_COLOR, GRADIENT } from '@/components/form';
import { GlowOrb } from '@/components/help-orb';
import { Icon, type IconName } from '@/components/icon';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useColorMode } from '@/lib/color-mode';
import { useAuth } from '@/lib/auth';
import { useUnreadTotal } from '@/lib/chat';

import { ThemedText } from './themed-text';

// Floating, glass-style top bar with tabs on the web version.
export default function AppTabs() {
  const { session } = useAuth();
  const unread = useUnreadTotal(!!session);
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/home" asChild>
            <TabButton icon="home-outline">Home</TabButton>
          </TabTrigger>
          <TabTrigger name="sell" href="/sell" asChild>
            <TabButton icon="add-circle-outline">Sell</TabButton>
          </TabTrigger>
          <TabTrigger name="chats" href="/chats" asChild>
            <TabButton icon="chatbubbles-outline" badge={unread}>
              Chats
            </TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="person-circle-outline">Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  badge,
  icon,
  ...props
}: TabTriggerSlotProps & { badge?: number; icon?: IconName }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 560;
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.tabButtonView, compact && styles.tabButtonCompact]}>
        {isFocused ? (
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : null}
        {icon ? <Icon name={icon} size={18} color={isFocused ? '#EAF5F4' : theme.textSecondary} /> : null}
        {!compact || isFocused ? (
          <ThemedText type="smallBold" style={{ color: isFocused ? '#EAF5F4' : theme.textSecondary }}>
            {children}
          </ThemedText>
        ) : null}
        {badge ? (
          <View style={styles.badge} accessibilityLabel={`${badge} unread`}>
            <ThemedText type="smallBold" style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const dark = useColorScheme() === 'dark';
  const { width } = useWindowDimensions();
  const glass = {
    backgroundColor: dark ? 'rgba(2, 70, 68, 0.7)' : 'rgba(248, 252, 252, 0.8)',
    borderColor: dark ? 'rgba(144,193,190,0.15)' : 'rgba(69,123,121,0.12)',
    // frosted-glass blur behind the bar (web)
    backdropFilter: 'blur(18px)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
  } as unknown as ViewStyle;
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={[styles.innerContainer, glass]}>
        <View style={styles.brand}>
          <GlowOrb size={26} pulse={false} icon="planet" />
          {width >= 560 ? (
            <ThemedText type="smallBold" style={styles.brandText}>
              Orbique
            </ThemedText>
          ) : null}
          <ModeSwitch />
        </View>
        {props.children}
      </View>
    </View>
  );
}

// Quick light/dark switch next to the logo.
function ModeSwitch() {
  const dark = useColorScheme() === 'dark';
  const { setMode } = useColorMode();
  return (
    <Pressable
      onPress={() => setMode(dark ? 'light' : 'dark')}
      accessibilityRole="button"
      accessibilityLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={({ pressed }) => [styles.modeSwitch, { backgroundColor: dark ? 'rgba(144,193,190,0.12)' : 'rgba(69,123,121,0.08)' }, pressed && styles.pressed]}>
      <Icon name={dark ? 'sunny-outline' : 'moon-outline'} size={17} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modeSwitch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 20,
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.one + 2,
    maxWidth: MaxContentWidth,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginRight: 'auto',
  },
  brandText: {
    fontSize: 17,
    letterSpacing: 0.5,
    color: BRAND_COLOR,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  tabButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    overflow: 'hidden',
  },
  tabButtonCompact: {
    paddingHorizontal: Spacing.two + 2,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: '#90C1BE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#011F1E',
    fontSize: 11,
    lineHeight: 14,
  },
});
