import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Firebase Imports
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../src/config/firebase';

export default function PatientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('Medical History');
  
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);

  // --- CHECKUP MODAL STATES ---
  const [isCheckupModalVisible, setIsCheckupModalVisible] = useState(false);
  const [submittingCheckup, setSubmittingCheckup] = useState(false);
  const [visitNo, setVisitNo] = useState('');
  const [bp, setBp] = useState('');
  const [weight, setWeight] = useState('');
  const [fhb, setFhb] = useState('');
  const [gestationalAgeInput, setGestationalAgeInput] = useState('');
  const [staffNotes, setStaffNotes] = useState('');

  // --- MEDICAL HISTORY MODAL STATES ---
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [submittingHistory, setSubmittingHistory] = useState(false);
  const [historyTitle, setHistoryTitle] = useState('');
  const [historyNotes, setHistoryNotes] = useState('');

  // Open Checkup Modal
  const handleOpenCheckupModal = () => {
    const nextVisitNum = (patient?.prenatalVisits?.length || 0) + 1;
    setVisitNo(`Visit #${nextVisitNum}`);
    setBp('');
    setWeight('');
    setFhb('');
    setGestationalAgeInput(patient?.gestationalAge || '');
    setStaffNotes('');
    setIsCheckupModalVisible(true);
  };

  // Save new checkup to Firestore
  const handleSaveCheckup = async () => {
    if (!bp || !weight) {
      Alert.alert('Validation Error', 'Please fill in at least the Blood Pressure and Weight.');
      return;
    }

    try {
      setSubmittingCheckup(true);
      const targetId = Array.isArray(id) ? id[0] : id;
      const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const newVisitData = {
        visitNo: visitNo || `Visit #${(patient?.prenatalVisits?.length || 0) + 1}`,
        date: currentDate,
        bp,
        weight,
        fhb: fhb || 'N/A',
        gestationalAge: gestationalAgeInput,
        notes: staffNotes || 'Routine checkup completed.',
        createdAt: serverTimestamp(),
      };

      const visitsCollectionRef = collection(db, 'patients', targetId, 'prenatalVisits');
      await addDoc(visitsCollectionRef, newVisitData);

      setPatient((prev: any) => ({
        ...prev,
        gestationalAge: gestationalAgeInput || prev.gestationalAge,
        prenatalVisits: [newVisitData, ...(prev.prenatalVisits || [])]
      }));

      Alert.alert('Success', 'New checkup visit recorded successfully!');
      setIsCheckupModalVisible(false);
    } catch (error) {
      console.error('Error saving checkup visit:', error);
      Alert.alert('Error', 'Failed to save checkup record. Please try again.');
    } finally {
      setSubmittingCheckup(false);
    }
  };

  // Save new medical history to Firestore
  const handleSaveHistory = async () => {
    if (!historyTitle || !historyNotes) {
      Alert.alert('Validation Error', 'Please fill in both the title and clinical notes.');
      return;
    }

    try {
      setSubmittingHistory(true);
      const targetId = Array.isArray(id) ? id[0] : id;
      const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const newHistoryData = {
        title: historyTitle,
        date: currentDate,
        notes: historyNotes,
        createdAt: serverTimestamp(),
      };

      const historyColRef = collection(db, 'patients', targetId, 'medicalHistory');
      await addDoc(historyColRef, newHistoryData);

      setPatient((prev: any) => ({
        ...prev,
        medicalHistory: [newHistoryData, ...(prev.medicalHistory || [])]
      }));

      Alert.alert('Success', 'Medical history entry added successfully!');
      setIsHistoryModalVisible(false);
    } catch (error) {
      console.error('Error saving medical history:', error);
      Alert.alert('Error', 'Failed to save history record. Please try again.');
    } finally {
      setSubmittingHistory(false);
    }
  };

  useEffect(() => {
    const loadPatientDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const targetId = Array.isArray(id) ? id[0] : id;

        const docRef = doc(db, 'patients', targetId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          let gravidaVal = 1;
          let paraVal = 0;
          if (data.gravidaPara) {
            const matches = data.gravidaPara.match(/G(\d+)\s*P(\d+)/i);
            if (matches) {
              gravidaVal = parseInt(matches[1], 10);
              paraVal = parseInt(matches[2], 10);
            }
          }

          setPatient({
            id: data.uid || targetId,
            fullName: data.name || data.fullName || 'Unknown Patient',
            age: data.age || 21,
            dob: data.dob || 'January 1, 2000',
            bloodType: data.bloodType || 'O+',
            contactNumber: data.contactNumber || data.email || 'N/A',
            address: data.address || 'Imus, Cavite',
            status: data.status || 'Routine',
            statusColor: data.flagColor || '#10B981',
            gravida: gravidaVal,
            para: paraVal,
            gestationalAge: data.pregnancyWeek ? `${data.pregnancyWeek} weeks` : '25 weeks',
            expectedDueDate: data.edd || 'October 25, 2026',
            assignedMidwife: data.assignedMidwife || 'Midwife Staff',
            
            medicalHistory: data.medicalHistory || [
              { date: data.lastVisit || 'Sept 17, 2026', title: 'Intake / Initial Assessment', notes: 'Patient registered into lying-in system.' }
            ],
            prenatalVisits: data.prenatalVisits || [
              { visitNo: 'Visit #1', date: data.lastVisit || data.date, bp: data.bp, weight: data.weight, fhb: data.fhb, notes: data.notes }
            ],
            financialRecords: data.financialRecords || []
          });
        } else {
          setPatient({
            id: targetId,
            fullName: 'N/A',
            age: 'N/A',
            dob: 'N/A',
            bloodType: 'N/A',
            contactNumber: 'N/A',
            address: 'N/A',
            status: 'N/A',
            statusColor: '#F59E0B',
            gravida: 1,
            para: 0,
            gestationalAge: 'N/A',
            expectedDueDate: 'N/A',
            assignedMidwife: 'N/A',
            medicalHistory: [{ date: 'N/A', title: 'N/A', notes: 'N/A' }],
            prenatalVisits: [{ visitNo: 'N/A', date: 'N/A', bp: 'N/A', weight: 'N/A', fhb: 'N/A', notes: 'N/A' }],
            financialRecords: []
          });
        }
      } catch (error) {
        console.error('Error loading patient details from Firestore:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPatientDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={{ marginTop: 10, color: '#64748B', fontWeight: '600' }}>Loading patient clinical records...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.appShell}>
        {/* Left Sidebar Menu */}
        <View style={styles.sidebar}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIconBox}>
              <Ionicons name="medical" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>Lying-In Clinic</Text>
          </View>

          <Text style={styles.navCategory}>Main Menu</Text>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.8} onPress={() => router.push('/(admin)/dashboard' as any)}>
            <Ionicons name="grid-outline" size={18} color="#64748B" style={styles.navIcon} />
            <Text style={styles.navText}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.navItem, styles.navItemActive]} activeOpacity={0.8} onPress={() => router.push('/(admin)/patients' as any)}>
            <Ionicons name="people" size={18} color="#0D9488" style={styles.navIcon} />
            <Text style={[styles.navText, styles.navTextActive]}>Patients</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} activeOpacity={0.8} onPress={() => router.push('/(admin)/appointments' as any)}>
            <Ionicons name="calendar-outline" size={18} color="#64748B" style={styles.navIcon} />
            <Text style={styles.navText}>Appointments</Text>
          </TouchableOpacity>

          <Text style={styles.navCategory}>Other Menu</Text>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.8} onPress={() => router.push('/(admin)/inventory' as any)}>
            <Ionicons name="medkit-outline" size={18} color="#64748B" style={styles.navIcon} />
            <Text style={styles.navText}>Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} activeOpacity={0.8} onPress={() => router.push('/(admin)/payments' as any)}>
            <Ionicons name="wallet-outline" size={18} color="#64748B" style={styles.navIcon} />
            <Text style={styles.navText}>Financial Tracking</Text>
          </TouchableOpacity>

          <Text style={styles.navCategory}>Help & Settings</Text>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.8} onPress={() => router.replace('/(auth)/login' as any)}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" style={styles.navIcon} />
            <Text style={[styles.navText, { color: '#EF4444' }]}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          <View style={styles.topNavbar}>
            <TouchableOpacity 
              style={styles.backButtonRow} 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(admin)/patients' as any);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color="#0D9488" />
              <Text style={styles.backButtonText}>Back to Patients</Text>
            </TouchableOpacity>

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
            <Text style={styles.breadcrumb}>Patients &gt; <Text style={{ color: '#0F172A' }}>{patient?.fullName}</Text></Text>

            {/* Patient Header Summary Card */}
            <View style={styles.profileHeaderCard}>
              <View style={styles.profileTopRow}>
                <View style={styles.profileAvatarBox}>
                  <Text style={styles.profileAvatarText}>
                    {patient?.fullName ? patient.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : 'ER'}
                  </Text>
                </View>
                
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.profileName}>{patient?.fullName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${patient?.statusColor}15` }]}>
                      <View style={[styles.statusDot, { backgroundColor: patient?.statusColor }]} />
                      <Text style={[styles.statusText, { color: patient?.statusColor }]}>{patient?.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.profileSubId}>ID: {patient?.id} • DOB: {patient?.dob} ({patient?.age} yrs old)</Text>
                </View>

                <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
                  <Ionicons name="create-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Contact Number</Text>
                  <Text style={styles.metaValue}>63+{patient?.contactNumber}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Blood Type</Text>
                  <Text style={styles.metaValue}>{patient?.bloodType}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Gravida / Para</Text>
                  <Text style={styles.metaValue}>G{patient?.gravida} P{patient?.para}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Gestational Age / EDD</Text>
                  <Text style={styles.metaValue}>{patient?.gestationalAge} (Due: {patient?.expectedDueDate})</Text>
                </View>
              </View>
            </View>

            {/* Navigation Tabs */}
            <View style={styles.tabRow}>
              {['Medical History', 'Prenatal & Checkups', 'Financial Assistance'].map(tab => (
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

            {/* Tab Content Display */}
            {activeTab === 'Medical History' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Clinical & Obstetric History</Text>
                  <TouchableOpacity 
                    style={styles.secondaryButton} 
                    onPress={() => {
                      setHistoryTitle('');
                      setHistoryNotes('');
                      setIsHistoryModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={14} color="#0D9488" style={{ marginRight: 4 }} />
                    <Text style={styles.secondaryButtonText}>Add History Entry</Text>
                  </TouchableOpacity>
                </View>

                {patient?.medicalHistory?.map((item: any, index: number) => (
                  <View key={index} style={styles.historyCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={styles.historyTitle}>{item.title}</Text>
                      <Text style={styles.historyDate}>{item.date}</Text>
                    </View>
                    <Text style={styles.historyNotes}>{item.notes}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'Prenatal & Checkups' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Prenatal Consultation Logs</Text>
                  <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenCheckupModal} activeOpacity={0.8}>
                    <Ionicons name="add" size={14} color="#0D9488" style={{ marginRight: 4 }} />
                    <Text style={styles.secondaryButtonText}>New Checkup Visit</Text>
                  </TouchableOpacity>
                </View>

                {patient?.prenatalVisits?.map((visit: any, index: number) => (
                  <View key={index} style={styles.visitCard}>
                    <View style={styles.visitCardHeader}>
                      <Text style={styles.visitName}>{visit.visitNo || `Visit #${index + 1}`}</Text>
                      <Text style={styles.visitDate}>{visit.date}</Text>
                    </View>
                    
                    <View style={styles.vitalsRow}>
                      <View style={styles.vitalBadge}>
                        <Text style={styles.vitalLabel}>BP:</Text>
                        <Text style={styles.vitalVal}>{visit.bp || '120/80'}</Text>
                      </View>
                      <View style={styles.vitalBadge}>
                        <Text style={styles.vitalLabel}>Weight:</Text>
                        <Text style={styles.vitalVal}>{visit.weight || 'N/A'}</Text>
                      </View>
                      <View style={styles.vitalBadge}>
                        <Text style={styles.vitalLabel}>FHB:</Text>
                        <Text style={styles.vitalVal}>{visit.fhb || 'N/A'}</Text>
                      </View>
                    </View>

                    <Text style={styles.visitNotes}><Text style={{fontWeight: '700', color: '#0F172A'}}>Staff / Midwife Notes:</Text> {visit.notes}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'Financial Assistance' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Patient Expenses & Government Assistance</Text>
                  <TouchableOpacity style={styles.secondaryButton}>
                    <Ionicons name="add" size={14} color="#0D9488" style={{ marginRight: 4 }} />
                    <Text style={styles.secondaryButtonText}>Add Expense Record</Text>
                  </TouchableOpacity>
                </View>

                {patient?.financialRecords && patient.financialRecords.length > 0 ? (
                  patient.financialRecords.map((fin: any, index: number) => (
                    <View key={index} style={styles.financialBoxCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Text style={styles.finId}>{fin.id} • {fin.date}</Text>
                        <Text style={[styles.finStatus, { color: '#F59E0B' }]}>{fin.status}</Text>
                      </View>

                      <View style={styles.breakdownGrid}>
                        <View style={styles.breakdownColumn}>
                          <Text style={styles.columnTitle}>Itemized Expenses</Text>
                          {fin.items?.map((it: any, idx: number) => (
                            <View key={idx} style={styles.rowItem}>
                              <Text style={styles.rowItemName}>{it.name}</Text>
                              <Text style={styles.rowItemAmount}>{it.amount}</Text>
                            </View>
                          ))}
                          <View style={[styles.rowItem, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                            <Text style={styles.totalRowText}>Total</Text>
                            <Text style={styles.totalRowAmount}>{fin.totalAmount}</Text>
                          </View>
                        </View>

                        <View style={styles.breakdownColumnSecondary}>
                          <Text style={styles.columnTitle}>Assistance & Balance</Text>
                          {fin.assistance?.map((asst: any, idx: number) => (
                            <View key={idx} style={styles.rowItem}>
                              <Text style={styles.rowItemName}>{asst.provider} ({asst.status})</Text>
                              <Text style={[styles.rowItemAmount, { color: '#0D9488' }]}>{asst.amount}</Text>
                            </View>
                          ))}
                          <View style={[styles.balanceBox, { marginTop: 8 }]}>
                            <Text style={styles.balanceLabel}>Patient Balance:</Text>
                            <Text style={styles.balanceValue}>{fin.patientBalance}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.historyCard}>
                    <Text style={styles.historyNotes}>No financial records found for this patient.</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ================= NEW CHECKUP VISIT MODAL ================= */}
      <Modal
        visible={isCheckupModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCheckupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="fitness-outline" size={18} color="#0D9488" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>New Checkup Visit</Text>
                  <Text style={styles.modalSubtitle}>Record clinical vitals for {patient?.fullName}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsCheckupModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Visit Label / Sequence</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Visit #2 or Follow-up"
                  value={visitNo}
                  onChangeText={setVisitNo}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Blood Pressure (BP) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="120/80 mmHg"
                    value={bp}
                    onChangeText={setBp}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Weight *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 62 kg"
                    value={weight}
                    onChangeText={setWeight}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Fetal Heartbeat (FHB)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 140 bpm"
                    value={fhb}
                    onChangeText={setFhb}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Gestational Age</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 28 weeks"
                    value={gestationalAgeInput}
                    onChangeText={setGestationalAgeInput}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Staff or Midwife Notes / Observations</Text>
                <TextInput
                  style={[styles.textInput, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="Enter clinical observations, supplement prescriptions, or advisory notes..."
                  value={staffNotes}
                  onChangeText={setStaffNotes}
                  multiline={true}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setIsCheckupModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalSubmitButton} 
                onPress={handleSaveCheckup}
                disabled={submittingCheckup}
                activeOpacity={0.8}
              >
                {submittingCheckup ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSubmitText}>Save Checkup Visit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= ADD MEDICAL HISTORY MODAL ================= */}
      <Modal
        visible={isHistoryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="document-text-outline" size={18} color="#0D9488" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Add Clinical History</Text>
                  <Text style={styles.modalSubtitle}>Record a new history note for {patient?.fullName}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Entry Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Ultrasound Results or Laboratory Screening"
                  value={historyTitle}
                  onChangeText={setHistoryTitle}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Clinical Notes & Findings *</Text>
                <TextInput
                  style={[styles.textInput, { height: 110, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="Enter detailed clinical remarks or diagnosis notes..."
                  value={historyNotes}
                  onChangeText={setHistoryNotes}
                  multiline={true}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setIsHistoryModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalSubmitButton} 
                onPress={handleSaveHistory}
                disabled={submittingHistory}
                activeOpacity={0.8}
              >
                {submittingHistory ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSubmitText}>Save History</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  appShell: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 240, backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: '#E2E8F0', paddingVertical: 24, paddingHorizontal: 16 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, paddingHorizontal: 8 },
  logoIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#0D9488', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  logoText: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  navCategory: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 10, paddingHorizontal: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  navItemActive: { backgroundColor: '#CCFBF1' },
  navIcon: { marginRight: 12 },
  navText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  navTextActive: { color: '#0D9488', fontWeight: '700' },
  mainContent: { flex: 1, backgroundColor: '#F8FAFC', flexDirection: 'column' },
  topNavbar: { height: 70, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30 },
  backButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backButtonText: { fontSize: 13, fontWeight: '700', color: '#0D9488' },
  topNavRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topIconButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  adminProfileBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#E2E8F0', gap: 10 },
  avatarPlaceholderBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#CCFBF1', justifyContent: 'center', alignItems: 'center' },
  adminName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  adminRole: { fontSize: 11, color: '#64748B' },
  scrollBody: { padding: 30, maxWidth: 1100, alignSelf: 'center', width: '100%' },
  breadcrumb: { fontSize: 13, color: '#64748B', marginBottom: 16, fontWeight: '500' },
  profileHeaderCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  profileTopRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileAvatarBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#CCFBF1', justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: 20, fontWeight: '800', color: '#0D9488' },
  profileName: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  profileSubId: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  metaGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  metaItem: { flex: 1, minWidth: 200 },
  metaLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  primaryButton: { backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tabButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  tabButtonActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabButtonTextActive: { color: '#FFFFFF' },
  sectionContainer: { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#CCFBF1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  secondaryButtonText: { fontSize: 12, fontWeight: '700', color: '#0D9488' },
  historyCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  historyTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  historyDate: { fontSize: 12, color: '#64748B' },
  historyNotes: { fontSize: 13, color: '#475569', marginTop: 4 },
  visitCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  visitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  visitName: { fontSize: 14, fontWeight: '800', color: '#0D9488' },
  visitDate: { fontSize: 12, color: '#64748B' },
  vitalsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  vitalBadge: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 },
  vitalLabel: { fontSize: 12, color: '#64748B' },
  vitalVal: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  visitNotes: { fontSize: 13, color: '#475569' },
  financialBoxCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  finId: { fontSize: 13, fontWeight: '700', color: '#0D9488' },
  finStatus: { fontSize: 12, fontWeight: '700' },
  breakdownGrid: { flexDirection: 'row', gap: 16 },
  breakdownColumn: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  breakdownColumnSecondary: { flex: 1, backgroundColor: '#F0FDFA', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#CCFBF1' },
  columnTitle: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: 8 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rowItemName: { fontSize: 12, color: '#334155', fontWeight: '500' },
  rowItemAmount: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  totalRowText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  totalRowAmount: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  balanceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#99F6E4' },
  balanceLabel: { fontSize: 11, fontWeight: '700', color: '#0F766E' },
  balanceValue: { fontSize: 14, fontWeight: '900', color: '#0F766E' },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFormBody: {
    padding: 20,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitButton: {
    flexDirection: 'row',
    backgroundColor: '#0D9488',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});