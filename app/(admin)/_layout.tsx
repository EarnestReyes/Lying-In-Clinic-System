import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="patients/index" />
      <Stack.Screen name="patients/[id]" />
      <Stack.Screen name="appointments" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="payments" />
    </Stack>
  );
}