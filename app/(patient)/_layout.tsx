import { useEffect, useRef } from 'react';
import { useAuth } from '../../src/hooks/useAuth';
import { useLocalSearchParams, useSegments } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar } from 'expo-router/build/react-navigation/bottom-tabs';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { usePermissionOnboarding } from '../../src/hooks/usePermissionOnboarding';

export default function PatientTabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { firebaseUser, userRole, loading } = useAuth();
  const onboarding = usePermissionOnboarding(firebaseUser?.uid, userRole === 'patient');
  const redirectingTo = useRef<string | null>(null);
  const isOnboarding = segments[0] === '(patient)' && segments[1] === 'permission-onboarding';
  const onboardingLoading = userRole === 'patient' && onboarding.loading;
  let redirectTarget: '/(auth)/login' | '/(patient)/permission-onboarding' | '/check-in' | '/(patient)/home' | null = null;

  if (!loading && (!firebaseUser || userRole !== 'patient')) {
    redirectTarget = '/(auth)/login';
  } else if (!loading && !onboardingLoading && onboarding.completed === false && !isOnboarding) {
    redirectTarget = '/(patient)/permission-onboarding';
  } else if (!loading && !onboardingLoading && onboarding.completed === true && isOnboarding) {
    redirectTarget = next === 'check-in' ? '/check-in' : '/(patient)/home';
  }

  useEffect(() => {
    if (!redirectTarget) {
      redirectingTo.current = null;
      return;
    }
    if (redirectingTo.current === redirectTarget) return;
    redirectingTo.current = redirectTarget;
    router.replace(redirectTarget);
  }, [redirectTarget, router]);

  if (loading || onboardingLoading || redirectTarget) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <Tabs
      tabBar={(props) => (
        props.state.routes[props.state.index]?.name === 'permission-onboarding' ? null :
        <View style={styles.tabBarWrapper}>
          {!['ai-chat', 'clinic-map', 'activities'].includes(props.state.routes[props.state.index]?.name) && (
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
        name="permission-onboarding"
        options={{ href: null }}
      />
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
      <Tabs.Screen name="activities" options={{ title: 'Activities', tabBarIcon: ({ color }) => <Ionicons name="body-outline" size={22} color={color} /> }} />
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.pageBackground },
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
