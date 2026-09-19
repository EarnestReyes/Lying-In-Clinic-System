import React from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { CareWorkspace } from '../../components/care/CareWorkspace';
import { s } from '../../components/care/CareUI';

export default function MyCare() {
  const { firebaseUser, userRole, userName, loading } = useAuth();
  if (loading) return <ActivityIndicator />;
  if (!firebaseUser) return <Redirect href="/(auth)/login" />;
  if (Platform.OS === 'web' || userRole !== 'patient') return <View style={s.content}><Text style={s.heading}>Open My Care in the patient mobile app.</Text></View>;
  return <CareWorkspace key={firebaseUser.uid} patientId={firebaseUser.uid} patientName={userName || 'Patient'} />;
}
