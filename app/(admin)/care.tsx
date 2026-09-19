import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { subscribePatients } from '../../src/services/patientService';
import { Patient } from '../../src/models/Patient';
import { CareWorkspace } from '../../components/care/CareWorkspace';
import { CareButton, CareCard, CareField, s } from '../../components/care/CareUI';

export default function StaffCare() {
  const { firebaseUser, userRole, loading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient>();
  const [search, setSearch] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const staff = ['staff', 'midwife', 'admin'].includes(userRole || '');
  useEffect(() => {
    if (!staff || !firebaseUser || Platform.OS !== 'web') return;
    return subscribePatients(data => { setPatients(data); setReady(true); }, reason => setError(reason.message));
  }, [staff, firebaseUser?.uid]);
  if (loading) return <ActivityIndicator />;
  if (!firebaseUser) return <Redirect href="/(auth)/login" />;
  if (!staff || Platform.OS !== 'web') return <View style={s.content}><Text style={s.heading}>Staff care management is available on the clinic website.</Text></View>;
  if (selected) return <View style={s.page}><View style={{ padding: 16 }}><CareButton secondary label="← Choose another patient" onPress={() => setSelected(undefined)} /></View><CareWorkspace key={selected.uid || selected.id} patientId={selected.uid || selected.id} patientName={selected.name || selected.fullName || 'Patient'} staff /></View>;
  const filtered = patients.filter(patient => `${patient.name || ''} ${patient.fullName || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.hero}><Text style={s.eyebrow}>PATIENT CARE</Text><Text style={s.heroTitle}>Support beyond the appointment.</Text><Text style={s.heroText}>Choose a patient to review their readiness passport, questions and visit recaps.</Text></View>
    <CareField label="Find a patient" value={search} onChange={setSearch} placeholder="Search by name" />
    {!!error && <Text style={s.error}>{error}</Text>}{!ready && !error && <ActivityIndicator />}
    {ready && !filtered.length && <CareCard title="No matching patients" subtitle="Try another name or register the patient first." />}
    {filtered.map(patient => <CareCard key={patient.id} title={patient.name || patient.fullName || 'Patient'}><CareButton label="Open care space" onPress={() => setSelected(patient)} /></CareCard>)}
  </ScrollView>;
}
