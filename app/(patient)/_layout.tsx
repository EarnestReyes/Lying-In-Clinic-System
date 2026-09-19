import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar } from 'expo-router/build/react-navigation/bottom-tabs';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../src/theme/colors';

export default function PatientTabLayout() {
  const router = useRouter();

  return (
    <Tabs
      tabBar={(props) => (
        <View style={styles.tabBarWrapper}>
          {!['ai-chat', 'clinic-map'].includes(props.state.routes[props.state.index]?.name) && (
            <TouchableOpacity
              style={styles.supportButton}
              activeOpacity={0.9}
              onPress={() => router.push('/(patient)/ai-chat' as any)}
            >
              <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
              <Text style={styles.supportButtonText}>Clinic Support</Text>
            </TouchableOpacity>
          )}
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerShown: false, // We handle custom headers inside each screen if needed
        tabBarStyle: {
          height: 65,
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "fitness" : "fitness-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="ai-chat"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen name="care" 
      options={{ href: null }} />
      
      <Tabs.Screen
        name="contact"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="reminders"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="clinic-map"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'relative',
  },
  supportButton: {
    position: 'absolute',
    right: 20,
    bottom: 76,
    zIndex: 10,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 7,
  },
  supportButtonText: {
    color: Colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
});
