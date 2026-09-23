import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { ActivityAssignment } from '../../src/models/Activity';
import { subscribeActivities } from '../../src/services/activityService';
import { Colors } from '../../src/theme/colors';
import ActivitySession, { ActivityButton, ProgressBar, privacyNotice, styles } from '../../components/activities/ActivitySession';

export default function ActivitiesScreen() {
  const { firebaseUser } = useAuth();
  const focused = useIsFocused();
  const [items, setItems] = useState<ActivityAssignment[]>([]);
  const [selected, setSelected] = useState<ActivityAssignment | null>(null);
  const [session, setSession] = useState<ActivityAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  useEffect(() => {
    setItems([]); setSelected(null); setSession(null); setPrivacyAccepted(false); setLoading(true); setError('');
    if (!firebaseUser) { setLoading(false); return; }
    return subscribeActivities(data => { setItems(data); setLoading(false); setError(''); }, e => { setError(e.message); setLoading(false); });
  }, [firebaseUser?.uid, retry]);
  // Guide uses live assignment data; running session retains its immutable initial snapshot.
  const current = selected ? items.find(i => i.id === selected.id) : null;
  useEffect(() => {
    if (!session) return;
    const latest = items.find(i => i.id === session.id);
    if (!latest || !latest.activity.isActive) { setSession(null); setError('The clinic has removed or paused this assignment.'); }
    else if (latest.status === 'completed') { setSession(null); setSelected(null); }
  }, [items, session]);
  if (session) return <SafeAreaView style={{ flex: 1, backgroundColor: Colors.pageBackground }} edges={['top']}><ActivitySession key={session.id} assignment={session} onExit={() => { setSession(null); setSelected(null); }} /></SafeAreaView>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: Colors.pageBackground }} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Ionicons name="body-outline" size={30} color={Colors.primary} /><Text style={styles.title}>Activities</Text></View>
    <Text style={styles.muted}>Your clinic-assigned activities and saved progress.</Text>
    {loading && <ActivityIndicator color={Colors.primary} />}
    {!!error && <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><ActivityButton title="Retry" onPress={() => setRetry(v => v + 1)} /></>}
    {current ? <View style={styles.card}>
      <Text style={styles.title}>{current.activity.name}</Text>
      <Text style={styles.muted}>{current.activity.description}</Text>
      {current.activity.instructions.map((instruction, i) => <Text key={i} style={styles.muted}>{i + 1}. {instruction}</Text>)}
      <Text style={styles.muted}>Verification: {current.activity.verificationType === 'pose' ? 'Camera movement detection' : current.activity.verificationType}</Text>
      <Text style={styles.muted}>{current.activity.verificationType === 'pose' ? `${current.activity.targetRepetitions} repetitions` : current.activity.verificationType === 'timer' ? `${current.activity.targetDurationSeconds} seconds of active time` : 'Patient confirmation'}</Text>
      {current.activity.estimatedDurationSeconds > 0 && <Text style={styles.muted}>Estimated duration: {current.activity.estimatedDurationSeconds} seconds</Text>}
      {!!current.activity.tutorialUrl && <ActivityButton title="View Clinic Demonstration" onPress={() => { void Linking.openURL(current.activity.tutorialUrl).catch(() => setError('Unable to open the clinic demonstration.')); }} />}
      {!!current.activity.safetyNotice && <Text style={styles.notice}>{current.activity.safetyNotice}</Text>}
      <Text style={styles.notice}>Follow only your clinic’s instructions. Movement detection does not provide medical clearance or assess pregnancy health.</Text>
      {current.activity.verificationType === 'pose' && <><Text style={styles.notice}>{privacyNotice}</Text>{!privacyAccepted && <ActivityButton title="I Understand Camera Use" onPress={() => setPrivacyAccepted(true)} />}</>}
      <ActivityButton title={current.status === 'completed' ? 'Completed' : 'Start Activity'} disabled={!focused || !current.activity.isActive || current.status === 'completed' || (current.activity.verificationType === 'pose' && !privacyAccepted)} onPress={() => setSession(current)} />
      <ActivityButton title="Back to Activities" onPress={() => setSelected(null)} />
    </View> : !loading && !error && items.length === 0 ? <Text style={styles.notice}>No activities have been assigned yet. Your clinic will assign approved activities here.</Text> : !selected && items.map(item => {
      const a = item.activity;
      const progress = item.status === 'completed' ? 1 : a.verificationType === 'pose' ? item.completedRepetitions / a.targetRepetitions : a.verificationType === 'timer' ? item.durationSeconds / a.targetDurationSeconds : 0;
      return <View key={item.id} style={styles.card}>
        <Text style={[styles.title, { fontSize: 21 }]}>{a.name}</Text><Text style={styles.muted}>{a.description}</Text>
        <Text style={styles.muted}>{a.verificationType === 'pose' ? `${item.completedRepetitions} / ${a.targetRepetitions} repetitions` : a.verificationType === 'timer' ? `${item.durationSeconds} / ${a.targetDurationSeconds} seconds` : 'Manual confirmation'}</Text>
        <Text style={styles.muted}>Verification: {a.verificationType === 'pose' ? 'Camera movement detection' : a.verificationType}</Text>
        <Text style={styles.muted}>Assigned by: {item.assignedBy}</Text>
        <Text style={styles.muted}>Status: {item.status.replace(/_/g, ' ')}{!a.isActive ? ' · Paused by clinic' : ''}</Text>
        <ProgressBar value={progress} />
        <ActivityButton title="View Guide" onPress={() => setSelected(item)} />
      </View>;
    })}
    {selected && !current && !loading && <><Text style={styles.error}>This assignment is no longer available.</Text><ActivityButton title="Back" onPress={() => setSelected(null)} /></>}
  </ScrollView></SafeAreaView>;
}
