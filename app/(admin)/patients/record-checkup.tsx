import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function RecordCheckupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [weight, setWeight] = useState('');
  const [fhr, setFhr] = useState('');
  const [gestationWeeks, setGestationWeeks] = useState('');
  const [notes, setNotes] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const handleRunAiAnalysis = () => {
    // Simple rule-based mock AI evaluation for demo
    const sysNum = parseInt(systolic, 10);
    const diasNum = parseInt(diastolic, 10);

    if (!systolic || !diastolic) {
      Alert.alert('Incomplete Data', 'Please enter blood pressure values to run AI analysis.');
      return;
    }

    if (sysNum >= 140 || diasNum >= 90) {
      setAiAnalysis('⚠️ High Risk Flag: Elevated BP detected (≥140/90 mmHg). Suggests potential gestational hypertension or pre-eclampsia risk. Recommend immediate physician review.');
    } else if (sysNum >= 130 || diasNum >= 85) {
      setAiAnalysis('⚡ Moderate Risk Flag: Borderline upward BP trend. Monitor closely and schedule follow-up within 1 week.');
    } else {
      setAiAnalysis('✓ Normal Range: Vital signs are within healthy clinical parameters for the current gestational age.');
    }
  };

  const handleSaveCheckup = () => {
    Alert.alert('Success', 'New prenatal checkup record saved and synced with patient profile!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D9488" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Record Prenatal Checkup</Text>
          <View style={{ width: 38 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Form Section */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeading}>Patient Vitals & Measurements</Text>

          {/* Blood Pressure */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Blood Pressure (mmHg)</Text>
            <View style={styles.bpRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Systolic (e.g. 120)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={systolic}
                onChangeText={setSystolic}
              />
              <Text style={styles.bpSeparator}>/</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Diastolic (e.g. 80)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={diastolic}
                onChangeText={setDiastolic}
              />
            </View>
          </View>

          {/* Weight & FHR Row */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 64.5"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Fetal Heart Rate (bpm)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 140"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={fhr}
                onChangeText={setFhr}
              />
            </View>
          </View>

          {/* Gestational Weeks */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Gestational Age (Weeks)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 32"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={gestationWeeks}
              onChangeText={setGestationWeeks}
            />
          </View>

          {/* Clinical Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Midwife Clinical Observations</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter observations, symptoms, or recommendations..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* AI Assistant Action */}
          <TouchableOpacity style={styles.aiButton} activeOpacity={0.8} onPress={handleRunAiAnalysis}>
            <Ionicons name="sparkles" size={18} color="#0D9488" style={{ marginRight: 8 }} />
            <Text style={styles.aiButtonText}>Run AI Clinical Risk Assessment</Text>
          </TouchableOpacity>

          {/* AI Analysis Result Display */}
          {aiAnalysis && (
            <View style={styles.aiResultBox}>
              <Text style={styles.aiResultTitle}>AI Diagnostic Assistant Insight:</Text>
              <Text style={styles.aiResultText}>{aiAnalysis}</Text>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} activeOpacity={0.8} onPress={handleSaveCheckup}>
          <Text style={styles.submitButtonText}>Save Checkup Record</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#0F172A',
  },
  bpRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bpSeparator: {
    marginHorizontal: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    height: 46,
    marginTop: 8,
    marginBottom: 16,
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
  },
  aiResultBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  aiResultTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
    marginBottom: 4,
  },
  aiResultText: {
    fontSize: 13,
    color: '#134E4A',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#0D9488',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});