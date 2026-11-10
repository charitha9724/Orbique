import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, ErrorText, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const schema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(1, 'Please enter your password'),
});
type FormValues = z.infer<typeof schema>;

export default function LogInScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setServerError(
        error.message === 'Invalid login credentials' ? 'Wrong email or password. Please try again.' : error.message,
      );
    }
    // On success the app moves on by itself.
  });

  return (
    <Screen centered>
      <ThemedText type="subtitle">Welcome back</ThemedText>
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
            autoComplete="current-password"
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
      <Button title="Log in" onPress={onSubmit} loading={isSubmitting} />
      <Link href="/forgot-password">
        <ThemedText type="linkPrimary">Forgot password?</ThemedText>
      </Link>
      <Link href="/sign-up">
        <ThemedText type="linkPrimary">New here? Create an account</ThemedText>
      </Link>
    </Screen>
  );
}
