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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Firebase Imports for adding patients, data fetching, and mutations
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../src/config/firebase';

export default function PatientsListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Adding New Patient
  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [gravidaPara, setGravidaPara] = useState('G1 P0');
  const [pregnancyWeek, setPregnancyWeek] = useState('');
  const [edd, setEdd] = useState('');
  
  // New Clinical Vital Signs State
  const [weight, setWeight] = useState('');
  const [bp, setBp] = useState('');
  const [fhb, setFhb] = useState('');

  const [status, setStatus] = useState('Routine');
  const [flagColor, setFlagColor] = useState('#10B981');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Patients from Firestore on Mount
  const fetchPatients = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'patients'));
      const list: any[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Fallback mock data if collection is empty for quick preview
      if (list.length === 0) {
        setPatients([
          { id: '1', name: 'Maria Santos', age: 28, contactNumber: '+63 917 123 4567', bloodType: 'B+', gravidaPara: 'G2 P1', pregnancyWeek: 31, edd: 'Oct 18, 2026', weight: '58 kg', bp: '120/80', fhb: '140 bpm', status: 'Review Required', flagColor: '#EF4444', lastVisit: 'Sept 7, 2026' },
          { id: '2', name: 'Ana Reyes', age: 24, contactNumber: '+63 918 987 6543', bloodType: 'A+', gravidaPara: 'G1 P0', pregnancyWeek: 24, edd: 'Nov 12, 2026', weight: '54 kg', bp: '110/70', fhb: '138 bpm', status: 'Routine', flagColor: '#10B981', lastVisit: 'Sept 10, 2026' },
        ]);
      } else {
        setPatients(list);
      }
    } catch (error) {
      console.log('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Handle Marking a Patient as Completed/Delivered
  const handleCompletePatient = async (id: string) => {
    try {
      const patientRef = doc(db, 'patients', id);
      await updateDoc(patientRef, {
        status: 'Completed / Delivered',
        flagColor: '#10B981', // Green indicator
      });
      fetchPatients();
    } catch (error) {
      console.log('Error updating patient status:', error);
    }
  };

  // Handle Deleting a Patient Record
  const handleDeletePatient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'patients', id));
      fetchPatients();
    } catch (error) {
      console.log('Error deleting patient:', error);
    }
  };

  // Handle Registering a New Patient
  const handleAddPatient = async () => {
    if (!fullName || !email || !password || !age || !contactNumber || !bloodType || !gravidaPara || !pregnancyWeek || !edd || !weight || !bp || !fhb) {
      setErrorMsg('Please fill in all required fields, including vitals (Weight, BP, FHB).');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Create Authentication user with role=patient
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Insert into users collection with role = 'patient'
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        fullName: fullName,
        role: 'patient',
        createdAt: new Date().toISOString(),
      });

      const currentDateString = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // 3. Insert into patients clinical collection with expanded profile & initial vitals log
      const patientRecord = {
        uid: user.uid,
        name: fullName,
        email: email,
        age: Number(age),
        contactNumber: contactNumber,
        bloodType: bloodType,
        gravidaPara: gravidaPara,
        pregnancyWeek: Number(pregnancyWeek),
        edd: edd,
        weight: weight,
        bp: bp,
        fhb: fhb,
        status: status,
        flagColor: flagColor,
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

      await setDoc(doc(db, 'patients', user.uid), patientRecord);

      // Reset Form and Refresh list
      setSubmitting(false);
      setModalVisible(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setAge('');
      setContactNumber('');
      setBloodType('O+');
      setGravidaPara('G1 P0');
      setPregnancyWeek('');
      setEdd('');
      setWeight('');
      setBp('');
      setFhb('');
      fetchPatients();
    } catch (error: any) {
      setSubmitting(false);
      setErrorMsg(error.message || 'Failed to register patient.');
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Outer App Shell Container */}
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

          <TouchableOpacity style={[styles.navItem, styles.navItemActive]} activeOpacity={0.8}>
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
          
          {/* Top Navigation Bar */}
          <View style={styles.topNavbar}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput 
                placeholder="Search patient name, vitals..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

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

          {/* Scrollable Body */}
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            
            <Text style={styles.breadcrumb}>Dashboard &gt; <Text style={{ color: '#0F172A' }}>Patient Records</Text></Text>

            <View style={styles.pageHeaderRow}>
              <View>
                <Text style={styles.pageTitle}>Patient Records</Text>
                <Text style={styles.pageSub}>Showing {filteredPatients.length} registered patients</Text>
              </View>
              
              <View style={styles.headerRightActions}>
                <View style={styles.aiFilterLabel}>
                  <Text style={styles.aiFilterText}>AI Prioritized</Text>
                </View>
                <TouchableOpacity 
                  style={styles.primaryButton} 
                  activeOpacity={0.8}
                  onPress={() => setModalVisible(true)}
                >
                  <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryButtonText}>Add New Patient</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Patient Cards List */}
            <View style={styles.listContainer}>
              {filteredPatients.map(patient => (
                <View key={patient.id} style={styles.patientCard}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push(`/(admin)/patients/${patient.id}` as any)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.patientInfoWrapper}>
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>{patient.name?.charAt(0)}</Text>
                        </View>
                        <View>
                          <Text style={styles.patientName}>{patient.name}</Text>
                          <Text style={styles.patientSub}>Age: {patient.age} • {patient.pregnancyWeek} Weeks Pregnant</Text>
                        </View>
                      </View>
                      
                      {/* AI Status Badge */}
                      <View style={[styles.statusBadge, { backgroundColor: `${patient.flagColor || '#10B981'}15` }]}>
                        <View style={[styles.statusDot, { backgroundColor: patient.flagColor || '#10B981' }]} />
                        <Text style={[styles.statusText, { color: patient.flagColor || '#10B981' }]}>{patient.status}</Text>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardFooter}>
                      <View style={styles.footerInfoItem}>
                        <Ionicons name="call-outline" size={14} color="#64748B" />
                        <Text style={styles.footerInfoText}>{patient.contactNumber || 'N/A'}</Text>
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

                  {/* Action Buttons Row: Complete & Delete */}
                  <View style={styles.cardActionRow}>
                    <TouchableOpacity 
                      style={styles.completeActionButton} 
                      onPress={() => handleCompletePatient(patient.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color="#0D9488" style={{ marginRight: 4 }} />
                      <Text style={styles.completeActionText}>Mark Completed</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.deleteActionButton} 
                      onPress={() => handleDeletePatient(patient.id)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={styles.deleteActionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

          </ScrollView>

        </View>

      </View>

      {/* Modal for Registering New Patient */}
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
              <TextInput
                style={styles.input}
                placeholder="e.g. Roshan Sevillena"
                placeholderTextColor="#94A3B8"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.inputLabel}>Email Address (For Mobile Portal Login)</Text>
              <TextInput
                style={styles.input}
                placeholder="patient@email.com"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.inputLabel}>Temporary Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="23"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={age}
                    onChangeText={setAge}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Contact Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+63 919..."
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={contactNumber}
                    onChangeText={setContactNumber}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Blood Type</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. O+"
                    placeholderTextColor="#94A3B8"
                    value={bloodType}
                    onChangeText={setBloodType}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Gravida / Para</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. G1 P0"
                    placeholderTextColor="#94A3B8"
                    value={gravidaPara}
                    onChangeText={setGravidaPara}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Pregnancy Week</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="25"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={pregnancyWeek}
                    onChangeText={setPregnancyWeek}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Estimated Due Date (EDD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Dec 15, 2026"
                    placeholderTextColor="#94A3B8"
                    value={edd}
                    onChangeText={setEdd}
                  />
                </View>
              </View>

              {/* Initial Vital Signs Section */}
              <Text style={styles.sectionDividerLabel}>Initial Vital Signs</Text>
              
              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.inputLabel}>Weight</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 58 kg"
                    placeholderTextColor="#94A3B8"
                    value={weight}
                    onChangeText={setWeight}
                  />
                </View>
                <View style={{ flex: 1, marginHorizontal: 6 }}>
                  <Text style={styles.inputLabel}>Blood Pressure (BP)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 120/80"
                    placeholderTextColor="#94A3B8"
                    value={bp}
                    onChangeText={setBp}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.inputLabel}>Fetal Heartbeat (FHB)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 140 bpm"
                    placeholderTextColor="#94A3B8"
                    value={fhb}
                    onChangeText={setFhb}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Clinical Status & Priority</Text>
              <View style={styles.statusSelectRow}>
                <TouchableOpacity 
                  style={[styles.statusOptionBtn, status === 'Routine' && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                  onPress={() => { setStatus('Routine'); setFlagColor('#10B981'); }}
                >
                  <Text style={[styles.statusOptionText, status === 'Routine' && { color: '#FFF' }]}>Routine</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.statusOptionBtn, status === 'Follow-up' && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }]}
                  onPress={() => { setStatus('Follow-up'); setFlagColor('#F59E0B'); }}
                >
                  <Text style={[styles.statusOptionText, status === 'Follow-up' && { color: '#FFF' }]}>Follow-up</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.statusOptionBtn, status === 'Review Required' && { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
                  onPress={() => { setStatus('Review Required'); setFlagColor('#EF4444'); }}
                >
                  <Text style={[styles.statusOptionText, status === 'Review Required' && { color: '#FFF' }]}>High Risk</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.submitButton} 
                activeOpacity={0.8}
                onPress={handleAddPatient}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Save & Create Patient Account</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
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
  sidebar: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  logoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  navCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#CCFBF1',
  },
  navIcon: {
    marginRight: 12,
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  navTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    flexDirection: 'column',
  },
  topNavbar: {
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
    marginBottom: 24,
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiFilterLabel: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  aiFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
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
  listContainer: {
    gap: 12,
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
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
  patientInfoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D9488',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
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
    flexWrap: 'wrap',
    gap: 20,
  },
  footerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerInfoText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '500',
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    gap: 10,
  },
  completeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completeActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  deleteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '500',
  },
  modalForm: {
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  sectionDividerLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
    marginTop: 18,
    marginBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  statusSelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statusOptionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButton: {
    backgroundColor: '#0D9488',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});