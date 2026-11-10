import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Small building blocks shared by the forms and screens, plus the app's brand colours.

export const BRAND_COLOR = '#457B79';
export const ACCENT_COLOR = '#066A67';
/** The Orbique gradient: dark teal to cadet teal. */
export const GRADIENT = ['#024644', '#457B79'] as const;
const ERROR_COLOR = '#E5484D';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, onFocus, onBlur, ...props }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement },
          focused && { borderColor: BRAND_COLOR },
          error ? { borderColor: ERROR_COLOR } : null,
          style,
        ]}
        {...props}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
    </View>
  );
}

export function ErrorText({ children }: { children: string }) {
  return (
    <ThemedText type="small" style={{ color: ERROR_COLOR }}>
      {children}
    </ThemedText>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'light';
};

// Primary buttons use the Orbique gradient; all buttons shrink slightly when pressed.
export function Button({ title, onPress, loading, variant = 'primary' }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const light = variant === 'light';
  const textColor = primary ? '#EAF5F4' : light ? '#011F1E' : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        !primary && { backgroundColor: light ? '#EAF5F4' : theme.backgroundElement },
        primary && styles.primaryShadow,
        pressed && styles.pressed,
        loading && styles.loading,
      ]}>
      {primary ? (
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText style={{ color: textColor, fontWeight: 700 }}>{title}</ThemedText>
      )}
    </Pressable>
  );
}

type ChoiceListProps = {
  options: readonly string[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  /** Keep all options on one line (put it inside a horizontal ScrollView). */
  nowrap?: boolean;
  /** Optional nicer text to show for an option. */
  labels?: Partial<Record<string, string>>;
  /** Optional icon shown before an option, e.g. { Books: 'book-outline' }. */
  icons?: Partial<Record<string, IconName>>;
};

// A row of tappable options (pills). The selected one gets the gradient.
export function ChoiceList({ options, value, onChange, nowrap, labels, icons }: ChoiceListProps) {
  const theme = useTheme();
  return (
    <View style={[styles.choices, nowrap && { flexWrap: 'nowrap' }]}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.choice,
              { backgroundColor: selected ? 'transparent' : theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            {selected ? (
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            ) : null}
            {icons?.[option] ? <Icon name={icons[option]} size={16} color={selected ? '#EAF5F4' : theme.textSecondary} /> : null}
            <ThemedText style={{ color: selected ? '#EAF5F4' : theme.text, fontWeight: selected ? 700 : 500 }}>
              {labels?.[option] ?? option}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
    alignSelf: 'stretch',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    fontSize: 16,
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: Spacing.four,
    overflow: 'hidden',
  },
  primaryShadow: {
    shadowColor: BRAND_COLOR,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  loading: {
    opacity: 0.8,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three + 2,
    borderRadius: Spacing.five,
    overflow: 'hidden',
  },
});
