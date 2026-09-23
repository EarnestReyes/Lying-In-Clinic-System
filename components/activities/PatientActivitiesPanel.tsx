import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { ActivityAssignment, CatalogActivity } from '../../src/models/Activity';
import { Patient } from '../../src/models/Patient';
import { assignActivity, getPatientAuthUid, subscribeActivityLibrary, subscribePatientActivities } from '../../src/services/activityService';
import { CareButton, CareCard, CareField, s } from '../care/CareUI';
import { ActivityDialog, ActivityPreview, dateLabel, errorMessage, targetLabel, verificationLabel } from './StaffActivityUI';

function AssignActivityDialog({ patientUid, patientName, assignments, onClose, onAssigned }: { patientUid: string; patientName: string; assignments: ActivityAssignment[]; onClose(): void; onAssigned(name: string): void }) {
  const [items, setItems] = useState<CatalogActivity[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    setLoading(true); setLoadError(''); setItems([]);
    return subscribeActivityLibrary(data => { setItems(data); setLoading(false); setLoadError(''); }, reason => { setLoadError(reason.message); setLoading(false); }, true);
  }, [retry]);
  const selected = items.find(item => item.id === selectedId);
  const duplicate = assignments.some(item => item.activityId === selectedId && item.status !== 'completed');
  const submit = async () => {
    if (!selected || duplicate || submitting.current || loadError) return;
    submitting.current = true; setBusy(true); setError('');
    try { await assignActivity(selected.id, patientUid); onAssigned(selected.name); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { submitting.current = false; setBusy(false); }
  };
  const filtered = items.filter(item => `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase()));
  return <ActivityDialog title="Assign Activity" busy={busy} onClose={onClose}>
    <Text style={s.label}>Patient: {patientName}</Text>
    <CareField label="Search active activities" value={search} onChange={setSearch} />
    {loading && <ActivityIndicator />}
    {!!loadError && <><Text accessibilityRole="alert" style={s.error}>{loadError}</Text><CareButton label="Retry" disabled={busy} onPress={() => setRetry(value => value + 1)} /></>}
    {!loading && !loadError && !filtered.length && <Text style={s.notice}>{items.length ? 'No matching activities.' : 'No active activities are available. Create or activate an activity in the Activity Library.'}</Text>}
    {!loadError && filtered.map(item => <CareButton key={item.id} label={`${item.name}${item.id === selectedId ? ' (selected)' : ''}`} secondary={item.id !== selectedId} disabled={busy} onPress={() => { setSelectedId(item.id); setError(''); }} />)}
    {selected && !loadError && <View style={s.card}><ActivityPreview activity={selected} /><Text style={s.muted}>This assignment uses the clinic-approved default target and instructions shown above.</Text></View>}
    {duplicate && <Text style={s.notice}>This patient already has an active assignment for this activity.</Text>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <View style={s.row}><CareButton label="Cancel" secondary disabled={busy} onPress={onClose} /><CareButton label={busy ? 'Assigning...' : 'Assign Activity'} disabled={busy || loading || !!loadError || !selected || duplicate} onPress={() => { void submit(); }} /></View>
  </ActivityDialog>;
}

export default function PatientActivitiesPanel({ patient }: { patient: Pick<Patient, 'uid' | 'name' | 'fullName'> }) {
  const router = useRouter();
  const { firebaseUser, userRole, loading: authLoading } = useAuth();
  const staff = ['admin', 'staff', 'midwife'].includes(userRole || '');
  const [uid, setUid] = useState('');
  const [items, setItems] = useState<ActivityAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [assigning, setAssigning] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    setUid(''); setItems([]); setLoading(true); setError(''); setAssigning(false); setSelectedId(''); setSuccess('');
    if (!staff || !firebaseUser) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    getPatientAuthUid({ uid: patient.uid }).then(patientUid => {
      if (disposed) return;
      setUid(patientUid);
      unsubscribe = subscribePatientActivities(patientUid, data => {
        setItems(data.sort((a, b) => (b.assignedAt?.getTime() || 0) - (a.assignedAt?.getTime() || 0)));
        setLoading(false); setError('');
      }, reason => { setError(reason.message); setLoading(false); setAssigning(false); });
    }).catch(reason => { if (!disposed) { setError(errorMessage(reason)); setLoading(false); } });
    return () => { disposed = true; unsubscribe?.(); };
  }, [patient.uid, staff, firebaseUser?.uid, retry]);
  if (authLoading) return <ActivityIndicator />;
  if (!staff || !firebaseUser) return <Text style={s.error}>Staff access required.</Text>;
  const selected = items.find(item => item.id === selectedId);
  return <View style={{ gap: 16 }}>
    <View style={s.row}><Text style={s.heading}>Activities</Text><CareButton label="Assign Activity" disabled={loading || !!error || !uid} onPress={() => { setSuccess(''); setAssigning(true); }} /><CareButton label="Activity Library" secondary onPress={() => router.push('/(admin)/activity-library' as Href)} /></View>
    {!!success && <Text accessibilityLiveRegion="polite" style={s.notice}>{success}</Text>}
    {loading && <ActivityIndicator />}
    {!!error && <><Text accessibilityRole="alert" style={s.error}>{error}</Text><CareButton label="Retry" onPress={() => setRetry(value => value + 1)} /></>}
    {!loading && !error && !items.length && <CareCard title="No assigned activities" subtitle="Choose Assign Activity to select a clinic-approved activity for this patient." />}
    {!error && items.map(item => <CareCard key={item.id} title={item.activity.name}>
      <Text style={s.text}>{targetLabel(item.activity)}</Text><Text style={s.muted}>{verificationLabel(item.activity.verificationType)}</Text>
      <Text style={s.muted}>Assigned: {dateLabel(item.assignedAt)}</Text>
      <Text style={s.badge}>{item.status.replace(/_/g, ' ')}{!item.activity.isActive ? ' · Paused' : ''}</Text>
      {item.status === 'completed' && <Text style={s.muted}>Completed: {dateLabel(item.completedAt)}</Text>}
      <CareButton label="View Details" secondary onPress={() => setSelectedId(item.id)} />
    </CareCard>)}
    {assigning && uid && !error && <AssignActivityDialog patientUid={uid} patientName={patient.name || patient.fullName || 'Patient'} assignments={items} onClose={() => setAssigning(false)} onAssigned={name => { setAssigning(false); setSuccess(`Activity Assigned: ${name} was assigned successfully.`); }} />}
    {selected && !error && <ActivityDialog title="Assignment Details" onClose={() => setSelectedId('')}>
      <ActivityPreview activity={selected.activity} />
      <Text style={s.badge}>{selected.status.replace(/_/g, ' ')}</Text>
      {selected.activity.verificationType === 'pose' && <Text style={s.text}>Completed: {selected.completedRepetitions} repetitions</Text>}
      <Text style={s.text}>Recorded duration: {selected.durationSeconds} seconds</Text>
      <Text style={s.muted}>Assigned: {dateLabel(selected.assignedAt)}</Text>
      <Text style={s.muted}>Started: {dateLabel(selected.startedAt)}</Text>
      <Text style={s.muted}>Completed: {selected.status === 'completed' ? dateLabel(selected.completedAt) : 'Not completed'}</Text>
    </ActivityDialog>}
  </View>;
}
