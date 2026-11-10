import { Platform, View, type ViewProps, type ViewStyle } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Blur whatever is behind cards on the web, for a frosted-glass look.
const GLASS = Platform.OS === 'web' ? ({ backdropFilter: 'blur(14px)' } as unknown as ViewStyle) : null;

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  const glass = type === 'backgroundElement' || type === 'backgroundSelected' ? GLASS : null;
  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, glass, style]} {...otherProps} />;
}
