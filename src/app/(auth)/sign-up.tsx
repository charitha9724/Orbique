import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform } from 'react-native';
import { z } from 'zod';

import { Button, ErrorText, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const schema = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(50, 'Keep it under 50 characters'),
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function SignUpScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setServerError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        // After confirming their email, bring people back to this app (web).
        emailRedirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
      },
    });
    if (error) {
      setServerError(
        error.message === 'User already registered'
          ? 'There is already an account with this email. Try logging in instead.'
          : error.message,
      );
    } else if (!data.session) {
      // Supabase is set to confirm emails first.
      setCheckEmail(true);
    }
    // If a session came back, the app moves on to "Pick your city" by itself.
  });

  if (checkEmail) {
    return (
      <Screen centered>
        <ThemedText type="subtitle">Check your email</ThemedText>
        <ThemedText>
          We sent you a link to confirm your account. Open it, then come back and log in.
        </ThemedText>
        <Link href="/log-in">
          <ThemedText type="linkPrimary">Go to log in</ThemedText>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen centered>
      <ThemedText type="subtitle">Create your account</ThemedText>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label="Your name"
            autoComplete="name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email"
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Password"
            autoComplete="new-password"
            secureTextEntry
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={() => onSubmit()}
            error={errors.password?.message}
          />
        )}
      />
      {serverError ? <ErrorText>{serverError}</ErrorText> : null}
      <Button title="Sign up" onPress={onSubmit} loading={isSubmitting} />
      <Link href="/log-in">
        <ThemedText type="linkPrimary">Already have an account? Log in</ThemedText>
      </Link>
    </Screen>
  );
}
