/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#011F1E',
    // see-through so the animated background (components/animated-background.tsx) shows
    background: 'transparent',
    backgroundElement: 'rgba(248, 252, 252, 0.74)',
    backgroundSelected: 'rgba(144, 193, 190, 0.75)',
    textSecondary: '#2F5F5D',
  },
  dark: {
    text: '#EAF5F4',
    background: 'transparent',
    backgroundElement: 'rgba(2, 70, 68, 0.66)',
    backgroundSelected: 'rgba(69, 123, 121, 0.85)',
    textSecondary: '#90C1BE',
  },
} as const;

/** Solid page colours, for places that can't be see-through (e.g. the phone tab bar). */
export const SolidBackground = { light: '#EAF5F4', dark: '#011F1E' } as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
