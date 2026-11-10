import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

import { AnimatedBackground } from '@/components/animated-background';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ColorModeProvider } from '@/lib/color-mode';

SplashScreen.preventAutoHideAsync();

// Navigation themes with see-through screens, so the animated background shows behind them.
const SEE_THROUGH_DARK = { ...DarkTheme, colors: { ...DarkTheme.colors, background: 'transparent' } };
const SEE_THROUGH_LIGHT = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } };

// Remembers loaded data (listings etc.) so screens open fast.
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

export default function RootLayout() {
  return (
    <ColorModeProvider>
      <ThemedRoot />
    </ColorModeProvider>
  );
}

function ThemedRoot() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? SEE_THROUGH_DARK : SEE_THROUGH_LIGHT}>
      <AnimatedBackground />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

// Sends people to the right place:
// logged out -> Welcome, logged in without an area -> Pick your area, otherwise -> the app.
function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const inAuthScreens = segments[0] === '(auth)';
  const onPickCity = segments[0] === 'pick-city';

  // Hide the start-up splash screen as soon as we know who is logged in.
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      if (!inAuthScreens) router.replace('/welcome');
    } else if (profile && profile.lat == null) {
      if (!onPickCity) router.replace('/pick-city');
    } else if (inAuthScreens) {
      router.replace('/home');
    }
  }, [loading, session, profile, inAuthScreens, onPickCity, router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
      {loading ? (
        <ThemedView
          style={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <ActivityIndicator />
        </ThemedView>
      ) : null}
    </>
  );
}
