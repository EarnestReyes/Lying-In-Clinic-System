import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Import your custom authService and Firestore config
import { authService } from '../../src/services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if the current device is running on the web
  const isWeb = Platform.OS === 'web';

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      // 1. Authenticate using authService
      const user = await authService.login(email, password);

      // 2. Fetch user role from Firestore to enforce portal security
      const userDoc = await authService.getUserProfile(user.uid);

      if (!userDoc) {
        setLoading(false);
        setErrorMessage('User record not found in the database.');
        await authService.logout();
        return;
      }

      const userRole = userDoc.role; // expected: 'staff', 'midwife', or 'patient'

      setLoading(false);

      // 3. Platform & Role Access Validation
      if (isWeb) {
        // Web Portal: Restricted to staff and midwives
        if (userRole === 'staff' || userRole === 'midwife') {
          router.replace('/(admin)/dashboard' as any);
        } else {
          setErrorMessage('Access denied. Patients must sign in via the mobile app.');
          await authService.logout();
        }
      } else {
        // Mobile App: Restricted to patients
        if (userRole === 'patient') {
          router.replace(returnTo === 'check-in' ? '/check-in' : '/(patient)/home' as any);
        } else {
          setErrorMessage('Access denied. Staff and midwives must use the web portal.');
          await authService.logout();
        }
      }

    } catch (error: any) {
      setLoading(false);
      // Friendly error handling for common Firebase Auth issues
      const message = error.message || '';
      if (message.includes('invalid-credential') || message.includes('user-not-found') || message.includes('wrong-password')) {
        setErrorMessage('Invalid email or password. Please try again.');
      } else if (message.includes('invalid-email')) {
        setErrorMessage('Please enter a valid email address.');
      } else {
        setErrorMessage(message || 'Failed to sign in. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D9488" />
      
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={isWeb ? "desktop-outline" : "phone-portrait-outline"} 
            size={36} 
            color="#0D9488" 
          />
        </View>

        <Text style={styles.title}>Lying-In Center Portal</Text>
        
        {/* Dynamic subtitle letting the user know their portal type */}
        <Text style={styles.subtitle}>
          {isWeb ? "Staff & Midwife Web Portal" : "Patient Mobile Portal"}
        </Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={isWeb ? "Staff Email" : "Patient Email"}
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity 
          style={styles.loginButton} 
          activeOpacity={0.8} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>
              {isWeb ? "Sign In as Staff" : "Sign In as Patient"}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.platformNotice}>
          {isWeb 
            ? "🔒 Web access restricted to Authorized Staff & Midwives." 
            : "📱 Mobile access restricted to Registered Patients."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D9488',
    marginBottom: 24,
    marginTop: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#0F172A',
    fontSize: 14,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#0D9488',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  platformNotice: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
