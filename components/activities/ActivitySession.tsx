import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { getCameraPermissionsAsync, requestCameraPermissionsAsync } from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ActivityAssignment, PoseFrame } from '../../src/models/Activity';
import { detectRepetition, initialMovementState } from '../../src/services/movementEvaluator';
import { saveActivityProgress } from '../../src/services/activityService';
import { Colors } from '../../src/theme/colors';
import PoseCamera, { poseCameraAvailable } from './PoseCamera';

export const privacyNotice = 'Camera access is used to detect body movement during this activity. Frames are processed on this device and are not saved or uploaded. Only repetitions, duration, status and timestamps are saved to your activity record.';
export function ActivityButton({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && { opacity: 0.45 }]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}
export function ProgressBar({ value }: { value: number }) {
  const progress = Math.max(0, Math.min(1, value));
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View>;
}
export default function ActivitySession({ assignment, onExit }: { assignment: ActivityAssignment; onExit: () => void }) {
  const a = assignment.activity;
  const focused = useIsFocused();
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied' | 'blocked'>('unknown');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(assignment.status === 'completed');
  const [reps, setReps] = useState(assignment.completedRepetitions);
  const [seconds, setSeconds] = useState(assignment.durationSeconds);
  const [feedback, setFeedback] = useState('Preparing activity…');
  const state = useRef(initialMovementState(assignment.completedRepetitions));
  const secondsRef = useRef(assignment.durationSeconds);
  const elapsedMs = useRef(assignment.durationSeconds * 1000);
  const runningRef = useRef(false);
  const lastTick = useRef(0);
  const lastPose = useRef(0);
  const completionRequested = useRef(false);
  const mounted = useRef(true);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const feedbackRef = useRef('');
  const say = (message: string) => { if (message !== feedbackRef.current) { feedbackRef.current = message; setFeedback(message); } };

  // Serialize writes, retaining a failed session in memory so completion can be retried.
  const persist = useCallback((complete = false) => {
    const count = state.current.repetitions, duration = secondsRef.current;
    const task = queue.current.catch(() => {}).then(() => saveActivityProgress(assignment.id, count, duration, complete));
    queue.current = task;
    return task;
  }, [assignment.id]);
  const stopClock = useCallback(() => {
    if (runningRef.current) {
      elapsedMs.current += Math.max(0, performance.now() - lastTick.current);
      secondsRef.current = Math.floor(elapsedMs.current / 1000);
    }
    runningRef.current = false;
    if (mounted.current) { setRunning(false); setSeconds(secondsRef.current); }
    state.current = initialMovementState(state.current.repetitions);
  }, []);
  const finish = useCallback(async () => {
    if (completionRequested.current) return;
    completionRequested.current = true;
    stopClock();
    setSaving(true); setError('');
    try { await persist(true); if (mounted.current) { setDone(true); setFeedback('Activity completed and saved.'); } }
    catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Unable to save completion.'); completionRequested.current = false; }
    finally { if (mounted.current) setSaving(false); }
  }, [persist, stopClock]);
  const pause = useCallback(() => {
    stopClock();
    void persist().catch(e => { if (mounted.current) setError(e instanceof Error ? e.message : 'Progress could not be saved.'); });
  }, [persist, stopClock]);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    void saveActivityProgress(assignment.id, assignment.completedRepetitions, assignment.durationSeconds).then(() => {
      if (!cancelled) { setReady(true); setFeedback('Ready. Start when you are prepared.'); }
    }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to start activity.'); });
    return () => { cancelled = true; stopClock(); mounted.current = false; void persist().catch(() => {}); };
  }, [assignment.id, assignment.completedRepetitions, assignment.durationSeconds, persist, stopClock]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', value => { if (value !== 'active') pause(); });
    return () => listener.remove();
  }, [pause]);
  useEffect(() => { if (!focused) pause(); }, [focused, pause]);
  useEffect(() => {
    if (a.verificationType !== 'pose' || Platform.OS === 'web') return;
    void getCameraPermissionsAsync().then(p => { if (mounted.current) setPermission(p.granted ? 'granted' : p.canAskAgain ? 'denied' : 'blocked'); }).catch(() => setError('Unable to check camera permission.'));
  }, [a.verificationType]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      if (!runningRef.current) return;
      const now = performance.now();
      elapsedMs.current += Math.max(0, now - lastTick.current); lastTick.current = now;
      secondsRef.current = Math.floor(elapsedMs.current / 1000);
      setSeconds(secondsRef.current);
      if (a.verificationType === 'pose' && now - lastPose.current > 2000) {
        state.current = initialMovementState(state.current.repetitions);
        say('Tracking unavailable. Return to starting position.');
      }
      if (a.verificationType === 'timer' && secondsRef.current >= a.targetDurationSeconds) stopClock();
    }, 250);
    return () => clearInterval(timer);
  }, [running, a.verificationType, a.targetDurationSeconds, stopClock]);

  async function requestPermission() {
    try {
      const p = await requestCameraPermissionsAsync();
      setPermission(p.granted ? 'granted' : p.canAskAgain ? 'denied' : 'blocked');
    } catch { setError('Unable to request camera permission.'); }
  }
  function resume() {
    setError(''); state.current = initialMovementState(state.current.repetitions);
    lastTick.current = performance.now(); lastPose.current = lastTick.current;
    runningRef.current = true; setRunning(true);
  }
  function onPose(frame: PoseFrame) {
    if (!runningRef.current || !focused || AppState.currentState !== 'active' || completionRequested.current || !a.rules) return;
    lastPose.current = performance.now();
    const previous = state.current.repetitions;
    const next = detectRepetition(state.current, frame, a.rules, a.targetRepetitions);
    state.current = next; say(next.feedback);
    if (previous !== next.repetitions) {
      setReps(next.repetitions);
      if (next.repetitions >= a.targetRepetitions) void finish();
      else void persist().catch(e => { if (mounted.current) setError(e instanceof Error ? e.message : 'Progress not saved.'); });
    }
  }
  async function exit() {
    stopClock(); setSaving(true);
    try { await persist(); onExit(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save progress. Retry before exiting.'); }
    finally { if (mounted.current) setSaving(false); }
  }
  const reached = a.verificationType === 'pose' ? reps >= a.targetRepetitions : a.verificationType === 'timer' ? seconds >= a.targetDurationSeconds : false;
  const remaining = Math.max(0, a.targetDurationSeconds - seconds);
  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>{a.name}</Text>
    <Text style={styles.muted}>Verification: {a.verificationType === 'pose' ? 'Camera movement detection' : a.verificationType === 'timer' ? 'Active timer' : 'Manual confirmation'}</Text>
    {a.verificationType === 'pose' && <>
      {!poseCameraAvailable ? <Text style={styles.notice}>Camera verification requires a rebuilt Android or iOS app with the PrenatalPose native module. Expo Go and web are not supported.</Text> : permission !== 'granted' ? <View style={styles.card}>
        <Text style={styles.muted}>{permission === 'blocked' ? 'Camera access is blocked. Enable it in device settings, then return and check permission.' : 'Allow camera access to verify this activity.'}</Text>
        <ActivityButton title={permission === 'blocked' ? 'Open Settings' : 'Allow Camera'} onPress={() => { if (permission === 'blocked') void Linking.openSettings(); else void requestPermission(); }} />
        <ActivityButton title="Check Permission" onPress={() => { void getCameraPermissionsAsync().then(p => setPermission(p.granted ? 'granted' : p.canAskAgain ? 'denied' : 'blocked')).catch(() => setError('Unable to check permission.')); }} />
      </View> : <View style={styles.camera}>
        {running && focused && !done ? <PoseCamera style={StyleSheet.absoluteFill} onPose={e => onPose(e.nativeEvent)} onError={e => { pause(); setError(e.nativeEvent.message); }} /> : <Ionicons name="videocam-outline" size={54} color={Colors.surface} />}
      </View>}
      <Text style={styles.counter}>{reps} / {a.targetRepetitions}</Text>
      <ProgressBar value={reps / a.targetRepetitions} />
      <Text style={styles.feedback}>{feedback}</Text>
    </>}
    {a.verificationType === 'timer' && <>
      <Text style={styles.counter}>{Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}</Text>
      <ProgressBar value={seconds / a.targetDurationSeconds} />
      <Text style={styles.muted}>Only time while this screen is active and the timer is running counts.</Text>
    </>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {saving && <ActivityIndicator color={Colors.primary} />}
    {done ? <><Text style={styles.feedback}>Activity completed and saved.</Text><ActivityButton title="Back to Activities" onPress={onExit} /></> : <>
      {!ready && !saving && <ActivityButton title="Retry Starting Activity" onPress={() => { setSaving(true); void persist().then(() => { setReady(true); setError(''); }).catch(e => setError(e instanceof Error ? e.message : 'Unable to start.')).finally(() => setSaving(false)); }} />}
      {a.verificationType === 'manual' ? <ActivityButton title="Mark Completed" disabled={!ready || saving} onPress={() => Alert.alert('Complete activity?', 'Confirm that you completed the clinic-assigned activity. This will be recorded as manual confirmation.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => { void finish(); } }])} /> : reached ? <ActivityButton title={a.verificationType === 'pose' ? 'Retry Saving Completion' : 'Finish'} disabled={saving || !ready} onPress={() => { void finish(); }} /> : <ActivityButton title={running ? 'Pause' : 'Start / Resume'} disabled={!ready || saving || (a.verificationType === 'pose' && (!poseCameraAvailable || permission !== 'granted'))} onPress={running ? pause : resume} />}
      <ActivityButton title="Cancel Activity / Save and Exit" disabled={saving} onPress={() => { void exit(); }} />
    </>}
    <Text style={styles.notice}>This verifies observable movement or records timer/manual completion. It does not assess pregnancy health, medical safety, or medical clearance.</Text>
  </ScrollView>;
}
export const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: 48 }, title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  card: { backgroundColor: Colors.surface, padding: 20, borderRadius: 20, gap: 12, borderWidth: 1, borderColor: Colors.border },
  muted: { fontSize: 15, lineHeight: 23, color: Colors.textSecondary }, button: { padding: 15, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center' },
  buttonText: { fontWeight: '700', color: Colors.surface, fontSize: 16 }, track: { height: 10, borderRadius: 5, backgroundColor: Colors.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.primary }, camera: { height: 380, borderRadius: 20, overflow: 'hidden', backgroundColor: Colors.textPrimary, justifyContent: 'center', alignItems: 'center' },
  counter: { fontSize: 48, color: Colors.primaryDeep, fontWeight: '800', textAlign: 'center' }, feedback: { fontSize: 18, color: Colors.primaryDark, textAlign: 'center', fontWeight: '600' },
  notice: { padding: 16, backgroundColor: Colors.primaryPale, color: Colors.textSecondary, borderRadius: 14, lineHeight: 22 }, error: { color: Colors.danger, lineHeight: 22 },
});
