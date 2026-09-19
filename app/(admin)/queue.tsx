import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { Redirect, useRouter } from 'expo-router';
import { toQR } from 'toqr';
import { useAuth } from '../../src/hooks/useAuth';
import { useClinicDay } from '../../src/hooks/useClinicDay';
import { changeQueueStatus, subscribeQueueEntries } from '../../src/services/queueService';
import { QueueEntry, QueueStatus, waitingQueue } from '../../src/utils/queue';
import { clinicCheckInLink } from '../../src/utils/checkInLink';
import { QueueButton, QueueCard, queueStyles as s } from '../../components/QueueUI';
import { CLINIC } from '../../src/config/clinic';

export default function LiveQueue() {
  const { firebaseUser, userRole, loading } = useAuth();
  const router = useRouter();
  const day = useClinicDay();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState<QueueStatus | 'All'>('All');
  const [showQR, setShowQR] = useState(false);
  const [qrMode, setQrMode] = useState<'installed' | 'expo'>(__DEV__ ? 'expo' : 'installed');
  const [projectUrl, setProjectUrl] = useState(() => process.env.EXPO_PUBLIC_EXPO_GO_URL ||
    (__DEV__ && Constants.expoConfig?.hostUri ? `exp://${Constants.expoConfig.hostUri}` : ''));
  const qrResult = useMemo(() => {
    try {
      const link = clinicCheckInLink(qrMode, projectUrl);
      return { link, matrix: toQR(link), error: '' };
    } catch (reason) {
      return { link: '', matrix: new Uint8Array(), error: reason instanceof Error ? reason.message : 'Unable to generate this QR code.' };
    }
  }, [qrMode, projectUrl]);
  const qr = qrResult.matrix;
  const size = Math.sqrt(qr.length);
  const staff = ['admin', 'staff', 'midwife'].includes(userRole || '');
  useEffect(() => {
    setReady(false); setError(''); setEntries([]);
    if (Platform.OS !== 'web' || !firebaseUser || !staff) return;
    return subscribeQueueEntries(day, null, data => { setEntries(data); setReady(true); }, reason => setError(reason.message));
  }, [firebaseUser?.uid, staff, day]);
  if (Platform.OS !== 'web') return <ScrollView style={s.page} contentContainerStyle={s.content}><Text style={s.title}>Staff web portal</Text><Text style={s.text}>Open the clinic website to manage the live queue. Patients can check in using the mobile app.</Text><QueueButton label="Patient check-in" onPress={() => router.replace('/check-in')} /></ScrollView>;
  if (loading) return <ActivityIndicator />;
  if (!firebaseUser) return <Redirect href="/(auth)/login" />;
  if (!staff) return <Redirect href="/check-in" />;
  const waiting = waitingQueue(entries);
  const sorted = [...entries].sort((a, b) => (a.checkedInAt?.toMillis() || 0) - (b.checkedInAt?.toMillis() || 0) || a.id.localeCompare(b.id));
  const change = async (id: string, status: QueueStatus) => {
    setBusy(id); setError('');
    try { await changeQueueStatus(id, status); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update queue.'); }
    finally { setBusy(''); }
  };
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.row}><QueueButton label="Dashboard" onPress={() => router.replace('/(admin)/dashboard')} /><QueueButton label={showQR ? 'Hide clinic QR' : 'Show clinic QR'} onPress={() => setShowQR(!showQR)} /></View>
    <Text style={s.title}>Live clinic queue</Text>
    <Text style={s.text}>{day} · Philippine time · Updates automatically</Text>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {showQR && <QueueCard>
      <Text style={s.heading}>{CLINIC.name} · Check in here</Text>
      <View style={s.row}>
        <QueueButton label={`${qrMode === 'expo' ? '✓ ' : ''}Expo Go`} onPress={() => setQrMode('expo')} />
        <QueueButton label={`${qrMode === 'installed' ? '✓ ' : ''}Installed clinic app`} onPress={() => setQrMode('installed')} />
      </View>
      {qrMode === 'expo' && <>
        <Text style={s.text}>Expo project URL</Text>
        <TextInput accessibilityLabel="Expo project URL" value={projectUrl} onChangeText={setProjectUrl}
          autoCapitalize="none" autoCorrect={false} placeholder="exp://192.168.1.10:8081"
          style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 16 }} />
        <Text style={s.text}>Paste the URL beside “Metro waiting on” in the terminal running Expo. Keep Expo running and connect the phone and computer to the same Wi-Fi, or use an Expo tunnel.</Text>
      </>}
      {!!qrResult.error && <Text accessibilityRole="alert" style={s.error}>{qrResult.error}</Text>}
      {!!qr.length && <>
      <View accessibilityLabel="Clinic check-in QR code" style={{ backgroundColor: '#fff', padding: 24, alignSelf: 'flex-start' }}>
        {Array.from({ length: size }, (_, row) => <View key={row} style={{ flexDirection: 'row' }}>{Array.from({ length: size }, (_, col) => <View key={col} style={{ width: 6, height: 6, backgroundColor: qr[row * size + col] ? '#000' : '#fff' }} />)}</View>)}
      </View>
      <Text style={s.text}>{qrMode === 'expo'
        ? 'Android: open Expo Go and choose Scan QR code. iPhone: scan with the Camera app and open in Expo Go. Then sign in and confirm your appointment.'
        : 'Scan using your phone’s camera. The standalone clinic app must be installed. Sign in and confirm your appointment to check in.'}</Text>
      <Text selectable style={s.text}>{qrResult.link}</Text>
      </>}
    </QueueCard>}
    <QueueCard>
      <Text style={s.heading}>{waiting.length} waiting · {entries.filter(entry => entry.status === 'In Consultation').length} in consultation</Text>
      <Text style={s.badge}>{error ? 'Live queue unavailable' : !ready ? 'Connecting…' : waiting[0] ? `Estimated next: ${waiting[0].patientName}` : 'No patient waiting'}</Text>
      <Text style={s.text}>Based on check-in order only. Clinical priority remains a staff decision.</Text>
    </QueueCard>
    <View style={s.row}>{(['All', 'Waiting', 'In Consultation', 'Completed', 'No-show'] as const).map(status => <QueueButton key={status} label={`${filter === status ? '✓ ' : ''}${status}`} onPress={() => setFilter(status)} />)}</View>
    {!ready && !error && <ActivityIndicator />}
    {sorted.filter(entry => filter === 'All' || entry.status === filter).map(entry => <QueueCard key={entry.id}>
      <View style={s.row}><Text style={s.heading}>{entry.patientName}</Text><Text style={s.badge}>{entry.status}</Text></View>
      <Text style={s.text}>{entry.purpose} · Appointment {entry.appointmentTime}</Text>
      <Text style={s.text}>Arrival: {entry.checkedInAt?.toDate().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }) || 'Confirming…'}{entry.status === 'Waiting' ? ` · Position ${waiting.findIndex(item => item.id === entry.id) + 1}` : ''}</Text>
      <View style={s.row}>
        {entry.status === 'Waiting' && <><QueueButton label="Start consultation" disabled={!!busy} onPress={() => change(entry.id, 'In Consultation')} /><QueueButton label="Mark no-show" disabled={!!busy} onPress={() => change(entry.id, 'No-show')} /></>}
        {entry.status === 'In Consultation' && <QueueButton label="Complete consultation" disabled={!!busy} onPress={() => change(entry.id, 'Completed')} />}
        {busy === entry.id && <ActivityIndicator />}
      </View>
    </QueueCard>)}
    {ready && !error && !entries.some(entry => filter === 'All' || entry.status === filter) && <Text style={s.text}>No patients in this queue view.</Text>}
  </ScrollView>;
}
