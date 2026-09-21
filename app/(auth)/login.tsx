import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authService } from '../../src/services/authService';
import { hasCompletedPermissionOnboarding } from '../../src/services/permissionService';

export default function LoginScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const loginLock = useRef(false);

  const isWeb = Platform.OS === 'web';

  const handleLogin = async () => {
    if (loginLock.current) return;
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      setSuccessMessage('');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    loginLock.current = true;

    try {
      const user = await authService.login(email, password);
      const userDoc = await authService.getUserProfile(user.uid);

      if (!userDoc) {
        setErrorMessage('User record not found in the database.');
        await authService.logout();
        return;
      }

      const userRole = userDoc.role;
      if (isWeb) {
        if (userRole === 'staff' || userRole === 'midwife') {
          router.replace('/(admin)/dashboard' as any);
        } else {
          setErrorMessage('Access denied. Patients must sign in via the mobile app.');
          await authService.logout();
        }
      } else {
        if (userRole === 'companion') {
          router.replace('/companion' as any);
        } else if (userRole === 'patient') {
          const completed = await hasCompletedPermissionOnboarding(user.uid);
          if (!completed) {
            router.replace((returnTo === 'check-in'
              ? '/(patient)/permission-onboarding?next=check-in'
              : '/(patient)/permission-onboarding') as any);
          } else {
            router.replace(returnTo === 'check-in' ? '/check-in' : '/(patient)/home' as any);
          }
        } else {
          setErrorMessage('Access denied. Staff and midwives must use the web portal.');
          await authService.logout();
        }
      }
    } catch (error: any) {
      const message = error.message || '';
      if (message.includes('invalid-credential') || message.includes('user-not-found') || message.includes('wrong-password')) {
        setErrorMessage('Invalid email or password. Please try again.');
      } else if (message.includes('invalid-email')) {
        setErrorMessage('Please enter a valid email address.');
      } else {
        setErrorMessage(message || 'Failed to sign in. Please try again.');
      }
    } finally {
      loginLock.current = false;
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F766E" />
      
      {/* Top Header Text Section with Expanded Space */}
      <View style={styles.headerContainer}>
        <View style={styles.headerBadge}>
          <Ionicons name="medical" size={14} color="#99F6E4" />
          <Text style={styles.headerBadgeText}>Maternal Health Portal</Text>
        </View>
        <Text style={styles.headerTitle}>
          Log In to stay on top of your care and schedules.
        </Text>
      </View>

      {/* Floating Bottom Form Card with Keyboard-Aware ScrollView */}
      <View style={styles.cardContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Login</Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.signUpText}>Back</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.portalSubLabel}>
            {isWeb ? "Staff & Midwife Web Portal" : "Patient Mobile Portal"}
          </Text>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          {/* Email Field */}
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
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

          {/* Password Field */}
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Forgot Password Link -> Directs to forgotPass.tsx */}
          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={() => router.push('/(auth)/forgotPass' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Action Button */}
          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>
                {isWeb ? "Sign In as Staff" : "Login"}
              </Text>
            )}
          </TouchableOpacity>

          {!isWeb && <TouchableOpacity onPress={() => router.push('/companion-register' as any)} style={{ padding: 16 }}><Text style={{ color: '#0D9488', fontWeight: '700' }}>Create a companion account</Text></TouchableOpacity>}
          <Text style={styles.platformNotice}>
            {isWeb ? "🔒 Authorized Staff & Midwives Only" : "📱 Patients & Companions"}
          </Text>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F766E',
  },
  headerContainer: {
    flex: 0.45,
    paddingHorizontal: 28,
    justifyContent: 'flex-end',
    paddingBottom: 32,
    paddingTop: 40,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerBadgeText: {
    color: '#99F6E4',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 36,
    letterSpacing: 0.2,
  },
  cardContainer: {
    flex: 1.2,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F766E',
  },
  portalSubLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 14,
    fontWeight: '600',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
  },
  successText: {
    color: '#0D9488',
    fontSize: 13,
    marginBottom: 14,
    fontWeight: '600',
    backgroundColor: '#F0FDFA',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '700',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#0F766E',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  platformNotice: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 6,
  },
});
