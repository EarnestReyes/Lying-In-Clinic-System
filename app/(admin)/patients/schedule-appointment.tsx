import React, { useEffect, useState } from 'react';
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
import { assertAppointmentSlotAvailable, createAppointment } from '../../../src/services/appointmentService';
import { fetchPatientById } from '../../../src/services/patientService';

const APPOINTMENT_TYPES = [
  'Prenatal Checkup',
  'Ultrasound Scan',
  'Lab Test Review',
  'Postnatal Follow-up',
];

const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', 
  '11:00 AM', '01:30 PM', '02:30 PM', '03:30 PM'
];

export default function ScheduleAppointmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [selectedType, setSelectedType] = useState('Prenatal Checkup');
  const [selectedDate, setSelectedDate] = useState('Oct 2, 2026');
  const [selectedTime, setSelectedTime] = useState('09:00 AM');
  const [remarks, setRemarks] = useState('');
  const [patientName, setPatientName] = useState('');
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadPatient = async () => {
      if (typeof id !== 'string') {
        setLoadingPatient(false);
        return;
      }
      try {
        const patient = await fetchPatientById(id);
        setPatientName(patient?.name || patient?.firstName || '');
      } catch (error) {
        console.error('Unable to load patient for appointment:', error);
      } finally {
        setLoadingPatient(false);
      }
    };
    loadPatient();
  }, [id]);

  const handleSaveAppointment = async () => {
    if (typeof id !== 'string' || !patientName) {
      Alert.alert('Patient unavailable', 'This appointment must be linked to a valid patient record.');
      return;
    }
    if (!selectedDate.trim()) {
      Alert.alert('Date required', 'Enter an appointment date before scheduling.');
      return;
    }
    try {
      setSubmitting(true);
      await assertAppointmentSlotAvailable(selectedDate.trim(), selectedTime);
      await createAppointment({
        patientId: id,
        patientName,
        appointmentDate: selectedDate.trim(),
        appointmentTime: selectedTime,
        purpose: selectedType,
        notes: remarks.trim(),
        status: 'Scheduled' as any,
      });
      Alert.alert('Appointment Confirmed', `Successfully scheduled ${selectedType} for ${selectedDate} at ${selectedTime}.`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      console.error('Unable to schedule appointment:', error);
      Alert.alert('Unable to schedule', 'The appointment was not saved. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
          <Text style={styles.headerTitle}>Schedule Appointment</Text>
          <View style={{ width: 38 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loadingPatient ? <Text style={styles.patientContext}>Loading patient record…</Text> : <Text style={styles.patientContext}>{patientName ? `Scheduling for: ${patientName}` : 'Patient record unavailable'}</Text>}
        
        {/* Appointment Type Selection */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Select Appointment Type</Text>
          <View style={styles.chipContainer}>
            {APPOINTMENT_TYPES.map((type) => {
              const isSelected = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date & Time Selection */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Date & Time Slot</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Appointment Date</Text>
            <View style={styles.dateInputWrapper}>
              <Ionicons name="calendar-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.dateInput}
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="e.g. Oct 15, 2026"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <Text style={styles.label}>Available Time Slots</Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeSlot, isSelected && styles.timeSlotSelected]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextSelected]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Additional Remarks */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Clinical Instructions / Remarks</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Add any specific instructions for the patient..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={remarks}
            onChangeText={setRemarks}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={[styles.submitButton, (submitting || loadingPatient || !patientName) && styles.submitButtonDisabled]} activeOpacity={0.8} onPress={handleSaveAppointment} disabled={submitting || loadingPatient || !patientName}>
          <Text style={styles.submitButtonText}>{submitting ? 'Scheduling…' : 'Confirm and Schedule'}</Text>
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
  patientContext: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
    marginBottom: 14,
  },
  sectionCard: {
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
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 14,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipSelected: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0D9488',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextSelected: {
    color: '#0D9488',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeSlotSelected: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  timeSlotTextSelected: {
    color: '#FFFFFF',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    height: 80,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
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
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
