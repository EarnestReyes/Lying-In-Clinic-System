import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { subscribePatients } from '../src/services/patientService';

type PatientResult = { id: string; name: string; contactNumber?: string };

export function PatientRecordSearch({ onQueryChange }: { onQueryChange?: (query: string) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);

  useEffect(() => subscribePatients((items) => {
    setPatients(items.map((item) => ({ id: item.id, name: item.name || item.firstName || 'Unnamed patient', contactNumber: item.contactNumber })));
    setLoading(false);
  }, () => setLoading(false)), []);

  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? patients.filter((patient) => patient.name.toLowerCase().includes(value)).slice(0, 6) : [];
  }, [patients, query]);

  const updateQuery = (value: string) => { setQuery(value); onQueryChange?.(value); };
  return <View style={styles.wrapper}>
    <View style={styles.inputBox}>
      <Ionicons name="search" size={16} color={Colors.textFaint} />
      <TextInput value={query} onChangeText={updateQuery} onFocus={() => setFocused(true)} placeholder="Search patient name..." placeholderTextColor={Colors.textFaint} style={styles.input} />
      {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
    </View>
    {focused && query.trim() ? <View style={styles.results}>
      {results.length ? results.map((patient) => <TouchableOpacity key={patient.id} style={styles.result} onPress={() => { setFocused(false); router.push(`/(admin)/patients/${patient.id}` as any); }}><View style={styles.avatar}><Text style={styles.avatarText}>{patient.name.charAt(0)}</Text></View><View><Text style={styles.name}>{patient.name}</Text><Text style={styles.phone}>{patient.contactNumber || 'No phone number'}</Text></View></TouchableOpacity>) : <Text style={styles.empty}>No patient found.</Text>}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { width: 300, position: 'relative', zIndex: 200, elevation: 200 },
  inputBox: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: Colors.surfaceMuted, borderRadius: 10 },
  input: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  results: { position: 'absolute', zIndex: 201, elevation: 201, top: 44, left: 0, right: 0, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', shadowColor: Colors.textPrimary, shadowOpacity: 0.14, shadowRadius: 8 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight },
  avatarText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  name: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  phone: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  empty: { padding: 12, fontSize: 12, color: Colors.textMuted },
});
