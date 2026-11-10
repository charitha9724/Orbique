import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

const useNative = Platform.OS !== 'web';

type Blob = {
  color: string;
  size: number;
  top: `${number}%`;
  left: `${number}%`;
  /** How far (px) and how slowly (ms) it drifts. */
  dx: number;
  dy: number;
  duration: number;
};

const DARK_BLOBS: Blob[] = [
  { color: '#066A67', size: 460, top: '-10%', left: '-20%', dx: 90, dy: 70, duration: 16000 },
  { color: '#024644', size: 520, top: '35%', left: '45%', dx: -110, dy: -60, duration: 19000 },
  { color: '#457B79', size: 380, top: '70%', left: '-15%', dx: 80, dy: -90, duration: 22000 },
  { color: '#90C1BE', size: 300, top: '5%', left: '70%', dx: -70, dy: 100, duration: 17000 },
];

const LIGHT_BLOBS: Blob[] = [
  { color: '#90C1BE', size: 460, top: '-10%', left: '-20%', dx: 90, dy: 70, duration: 16000 },
  { color: '#90C1BE', size: 520, top: '35%', left: '45%', dx: -110, dy: -60, duration: 19000 },
  { color: '#C2E1DF', size: 380, top: '70%', left: '-15%', dx: 80, dy: -90, duration: 22000 },
  { color: '#457B79', size: 300, top: '5%', left: '70%', dx: -70, dy: 100, duration: 17000 },
];

// A softly glowing background of coloured lights that slowly drift around.
// Sits behind every screen. Stays still if the person has "reduce motion" turned on.
export function AnimatedBackground() {
  const dark = useColorScheme() === 'dark';
  const [still, setStill] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setStill)
      .catch(() => {});
  }, []);

  const blobs = dark ? DARK_BLOBS : LIGHT_BLOBS;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: dark ? '#011F1E' : '#EAF5F4' }]}>
      {blobs.map((b, i) => (
        <DriftingBlob key={i} blob={b} still={still} opacity={dark ? 0.55 : 0.5} />
      ))}
      {/* a faint veil on top keeps text easy to read */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(1,31,30,0.3)' : 'rgba(234,245,244,0.25)' }]} />
    </View>
  );
}

function DriftingBlob({ blob, still, opacity }: { blob: Blob; still: boolean; opacity: number }) {
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: blob.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
        Animated.timing(t, { toValue: 0, duration: blob.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [still, t, blob.duration]);

  // Soft edges: a real blur on the web, very low opacity on phones.
  const soft: ViewStyle =
    Platform.OS === 'web' ? ({ filter: `blur(${Math.round(blob.size / 5)}px)` } as unknown as ViewStyle) : { opacity: opacity * 0.6 };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: blob.top,
          left: blob.left,
          width: blob.size,
          height: blob.size,
          borderRadius: blob.size / 2,
          backgroundColor: blob.color,
          opacity,
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, blob.dx] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, blob.dy] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
          ],
        },
        soft,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // keep the drifting lights inside the screen (otherwise phones can scroll sideways)
  clip: { overflow: 'hidden' },
});
