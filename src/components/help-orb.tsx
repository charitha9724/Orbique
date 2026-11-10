import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { BRAND_COLOR } from '@/components/form';
import { Icon, type IconName } from '@/components/icon';

const GLOW = 'rgba(144, 193, 190, 0.45)';
const useNative = Platform.OS !== 'web';

// A glowing, gently pulsing ball. Used as the help button and as the helper's avatar.
export function GlowOrb({ size = 56, pulse = true, icon = 'help' }: { size?: number; pulse?: boolean; icon?: IconName }) {
  const [wave] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.timing(wave, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: useNative,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, wave]);

  const ring = {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: GLOW,
  } as const;

  const glow: ViewStyle =
    Platform.OS === 'web'
      ? ({ boxShadow: `0 0 ${size * 0.35}px ${size * 0.08}px ${GLOW}, inset 0 -${size * 0.08}px ${size * 0.2}px rgba(0,0,0,0.18)` } as ViewStyle)
      : { shadowColor: BRAND_COLOR, shadowOpacity: 0.8, shadowRadius: size * 0.3, shadowOffset: { width: 0, height: 0 }, elevation: 10 };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {pulse ? (
        <Animated.View
          pointerEvents="none"
          style={[
            ring,
            {
              opacity: wave.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
              transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
            },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.orb,
          { width: size, height: size, borderRadius: size / 2 },
          glow,
        ]}>
        {/* soft highlight for a 3D look */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: size * 0.1,
            left: size * 0.24,
            width: size * 0.3,
            height: size * 0.16,
            borderRadius: size,
            backgroundColor: 'rgba(255,255,255,0.22)',
          }}
        />
        <Icon name={icon} size={Math.round(size * 0.5)} color="#EAF5F4" />
      </View>
    </View>
  );
}

// The floating help button in the bottom-right corner.
export function HelpOrb({ bottom }: { bottom: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/help')}
      accessibilityRole="button"
      accessibilityLabel="Help"
      style={({ pressed }) => [styles.floating, { bottom }, pressed && styles.pressed]}>
      <GlowOrb />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  orb: {
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  floating: {
    position: 'absolute',
    right: 20,
    zIndex: 50,
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
});
