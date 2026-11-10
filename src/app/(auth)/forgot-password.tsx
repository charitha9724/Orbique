import { Link } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';

import { Button, ErrorText, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

// Send a "reset your password" email.
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = async () => {
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError('Please enter a valid email');
      return;
    }
    setSending(true);
    setError(null);
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: Platform.OS === 'web' ? `${window.location.origin}/reset-password` : undefined,
    });
    setSending(false);
    if (sendError) setError(sendError.message);
    else setSent(true);
  };

  if (sent) {
    return (
      <Screen centered>
        <ThemedText type="subtitle">Check your email</ThemedText>
        <ThemedText>
          If there&apos;s an account for {email.trim()}, we&apos;ve sent a link to choose a new password. It can take a
          few minutes, and might land in spam.
        </ThemedText>
        <Link href="/log-in">
          <ThemedText type="linkPrimary">Back to log in</ThemedText>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen centered>
      <ThemedText type="subtitle">Forgot your password?</ThemedText>
      <ThemedText themeColor="textSecondary">
        Enter your email and we&apos;ll send you a link to choose a new one.
      </ThemedText>
      <TextField
        label="Email"
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={send}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title="Send reset link" onPress={send} loading={sending} />
      <Link href="/log-in">
        <ThemedText type="linkPrimary">Back to log in</ThemedText>
      </Link>
    </Screen>
  );
}
