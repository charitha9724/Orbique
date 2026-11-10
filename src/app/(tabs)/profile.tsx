import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ChoiceList, ErrorText, TextField } from '@/components/form';
import { BlockedPeople } from '@/components/blocked-people';
import { DeleteAccount } from '@/components/delete-account';
import { MyListings } from '@/components/my-listings';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useColorMode, type ColorMode } from '@/lib/color-mode';
import { supabase } from '@/lib/supabase';

const DISTANCES = ['5 km', '10 km', '25 km'] as const;
const MODES: ColorMode[] = ['light', 'dark', 'system'];
const MODE_LABELS: Record<string, string> = { light: 'Light', dark: 'Dark', system: 'Automatic' };
const MODE_ICONS = { light: 'sunny-outline', dark: 'moon-outline', system: 'phone-portrait-outline' } as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const { mode, setMode } = useColorMode();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [distance, setDistance] = useState(`${profile?.radius_km ?? 10} km`);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name');
      return;
    }
    if (trimmed.length > 50) {
      setError('Keep your name under 50 characters');
      return;
    }
    if (!session) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const { error: saveError } = await supabase
      .from('profiles')
      .update({ display_name: trimmed, radius_km: parseInt(distance, 10) })
      .eq('id', session.user.id);
    if (saveError) {
      setError(saveError.message);
    } else {
      await refreshProfile();
      setMessage('Saved');
    }
    setSaving(false);
  };

  return (
    <Screen>
      <View style={styles.content}>
        <ThemedText type="subtitle">Your profile</ThemedText>
        <ThemedText themeColor="textSecondary">{session?.user.email}</ThemedText>

        <TextField label="Your name" value={name} onChangeText={setName} autoComplete="name" />

        <View style={styles.section}>
          <ThemedText type="smallBold">Your area</ThemedText>
          <View style={styles.placeRow}>
            <Icon name="location-outline" size={18} />
            <ThemedText>{profile?.area ?? 'Not set yet'}</ThemedText>
          </View>
          <Button title="Change area on the map" variant="secondary" onPress={() => router.push('/pick-city')} />
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Show things for sale within</ThemedText>
          <ChoiceList options={DISTANCES} value={distance} onChange={setDistance} />
        </View>

        {error ? <ErrorText>{error}</ErrorText> : null}
        {message ? <ThemedText type="small">{message}</ThemedText> : null}
        <Button title="Save changes" onPress={save} loading={saving} />

        {session ? (
          <View style={styles.section}>
            <ThemedText type="smallBold">Your listings</ThemedText>
            <MyListings userId={session.user.id} />
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="smallBold">Appearance</ThemedText>
          <ChoiceList options={MODES} value={mode} onChange={(m) => setMode(m as ColorMode)} labels={MODE_LABELS} icons={MODE_ICONS} />
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Blocked people</ThemedText>
          <BlockedPeople />
        </View>

        <Button title="Help & questions" variant="secondary" onPress={() => router.push('/help')} />
        <Button title="Log out" variant="secondary" onPress={() => supabase.auth.signOut()} />
        {session ? <DeleteAccount userId={session.user.id} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  section: {
    gap: Spacing.two,
  },
});
