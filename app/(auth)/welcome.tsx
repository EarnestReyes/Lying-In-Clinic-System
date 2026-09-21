import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { usePermissionOnboarding } from '../../src/hooks/usePermissionOnboarding';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { firebaseUser, userRole, loading: authLoading } = useAuth();
  const onboarding = usePermissionOnboarding(firebaseUser?.uid, userRole === 'patient');
  const redirected = useRef(false);

  // Entrance animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Continuous heartbeat pulse value
  const heartbeatAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Play entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Start continuous heartbeat loop
    const heartbeatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartbeatAnim, {
          toValue: 1.18, // Expand
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1.0, // Contract back
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1.12, // Minor second beat pulse
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1.0, // Rest
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    );

    heartbeatLoop.start();

    return () => heartbeatLoop.stop();
  }, [fadeAnim, slideAnim, scaleAnim, heartbeatAnim]);

  useEffect(() => {
    if (!firebaseUser) { redirected.current = false; return; }
    if (authLoading || !userRole || redirected.current) return;
    if (userRole === 'patient') {
      if (onboarding.completed === null) return;
      redirected.current = true;
      router.replace(onboarding.completed ? '/(patient)/home' : '/(patient)/permission-onboarding');
      return;
    }
    redirected.current = true;
    if (userRole === 'companion' && Platform.OS !== 'web') router.replace('/companion');
    else if (['admin', 'staff', 'midwife'].includes(userRole) && Platform.OS === 'web') router.replace('/(admin)/dashboard');
  }, [authLoading, firebaseUser, onboarding.completed, router, userRole]);

  if (authLoading || (!!firebaseUser && (userRole === 'patient' ? onboarding.loading : !userRole))) {
    return <View style={styles.authLoading}><ActivityIndicator size="large" color="#FFFFFF" /><Text style={styles.authLoadingText}>Preparing your account…</Text></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F766E" />
      
      {/* Top Banner / Illustration Area with Fade & Scale Animation */}
      <Animated.View 
        style={[
          styles.illustrationContainer, 
          { 
            opacity: fadeAnim, 
            transform: [{ scale: scaleAnim }] 
          }
        ]}
      >
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={16} color="#99F6E4" />
          <Text style={styles.badgeText}>Secure Maternal Portal</Text>
        </View>

        {/* Beating Heart Hero Icon */}
        <Animated.View 
          style={[
            styles.heroCircle, 
            { transform: [{ scale: heartbeatAnim }] }
          ]}
        >
          <Ionicons name="heart" size={72} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>

      {/* Bottom Floating White Card with Slide-Up Animation */}
      <Animated.View 
        style={[
          styles.bottomCard, 
          { 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        <View style={styles.indicatorBar} />
        
        <Text style={styles.brandTitle}>Lying-In System</Text>
        <Text style={styles.headline}>Let's Get You Set Up for Care</Text>
        <Text style={styles.subtext}>
          Manage your prenatal schedules, track health logs, and connect with your clinic seamlessly.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => router.push('/(auth)/login' as any)}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.buttonIcon} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F766E',
  },
  authLoading: { flex: 1, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center', gap: 12 },
  authLoadingText: { color: '#CCFBF1', fontSize: 13, fontWeight: '700' },
  illustrationContainer: {
    flex: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    color: '#99F6E4',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  heroCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  indicatorBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headline: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#0F766E',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
