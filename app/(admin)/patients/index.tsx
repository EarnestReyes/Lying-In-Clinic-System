import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

// Firebase Imports
import { PatientPriority } from '../../../src/models/patientPriority';
import { getPatientPriorities } from '../../../src/services/patientPriorityService';
import { archivePatient, fetchPatients as fetchPatientRecords, savePatient, subscribePatients, updatePatient } from '../../../src/services/patientService';
import { authService } from '../../../src/services/authService';
import { subscribeAppointments } from '../../../src/services/appointmentService';
import { subscribeDashboardReminders } from '../../../src/services/dashboardService';

export default function PatientsListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<Record<string, PatientPriority>>({});
  const [loading, setLoading] = useState(true);

  // Modal State for Adding New Patient
  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  
  // Selection/Choice Fields
  const [bloodType, setBloodType] = useState('O+');
  const [gravidaPara, setGravidaPara] = useState('G1 P0');
  const [pregnancyWeek, setPregnancyWeek] = useState('12');
  const [edd, setEdd] = useState('');
  const [eddDate, setEddDate] = useState(new Date());
  const [showEddPicker, setShowEddPicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [intakeTime, setIntakeTime] = useState('');
  const [intakeTimeValue, setIntakeTimeValue] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerPeriod, setPickerPeriod] = useState<'AM' | 'PM'>('AM');
  
  // Clinical Vital Signs State (Including BP back)
  const [weight, setWeight] = useState('55');
  const [bp, setBp] = useState('120/80');
  const [fhb, setFhb] = useState('');

  const [status, setStatus] = useState('Routine');
  const [flagColor, setFlagColor] = useState('#10B981');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minimumRegistrationTime = new Date(); minimumRegistrationTime.setSeconds(0, 0); minimumRegistrationTime.setMinutes(Math.ceil((minimumRegistrationTime.getMinutes() + 1) / 15) * 15);
  const calendarDays = Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }, (_, index) => index + 1);
  const calendarPadding = Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() });
  const clockHours = [{ h: 12, x: 82, y: 4 }, { h: 1, x: 126, y: 16 }, { h: 2, x: 154, y: 47 }, { h: 3, x: 164, y: 84 }, { h: 4, x: 154, y: 122 }, { h: 5, x: 126, y: 151 }, { h: 6, x: 82, y: 162 }, { h: 7, x: 38, y: 151 }, { h: 8, x: 10, y: 122 }, { h: 9, x: 0, y: 84 }, { h: 10, x: 10, y: 47 }, { h: 11, x: 38, y: 16 }];

  // Fetch Patients from Firestore on Mount
  const refreshPatients = async () => {
    try {
      setLoading(true);
      const list = await fetchPatientRecords();
      setPatients(list);
      setPriorities(await getPatientPriorities(list));
    } catch (error) {
      console.log('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribePatients = subscribePatients(async (list) => {
      setPatients(list);
      try {
        setPriorities(await getPatientPriorities(list));
      } catch (error) {
        console.error('Error calculating patient priorities:', error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error subscribing to patients:', error);
      setLoading(false);
    });

    // Appointment and reminder changes also recalculate administrative attention immediately.
    const unsubscribeAppointments = subscribeAppointments(() => refreshPatients());
    const unsubscribeReminders = subscribeDashboardReminders(() => refreshPatients());
    return () => {
      unsubscribePatients();
      unsubscribeAppointments();
      unsubscribeReminders();
    };
  }, []);

  // Handle Marking a Patient as Completed/Delivered
  const handleCompletePatient = async (id: string) => {
    try {
      await updatePatient(id, {
        status: 'Completed / Delivered',
        flagColor: '#10B981',
      });
      refreshPatients();
    } catch (error) {
      console.log('Error updating patient status:', error);
    }
  };

  // Handle Deleting a Patient Record
  const handleDeletePatient = async (id: string) => {
    try {
      await archivePatient(id);
      refreshPatients();
    } catch (error) {
      console.log('Error deleting patient:', error);
    }
  };

  // Handle Registering a New Patient
  const handleAddPatient = async () => {
    if (!fullName || !email || !password || !age || !contactNumber || !bloodType || !gravidaPara || !pregnancyWeek || !edd || !weight || !bp || !fhb) {
      setErrorMsg('Please fill in all required fields and vitals.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const patientUid = await authService.registerPatientAccount(email, password, fullName);

      const currentDateString = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const patientRecord = {
        uid: patientUid,
        name: fullName,
        email: email,
        age: Number(age),
        contactNumber: contactNumber,
        bloodType: bloodType,
        gravidaPara: gravidaPara,
        pregnancyWeek: Number(pregnancyWeek),
        edd: edd,
        intakeTime: intakeTime || formatTime(intakeTimeValue),
        weight: weight,
        bp: bp,
        fhb: fhb,
        status: status,
        flagColor: flagColor,
        createdAt: new Date().toISOString(),
        lastVisit: currentDateString,
        prenatalVisits: [
          {
            visitNo: 'Initial Intake',
            date: currentDateString,
            bp: bp,
            weight: weight,
            fhb: fhb,
            notes: 'Baseline checkup recorded upon patient registration.'
          }
        ]
      };

      await savePatient(patientUid, patientRecord);

      setSubmitting(false);
      setModalVisible(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setAge('');
      setContactNumber('');
      setBloodType('O+');
      setGravidaPara('G1 P0');
      setPregnancyWeek('12');
      setEdd('');
      setEddDate(new Date());
      setIntakeTime('');
      setIntakeTimeValue(new Date());
      setWeight('55');
      setBp('120/80');
      setFhb('');
      refreshPatients();
    } catch (error: any) {
      setSubmitting(false);
      setErrorMsg(error.message || 'Failed to register patient.');
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityStyle = (level: PatientPriority['level']) => {
    if (level === 'high') return styles.priorityHigh;
    if (level === 'moderate') return styles.priorityModerate;
    return styles.priorityRoutine;
  };

  const openSearchResult = () => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return;
    const exactMatch = filteredPatients.find((patient) => patient.name?.trim().toLowerCase() === normalizedQuery);
    const patient = exactMatch || filteredPatients[0];
    if (patient) router.push(`/(admin)/patients/${patient.id}` as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.appShell}>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          
          <View style={styles.topNavbar}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput 
                placeholder="Search patient name, vitals..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={openSearchResult}
              />
            </View>

            <View style={styles.topNavRight}>
              <TouchableOpacity style={styles.topIconButton}>
                <Ionicons name="notifications-outline" size={18} color="#64748B" />
              </TouchableOpacity>
              <View style={styles.adminProfileBadge}>
                <View style={styles.avatarPlaceholderBadge}>
                  <Ionicons name="person" size={14} color="#0D9488" />
                </View>
                <View>
                  <Text style={styles.adminName}>Midwife Admin</Text>
                  <Text style={styles.adminRole}>Lying-In Staff</Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            
            <Text style={styles.breadcrumb}>Dashboard &gt; <Text style={{ color: '#0F172A' }}>Patient Records</Text></Text>

            <View style={styles.pageHeaderRow}>
              <View>
                <Text style={styles.pageTitle}>Patient Records</Text>
                <Text style={styles.pageSub}>Showing {filteredPatients.length} registered patients</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryButtonText}>Add New Patient</Text>
              </TouchableOpacity>
            </View>

            {/* Patient List */}
            <View style={styles.listContainer}>
              {filteredPatients.length ? filteredPatients.map(patient => (
                <View key={patient.id} style={styles.patientCard}>
                  <TouchableOpacity onPress={() => router.push(`/(admin)/patients/${patient.id}` as any)}>
                    <View style={styles.cardHeader}>
                      <View style={styles.patientInfoWrapper}>
                        <View style={styles.avatarPlaceholder}>
                          {patient.profileImage && patient.profileImage.trim() !== '' ? (
                            <Image source={{ uri: patient.profileImage }} style={styles.avatarImage} />
                          ) : (
                            <Text style={styles.avatarText}>
                              {patient.name ? patient.name.charAt(0).toUpperCase() : 'P'}
                            </Text>
                          )}
                        </View>
                        <View>
                          <Text style={styles.patientName}>{patient.name}</Text>
                          <Text style={styles.patientSub}>Age: {patient.age} • {patient.pregnancyWeek} Weeks Pregnant</Text>
                        </View>
                      </View>
                      
                      <View style={[styles.statusBadge, { backgroundColor: `${patient.flagColor || '#10B981'}15` }]}>
                        <View style={[styles.statusDot, { backgroundColor: patient.flagColor || '#10B981' }]} />
                        <Text style={[styles.statusText, { color: patient.flagColor || '#10B981' }]}>{patient.status}</Text>
                      </View>
                    </View>

                    {priorities[patient.id] && (
                      <View style={[styles.priorityPanel, getPriorityStyle(priorities[patient.id].level)]}>
                        <Text style={styles.priorityTitle}>
                          {priorities[patient.id].level === 'high' ? '🔴' : priorities[patient.id].level === 'moderate' ? '🟡' : '🟢'} {priorities[patient.id].label}
                        </Text>
                        <Text style={styles.priorityReason}>{priorities[patient.id].reason}</Text>
                        {priorities[patient.id].relevantInfo ? <Text style={styles.priorityInfo}>{priorities[patient.id].relevantInfo}</Text> : null}
                      </View>
                    )}

                    <View style={styles.cardDivider} />

                    <View style={styles.cardFooter}>
                      <View style={styles.footerInfoItem}>
                        <Ionicons name="call-outline" size={14} color="#64748B" />
                        <Text style={styles.footerInfoText}>{patient.contactNumber || patient.phone || 'N/A'}</Text>
                      </View>
                      <View style={styles.footerInfoItem}>
                        <Ionicons name="water-outline" size={14} color="#64748B" />
                        <Text style={styles.footerInfoText}>Blood: {patient.bloodType || 'N/A'}</Text>
                      </View>
                      <View style={styles.footerInfoItem}>
                        <Ionicons name="fitness-outline" size={14} color="#64748B" />
                        <Text style={styles.footerInfoText}>BP: {patient.bp || 'N/A'} | Wt: {patient.weight || 'N/A'}</Text>
                      </View>
                      <View style={styles.footerInfoItem}>
                        <Ionicons name="heart-outline" size={14} color="#64748B" />
                        <Text style={styles.footerInfoText}>FHB: {patient.fhb || 'N/A'}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.cardActionRow}>
                    <TouchableOpacity style={styles.completeActionButton} onPress={() => handleCompletePatient(patient.id)}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#0D9488" style={{ marginRight: 4 }} />
                      <Text style={styles.completeActionText}>Mark Completed</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteActionButton} onPress={() => handleDeletePatient(patient.id)}>
                      <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={styles.deleteActionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )) : searchQuery.trim() ? <View style={styles.emptySearchState}><Ionicons name="search-outline" size={30} color="#94A3B8" /><Text style={styles.emptySearchText}>No patient found for “{searchQuery}”.</Text></View> : null}
            </View>

            <Text style={styles.priorityDisclaimer}>Priority status supports administrative workflow only. It is not a medical diagnosis or clinical decision.</Text>

          </ScrollView>
        </View>
      </View>

      {/* Modal with Choice/Auto Options */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Patient</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <ScrollView contentContainerStyle={styles.modalForm} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput style={styles.input} placeholder="e.g. Roshan Sevillena" placeholderTextColor="#94A3B8" value={fullName} onChangeText={setFullName} />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput style={styles.input} placeholder="patient@email.com" placeholderTextColor="#94A3B8" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

              <Text style={styles.inputLabel}>Temporary Password</Text>
              <TextInput style={styles.input} placeholder="At least 6 characters" placeholderTextColor="#94A3B8" secureTextEntry value={password} onChangeText={setPassword} />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <View style={styles.dropdownContainer}><Picker selectedValue={age} onValueChange={setAge} style={styles.dropdown}><Picker.Item label="Select age" value="" />{Array.from({ length: 43 }, (_, index) => String(index + 18)).map((value) => <Picker.Item key={value} label={`${value} years`} value={value} />)}</Picker></View>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Contact Number</Text>
                  <TextInput style={styles.input} placeholder="+63 919..." placeholderTextColor="#94A3B8" keyboardType="phone-pad" value={contactNumber} onChangeText={setContactNumber} />
                </View>
              </View>

              {/* Automatic Choice Option: Blood Type */}
              <View style={styles.dropdownGrid}>
                <View style={styles.dropdownField}><Text style={styles.inputLabel}>Blood Type</Text><View style={styles.dropdownContainer}><Picker selectedValue={bloodType} onValueChange={setBloodType} style={styles.dropdown}>{['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map((type) => <Picker.Item key={type} label={type} value={type} />)}</Picker></View></View>
                <View style={styles.dropdownField}><Text style={styles.inputLabel}>Gravida / Para</Text><View style={styles.dropdownContainer}><Picker selectedValue={gravidaPara} onValueChange={setGravidaPara} style={styles.dropdown}>{['G1 P0', 'G2 P1', 'G3 P2', 'G4 P3', 'G5 P4+'].map((value) => <Picker.Item key={value} label={value} value={value} />)}</Picker></View></View>
              </View>

              {/* Automatic Choice Option: Pregnancy Week */}
              <Text style={styles.inputLabel}>Pregnancy Week</Text>
              <View style={styles.dropdownContainer}><Picker selectedValue={pregnancyWeek} onValueChange={setPregnancyWeek} style={styles.dropdown}>{Array.from({ length: 41 }, (_, index) => String(index)).map((value) => <Picker.Item key={value} label={`${value} weeks`} value={value} />)}</Picker></View>

              <Text style={styles.inputLabel}>Estimated Due Date (Calendar)</Text>
              <TouchableOpacity style={styles.pickerInput} onPress={() => { setCalendarMonth(new Date(eddDate.getFullYear(), eddDate.getMonth(), 1)); setShowEddPicker(true); }}>
                <Ionicons name="calendar-outline" size={18} color="#0D9488" />
                <Text style={[styles.pickerInputText, !edd && styles.pickerPlaceholder]}>{edd || 'Select estimated due date'}</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Registration Time (Time Picker)</Text>
              <TouchableOpacity style={styles.pickerInput} onPress={() => { const baseTime = intakeTimeValue > minimumRegistrationTime ? intakeTimeValue : minimumRegistrationTime; const hour = baseTime.getHours(); setPickerHour(hour % 12 || 12); setPickerMinute(Math.ceil(baseTime.getMinutes() / 15) * 15 % 60); setPickerPeriod(hour >= 12 ? 'PM' : 'AM'); setShowTimePicker(true); }}>
                <Ionicons name="time-outline" size={18} color="#0D9488" />
                <Text style={styles.pickerInputText}>{intakeTime || formatTime(intakeTimeValue)}</Text>
              </TouchableOpacity>

              {/* Initial Vital Signs Section */}
              <Text style={styles.sectionDividerLabel}>Initial Vital Signs</Text>

              <View style={styles.dropdownGrid}>
                <View style={styles.dropdownField}><Text style={styles.inputLabel}>Weight (kg)</Text><View style={styles.dropdownContainer}><Picker selectedValue={weight} onValueChange={setWeight} style={styles.dropdown}>{['45', '50', '55', '60', '65', '70', '75', '80', '85', '90'].map((value) => <Picker.Item key={value} label={`${value} kg`} value={value} />)}</Picker></View></View>
                <View style={styles.dropdownField}><Text style={styles.inputLabel}>Blood Pressure</Text><View style={styles.dropdownContainer}><Picker selectedValue={bp} onValueChange={setBp} style={styles.dropdown}>{['110/70', '120/80', '130/85', '140/90', '150/95'].map((value) => <Picker.Item key={value} label={value} value={value} />)}</Picker></View></View>
              </View>

              <Text style={styles.inputLabel}>Fetal Heartbeat (FHB)</Text>
              <TextInput style={styles.input} placeholder="e.g. 140 bpm" placeholderTextColor="#94A3B8" value={fhb} onChangeText={setFhb} />

              <Text style={styles.inputLabel}>Clinical Status & Priority</Text>
              <View style={styles.statusSelectRow}>
                <TouchableOpacity style={[styles.statusOptionBtn, status === 'Routine' && styles.statusRoutine]} onPress={() => { setStatus('Routine'); setFlagColor('#10B981'); }}><Text style={[styles.statusOptionText, status === 'Routine' && styles.statusOptionTextActive]}>Routine</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.statusOptionBtn, status === 'Follow-up' && styles.statusFollowUp]} onPress={() => { setStatus('Follow-up'); setFlagColor('#F59E0B'); }}><Text style={[styles.statusOptionText, status === 'Follow-up' && styles.statusOptionTextActive]}>Follow-up</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.statusOptionBtn, status === 'Review Required' && styles.statusReview]} onPress={() => { setStatus('Review Required'); setFlagColor('#EF4444'); }}><Text style={[styles.statusOptionText, status === 'Review Required' && styles.statusOptionTextActive]}>Review Required</Text></TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAddPatient} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Save & Create Patient Account</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showEddPicker} transparent animationType="fade" onRequestClose={() => setShowEddPicker(false)}>
        <View style={styles.modalOverlay}><View style={styles.optionPickerModal}><View style={styles.optionPickerHeader}><Text style={styles.modalTitle}>Select Estimated Due Date</Text><TouchableOpacity onPress={() => setShowEddPicker(false)}><Ionicons name="close" size={22} color="#64748B" /></TouchableOpacity></View><View style={styles.calendarNav}><TouchableOpacity disabled={calendarMonth <= new Date(today.getFullYear(), today.getMonth(), 1)} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} style={styles.calendarNavButton}><Ionicons name="chevron-back" size={20} color={calendarMonth <= new Date(today.getFullYear(), today.getMonth(), 1) ? '#CBD5E1' : '#0D9488'} /></TouchableOpacity><Text style={styles.calendarMonth}>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text><TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} style={styles.calendarNavButton}><Ionicons name="chevron-forward" size={20} color="#0D9488" /></TouchableOpacity></View><View style={styles.calendarGrid}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <Text key={day} style={styles.calendarWeekday}>{day}</Text>)}{calendarPadding.map((_, index) => <View key={`blank-${index}`} style={styles.calendarDay} />)}{calendarDays.map((day) => { const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day); const disabled = date < today; const selected = edd === formatDate(date); return <TouchableOpacity key={day} disabled={disabled} style={[styles.calendarDay, selected && styles.calendarDaySelected]} onPress={() => { setEddDate(date); setEdd(formatDate(date)); setShowEddPicker(false); }}><Text style={[styles.calendarDayText, disabled && styles.calendarDayDisabled, selected && styles.calendarDayTextSelected]}>{day}</Text></TouchableOpacity>; })}</View></View></View>
      </Modal>

      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.modalOverlay}><View style={styles.optionPickerModal}><View style={styles.optionPickerHeader}><Text style={styles.modalTitle}>Select Registration Time</Text><TouchableOpacity onPress={() => setShowTimePicker(false)}><Ionicons name="close" size={22} color="#64748B" /></TouchableOpacity></View><View style={styles.clockPickerLayout}><View style={styles.clockFace}><View style={styles.clockCenter}><Text style={styles.clockCenterText}>{pickerHour}:{String(pickerMinute).padStart(2, '0')}</Text></View>{clockHours.map(({ h, x, y }) => <TouchableOpacity key={h} onPress={() => setPickerHour(h)} style={[styles.clockHour, { left: x, top: y }, pickerHour === h && styles.clockHourSelected]}><Text style={[styles.timeOptionText, pickerHour === h && styles.timeOptionTextSelected]}>{h}</Text></TouchableOpacity>)}</View><View style={styles.timePickerSide}><Text style={styles.timePickerLabel}>Minute</Text>{[0, 15, 30, 45].map((minute) => <TouchableOpacity key={minute} style={[styles.timeOption, pickerMinute === minute && styles.timeOptionSelected]} onPress={() => setPickerMinute(minute)}><Text style={[styles.timeOptionText, pickerMinute === minute && styles.timeOptionTextSelected]}>{String(minute).padStart(2, '0')}</Text></TouchableOpacity>)}<Text style={styles.timePickerLabel}>Period</Text>{(['AM', 'PM'] as const).map((period) => <TouchableOpacity key={period} style={[styles.timeOption, pickerPeriod === period && styles.timeOptionSelected]} onPress={() => setPickerPeriod(period)}><Text style={[styles.timeOptionText, pickerPeriod === period && styles.timeOptionTextSelected]}>{period}</Text></TouchableOpacity>)}</View></View><TouchableOpacity style={styles.timeConfirmButton} onPress={() => { const date = new Date(); date.setHours((pickerHour % 12) + (pickerPeriod === 'PM' ? 12 : 0), pickerMinute, 0, 0); if (date < minimumRegistrationTime) { Alert.alert('Invalid time', 'Registration time cannot be earlier than the next available 15-minute slot.'); return; } setIntakeTimeValue(date); setIntakeTime(formatTime(date)); setShowTimePicker(false); }}><Text style={styles.submitButtonText}>Confirm Time</Text></TouchableOpacity></View></View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  appShell: { flex: 1, flexDirection: 'row' },
  mainContent: { flex: 1, backgroundColor: '#F8FAFC', flexDirection: 'column' },
  topNavbar: { height: 70, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 12, height: 40, width: 300 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  topNavRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topIconButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  adminProfileBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#E2E8F0', gap: 10 },
  avatarPlaceholderBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#CCFBF1', justifyContent: 'center', alignItems: 'center' },
  adminName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  adminRole: { fontSize: 11, color: '#64748B' },
  scrollBody: { padding: 30, maxWidth: 1100, alignSelf: 'center', width: '100%' },
  breadcrumb: { fontSize: 13, color: '#64748B', marginBottom: 16, fontWeight: '500' },
  pageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  pageSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  primaryButton: { backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  listContainer: { gap: 12 },
  emptySearchState: { alignItems: 'center', paddingVertical: 36, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  emptySearchText: { fontSize: 13, color: '#64748B', marginTop: 8, fontWeight: '600' },
  patientCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientInfoWrapper: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#CCFBF1', justifyContent: 'center', alignItems: 'center', marginRight: 14, overflow: 'hidden' },
  avatarImage: { width: 48, height: 48, borderRadius: 14 },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#0D9488' },
  patientName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  patientSub: { fontSize: 12, color: '#64748B', marginTop: 3 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  priorityPanel: { marginTop: 14, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  priorityHigh: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  priorityModerate: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  priorityRoutine: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  priorityTitle: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  priorityReason: { fontSize: 12, lineHeight: 18, color: '#334155', marginTop: 3 },
  priorityInfo: { fontSize: 11, color: '#64748B', marginTop: 3, fontWeight: '600' },
  priorityDisclaimer: { color: '#64748B', fontSize: 11, lineHeight: 16, marginTop: 14, textAlign: 'center' },
  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  footerInfoItem: { flexDirection: 'row', alignItems: 'center' },
  footerInfoText: { fontSize: 12, color: '#64748B', marginLeft: 6, fontWeight: '500' },
  cardActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, gap: 10 },
  completeActionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#CCFBF1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  completeActionText: { fontSize: 12, fontWeight: '700', color: '#0D9488' },
  deleteActionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  deleteActionText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', maxWidth: 540, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, maxHeight: '90%' },
  optionPickerModal: { width: '100%', maxWidth: 420, maxHeight: '78%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18 },
  optionPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 8 },
  calendarNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calendarNavButton: { padding: 6, borderRadius: 8, backgroundColor: '#F0FDFA' },
  calendarMonth: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarWeekday: { width: '14.285%', textAlign: 'center', fontSize: 10, color: '#64748B', fontWeight: '700', paddingVertical: 7 },
  calendarDay: { width: '14.285%', height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  calendarDaySelected: { backgroundColor: '#0D9488' },
  calendarDayText: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  calendarDayDisabled: { color: '#CBD5E1' },
  calendarDayTextSelected: { color: '#FFFFFF' },
  clockPickerLayout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  clockFace: { width: 190, height: 190, borderRadius: 95, backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#99F6E4', position: 'relative' },
  clockHour: { position: 'absolute', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  clockHourSelected: { backgroundColor: '#0D9488' },
  clockCenter: { position: 'absolute', left: 57, top: 67, width: 76, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  clockCenterText: { color: '#0D9488', fontSize: 16, fontWeight: '800' },
  timePickerSide: { width: 78, gap: 6 },
  timePickerLabel: { textAlign: 'center', fontSize: 11, color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  timeOption: { alignItems: 'center', paddingVertical: 9, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  timeOptionSelected: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  timeOptionText: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  timeOptionTextSelected: { color: '#FFFFFF' },
  timeConfirmButton: { backgroundColor: '#0D9488', borderRadius: 10, alignItems: 'center', paddingVertical: 12, marginTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12, fontWeight: '500' },
  modalForm: { paddingBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 12 },
  sectionDividerLabel: { fontSize: 13, fontWeight: '800', color: '#0D9488', marginTop: 18, marginBottom: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, height: 44, paddingHorizontal: 14, fontSize: 14, color: '#0F172A' },
  pickerInput: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, height: 44, paddingHorizontal: 14 },
  pickerInputText: { fontSize: 14, color: '#0F172A' },
  pickerPlaceholder: { color: '#94A3B8' },
  dropdownGrid: { flexDirection: 'row', gap: 12, marginTop: 4 },
  dropdownField: { flex: 1, minWidth: 0 },
  dropdownContainer: { height: 46, borderWidth: 1, borderColor: '#CFE8E5', borderRadius: 12, backgroundColor: '#F8FFFE', overflow: 'hidden', justifyContent: 'center', shadowColor: '#0D9488', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  dropdown: { height: 44, color: '#0F172A', fontSize: 14 },
  rowInputs: { flexDirection: 'row' },
  choiceRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  choiceBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
  choiceBtnSelected: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  choiceBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  choiceBtnTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  statusSelectRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statusOptionBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
  statusRoutine: { backgroundColor: '#10B981', borderColor: '#10B981' },
  statusFollowUp: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  statusReview: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  statusOptionText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  statusOptionTextActive: { color: '#FFFFFF', fontWeight: '700' },
  submitButton: { backgroundColor: '#0D9488', height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  submitButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});