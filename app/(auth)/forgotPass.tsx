import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { authService } from '../../src/services/authService';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!email) {
      setErrorMessage('Please enter your registered email address.');
      setSuccessMessage('');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      // Corrected method name to match authService type definition
      await authService.resetPassword(email);
      setSuccessMessage('Password reset link sent! Please check your email inbox.');
    } catch (error: any) {
      const message = error.message || '';
      if (message.includes('user-not-found')) {
        setErrorMessage('No account found with this email address.');
      } else if (message.includes('invalid-email')) {
        setErrorMessage('Please enter a valid email address.');
      } else {
        setErrorMessage(message || 'Failed to send reset email. Please try again.');
      }
    } finally {
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
      
      {/* Top Header Text Section matching the theme */}
      <View style={styles.headerContainer}>
        <View style={styles.headerBadge}>
          <Ionicons name="key-outline" size={14} color="#99F6E4" />
          <Text style={styles.headerBadgeText}>Account Recovery</Text>
        </View>
        <Text style={styles.headerTitle}>
          Reset your password to regain access to your care portal.
        </Text>
      </View>

      {/* Floating Bottom Form Card */}
      <View style={styles.cardContainer}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Forgot Password</Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.portalSubLabel}>
            Enter your email and we'll send you a link to reset your password.
          </Text>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          {/* Email Field */}
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Submit Action Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={handlePasswordReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.returnLoginContainer} 
            onPress={() => router.replace('/(auth)/login' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.returnLoginText}>Remembered your password? <Text style={styles.loginHighlight}>Sign In</Text></Text>
          </TouchableOpacity>

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
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 34,
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
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F766E',
  },
  portalSubLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 24,
    lineHeight: 18,
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
    marginBottom: 20,
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
  primaryButton: {
    width: '100%',
    backgroundColor: '#0F766E',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
  returnLoginContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  returnLoginText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  loginHighlight: {
    color: '#0F766E',
    fontWeight: '700',
  },
});