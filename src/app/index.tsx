import { Redirect } from 'expo-router';

// The app's front door. The main layout decides where people really go
// (Welcome, Pick your city, or Home), so this just points at Home.
export default function Index() {
  return <Redirect href="/home" />;
}
