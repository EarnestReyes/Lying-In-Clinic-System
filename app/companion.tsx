import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { authService } from '../src/services/authService';
import { subscribeCompanionShares } from '../src/services/careService';
import { CompanionShare } from '../src/models/Care';
import { CareButton, CareCard, s } from '../components/care/CareUI';

export default function CompanionPortal() {
  const { firebaseUser, userRole, loading } = useAuth();
  const router = useRouter();
  const [shares, setShares] = useState<CompanionShare[]>([]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setShares([]); setReady(false);
    if (!firebaseUser || userRole !== 'companion' || Platform.OS === 'web') return;
    return subscribeCompanionShares(firebaseUser.uid, true, data => { setShares(data); setReady(true); setError(''); }, () => { setShares([]); setError('Shared details are unavailable. Reopen this screen when connected, or ask the patient to check your access.'); });
  }, [firebaseUser?.uid, userRole]);
  if (loading) return <ActivityIndicator />;
  if (!firebaseUser) return <Redirect href="/(auth)/login" />;
  if (userRole !== 'companion' || Platform.OS === 'web') return <View style={s.content}><Text style={s.heading}>Use a companion account in the mobile app.</Text><CareButton label="Sign in" onPress={() => router.replace('/(auth)/login')} /></View>;
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.hero}><Text style={s.eyebrow}>COMPANION SPACE</Text><Text style={s.heroTitle}>Be part of their support.</Text><Text style={s.heroText}>Only details the patient has chosen to share appear here.</Text></View>
    <CareCard title="Your companion account ID" subtitle="Give this ID to the patient. They can select what to share from My Care → Companions."><Text selectable style={s.text}>{firebaseUser.uid}</Text></CareCard>
    {!!error && <Text style={s.error}>{error}</Text>}{!ready && !error && <ActivityIndicator />}
    {ready && !shares.length && <CareCard title="Nothing shared yet" subtitle="The patient can grant or revoke access at any time. You cannot edit their care information." />}
    {shares.map(share => <CareCard key={share.id} title={share.patientName} subtitle={`Shared copy updated ${share.updatedAt?.toDate().toLocaleString() || 'recently'}`}>
      {!!share.preparation.length && <Text style={s.heading}>Preparation</Text>}
      {share.preparation.map(item => <Text key={item.id} style={s.text}>{item.done ? '✓' : '○'} {item.label}</Text>)}
      {!!share.reminders.length && <Text style={s.heading}>Reminders</Text>}
      {share.reminders.map(item => <View key={item.id} style={s.separator}><Text style={s.label}>{item.title}</Text><Text style={s.text}>{item.date} · {item.time}</Text></View>)}
      <Text style={s.muted}>These are selected copies, not the full care record. Ask the patient to refresh them when plans change.</Text>
    </CareCard>)}
    <CareButton label="Sign out" secondary onPress={async () => { try { await authService.logout(); router.replace('/(auth)/login'); } catch { setError('Unable to sign out. Try again.'); } }} />
  </ScrollView>;
}
