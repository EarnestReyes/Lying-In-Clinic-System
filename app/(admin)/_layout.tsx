import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import { AdminSidebar } from '../../components/AdminSidebar';
import { AdminHeader } from '../../components/AdminHeader';

export default function AdminLayout() {
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {Platform.OS === 'web' && <AdminSidebar />}
      <View style={{ flex: 1, minWidth: 0 }}>
        {Platform.OS === 'web' && <AdminHeader />}
        <View style={{ flex: 1, minHeight: 0 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="queue" />
            <Stack.Screen name="care" />
            <Stack.Screen name="chatPatient" />
            <Stack.Screen name="patients/index" />
            <Stack.Screen name="patients/[id]" />
            <Stack.Screen name="appointments" />
            <Stack.Screen name="inventory" />
            <Stack.Screen name="payments" />
          </Stack>
        </View>
      </View>
    </View>
  );
}
