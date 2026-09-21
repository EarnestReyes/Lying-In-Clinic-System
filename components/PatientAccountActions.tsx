import React, { useRef, useState } from 'react';
import { Alert, Text, TextInput, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { changePassword, clearPatientCache, deletePatientAccount } from '../src/services/patientAccountService';
import { authService } from '../src/services/authService';
import { CareButton, CareCard, CareField, s } from './care/CareUI';
import { Colors as C } from '../src/theme/colors';

export function PatientAccountActions({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'password' | 'delete' | null>(null);
  const [current, setCurrent] = useState(''); 
  const [next, setNext] = useState(''); 
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); 
  const [error, setError] = useState(''); 
  const lock = useRef(false);

  const reset = () => { 
    setMode(null); 
    setCurrent(''); 
    setNext(''); 
    setConfirm(''); 
    setError(''); 
  };

  const run = async (action: () => Promise<void>, message?: string) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { 
      await action(); 
      reset(); 
      if (message) Alert.alert('Success', message); 
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' 
          ? 'Current password is incorrect.' 
          : code === 'auth/requires-recent-login' 
          ? 'Please sign in again and retry.' 
          : code?.startsWith('functions/') 
          ? 'Account deletion could not finish. Check your connection and try again, or contact the clinic.' 
          : e instanceof Error ? e.message : 'Action failed. Please try again.'
      );
    } finally { 
      lock.current = false; 
      setBusy(false); 
    }
  };

  const blocked = disabled || busy;

  return (
    <View style={localStyles.wrapperCard}>
      <Text style={localStyles.sectionTitle}>Account Actions & Security</Text>

      {!!error && <Text style={s.error}>{error}</Text>}

      {!mode ? (
        <View style={{ gap: 10 }}>
          {/* Change Password Trigger */}
          <TouchableOpacity 
            style={localStyles.actionRow} 
            activeOpacity={0.7} 
            disabled={blocked} 
            onPress={() => { reset(); setMode('password'); }}
          >
            <View style={[localStyles.iconBox, { backgroundColor: C.primaryPale }]}>
              <Ionicons name="key-outline" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.actionTitle}>Change Password</Text>
              <Text style={localStyles.actionSub}>Update your login credentials securely</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>

          {/* Clear Cache Trigger */}
          <TouchableOpacity 
            style={localStyles.actionRow} 
            activeOpacity={0.7} 
            disabled={blocked} 
            onPress={() => Alert.alert('Clear local cache?', 'This removes temporary imported files and app cache. Your account, appointments and healthcare records stay saved.', [{ text: 'Keep cache', style: 'cancel' }, { text: 'Clear cache', onPress: () => run(clearPatientCache, 'Local cache cleared.') }])}
          >
            <View style={[localStyles.iconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="trash-bin-outline" size={18} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.actionTitle}>Clear Local Cache</Text>
              <Text style={localStyles.actionSub}>Free up temporary storage space</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>

          {/* Delete Account Trigger */}
          <TouchableOpacity 
            style={localStyles.actionRow} 
            activeOpacity={0.7} 
            disabled={blocked} 
            onPress={() => { reset(); setMode('delete'); }}
          >
            <View style={[localStyles.iconBox, { backgroundColor: C.dangerPale }]}>
              <Ionicons name="warning-outline" size={18} color={C.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[localStyles.actionTitle, { color: C.danger }]}>Delete Account</Text>
              <Text style={localStyles.actionSub}>Permanently close your access account</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>

          {/* Log Out Trigger */}
          <TouchableOpacity 
            style={[localStyles.actionRow, { borderBottomWidth: 0 }]} 
            activeOpacity={0.7} 
            disabled={blocked} 
            onPress={() => Alert.alert('Log out?', 'You can sign in again anytime.', [{ text: 'Stay', style: 'cancel' }, { text: 'Log out', onPress: () => run(async () => { await authService.logout(); router.replace('/(auth)/login'); }) }])}
          >
            <View style={[localStyles.iconBox, { backgroundColor: C.pageBackground }]}>
              <Ionicons name="log-out-outline" size={18} color={C.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={localStyles.actionTitle}>Log Out</Text>
              <Text style={localStyles.actionSub}>Sign out from this device</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        /* Expanded Form View for Password Change or Deletion */
        <View style={localStyles.formContainer}>
          <Text style={localStyles.formHeading}>
            {mode === 'password' ? 'Change Account Password' : 'Confirm Account Deletion'}
          </Text>

          <Text style={s.label}>Current Password</Text>
          <TextInput 
            accessibilityLabel="Current password" 
            style={s.input} 
            secureTextEntry 
            autoCapitalize="none" 
            autoCorrect={false} 
            placeholder="Enter current password"
            placeholderTextColor={C.textFaint}
            value={current} 
            onChangeText={setCurrent} 
            editable={!blocked} 
          />

          {mode === 'password' && (
            <>
              <Text style={s.label}>New Password</Text>
              <TextInput 
                accessibilityLabel="New password" 
                style={s.input} 
                secureTextEntry 
                autoCapitalize="none" 
                autoCorrect={false} 
                placeholder="Enter new password"
                placeholderTextColor={C.textFaint}
                value={next} 
                onChangeText={setNext} 
                editable={!blocked} 
              />

              <Text style={s.label}>Confirm New Password</Text>
              <TextInput 
                accessibilityLabel="Confirm new password" 
                style={s.input} 
                secureTextEntry 
                autoCapitalize="none" 
                autoCorrect={false} 
                placeholder="Re-enter new password"
                placeholderTextColor={C.textFaint}
                value={confirm} 
                onChangeText={setConfirm} 
                editable={!blocked} 
              />
            </>
          )}

          {mode === 'delete' && (
            <>
              <Text style={s.label}>Type DELETE to confirm</Text>
              <TextInput 
                accessibilityLabel="Type DELETE" 
                style={s.input} 
                autoCapitalize="characters" 
                autoCorrect={false} 
                placeholder="DELETE"
                placeholderTextColor={C.textFaint}
                value={confirm} 
                onChangeText={setConfirm} 
                editable={!blocked} 
              />
              <Text style={localStyles.warningText}>
                This permanently removes your sign-in account. Your clinic retains medical history, submitted healthcare documents, and appointment records. Access cannot be restored by signing in again.
              </Text>
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <CareButton 
              label={busy ? 'Please wait…' : mode === 'password' ? 'Save password' : 'Permanently delete'} 
              danger={mode === 'delete'} 
              disabled={blocked || !current || (mode === 'delete' && (confirm !== 'DELETE' || !current))} 
              onPress={() => {
                if (mode === 'password') {
                  run(() => changePassword(current, next, confirm), 'Password updated.');
                } else {
                  Alert.alert('Final confirmation', 'Permanently delete your sign-in account? This cannot be undone.', [
                    { text: 'Keep account', style: 'cancel' }, 
                    { text: 'Delete permanently', style: 'destructive', onPress: () => run(async () => { await deletePatientAccount(current, confirm); router.replace('/(auth)/login'); }) }
                  ]);
                }
              }} 
            />
            <CareButton label="Cancel" secondary disabled={blocked} onPress={reset} />
          </View>
        </View>
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  wrapperCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textPrimary,
  },
  actionSub: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
  },
  formContainer: {
    gap: 12,
  },
  formHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 4,
  },
  warningText: {
    color: C.danger,
    backgroundColor: C.dangerPale,
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
  },
});