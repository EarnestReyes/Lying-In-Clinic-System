import { SafeAreaView } from 'react-native-safe-area-context';
import { Appointment } from '../../src/models/Appointment';
import { AppointmentDetails } from '../../components/AppointmentDetails';
import { appointmentMillis } from '../../src/utils/patientAppointments';
import { useAuth } from '../../src/hooks/useAuth';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '../../src/config/firebase';
import { createAppointment, subscribePatientAppointments } from '../../src/services/appointmentService';
import { QueueButton } from '../../components/QueueUI';

export default function PatientAppointmentsScreen() {
  const router = useRouter();
  const { userName } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // New appointment form state
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bookingLock = useRef(false);

  const patientUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!patientUid) { setLoading(false); return; }
    setLoading(true);
    return subscribePatientAppointments(patientUid, (records) => { setAppointments(records.sort((a,b) => (appointmentMillis(a) || 0) - (appointmentMillis(b) || 0))); setError(''); setLoading(false); }, (error) => { setError('Unable to load appointments. Please retry.'); setLoading(false); });
  }, [patientUid, retry]);

  // Handle booking a new appointment request
  const handleBookAppointment = async () => {
    if (bookingLock.current) return;
    if (!patientUid || !preferredDate || !preferredTime) {
      Alert.alert("Missing Fields", "Please provide both a preferred date and time.");
      return;
    }

    if (!(appointmentMillis({ appointmentDate: preferredDate, appointmentTime: preferredTime }) > Date.now())) {
      Alert.alert('Invalid date or time', 'Enter a future date (YYYY-MM-DD) and time (10:00 AM).');
      return;
    }
    bookingLock.current = true;
    try {
      setSubmitting(true);
      await createAppointment({
        patientUid,
        patientId: patientUid,
        patientName: userName || 'Patient',
        appointmentDate: preferredDate,
        appointmentTime: preferredTime,
        notes: notes,
        status: 'pending',
        purpose: 'General Prenatal Consultation',
      });

      Alert.alert("Success", "Your appointment request has been submitted to the clinic.");
      setModalVisible(false);
      setPreferredDate('');
      setPreferredTime('');
      setNotes('');
    } catch (error) {
      console.error("Error booking appointment:", error);
      Alert.alert("Error", "Failed to submit appointment request.");
    } finally {
      bookingLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <QueueButton label="Check In / My Queue" onPress={() => router.push('/check-in')} />
        
        {!!error && <><Text style={{ color: "#B91C1C" }}>{error}</Text><QueueButton label="Retry" onPress={() => setRetry(v => v + 1)} /></>}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0D9488" />
            <Text style={styles.loaderText}>Loading schedule...</Text>
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Appointments Found</Text>
            <Text style={styles.emptySub}>Tap the '+' icon above to request a checkup date.</Text>
          </View>
        ) : (
          appointments.map((item) => (
            <View key={item.id} style={styles.appointmentCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.badgeRow}>
                  <Ionicons name="time-outline" size={14} color="#0D9488" />
                  <Text style={styles.badgeText}>{item.status || 'Not recorded'}</Text>
                </View>
              <Text style={styles.timeText}>{item.appointmentTime || item.time}</Text>
              </View>

              <Text style={styles.appointmentType}>{item.purpose || item.service || 'Prenatal Consultation'}</Text>
              <Text style={styles.appointmentDate}>
                <Ionicons name="calendar" size={13} color="#64748B" /> {item.appointmentDate || item.date}
              </Text>
              {item.doctor && (
                <Text style={styles.doctorText}>Attending: {item.doctor}</Text>
              )}
            </View>
          ))
        )}

      </ScrollView>

      {appointments.find(item => item.id === selectedId) && <AppointmentDetails key={selectedId} item={appointments.find(item => item.id === selectedId)!} close={() => setSelectedId(null)} />}
      {/* Request Appointment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Request Appointment</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Preferred Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter date"
              placeholderTextColor="#94A3B8"
              value={preferredDate}
              onChangeText={setPreferredDate}
            />

            <Text style={styles.inputLabel}>Preferred Time (e.g., 10:00 AM)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter time"
              placeholderTextColor="#94A3B8"
              value={preferredTime}
              onChangeText={setPreferredTime}
            />

            <Text style={styles.inputLabel}>Notes / Specific Concerns</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Mention any symptoms or lab requests..."
              placeholderTextColor="#94A3B8"
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleBookAppointment}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
    marginLeft: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  appointmentType: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  appointmentDate: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 4,
  },
  doctorText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  submitButton: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
