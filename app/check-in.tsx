import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useClinicDay } from '../src/hooks/useClinicDay';
import { Appointment } from '../src/models/Appointment';
import { subscribePatientAppointments } from '../src/services/appointmentService';
import { checkIn, subscribeQueue, subscribeQueueEntries } from '../src/services/queueService';
import { CHECK_IN_URL, canCheckIn, QueueEntry, QueueTicket, waitingQueue } from '../src/utils/queue';
import { QueueButton, QueueCard, QueueHeader, queueStyles as s } from '../components/QueueUI';

export default function CheckInScreen() {
  const { firebaseUser, userRole, loading } = useAuth();
  const router = useRouter();
  const day = useClinicDay();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    setReady(false); setAppointments([]); setEntries([]); setTickets([]); setError('');
    if (Platform.OS === 'web' || !firebaseUser || userRole !== 'patient') return;
    const fail = (reason: Error) => setError(reason.message);
    const stops = [
      subscribePatientAppointments(firebaseUser.uid, data => { setAppointments(data); setReady(true); }, fail),
      subscribeQueueEntries(day, firebaseUser.uid, setEntries, fail),
      subscribeQueue(day, setTickets, fail),
    ];
    return () => stops.forEach(stop => stop());
  }, [firebaseUser?.uid, userRole, day]);

  if (Platform.OS === 'web') return (
    <View style={s.page}>
      <QueueHeader title="Clinic Check-in" />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Check in with the patient app</Text>
        <Text style={s.text}>Patient check-in is available in the mobile app. Open the installed clinic app on your phone, or scan the clinic QR with your phone’s camera.</Text>
        <QueueButton label="Open patient app" onPress={() => { Linking.openURL(CHECK_IN_URL).catch(() => setError('Install the clinic mobile app, then try again.')); }} />
        {!!error && <Text style={s.error}>{error}</Text>}
        <QueueButton label="Staff sign in" onPress={() => router.replace('/(auth)/login')} />
      </ScrollView>
    </View>
  );

  if (loading) return <ActivityIndicator style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />;
  if (!firebaseUser) return <Redirect href={'/(auth)/login?returnTo=check-in' as any} />;
  
  if (userRole !== 'patient') return (
    <View style={s.page}>
      <QueueHeader title="Clinic Check-in" />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.heading}>Patient account required</Text>
        <Text style={s.text}>Staff manage the queue through the clinic website. Sign in with a patient account to check in on mobile.</Text>
        <QueueButton label="Sign in" onPress={() => router.replace('/(auth)/login')} />
      </ScrollView>
    </View>
  );

  const waiting = waitingQueue(tickets);
  const eligible = appointments.filter(item => canCheckIn(item, day) && !entries.some(entry => entry.id === item.id));
  
  const arrive = async (id: string) => {
    setBusy(id); setError('');
    try { await checkIn(id); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to check in. Please try again.'); }
    finally { setBusy(''); }
  };

  return (
    <View style={s.page}>
      <QueueHeader title="Clinic Check-in" />
      <ScrollView contentContainerStyle={s.content}>
        <QueueButton label="My appointments" onPress={() => router.replace('/(patient)/appointments')} />
        <Text style={s.title}>Clinic check-in</Text>
        <Text style={s.text}>Check in when you arrive at the clinic. Your queue status updates here automatically.</Text>
        <Text style={s.text}>{day} · Philippine time</Text>
        
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        {!ready && !error && <ActivityIndicator />}
        
        {entries.map(entry => {
          const index = waiting.findIndex(ticket => ticket.id === entry.id);
          return (
            <QueueCard key={entry.id}>
              <Text style={s.heading}>{entry.purpose}</Text>
              <Text style={s.badge}>{entry.status}</Text>
              <Text style={s.text}>Appointment: {entry.appointmentTime}</Text>
              <Text style={s.text}>Arrival: {entry.checkedInAt?.toDate().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }) || 'Confirming…'}</Text>
              {entry.status === 'Waiting' && <Text style={s.heading}>{error ? 'Queue position unavailable' : index >= 0 ? `Position ${index + 1} · ${index} waiting ahead` : 'Updating position…'}</Text>}
              {entry.status === 'In Consultation' && <Text style={s.text}>Please follow the clinic staff’s instructions.</Text>}
              {entry.status === 'No-show' && <Text style={s.text}>Please speak to reception if you are at the clinic.</Text>}
            </QueueCard>
          );
        })}

        {eligible.map(item => (
          <QueueCard key={item.id}>
            <Text style={s.heading}>{item.purpose || item.service || 'Consultation'}</Text>
            <Text style={s.text}>{item.appointmentTime || item.time} · {item.status}</Text>
            <QueueButton label={busy === item.id ? 'Checking in…' : 'Check In'} disabled={!!busy} onPress={() => arrive(item.id)} />
          </QueueCard>
        ))}

        {ready && !error && !eligible.length && !entries.length && (
          <QueueCard>
            <Text style={s.heading}>No confirmed appointment today</Text>
            <Text style={s.text}>Pending requests need clinic confirmation before check-in. Ask reception for help with a walk-in visit.</Text>
          </QueueCard>
        )}

        <View>
          <Text style={s.text}>Queue position follows arrival order. It is an estimate of who is next, not a medical priority decision.</Text>
          <Text style={s.text}>You can also open this screen by scanning the clinic QR code with your phone’s camera.</Text>
        </View>
      </ScrollView>
    </View>
  );
}