import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/form';
import { GlowOrb } from '@/components/help-orb';
import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'location-outline', title: 'Near you', text: 'See what students within a few km are selling.' },
  { icon: 'chatbubble-ellipses-outline', title: 'Chat safely', text: 'Message sellers without sharing your number.' },
  { icon: 'shield-checkmark-outline', title: 'Stay in control', text: 'Report or block anyone, any time.' },
];

// The first screen people see: a colourful, animated welcome.
export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <LinearGradient colors={['#011F1E', '#024644', '#066A67']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.flex}>
      {/* soft glowing blobs in the background */}
      <View pointerEvents="none" style={[styles.blob, styles.blobOne]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobTwo]} />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View entering={FadeInDown.duration(700)} style={styles.hero}>
            <GlowOrb size={96} icon="planet" />
            <ThemedText type="title" style={styles.title}>
              Orbique
            </ThemedText>
            <ThemedText style={styles.tagline}>Buy and sell with students near you.</ThemedText>
          </Animated.View>

          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <Animated.View key={f.title} entering={FadeInDown.delay(250 + i * 150).duration(600)} style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Icon name={f.icon} size={22} color="#EAF5F4" />
                </View>
                <View style={styles.flex}>
                  <ThemedText type="smallBold" style={styles.white}>
                    {f.title}
                  </ThemedText>
                  <ThemedText type="small" style={styles.muted}>
                    {f.text}
                  </ThemedText>
                </View>
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.buttons}>
            <Button title="Create an account" onPress={() => router.push('/sign-up')} />
            <Button title="I already have an account" variant="light" onPress={() => router.push('/log-in')} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, overflow: 'hidden' },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.five,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.35,
  },
  blobOne: {
    width: 320,
    height: 320,
    top: -80,
    right: -100,
    backgroundColor: '#457B79',
  },
  blobTwo: {
    width: 260,
    height: 260,
    bottom: -60,
    left: -90,
    backgroundColor: '#90C1BE',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    color: '#EAF5F4',
    textAlign: 'center',
    letterSpacing: 1,
  },
  tagline: {
    color: 'rgba(234,245,244,0.85)',
    textAlign: 'center',
    fontSize: 18,
  },
  features: {
    gap: Spacing.three,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 18,
    backgroundColor: 'rgba(2,70,68,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(144,193,190,0.18)',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(144, 193, 190, 0.22)',
  },
  white: { color: '#EAF5F4' },
  muted: { color: 'rgba(144,193,190,0.9)' },
  buttons: {
    gap: Spacing.three,
  },
});
