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
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Import appointment service functions and model
import { 
  createAppointment, 
  assertAppointmentSlotAvailable,
  subscribeAppointments,
  reviewAppointment,
  updateAppointment, 
  deleteAppointment,
} from '../../src/services/appointmentService'; 
import { fetchPatients } from '../../src/services/patientService';
import { Appointment, AppointmentStatus } from '../../src/models/Appointment';
import { PatientRecordSearch } from '../../components/PatientRecordSearch';
import { Picker } from '@react-native-picker/picker';

type PatientOption = { id: string; name: string; contactNumber?: string };

export default function AppointmentsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  
  // Database states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [reviewMode, setReviewMode] = useState<'approve' | 'cancel' | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // New Appointment Form State
  const [formPatientName, setFormPatientName] = useState('');
  const [formPatientId, setFormPatientId] = useState('');
  const [formService, setFormService] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [clockHour, setClockHour] = useState(9);
  const [clockMinute, setClockMinute] = useState(0);
  const [clockPeriod, setClockPeriod] = useState<'AM' | 'PM'>('AM');
  const [formMidwife, setFormMidwife] = useState('');
  const [formContact, setFormContact] = useState('');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const calendarDays = Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);
  const calendarPadding = Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() });
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const clockPositions = [{ h: 12, x: 82, y: 4 }, { h: 1, x: 126, y: 16 }, { h: 2, x: 154, y: 47 }, { h: 3, x: 164, y: 84 }, { h: 4, x: 154, y: 122 }, { h: 5, x: 126, y: 151 }, { h: 6, x: 82, y: 162 }, { h: 7, x: 38, y: 151 }, { h: 8, x: 10, y: 122 }, { h: 9, x: 0, y: 84 }, { h: 10, x: 10, y: 47 }, { h: 11, x: 38, y: 16 }];

  useEffect(() => {
    let active = true;
    fetchPatients().then(patientSnapshot => {
      if (!active) return;
      setPatients(patientSnapshot.map(patient => ({
        id: patient.id,
        name: patient.name || patient.firstName || 'Unnamed patient',
        contactNumber: patient.contactNumber,
      })));
    }).catch(error => {
      console.error('Error fetching patients:', error);
      Alert.alert('Error', 'Failed to load patient options.');
    });
    const unsubscribe = subscribeAppointments(items => {
      setAppointments(items);
      setSelectedAppointment(current => current ? items.find(item => item.id === current.id) ?? null : null);
      setLoading(false);
    }, error => {
      console.error('Error subscribing to appointments:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load appointments from database.');
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  // Handle Creating New Appointment
  const handleCreate = async () => {
    if (!formPatientId || !formPatientName || !formService || !formDate) {
      Alert.alert("Missing Fields", "Select a registered patient, service, and date.");
      return;
    }
    const appointmentDate = new Date(formDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (Number.isNaN(appointmentDate.getTime()) || appointmentDate < today) {
      Alert.alert('Invalid date', 'Select a valid appointment date that is today or later.');
      return;
    }

    try {
      setActionLoading(true);
      await assertAppointmentSlotAvailable(formDate, formTime || '9:00 AM');
      await createAppointment({
        patientId: formPatientId,
        patientName: formPatientName,
        patientContact: formContact,
        service: formService, 
        appointmentDate: formDate,
        appointmentTime: formTime || '9:00 AM',
        status: 'Scheduled' as AppointmentStatus,
        notes: `Time: ${formTime || '9:00 AM'} | Staff: ${formMidwife || 'Midwife Clara Reyes'} | Contact: ${formContact || '+63 900 000 0000'}`,
      } as any);
      
      setModalVisible(false);
      clearForm();
    } catch (error) {
      console.error("Error creating appointment:", error);
      Alert.alert("Error", "Could not create appointment.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (id: string, newStatus: AppointmentStatus) => {
    try {
      setActionLoading(true);
      await updateAppointment(id, { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Could not update appointment status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async (decision: 'confirmed' | 'cancelled') => {
    if (!selectedAppointment?.id || actionLoading) return;
    if (decision === 'cancelled' && !cancellationReason.trim()) {
      Alert.alert('Reason required', 'Enter a reason for cancelling this appointment.');
      return;
    }
    try {
      setActionLoading(true);
      await reviewAppointment(selectedAppointment.id, decision, cancellationReason);
      setReviewMode(null);
      setCancellationReason('');
    } catch (error) {
      Alert.alert('Unable to update appointment', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Appointment with built-in validation & logs
  const handleDelete = async (id: string) => {
    console.log("Delete button clicked for ID:", id);

    if (!id) {
      Alert.alert("Error", "Appointment ID is missing or undefined.");
      return;
    }

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this appointment?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteAppointment(id);
              setSelectedAppointment(null);
            } catch (error: any) {
              console.error("Error deleting appointment from database:", error);
              Alert.alert("Error", `Could not delete appointment: ${error?.message || error}`);
            } finally {
              setActionLoading(false);
            }
          } 
        }
      ]
    );
  };

  const clearForm = () => {
    setFormPatientName('');
    setFormPatientId('');
    setFormService('');
    setFormDate('');
    setFormTime('');
    setFormMidwife('');
    setFormContact('');
  };

  const getStatusColor = (status?: AppointmentStatus | string) => {
    switch (String(status || '').toLowerCase()) {
      case 'pending': return '#D97706';
      case 'confirmed': return '#059669';
      case 'completed': return '#2563EB';
      case 'cancelled': return '#DC2626';
      default: return '#3B82F6';
    }
  };

  const getStatusLabel = (status?: AppointmentStatus | string) => {
    switch (String(status || '').toLowerCase()) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Approved';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Scheduled';
    }
  };

  // Filter Logic
  const filteredAppointments = appointments.filter(apt => {
    const pName = apt.patientName || '';
    const sName = (apt as any).service || (apt as any).type || '';
    const aptId = apt.id || '';
    
    const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          aptId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          sName.toLowerCase().includes(searchQuery.toLowerCase());
                          
    if (activeTab === 'All') return matchesSearch;
    return matchesSearch && getStatusLabel(apt.status) === activeTab;
  });

  const selectedPatient = patients.find((patient) => patient.id === formPatientId);
  const selectedStatus = getStatusLabel(selectedAppointment?.status);
  const selectedStatusColor = getStatusColor(selectedAppointment?.status);
  const selectedIsPending = ['pending', 'requested'].includes(String(selectedAppointment?.status || '').toLowerCase());
  const selectedService = selectedAppointment?.service || selectedAppointment?.purpose || 'General Consultation';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.appShell}>
        
        {/* Main Content Area */}
        <View style={styles.mainContent}>
          
          <View style={styles.topNavbar}>
            <PatientRecordSearch onQueryChange={setSearchQuery} />

            <View style={styles.topNavRight}>
              <TouchableOpacity style={styles.topIconButton}>
                <Ionicons name="notifications-outline" size={18} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.topIconButton}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#64748B" />
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
            
            <Text style={styles.breadcrumb}>Dashboard &gt; <Text style={{ color: '#0F172A' }}>Appointments</Text></Text>

            <View style={styles.pageHeaderRow}>
              <View>
                <Text style={styles.pageTitle}>Appointment Schedule</Text>
                <Text style={styles.pageSub}>Manage clinic visits, prenatal checkups, and scheduled consultations</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.primaryButton} 
                activeOpacity={0.8}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryButtonText}>New Appointment</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tabRow}>
              {['All', 'Pending', 'Approved', 'Scheduled', 'Completed', 'Cancelled'].map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#0D9488" />
                <Text style={styles.emptyText}>Syncing appointments from database...</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map(apt => {
                    const statusColor = getStatusColor(apt.status);
                    const serviceVal = apt.service || apt.purpose || 'General Consultation';
                    const statusLabel = getStatusLabel(apt.status);
                    return (
                      <TouchableOpacity key={apt.id} style={styles.appointmentCard} activeOpacity={0.78} onPress={() => setSelectedAppointment(apt)}>
                        <View style={styles.cardHeader}>
                          <View style={styles.itemInfoWrapper}>
                            <View style={styles.itemIconBox}>
                              <Ionicons name="calendar-outline" size={20} color="#0D9488" />
                            </View>
                            <View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.aptId}>#{apt.id?.slice(-6)}</Text>
                                <Text style={styles.aptDate}>• {apt.appointmentDate}</Text>
                              </View>
                              <Text style={styles.patientName}>{apt.patientName}</Text>
                              {apt.patientContact ? <Text style={styles.patientContact}>Phone: {apt.patientContact}</Text> : null}
                            </View>
                          </View>
                          
                          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                          </View>
                        </View>

                        <View style={styles.cardDivider} />

                        <View style={styles.cardFooter}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.serviceLabel}>Scheduled Service</Text>
                            <Text style={styles.serviceName}>{serviceVal}</Text>
                            <Text style={styles.midwifeText}>Notes / Details: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{apt.notes || 'N/A'}</Text></Text>
                          </View>

                          <View style={styles.openDetails}><Text style={styles.openDetailsText}>View details</Text><Ionicons name="chevron-forward" size={16} color="#0D9488" /></View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
                    <Text style={styles.emptyText}>No appointments found in database.</Text>
                  </View>
                )}
              </View>
            )}

          </ScrollView>

        </View>

      </View>

      <Modal visible={!!selectedAppointment && !reviewMode} animationType="fade" transparent onRequestClose={() => setSelectedAppointment(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <TouchableOpacity accessibilityLabel="Close appointment details" hitSlop={10} onPress={() => setSelectedAppointment(null)}>
                <Ionicons name="close" size={21} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.detailList}>
              <AppointmentDetail label="Patient" value={selectedAppointment?.patientName} />
              <View style={styles.detailColumns}>
                <AppointmentDetail label="Date" value={selectedAppointment?.appointmentDate || selectedAppointment?.date} />
                <AppointmentDetail label="Time" value={selectedAppointment?.appointmentTime || selectedAppointment?.time} />
              </View>
              <AppointmentDetail label="Service" value={selectedService} />
              {!!selectedAppointment?.notes && <AppointmentDetail label="Reason / Notes" value={selectedAppointment.notes} />}
              <View style={styles.detailField}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[styles.statusBadge, styles.detailStatus, { backgroundColor: `${selectedStatusColor}15` }]}>
                  <View style={[styles.statusDot, { backgroundColor: selectedStatusColor }]} />
                  <Text style={[styles.statusText, { color: selectedStatusColor }]}>{selectedStatus}</Text>
                </View>
              </View>
              {!!selectedAppointment?.createdAt && <AppointmentDetail label="Date Requested" value={formatTimestamp(selectedAppointment.createdAt)} />}
              {selectedStatus === 'Cancelled' && !!selectedAppointment?.cancellationReason && <AppointmentDetail label="Cancellation Reason" value={selectedAppointment.cancellationReason} />}
            </ScrollView>
            <View style={styles.detailActions}>
              <TouchableOpacity style={styles.deleteDetailButton} disabled={actionLoading} onPress={() => selectedAppointment?.id && handleDelete(selectedAppointment.id)}>
                <Text style={styles.deleteDetailText}>Delete</Text>
              </TouchableOpacity>
              {selectedIsPending && <>
                <TouchableOpacity style={styles.cancelAppointmentButton} disabled={actionLoading} onPress={() => { setCancellationReason(''); setReviewMode('cancel'); }}>
                  <Text style={styles.cancelAppointmentText}>Cancel Appointment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveButton} disabled={actionLoading} onPress={() => setReviewMode('approve')}>
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
              </>}
              {!selectedIsPending && ['Approved', 'Scheduled'].includes(selectedStatus) && <TouchableOpacity style={styles.approveButton} disabled={actionLoading} onPress={() => selectedAppointment?.id && handleUpdateStatus(selectedAppointment.id, 'completed')}>
                {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.approveButtonText}>Mark Completed</Text>}
              </TouchableOpacity>}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={reviewMode === 'approve'} animationType="fade" transparent onRequestClose={() => setReviewMode(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmIcon}><Ionicons name="checkmark-circle-outline" size={25} color="#059669" /></View>
            <Text style={styles.confirmTitle}>Approve Appointment?</Text>
            <Text style={styles.confirmText}>Confirm this patient's appointment for:</Text>
            <Text style={styles.confirmSchedule}>{selectedAppointment?.appointmentDate}{'\n'}{selectedAppointment?.appointmentTime}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.modalCancelButton} disabled={actionLoading} onPress={() => setReviewMode(null)}><Text style={styles.modalCancelText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={styles.approveButton} disabled={actionLoading} onPress={() => void handleReview('confirmed')}>{actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.approveButtonText}>Approve</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={reviewMode === 'cancel'} animationType="fade" transparent onRequestClose={() => setReviewMode(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Cancel Appointment</Text><TouchableOpacity hitSlop={10} onPress={() => setReviewMode(null)}><Ionicons name="close" size={21} color="#64748B" /></TouchableOpacity></View>
            <Text style={styles.cancelHelp}>Please provide a reason for cancelling this appointment.</Text>
            <Text style={styles.inputLabel}>Reason *</Text>
            <TextInput style={[styles.modalInput, styles.reasonInput]} value={cancellationReason} onChangeText={setCancellationReason} multiline textAlignVertical="top" placeholder="The clinic is fully booked for the selected schedule." />
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.modalCancelButton} disabled={actionLoading} onPress={() => setReviewMode(null)}><Text style={styles.modalCancelText}>Go Back</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.cancelAppointmentButton, !cancellationReason.trim() && styles.disabledButton]} disabled={actionLoading || !cancellationReason.trim()} onPress={() => void handleReview('cancelled')}>{actionLoading ? <ActivityIndicator size="small" color="#DC2626" /> : <Text style={styles.cancelAppointmentText}>Cancel Appointment</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Appointment</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <View>
                <Text style={styles.inputLabel}>Patient Name *</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="Search registered patient"
                  value={formPatientName}
                  onChangeText={(value) => {
                    setFormPatientName(value);
                    setFormPatientId('');
                  }}
                />
                {formPatientName.length > 0 && !formPatientId && (
                  <View style={styles.patientResults}>
                    {patients.filter((patient) => patient.name.toLowerCase().includes(formPatientName.toLowerCase())).slice(0, 5).map((patient) => (
                      <TouchableOpacity key={patient.id} style={styles.patientResult} onPress={() => {
                        setFormPatientId(patient.id);
                        setFormPatientName(patient.name);
                        if (!formContact && patient.contactNumber) setFormContact(patient.contactNumber);
                      }}>
                        <Ionicons name="person-outline" size={15} color="#0D9488" />
                        <Text style={styles.patientResultText}>{patient.name}</Text>
                      </TouchableOpacity>
                    ))}
                    {patients.filter((patient) => patient.name.toLowerCase().includes(formPatientName.toLowerCase())).length === 0 && <Text style={styles.patientResultEmpty}>No registered patient found.</Text>}
                  </View>
                )}
                {selectedPatient ? <View style={styles.selectedPatientInfo}><Ionicons name="checkmark-circle" size={15} color="#0D9488" /><View><Text style={styles.selectedPatientText}>{selectedPatient.name}</Text><Text style={styles.selectedPatientPhone}>{selectedPatient.contactNumber || 'No phone number on record'}</Text></View></View> : null}
              </View>

              <View>
                <Text style={styles.inputLabel}>Service / Reason *</Text>
                <View style={styles.modalPicker}><Picker selectedValue={formService} onValueChange={setFormService} style={styles.picker}><Picker.Item label="Select service" value="" />{['Prenatal Checkup', 'Ultrasound Scan', 'Lab Test Review', 'Postnatal Follow-up', 'General Consultation'].map((service) => <Picker.Item key={service} label={service} value={service} />)}</Picker></View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Date *</Text>
                  <TouchableOpacity style={styles.clockInput} onPress={() => setDatePickerVisible(true)}><Ionicons name="calendar-outline" size={16} color="#0D9488" /><Text style={styles.clockInputText}>{formDate || 'Select date'}</Text></TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TouchableOpacity style={styles.clockInput} onPress={() => setTimePickerVisible(true)}><Ionicons name="time-outline" size={16} color="#0D9488" /><Text style={styles.clockInputText}>{formTime || 'Select time'}</Text></TouchableOpacity>
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Assigned Midwife</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="e.g. Midwife Clara Reyes"
                  value={formMidwife}
                  onChangeText={setFormMidwife}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="e.g. +63 912 345 6789"
                  value={formContact}
                  onChangeText={setFormContact}
                />
              </View>

              <TouchableOpacity 
                style={styles.modalSubmitButton} 
                onPress={handleCreate}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Appointment</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={timePickerVisible} transparent animationType="fade" onRequestClose={() => setTimePickerVisible(false)}><View style={styles.modalOverlay}><View style={styles.clockModal}><Text style={styles.modalTitle}>Select Appointment Time</Text><View style={styles.clockHours}><View style={styles.clockCenter}><Text style={styles.clockCenterText}>{clockHour}:{String(clockMinute).padStart(2,'0')}</Text></View>{clockPositions.map(({h,x,y}) => <TouchableOpacity key={h} style={[styles.clockNumber, {left:x,top:y}, clockHour === h && styles.clockNumberActive]} onPress={() => setClockHour(h)}><Text style={[styles.clockNumberText, clockHour === h && styles.clockNumberTextActive]}>{h}</Text></TouchableOpacity>)}</View><View style={styles.clockRow}>{[0,15,30,45].map((minute) => <TouchableOpacity key={minute} style={[styles.clockChoice, clockMinute === minute && styles.clockChoiceActive]} onPress={() => setClockMinute(minute)}><Text>{String(minute).padStart(2,'0')}</Text></TouchableOpacity>)}{(['AM','PM'] as const).map((period) => <TouchableOpacity key={period} style={[styles.clockChoice, clockPeriod === period && styles.clockChoiceActive]} onPress={() => setClockPeriod(period)}><Text>{period}</Text></TouchableOpacity>)}</View><TouchableOpacity style={styles.modalSubmitButton} onPress={() => { setFormTime(`${String(clockHour).padStart(2,'0')}:${String(clockMinute).padStart(2,'0')} ${clockPeriod}`); setTimePickerVisible(false); }}><Text style={styles.modalSubmitText}>Confirm Time</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={datePickerVisible} transparent animationType="fade"><View style={styles.modalOverlay}><View style={styles.clockModal}><View style={styles.calendarNav}><TouchableOpacity disabled={calendarMonth <= new Date(today.getFullYear(), today.getMonth(), 1)} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()-1, 1))}><Ionicons name="chevron-back" size={22} color="#0D9488" /></TouchableOpacity><Text style={styles.modalTitle}>{calendarMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</Text><TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1, 1))}><Ionicons name="chevron-forward" size={22} color="#0D9488" /></TouchableOpacity></View><View style={styles.calendarGrid}>{['S','M','T','W','T','F','S'].map((x,i)=><Text key={i} style={styles.weekday}>{x}</Text>)}{calendarPadding.map((_,i)=><View key={`b${i}`} style={styles.day} />)}{calendarDays.map((day)=>{const date=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),day);const disabled=date<today;return <TouchableOpacity key={day} disabled={disabled} style={styles.day} onPress={()=>{setFormDate(formatDate(date));setDatePickerVisible(false)}}><Text style={[styles.dayText,disabled&&styles.dayDisabled]}>{day}</Text></TouchableOpacity>})}</View></View></View></Modal>

    </SafeAreaView>
  );
}

function AppointmentDetail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <View style={styles.detailField}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function formatTimestamp(value: unknown): string {
  const firestoreDate = typeof value === 'object' && value !== null && 'toDate' in value
    ? (value as { toDate(): Date }).toDate()
    : new Date(String(value));
  return Number.isNaN(firestoreDate.getTime()) ? '' : firestoreDate.toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  appShell: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    flexDirection: 'column',
  },
  topNavbar: {
    position: 'relative', zIndex: 100, elevation: 100,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    width: 300,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminProfileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    gap: 10,
  },
  avatarPlaceholderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  adminRole: {
    fontSize: 11,
    color: '#64748B',
  },
  scrollBody: {
    padding: 30,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  breadcrumb: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    fontWeight: '500',
  },
  pageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: '#0D9488',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 12,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  aptId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  aptDate: {
    fontSize: 12,
    color: '#64748B',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  midwifeText: {
    fontSize: 12,
    color: '#64748B',
  },
  openDetails: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 14 },
  openDetailsText: { color: '#0D9488', fontSize: 12, fontWeight: '700' },
  actionButtonSecondary: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionButtonSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 450,
  },
  detailModalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 560, maxHeight: '86%' },
  detailList: { gap: 15, paddingBottom: 4 },
  detailColumns: { flexDirection: 'row', gap: 18 },
  detailField: { flex: 1, minWidth: 0 },
  detailLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { color: '#0F172A', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  detailStatus: { alignSelf: 'flex-start' },
  detailActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 9, paddingTop: 18, marginTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  approveButton: { minHeight: 40, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D9488' },
  approveButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  cancelAppointmentButton: { minHeight: 40, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  cancelAppointmentText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
  deleteDetailButton: { minHeight: 40, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 'auto' },
  deleteDetailText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  confirmModalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 410, alignItems: 'center' },
  confirmIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  confirmText: { color: '#64748B', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  confirmSchedule: { color: '#0F172A', fontSize: 15, lineHeight: 23, textAlign: 'center', fontWeight: '800', marginTop: 10 },
  confirmActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', alignSelf: 'stretch', marginTop: 20 },
  modalCancelButton: { minHeight: 40, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  modalCancelText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  cancelModalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500 },
  cancelHelp: { color: '#64748B', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  reasonInput: { minHeight: 105 },
  disabledButton: { opacity: 0.5 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  modalPicker: { height: 44, borderWidth: 1, borderColor: '#CFE8E5', borderRadius: 10, backgroundColor: '#F8FFFE', overflow: 'hidden', justifyContent: 'center' },
  picker: { height: 44, color: '#0F172A', fontSize: 13 },
  clockInput: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#CFE8E5', borderRadius: 10, backgroundColor: '#F8FFFE', paddingHorizontal: 12 },
  clockInputText: { fontSize: 13, color: '#0F172A' },
  clockModal: { width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 22 },
  clockHours: { width: 190, height: 190, alignSelf: 'center', borderRadius: 95, borderWidth: 1, borderColor: '#99F6E4', backgroundColor: '#F0FDFA', position: 'relative', marginVertical: 14 },
  clockNumber: { position: 'absolute', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  clockNumberActive: { backgroundColor: '#0D9488' },
  clockNumberText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  clockNumberTextActive: { color: '#FFFFFF' },
  clockCenter: { position: 'absolute', left: 57, top: 67, width: 76, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  clockCenterText: { color: '#0D9488', fontSize: 16, fontWeight: '800' },
  calendarNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.285%', textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#64748B', paddingVertical: 7 },
  day: { width: '14.285%', height: 40, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  dayDisabled: { color: '#CBD5E1' },
  clockRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  clockChoice: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9' },
  clockChoiceActive: { backgroundColor: '#CCFBF1', borderWidth: 1, borderColor: '#0D9488' },
  patientContact: { fontSize: 11, color: '#64748B', marginTop: 2 },
  patientResults: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  patientResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  patientResultText: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  patientResultEmpty: { padding: 10, fontSize: 12, color: '#64748B' },
  selectedPatientInfo: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, padding: 8, borderRadius: 8, backgroundColor: '#ECFDF5' },
  selectedPatientText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  selectedPatientPhone: { fontSize: 11, color: '#64748B', marginTop: 1 },
  modalSubmitButton: {
    backgroundColor: '#0D9488',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
