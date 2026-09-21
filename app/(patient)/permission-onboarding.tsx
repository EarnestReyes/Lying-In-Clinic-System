import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { PermissionState } from '../../src/models/permission';
import {
  getLocationPermissionStatus,
  markPermissionOnboardingCompleted,
  openAppSettings,
  requestForegroundLocationPermission,
} from '../../src/services/permissionService';
import { Colors } from '../../src/theme/colors';

const TOTAL_STEPS = 3;

export default function PermissionOnboardingScreen() {
  const { firebaseUser, userRole, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [locationState, setLocationState] = useState<PermissionState | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const actionLock = useRef(false);

  const refreshLocation = async () => {
    try {
      const result = await getLocationPermissionStatus();
      setLocationState(result.state);
      setError('');
    } catch {
      setError('Location permission status could not be checked. You can continue without it.');
    } finally {
      setCheckingLocation(false);
    }
  };

  useEffect(() => { void refreshLocation(); }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && step === 2) void refreshLocation();
    });
    return () => subscription.remove();
  }, [step]);

  const changeStep = (nextStep: number) => {
    if (busy || nextStep === step) return;
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(slide, { toValue: -10, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slide.setValue(12);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const finish = async () => {
    if (!firebaseUser || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError('');
    try {
      await markPermissionOnboardingCompleted(firebaseUser.uid);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your choice could not be saved. Please try again.');
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const requestLocation = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await requestForegroundLocationPermission();
      setLocationState(result.state);
    } catch {
      setError('Location access could not be requested. You can continue and enable it later in Settings.');
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const confirmSkip = () => Alert.alert(
    'Skip permissions?',
    'You can continue using Lying-In without enabling these permissions. Nearby clinic and direction features may be limited. You can enable location later in your device settings.',
    [
      { text: 'Go Back', style: 'cancel' },
      { text: 'Skip', onPress: () => void finish() },
    ],
  );

  if (authLoading) return <SafeAreaView style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></SafeAreaView>;
  if (!firebaseUser) return <Redirect href="/(auth)/login" />;
  if (userRole !== 'patient') return <Redirect href={userRole === 'companion' ? '/companion' : '/(auth)/login'} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SET UP YOUR EXPERIENCE</Text>
          <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
        </View>
        {step < 3 && <Pressable accessibilityRole="button" disabled={busy} onPress={confirmSkip} hitSlop={12}>
          <Text style={[styles.skipText, busy && styles.disabledText]}>Skip for now</Text>
        </Pressable>}
      </View>

      <View accessibilityLabel={`Step ${step} of ${TOTAL_STEPS}`} style={styles.progressRow}>
        {[1, 2, 3].map((value, index) => <React.Fragment key={value}>
          <View style={[styles.progressDot, value <= step && styles.progressDotActive]}>
            {value < step ? <Ionicons name="checkmark" size={14} color={Colors.surface} /> : <Text style={[styles.progressNumber, value <= step && styles.progressNumberActive]}>{value}</Text>}
          </View>
          {index < 2 && <View style={[styles.progressLine, value < step && styles.progressLineActive]} />}
        </React.Fragment>)}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY: slide }] }]}>
          {step === 1 && <>
            <View style={styles.iconCircle}><Ionicons name="person-circle-outline" size={54} color={Colors.primary} /></View>
            <Text style={styles.title}>Your Information</Text>
            <Text style={styles.body}>We use the information you provide to maintain your patient profile, appointments, and clinic records.</Text>
            <View style={styles.infoPanel}>
              {['Basic personal and contact details', 'Pregnancy and maternal information', 'Appointments and clinic records'].map(item => <View key={item} style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={19} color={Colors.primary} />
                <Text style={styles.infoText}>{item}</Text>
              </View>)}
            </View>
            <Text style={styles.caption}>This is an information acknowledgment. Your clinic uses these details to provide and manage your care.</Text>
            <PrimaryButton label="I Understand" disabled={busy} onPress={() => changeStep(2)} />
          </>}

          {step === 2 && <>
            <View style={styles.iconCircle}><Ionicons name="location-outline" size={52} color={Colors.primary} /></View>
            <Text style={styles.title}>Find Nearby Clinics</Text>
            <Text style={styles.body}>Allow location access so Lying-In can show nearby clinic branches and provide directions while you use the app.</Text>
            <Text style={styles.caption}>Your location is only used when you open location-based features. The app does not request background tracking.</Text>
            {checkingLocation ? <ActivityIndicator color={Colors.primary} style={styles.statusLoader} /> : <LocationStatus state={locationState} />}
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {locationState === 'granted' ? <PrimaryButton label="Continue" disabled={busy} onPress={() => changeStep(3)} /> : <>
              {locationState === 'blocked' ? <PrimaryButton label="Open Settings" disabled={busy} onPress={() => void openAppSettings().catch(() => setError('Device settings could not be opened.'))} /> : <PrimaryButton label={busy ? 'Requesting…' : 'Allow Location'} disabled={busy || checkingLocation} onPress={() => void requestLocation()} />}
              <Pressable accessibilityRole="button" disabled={busy} style={styles.secondaryButton} onPress={() => changeStep(3)}>
                <Text style={styles.secondaryButtonText}>Not Now</Text>
              </Pressable>
            </>}
          </>}

          {step === 3 && <>
            <View style={[styles.iconCircle, styles.successCircle]}><Ionicons name="checkmark" size={52} color={Colors.surface} /></View>
            <Text style={styles.title}>You're All Set</Text>
            <Text style={styles.body}>Your Lying-In experience is ready. You can update device permissions later from your phone's settings.</Text>
            <LocationStatus state={locationState} />
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <PrimaryButton label={busy ? 'Saving…' : 'Continue to Lying-In'} disabled={busy} onPress={() => void finish()} />
          </>}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LocationStatus({ state }: { state: PermissionState | null }) {
  const allowed = state === 'granted';
  const label = allowed ? 'Allowed' : state === 'blocked' ? 'Not enabled · use Settings to allow' : 'Not enabled';
  return <View style={[styles.permissionStatus, allowed && styles.permissionStatusAllowed]}>
    <Ionicons name={allowed ? 'checkmark-circle' : 'location-outline'} size={21} color={allowed ? Colors.success : Colors.textMuted} />
    <View style={styles.permissionStatusText}><Text style={styles.permissionName}>Location</Text><Text style={styles.permissionValue}>{label}</Text></View>
  </View>;
}

function PrimaryButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, (pressed || disabled) && styles.buttonDisabled]}>
    <Text style={styles.primaryButtonText}>{label}</Text><Ionicons name="arrow-forward" size={19} color={Colors.surface} />
  </Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.pageBackground },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.pageBackground },
  header: { paddingHorizontal: 22, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  stepLabel: { color: Colors.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 3 },
  skipText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
  disabledText: { opacity: 0.45 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 30, marginTop: 22 },
  progressDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  progressNumber: { color: Colors.textMuted, fontSize: 12, fontWeight: '800' },
  progressNumberActive: { color: Colors.surface },
  progressLine: { flex: 1, height: 3, backgroundColor: Colors.border },
  progressLineActive: { backgroundColor: Colors.primary },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: Platform.OS === 'android' ? 28 : 20 },
  card: { backgroundColor: Colors.surface, borderRadius: 26, padding: 24, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.overlay, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 3 },
  iconCircle: { width: 92, height: 92, borderRadius: 46, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryPale, marginBottom: 22 },
  successCircle: { backgroundColor: Colors.primary },
  title: { color: Colors.textPrimary, fontSize: 26, lineHeight: 33, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  body: { color: Colors.textSecondary, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  caption: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 14 },
  infoPanel: { backgroundColor: Colors.primaryPale, borderRadius: 16, padding: 15, gap: 11, marginTop: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { flex: 1, color: Colors.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  permissionStatus: { marginTop: 22, padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: Colors.surfaceMuted, borderWidth: 1, borderColor: Colors.border },
  permissionStatusAllowed: { backgroundColor: Colors.successPale, borderColor: Colors.successSoft },
  permissionStatusText: { flex: 1 },
  permissionName: { color: Colors.textPrimary, fontWeight: '800', fontSize: 14 },
  permissionValue: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  statusLoader: { marginTop: 24 },
  error: { color: Colors.danger, backgroundColor: Colors.dangerPale, padding: 12, borderRadius: 12, fontSize: 12, lineHeight: 18, marginTop: 14 },
  primaryButton: { minHeight: 52, borderRadius: 15, backgroundColor: Colors.primary, marginTop: 24, paddingHorizontal: 18, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: Colors.surface, fontSize: 15, fontWeight: '800' },
  buttonDisabled: { opacity: 0.55 },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secondaryButtonText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' },
});
