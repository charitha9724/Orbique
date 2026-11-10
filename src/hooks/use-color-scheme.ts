import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useColorMode } from '@/lib/color-mode';

/** 'light' or 'dark': the person's choice in Profile, or the device setting if they chose Automatic. */
export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const { mode } = useColorMode();
  if (mode === 'light' || mode === 'dark') return mode;
  return system === 'dark' ? 'dark' : 'light';
}
