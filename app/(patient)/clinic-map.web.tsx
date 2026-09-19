import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CLINIC } from '../../src/config/clinic';
import { Colors } from '../../src/theme/colors';
import { ClinicLocation } from '../../src/models/ClinicLocation';
import { subscribeClinicLocation } from '../../src/services/clinicLocationService';

export default function ClinicMapWebScreen() {
  const router = useRouter();
  const [clinic, setClinic] = useState<ClinicLocation>(CLINIC);
  const [locating, setLocating] = useState(false);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeClinicLocation(setClinic, (syncError) => console.error('Unable to sync clinic location:', syncError)), []);

  const mapUrl = useMemo(() => {
    const { latitude, longitude } = clinic.coordinates;
    const delta = 0.012;
    const bounds = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bounds)}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  }, [clinic]);

  const startGuidance = () => {
    if (!navigator.geolocation) {
      setError('Location tracking is not supported by this browser.');
      return;
    }
    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${clinic.coordinates.longitude},${clinic.coordinates.latitude}?overview=false`);
        const data = await response.json();
        const route = data.routes?.[0];
        if (!route) throw new Error('Route unavailable');
        setGuidance(`${(route.distance / 1000).toFixed(1)} km · about ${Math.max(1, Math.round(route.duration / 60))} min by road`);
      } catch {
        setError('Unable to calculate a road route right now. Please try again.');
      } finally {
        setLocating(false);
      }
    }, () => {
      setLocating(false);
      setError('Allow location access in your browser to calculate the route.');
    }, { enableHighAccuracy: true, timeout: 12000 });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={20} color={Colors.textPrimary} /></TouchableOpacity>
        <View><Text style={styles.eyebrow}>YOUR CLINIC</Text><Text style={styles.title}>Clinic Location</Text></View>
      </View>
      {React.createElement('iframe' as any, { src: mapUrl, title: `${clinic.name} map`, style: styles.mapFrame as any, loading: 'lazy' })}
      <View style={styles.locationCard}>
        <View style={styles.locationIcon}><Ionicons name="medical" size={19} color={Colors.primary} /></View>
        <View style={styles.locationText}><Text style={styles.clinicName}>{clinic.name}</Text><Text style={styles.address}>{guidance || clinic.address}</Text></View>
        <TouchableOpacity style={styles.guidanceButton} onPress={startGuidance} disabled={locating}>{locating ? <ActivityIndicator size="small" color={Colors.surface} /> : <><Ionicons name="navigate" size={15} color={Colors.surface} /><Text style={styles.guidanceText}>{guidance ? 'Refresh' : 'Start route'}</Text></>}</TouchableOpacity>
      </View>
      <Text style={error ? styles.error : styles.note}>{error || 'This map is displayed inside the patient website and is pinned to this clinic.'}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.pageBackground },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surfaceMuted, justifyContent: 'center', alignItems: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 1, fontWeight: '800', color: Colors.primary },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 1 },
  mapFrame: { flex: 1, width: '100%', borderWidth: 0, borderStyle: 'solid' },
  locationCard: { position: 'absolute', left: 18, right: 18, bottom: 55, flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.overlay, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  locationIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight, marginRight: 12 },
  locationText: { flex: 1 },
  clinicName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  address: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  guidanceButton: { backgroundColor: Colors.primary, paddingHorizontal: 11, height: 36, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  guidanceText: { color: Colors.surface, fontWeight: '800', fontSize: 11 },
  note: { position: 'absolute', left: 24, right: 24, bottom: 15, color: Colors.textMuted, textAlign: 'center', fontSize: 10, lineHeight: 14 },
  error: { position: 'absolute', left: 24, right: 24, bottom: 15, color: Colors.danger, textAlign: 'center', fontSize: 10, lineHeight: 14 },
});

