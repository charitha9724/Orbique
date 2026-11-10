import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// One consistent icon style for the whole app (Ionicons line icons).
// Colour defaults to the normal text colour for light/dark mode.
export function Icon({ name, size = 18, color }: { name: IconName; size?: number; color?: string }) {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={color ?? theme.text} />;
}
