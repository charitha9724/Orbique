import { Stack } from 'expo-router';

// Screens for people who are not logged in: Welcome, Sign up, Log in.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />;
}
