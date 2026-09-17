import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
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
import { 
  fetchRemindersForPatient, 
  addReminder, 
  toggleReminderStatus, 
  deleteReminder 
} from '../../src/(patient)/remindersService';
import { Reminder } from '../../src/models/reminder';

export default function PatientRemindersScreen() {
  const router = useRouter();
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<'Medication' | 'Checkup' | 'Lab Test' | 'General'>('Medication');
  const [submitting, setSubmitting] = useState(false);

  // Patient UID linked to your active profile session
  const patientUid = "spCRyTr79TaIAPDQMQLN6t1keqg2";

  const loadReminders = async () => {
    try {
      setLoading(true);
      const data = await fetchRemindersForPatient(patientUid);
      
      // Fallback sample mock if DB is empty for initial UX view
      if (data.length === 0) {
        setReminders([
          {
            id: 'mock-1',
            patientUid,
            title: 'Prenatal Vitamins & Iron Supplement',
            date: 'September 18, 2026',
            time: '8:00 AM',
            type: 'Medication',
            completed: false,
          },
          {
            id: 'mock-2',
            patientUid,
            title: 'Blood Pressure Monitoring',
            date: 'September 19, 2026',
            time: '6:00 PM',
            type: 'Checkup',
            completed: true,
          },
        ]);
      } else {
        setReminders(data);
      }
    } catch (error) {
      console.error("Failed to load reminders", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const handleCreateReminder = async () => {
    if (!title || !date || !time) {
      Alert.alert("Missing Fields", "Please fill out title, date, and time.");
      return;
    }

    try {
      setSubmitting(true);
      await addReminder({
        patientUid,
        title,
        date,
        time,
        type,
        completed: false,
      });

      Alert.alert("Success", "Reminder added successfully!");
      setModalVisible(false);
      setTitle('');
      setDate('');
      setTime('');
      loadReminders();
    } catch (error) {
      Alert.alert("Error", "Could not save reminder.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id?: string, completed?: boolean) => {
    if (!id) return;
    // Handle mock toggle locally if it's mock item, else push update to Firestore
    if (id.startsWith('mock-')) {
      setReminders(prev => 
        prev.map(item => item.id === id ? { ...item, completed: !completed } : item)
      );
      return;
    }

    try {
      await toggleReminderStatus(id, !!completed);
      loadReminders();
    } catch (error) {
      Alert.alert("Error", "Could not update status.");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (id.startsWith('mock-')) {
      setReminders(prev => prev.filter(item => item.id !== id));
      return;
    }

    try {
      await deleteReminder(id);
      loadReminders();
    } catch (error) {
      Alert.alert("Error", "Could not delete reminder.");
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
        <Text style={styles.headerTitle}>Reminders</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0D9488" />
            <Text style={styles.loaderText}>Loading reminders...</Text>
          </View>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Reminders Found</Text>
            <Text style={styles.emptySub}>Tap the '+' icon to create a schedule notice.</Text>
          </View>
        ) : (
          reminders.map((item) => (
            <View key={item.id} style={[styles.card, item.completed && styles.cardCompleted]}>
              <TouchableOpacity 
                style={styles.checkboxContainer} 
                onPress={() => handleToggle(item.id, item.completed)}
              >
                <Ionicons 
                  name={item.completed ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={item.completed ? "#0D9488" : "#94A3B8"} 
                />
              </TouchableOpacity>

              <View style={styles.cardContent}>
                <View style={styles.badgeRow}>
                  <Text style={styles.typeBadge}>{item.type}</Text>
                  <Text style={styles.timeText}>{item.date} • {item.time}</Text>
                </View>
                <Text style={[styles.cardTitle, item.completed && styles.textCompleted]}>
                  {item.title}
                </Text>
              </View>

              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Reminder Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>New Reminder</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title / Task</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Take Prenatal Vitamin"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Date (e.g., October 20, 2026)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter date"
              placeholderTextColor="#94A3B8"
              value={date}
              onChangeText={setDate}
            />

            <Text style={styles.inputLabel}>Time (e.g., 9:00 AM)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter time"
              placeholderTextColor="#94A3B8"
              value={time}
              onChangeText={setTime}
            />

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleCreateReminder}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Save Reminder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.7,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  deleteButton: {
    padding: 8,
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