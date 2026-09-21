import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onAnimationComplete) {
        const timer = setTimeout(() => {
          onAnimationComplete();
        }, 600);
        return () => clearTimeout(timer);
      }
    });
  }, [fadeAnim, scaleAnim, onAnimationComplete]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F766E" />
      
      <Animated.View 
        style={[
          styles.contentBox, 
          { 
            opacity: fadeAnim, 
            transform: [{ scale: scaleAnim }] 
          }
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="heart" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.appName}>Lying-In System</Text>
        <Text style={styles.appSubtitle}>Maternal Care & Clinic Portal</Text>
      </Animated.View>

      <View style={styles.footerContainer}>
        <View style={styles.glowCircle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  contentBox: {
    alignItems: 'center',
    zIndex: 2,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#99F6E4',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footerContainer: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    zIndex: 1,
  },
  glowCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});