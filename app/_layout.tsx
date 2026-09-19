import { Stack } from 'expo-router';
import { AuthProvider } from '../src/hooks/useAuth';

export default function RootLayout() {
  return (
    <AuthProvider><Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(patient)" />
      <Stack.Screen name="check-in" />
    </Stack></AuthProvider>
  );
}
