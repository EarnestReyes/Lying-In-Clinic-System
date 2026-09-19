import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MapView, { LatLng, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { CLINIC } from '../../src/config/clinic';
import { Colors } from '../../src/theme/colors';
import { ClinicLocation } from '../../src/models/ClinicLocation';
import { subscribeClinicLocation } from '../../src/services/clinicLocationService';

const region = {
  ...CLINIC.coordinates,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

export default function ClinicMapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const [patientLocation, setPatientLocation] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LatLng[]>([]);
  const [routeSummary, setRouteSummary] = useState<string | null>(null);
  const [guiding, setGuiding] = useState(false);
  const [guidanceError, setGuidanceError] = useState<string | null>(null);
  const [clinic, setClinic] = useState<ClinicLocation>(CLINIC);

  useEffect(() => () => watchRef.current?.remove(), []);
  useEffect(() => subscribeClinicLocation(setClinic, (error) => console.error('Unable to sync clinic location:', error)), []);

  useEffect(() => {
    mapRef.current?.animateToRegion({ ...clinic.coordinates, latitudeDelta: 0.018, longitudeDelta: 0.018 }, 450);
  }, [clinic]);

  const updateRoute = async (origin: LatLng) => {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${clinic.coordinates.longitude},${clinic.coordinates.latitude}?overview=full&geometries=geojson`);
    const data = await response.json();
    const selectedRoute = data.routes?.[0];
    if (!selectedRoute?.geometry?.coordinates) throw new Error('Route unavailable');
    const coordinates = selectedRoute.geometry.coordinates.map(([longitude, latitude]: [number, number]) => ({ latitude, longitude }));
    setRoute(coordinates);
    setRouteSummary(`${(selectedRoute.distance / 1000).toFixed(1)} km · ${Math.max(1, Math.round(selectedRoute.duration / 60))} min by road`);
    mapRef.current?.fitToCoordinates([origin, ...coordinates, clinic.coordinates], { edgePadding: { top: 90, right: 50, bottom: 210, left: 50 }, animated: true });
  };

  const startGuidance = async () => {
    setGuidanceError(null);
    setGuiding(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission is needed to show your route.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const origin = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setPatientLocation(origin);
      await updateRoute(origin);
      watchRef.current?.remove();
      watchRef.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 15000 }, (nextPosition) => {
        setPatientLocation({ latitude: nextPosition.coords.latitude, longitude: nextPosition.coords.longitude });
      });
    } catch (error) {
      setGuidanceError(error instanceof Error ? error.message : 'Unable to start location guidance.');
    } finally {
      setGuiding(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View><Text style={styles.eyebrow}>YOUR CLINIC</Text><Text style={styles.title}>Clinic Location</Text></View>
      </View>

      <MapView ref={mapRef} style={styles.map} initialRegion={region} showsUserLocation={Boolean(patientLocation)}>
        <Marker coordinate={clinic.coordinates} title={clinic.name} description={clinic.address} pinColor={Colors.primary} />
        {patientLocation ? <Marker coordinate={patientLocation} title="Your location"><View style={styles.userLocationDot} /></Marker> : null}
        {route.length ? <Polyline coordinates={route} strokeColor={Colors.infoStrong} strokeWidth={5} /> : null}
      </MapView>

      <View style={styles.locationCard}>
        <View style={styles.locationIcon}><Ionicons name="medical" size={19} color={Colors.primary} /></View>
        <View style={styles.locationText}><Text style={styles.clinicName}>{clinic.name}</Text><Text style={styles.address}>{routeSummary || clinic.address}</Text></View>
        <TouchableOpacity style={styles.guidanceButton} onPress={startGuidance} disabled={guiding}>
          {guiding ? <ActivityIndicator size="small" color={Colors.surface} /> : <><Ionicons name="navigate" size={15} color={Colors.surface} /><Text style={styles.guidanceText}>{routeSummary ? 'Refresh' : 'Start route'}</Text></>}
        </TouchableOpacity>
      </View>
      {guidanceError ? <Text style={styles.error}>{guidanceError}</Text> : <Text style={styles.note}>Start route to use your location and view an in-app road route to this clinic. Your location is not saved.</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.pageBackground },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surfaceMuted, justifyContent: 'center', alignItems: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 1, fontWeight: '800', color: Colors.primary },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 1 },
  map: { flex: 1 },
  locationCard: { position: 'absolute', left: 18, right: 18, bottom: 55, flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.overlay, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  locationIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight, marginRight: 12 },
  locationText: { flex: 1 },
  clinicName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  address: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  guidanceButton: { backgroundColor: Colors.primary, paddingHorizontal: 11, height: 36, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  guidanceText: { color: Colors.surface, fontWeight: '800', fontSize: 11 },
  userLocationDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.infoStrong, borderWidth: 3, borderColor: Colors.surface },
  note: { position: 'absolute', left: 24, right: 24, bottom: 15, color: Colors.textMuted, textAlign: 'center', fontSize: 10, lineHeight: 14 },
  error: { position: 'absolute', left: 24, right: 24, bottom: 15, color: Colors.danger, textAlign: 'center', fontSize: 10, lineHeight: 14 },
});
