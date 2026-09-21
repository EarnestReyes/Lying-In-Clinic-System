import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { subscribePatients } from '../../src/services/patientService';
import { Patient } from '../../src/models/Patient';
import { CareWorkspace } from '../../components/care/CareWorkspace';
import { StaffDocumentsPanel } from '../../components/care/StaffDocumentsPanel';
import { CareButton, CareCard, CareField, s } from '../../components/care/CareUI';

type StaffCareSection = 'Documents' | 'Patient Care';

export default function StaffCare() {
  const { firebaseUser, userRole, loading } = useAuth();
  const [section, setSection] = useState<StaffCareSection>('Documents');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient>();
  const [search, setSearch] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const compactCards = width < 760;
  const staff = ['staff', 'midwife', 'admin'].includes(userRole || '');

  useEffect(() => {
    if (!staff || !firebaseUser || Platform.OS !== 'web' || section !== 'Patient Care') return;
    return subscribePatients(data => { setPatients(data); setReady(true); }, reason => setError(reason.message));
  }, [staff, firebaseUser?.uid, section]);

  if (loading) return <ActivityIndicator />;
  if (!firebaseUser) return <Redirect href="/(auth)/login" />;
  if (!staff || Platform.OS !== 'web') return <View style={s.content}><Text style={s.heading}>Staff care management is available on the clinic website.</Text></View>;
  if (selected) return <View style={s.page}><View style={{ padding: 16 }}><CareButton secondary label="Choose another patient" onPress={() => setSelected(undefined)} /></View><CareWorkspace key={selected.uid || selected.id} patientId={selected.uid || selected.id} patientName={selected.name || selected.fullName || 'Patient'} staff /></View>;

  const filtered = patients.filter(patient => `${patient.name || ''} ${patient.fullName || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.hero}>
      <Text style={s.eyebrow}>PATIENT CARE</Text>
      <Text style={s.heroTitle}>{section === 'Documents' ? 'Document Review' : 'Support beyond the appointment.'}</Text>
      <Text style={s.heroText}>{section === 'Documents' ? 'Review supporting documents submitted by patients.' : 'Choose a patient to review preparation, questions and visit recaps.'}</Text>
    </View>
    <View style={s.row}>
      {(['Documents', 'Patient Care'] as StaffCareSection[]).map(item => <CareButton key={item} label={item} secondary={section !== item} onPress={() => { setSection(item); setSelected(undefined); setError(''); }} />)}
    </View>
    {section === 'Documents' ? <StaffDocumentsPanel /> : <>
      <CareField label="Find a patient" value={search} onChange={setSearch} placeholder="Search by name" />
      {!!error && <Text style={s.error}>{error}</Text>}{!ready && !error && <ActivityIndicator />}
      {ready && !filtered.length && <CareCard title="No matching patients" subtitle="Try another name or register the patient first." />}
      {filtered.map(patient => {
        const name = patient.name || patient.fullName || 'Patient';
        const details = [patient.contactNumber, patient.pregnancyWeek ? `${patient.pregnancyWeek} weeks` : '', patient.status].filter(Boolean).join(' · ');
        return <View key={patient.id} style={[s.card, styles.patientCard, compactCards && styles.patientCardCompact]}>
          {patient.profileImage
            ? <Image source={{ uri: patient.profileImage }} style={styles.avatarImage} />
            : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>}
          <View style={styles.patientInfo}>
            <Text style={s.heading}>{name}</Text>
            <Text style={s.muted}>{details || 'Patient care record'}</Text>
          </View>
          <View style={[styles.patientAction, compactCards && styles.patientActionCompact]}>
            <CareButton label="Open care space" onPress={() => setSelected(patient)} />
          </View>
        </View>;
      })}
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  patientCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  patientCardCompact: { flexWrap: 'wrap', alignItems: 'flex-start' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CCFBF1' },
  avatarText: { color: '#0D9488', fontSize: 18, fontWeight: '800' },
  patientInfo: { flex: 1, minWidth: 180, gap: 4 },
  patientAction: { marginLeft: 'auto', alignSelf: 'center' },
  patientActionCompact: { flexBasis: '100%', paddingLeft: 64, marginLeft: 0, alignSelf: 'flex-start' },
});
