import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreenModule from 'expo-splash-screen';
import SplashScreen from '../components/SplashScreen';
import { AuthProvider } from '../src/hooks/useAuth';

SplashScreenModule.preventAutoHideAsync();

export default function RootLayout() {
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s splash duration
      } catch (e) {
        console.warn(e);
      } finally {
        await SplashScreenModule.hideAsync();
      }
    }
    prepare();
  }, []);

  // 1. Show custom animated splash screen first
  if (!isSplashFinished) {
    return (
      <SplashScreen 
        onAnimationComplete={() => {
          setIsSplashFinished(true);
        }} 
      />
    );
  }

  // 2. Render main navigation stack
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(patient)" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="companion" />
      <Stack.Screen name="companion-register" />
      </Stack>
    </AuthProvider>
  );
}
