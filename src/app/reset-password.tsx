import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorText, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Opened from the "reset your password" email: choose a new password.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (password.length < 8) {
      setError('Use at least 8 characters');
      return;
    }
    if (password !== repeat) {
      setError("The two passwords don't match");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (saveError) setError(saveError.message);
    else router.replace('/home');
  };

  if (!session) {
    return (
      <Screen centered>
        <ThemedText type="subtitle">Link expired</ThemedText>
        <ThemedText>This reset link is no longer valid. Ask for a new one from the log in page.</ThemedText>
        <Button title="Go to log in" onPress={() => router.replace('/log-in')} />
      </Screen>
    );
  }

  return (
    <Screen centered>
      <ThemedText type="subtitle">Choose a new password</ThemedText>
      <TextField
        label="New password"
        autoComplete="new-password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextField
        label="Type it again"
        autoComplete="new-password"
        secureTextEntry
        value={repeat}
        onChangeText={setRepeat}
        onSubmitEditing={save}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title="Save new password" onPress={save} loading={saving} />
    </Screen>
  );
}
