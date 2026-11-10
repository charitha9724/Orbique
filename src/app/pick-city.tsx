import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, ErrorText, TextField } from '@/components/form';
import LocationMap, { type LatLng } from '@/components/location-map';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { reverseGeocode, searchPlaces, type Place } from '@/lib/geocode';
import { supabase } from '@/lib/supabase';

// Where the map starts if we know nothing yet (central Bengaluru).
const DEFAULT_CENTER: LatLng = { lat: 12.9716, lng: 77.5946 };

// "Pick your location": shown after sign-up, and from Profile > Change location.
// (The file keeps its old name "pick-city" because files on the D: drive can't be renamed.)
export default function PickLocationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, profile, refreshProfile } = useAuth();

  const start: LatLng =
    profile?.lat != null && profile?.lng != null ? { lat: profile.lat, lng: profile.lng } : DEFAULT_CENTER;
  const [center, setCenter] = useState<LatLng>(start);
  const [place, setPlace] = useState<Place | null>(
    profile?.area && profile.lat != null && profile.lng != null
      ? { lat: profile.lat, lng: profile.lng, area: profile.area, city: profile.city }
      : null,
  );
  const [lookingUp, setLookingUp] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Look up the area name a moment after the map stops moving.
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookupId = useRef(0);
  const lookUp = (spot: LatLng) => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    setLookingUp(true);
    lookupTimer.current = setTimeout(async () => {
      const id = ++lookupId.current;
      try {
        const found = await reverseGeocode(spot.lat, spot.lng);
        if (id === lookupId.current) setPlace(found);
      } catch (e) {
        if (id === lookupId.current) setError((e as Error).message);
      } finally {
        if (id === lookupId.current) setLookingUp(false);
      }
    }, 700);
  };
  useEffect(() => () => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
  }, []);

  const onMoveEnd = (spot: LatLng) => {
    setCenter(spot);
    setError(null);
    lookUp(spot);
  };

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const found = await searchPlaces(query.trim());
      setResults(found);
      if (!found.length) setError('No places found. Try a different name.');
    } catch (e) {
      setError((e as Error).message);
    }
    setSearching(false);
  };

  const choose = (found: Place) => {
    setResults([]);
    setQuery('');
    setCenter({ lat: found.lat, lng: found.lng });
    setPlace(found);
  };

  const useMyLocation = () => {
    if (Platform.OS !== 'web' || !navigator.geolocation) {
      setError("Your device can't share its location here. Try searching instead.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const spot = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(spot);
        lookUp(spot);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Check that location access is allowed, or search instead.");
      },
      { enableHighAccuracy: false, timeout: 15000 },
    );
  };

  const save = async () => {
    if (!place || lookingUp) {
      setError('Move the map to your area first');
      return;
    }
    if (!session) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase
      .from('profiles')
      .update({ lat: place.lat, lng: place.lng, area: place.area.slice(0, 120), city: place.city?.slice(0, 60) ?? null })
      .eq('id', session.user.id);
    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }
    await refreshProfile();
    setSaving(false);
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  return (
    <Screen>
      <ThemedText type="subtitle">Pick your area</ThemedText>
      <ThemedText themeColor="textSecondary">
        You&apos;ll see things for sale near here. Others only see your area name, never your exact spot.
      </ThemedText>

      <View style={styles.searchRow}>
        <View style={styles.flex}>
          <TextField
            label="Search for your area"
            placeholder="e.g. Koramangala"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
          />
        </View>
        <View style={styles.searchButton}>
          <Button title="Search" variant="secondary" onPress={search} loading={searching} />
        </View>
      </View>

      {results.length ? (
        <View style={[styles.results, { backgroundColor: theme.backgroundElement }]}>
          {results.map((r, i) => (
            <Pressable key={`${i}-${r.lat},${r.lng}`} onPress={() => choose(r)} style={styles.result}>
              <ThemedText>{r.area}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {Platform.OS === 'web' ? (
        <Button title="Use my current location" variant="secondary" onPress={useMyLocation} loading={locating} />
      ) : null}

      <LocationMap center={center} onMoveEnd={onMoveEnd} />

      <ThemedText style={styles.center}>
        {lookingUp ? 'Finding the area name...' : place ? place.area : 'Move the map so the pin is on your area'}
      </ThemedText>

      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title="Save my area" onPress={save} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  searchButton: {
    width: 100,
  },
  results: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
  },
  result: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
});
