import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { CatalogActivity } from '../../src/models/Activity';
import { setActivityActive, subscribeActivityLibrary } from '../../src/services/activityService';
import { Colors } from '../../src/theme/colors';
import { CareButton, CareCard, CareField, s } from '../../components/care/CareUI';
import ActivityEditor from '../../components/activities/ActivityEditor';
import { ActivityDialog, errorMessage, targetLabel, verificationLabel } from '../../components/activities/StaffActivityUI';

export default function ActivityLibrary() {
  const { firebaseUser, userRole, loading } = useAuth();
  const router = useRouter();
  const staff = ['admin', 'staff', 'midwife'].includes(userRole || '');
  const [items, setItems] = useState<CatalogActivity[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [editor, setEditor] = useState<CatalogActivity | 'new' | null>(null);
  const [confirmation, setConfirmation] = useState<CatalogActivity | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const submitting = useRef(false);
  useEffect(() => {
    setItems([]); setReady(false); setError('');
    if (!staff || !firebaseUser) return;
    return subscribeActivityLibrary(data => { setItems(data); setReady(true); setError(''); }, reason => { setError(reason.message); setReady(true); });
  }, [staff, firebaseUser?.uid, retry]);
  const toggle = async () => {
    if (!confirmation || submitting.current) return;
    submitting.current = true; setBusy(true); setActionError('');
    try { await setActivityActive(confirmation.id, !confirmation.isActive); setSuccess(`${confirmation.name} is now ${confirmation.isActive ? 'inactive' : 'active'}.`); setConfirmation(null); }
    catch (reason) { setActionError(errorMessage(reason)); }
    finally { submitting.current = false; setBusy(false); }
  };
  if (loading) return <ActivityIndicator />;
  if (!firebaseUser) return <Redirect href="/(auth)/login" />;
  if (!staff) return <View style={s.content}><Text style={s.error}>Staff access required.</Text></View>;
  const filtered = items.filter(item => `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All' || item.isActive === (filter === 'Active')));
  return <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.row}><Ionicons name="body-outline" size={26} color={Colors.primary} /><Text style={s.heading}>Activity Library</Text></View>
      <Text style={s.muted}>Manage clinic-approved activities and their default instructions and targets.</Text>
      <View style={s.row}><CareButton label="Patients" secondary onPress={() => router.push('/(admin)/patients')} /><CareButton label="Create Activity" disabled={!ready || !!error} onPress={() => { setSuccess(''); setEditor('new'); }} /></View>
      {!!success && <Text accessibilityLiveRegion="polite" style={s.notice}>{success}</Text>}
      <CareField label="Search activities" value={search} onChange={setSearch} placeholder="Name or description" />
      <View style={s.row}>{['All', 'Active', 'Inactive'].map(value => <CareButton key={value} label={value} secondary={value !== filter} onPress={() => setFilter(value)} />)}</View>
      {!ready && <ActivityIndicator color={Colors.primary} />}
      {!!error && <><Text accessibilityRole="alert" style={s.error}>{error}</Text><CareButton label="Retry" onPress={() => setRetry(value => value + 1)} /></>}
      {ready && !error && !filtered.length && <CareCard title={items.length ? 'No matching activities' : 'No activities yet'} subtitle="Create an activity or adjust your search." />}
      {!error && filtered.map(item => <CareCard key={item.id} title={item.name} subtitle={item.description}>
        {!!item.configurationError && <Text style={s.error}>{item.configurationError}</Text>}
        <Text style={s.muted}>{verificationLabel(item.verificationType)}</Text><Text style={s.text}>Default: {targetLabel(item)}</Text>
        <Text style={s.badge}>{item.isActive ? 'Active' : 'Inactive'}</Text>
        <View style={s.row}><CareButton label="Edit" secondary onPress={() => { setSuccess(''); setEditor(item); }} /><CareButton label={item.isActive ? 'Make Inactive' : 'Make Active'} secondary disabled={!item.isActive && !!item.configurationError} onPress={() => { setActionError(''); setConfirmation(item); }} /></View>
      </CareCard>)}
    </ScrollView>
    {editor && <ActivityEditor activity={editor === 'new' ? undefined : editor} catalog={items} onClose={() => setEditor(null)} onSaved={name => { setEditor(null); setSuccess(`${name} was saved successfully.`); }} />}
    {confirmation && <ActivityDialog title={confirmation.isActive ? 'Make Activity Inactive?' : 'Make Activity Active?'} busy={busy} onClose={() => setConfirmation(null)}>
      <Text style={s.text}>{confirmation.name}</Text><Text style={s.muted}>{confirmation.isActive ? 'This activity will no longer be available for new assignments. Existing patient assignments and completion history remain available.' : 'This activity will be available for staff to assign to patients.'}</Text>
      {!!actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}
      <CareButton label={busy ? 'Saving...' : 'Confirm'} disabled={busy} onPress={() => { void toggle(); }} />
    </ActivityDialog>}
  </SafeAreaView>;
}
