import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, TouchableOpacity, Modal, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePatientClinicalRecord } from '../../src/hooks/usePatientClinicalRecord';
import { useAuth } from '../../src/hooks/useAuth';
import { subscribePatientAppointments } from '../../src/services/appointmentService';
import { Appointment } from '../../src/models/Appointment';
import { appointmentMillis } from '../../src/utils/patientAppointments';
import { BloodPressureChart } from '../../components/BloodPressureChart';
import { CareButton, CareCard, CareHeader, s } from '../../components/care/CareUI';
import { Ionicons } from '@expo/vector-icons';

export default function ProgressScreen() {
  const router = useRouter(); 
  const { firebaseUser } = useAuth();
  const { patient, loading, error, refresh } = usePatientClinicalRecord();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentError, setAppointmentError] = useState(''); 
  const [retry, setRetry] = useState(0);

  // Modal and inline collapse/expand states for the 4 lists
  const [showAllBpModal, setShowAllBpModal] = useState(false);
  const [showAllBpInline, setShowAllBpInline] = useState(false);

  const [showAllWeightModal, setShowAllWeightModal] = useState(false);
  const [showAllWeightInline, setShowAllWeightInline] = useState(false);

  const [showAllVisitsModal, setShowAllVisitsModal] = useState(false);
  const [showAllVisitsInline, setShowAllVisitsInline] = useState(false);

  const [showAllRecordsModal, setShowAllRecordsModal] = useState(false);
  const [showAllRecordsInline, setShowAllRecordsInline] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribePatientAppointments(
      firebaseUser.uid, 
      items => { setAppointments(items); setAppointmentError(''); }, 
      () => setAppointmentError('Appointments could not be loaded.')
    );
  }, [firebaseUser?.uid, retry]);

  const visits = [...(patient?.prenatalVisits || [])].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  const weightItems = [...visits].reverse().filter(item => item.weight && Number(item.weight) > 0);
  const medicalHistory = patient?.medicalHistory || [];

  const weeks = patient?.pregnancyWeek == null || patient.pregnancyWeek === '' ? null : Number(patient.pregnancyWeek);
  const validWeeks = weeks !== null && Number.isFinite(weeks) && weeks >= 0;
  const upcoming = appointments.filter(item => !['completed', 'cancelled', 'canceled'].includes(String(item.status).toLowerCase()) && appointmentMillis(item) > Date.now()).sort((a,b) => appointmentMillis(a) - appointmentMillis(b));

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'left', 'right']}>
      <CareHeader title="My prenatal progress" />
      <ScrollView 
        contentContainerStyle={s.content} 
        refreshControl={
          <RefreshControl refreshing={loading && !patient} onRefresh={() => { refresh(); setRetry(value => value + 1); }} />
        }
      >
        {!!error && <Text style={s.error}>{error}</Text>}
        {loading && !patient ? (
          <ActivityIndicator style={{ marginVertical: 40 }} color="#0D9488" />
        ) : !patient ? (
          <CareCard title="No patient record available" subtitle="Your clinic records will appear here once linked to your account." />
        ) : (
          <>
            {/* Pregnancy Overview */}
            <CareCard title="Pregnancy overview" subtitle="Latest information recorded by your clinic">
              <View style={localStyles.overviewBox}>
                <View style={localStyles.overviewItem}>
                  <Text style={localStyles.overviewLabel}>Gestational Age</Text>
                  <Text style={localStyles.overviewValue}>{validWeeks ? `${weeks} weeks` : visits[0]?.gestationalAge || 'Not recorded'}</Text>
                </View>
                <View style={localStyles.overviewDivider} />
                <View style={localStyles.overviewItem}>
                  <Text style={localStyles.overviewLabel}>Expected Delivery</Text>
                  <Text style={localStyles.overviewValue}>{patient.edd || 'Not recorded'}</Text>
                </View>
              </View>

              {validWeeks && (
                <View style={{ marginVertical: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>Progress</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0D9488' }}>{weeks} of 40 weeks</Text>
                  </View>
                  <View accessibilityLabel={`${weeks} of 40 weeks`} style={{ height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: 5, backgroundColor: '#0D9488', width: `${Math.min(100, weeks / 40 * 100)}%` }} />
                  </View>
                </View>
              )}

              <View style={localStyles.metaRow}>
                <View style={localStyles.metaChip}>
                  <Ionicons name="medical-outline" size={14} color="#0D9488" />
                  <Text style={localStyles.metaChipText}>Visits: {visits.length}</Text>
                </View>
                <View style={localStyles.metaChip}>
                  <Ionicons name="water-outline" size={14} color="#E11D48" />
                  <Text style={localStyles.metaChipText}>Blood Type: {patient.bloodType || 'N/A'}</Text>
                </View>
              </View>
            </CareCard>

            <BloodPressureChart visits={visits} />

            {/* Blood Pressure History List */}
            <CareCard title="Blood Pressure History">
              {visits.length > 3 && (
                <View style={localStyles.cardHeaderAction}>
                  <TouchableOpacity onPress={() => setShowAllBpInline(!showAllBpInline)} style={localStyles.actionLinkBtn}>
                    <Text style={localStyles.actionLinkText}>{showAllBpInline ? 'Show less' : 'Shrink'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowAllBpModal(true)} style={localStyles.actionLinkBtnPrimary}>
                    <Text style={localStyles.actionLinkTextPrimary}>See all</Text>
                  </TouchableOpacity>
                </View>
              )}
              {visits.length ? (
                (showAllBpInline ? visits : visits.slice(0, 3)).map((item, index) => (
                  <View key={item.id || index} style={localStyles.rowCardItem}>
                    <View style={localStyles.rowIconContainer}>
                      <Ionicons name="pulse" size={16} color="#0D9488" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={localStyles.rowTitle}>BP: {item.bp || item.bloodPressure || 'N/A'}</Text>
                      <Text style={localStyles.rowSubtitle}>{item.date || 'Date not recorded'}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={s.muted}>No blood pressure measurements recorded.</Text>
              )}
            </CareCard>

            {/* Weight History List */}
            <CareCard title="Weight history">
              {weightItems.length > 3 && (
                <View style={localStyles.cardHeaderAction}>
                  <TouchableOpacity onPress={() => setShowAllWeightInline(!showAllWeightInline)} style={localStyles.actionLinkBtn}>
                    <Text style={localStyles.actionLinkText}>{showAllWeightInline ? 'Show less' : 'Shrink'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowAllWeightModal(true)} style={localStyles.actionLinkBtnPrimary}>
                    <Text style={localStyles.actionLinkTextPrimary}>See all</Text>
                  </TouchableOpacity>
                </View>
              )}
              {weightItems.length ? (
                (showAllWeightInline ? weightItems : weightItems.slice(0, 3)).map((item, index) => (
                  <View key={item.id || index} style={localStyles.rowCardItem}>
                    <View style={[localStyles.rowIconContainer, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="scale-outline" size={16} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={localStyles.rowTitle}>{item.weight} kg</Text>
                      <Text style={localStyles.rowSubtitle}>{item.date || 'Date not recorded'}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={s.muted}>No weight measurements recorded.</Text>
              )}
            </CareCard>

            {/* Prenatal Visits History List */}
            <CareCard title="Prenatal visits">
              {visits.length > 3 && (
                <View style={localStyles.cardHeaderAction}>
                  <TouchableOpacity onPress={() => setShowAllVisitsInline(!showAllVisitsInline)} style={localStyles.actionLinkBtn}>
                    <Text style={localStyles.actionLinkText}>{showAllVisitsInline ? 'Show less' : 'Shrink'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowAllVisitsModal(true)} style={localStyles.actionLinkBtnPrimary}>
                    <Text style={localStyles.actionLinkTextPrimary}>See all</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!visits.length && <Text style={s.muted}>No prenatal visits recorded yet.</Text>}
              {(showAllVisitsInline ? visits : visits.slice(0, 3)).map((visit, index) => (
                <View key={visit.id || index} style={localStyles.expandedItemCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={localStyles.visitTitle}>{visit.visitNo || 'Prenatal visit'}</Text>
                    <Text style={localStyles.visitDate}>{visit.date || 'Date not recorded'}</Text>
                  </View>
                  <Text style={localStyles.rowSubtitle}>Gestational age: {visit.gestationalAge || 'Not recorded'}</Text>
                  <View style={localStyles.visitBadgeRow}>
                    <Text style={localStyles.visitBadgeText}>BP: {visit.bp || visit.bloodPressure || 'N/A'}</Text>
                    <Text style={localStyles.visitBadgeText}>Weight: {visit.weight ? `${visit.weight} kg` : 'N/A'}</Text>
                  </View>
                  {!!visit.notes && <Text style={localStyles.visitNotes}>"{visit.notes}"</Text>}
                </View>
              ))}
            </CareCard>

            {/* Recent Health Records History List */}
            <CareCard title="Recent health records">
              {medicalHistory.length > 3 && (
                <View style={localStyles.cardHeaderAction}>
                  <TouchableOpacity onPress={() => setShowAllRecordsInline(!showAllRecordsInline)} style={localStyles.actionLinkBtn}>
                    <Text style={localStyles.actionLinkText}>{showAllRecordsInline ? 'Show less' : 'Shrink'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowAllRecordsModal(true)} style={localStyles.actionLinkBtnPrimary}>
                    <Text style={localStyles.actionLinkTextPrimary}>See all</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!medicalHistory.length && <Text style={s.muted}>No health records recorded yet.</Text>}
              {(showAllRecordsInline ? medicalHistory : medicalHistory.slice(0, 3)).map((item, index) => (
                <View key={item.id || index} style={localStyles.expandedItemCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={localStyles.visitTitle}>{item.title}</Text>
                    <Text style={localStyles.visitDate}>{item.date || 'Date not recorded'}</Text>
                  </View>
                  <Text style={localStyles.visitNotes}>{item.notes || 'No additional notes.'}</Text>
                </View>
              ))}
            </CareCard>
          </>
        )}

        {/* Upcoming Appointments Card */}
        <CareCard title="Upcoming appointments">
          {!!appointmentError && <Text style={s.error}>{appointmentError}</Text>}
          {!appointmentError && !upcoming.length && <Text style={s.muted}>No upcoming appointments.</Text>}
          {upcoming.map(item => (
            <View key={item.id} style={localStyles.appointmentCard}>
              <View style={localStyles.rowIconContainer}>
                <Ionicons name="calendar-outline" size={16} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={localStyles.rowTitle}>{item.purpose || item.service || 'Appointment'}</Text>
                <Text style={localStyles.rowSubtitle}>{item.appointmentDate || item.date} at {item.appointmentTime || item.time}</Text>
              </View>
              <View style={localStyles.statusBadge}>
                <Text style={localStyles.statusText}>{item.status}</Text>
              </View>
            </View>
          ))}
          <View style={{ marginTop: 12 }}>
            <CareButton label="Manage appointments" onPress={() => router.push('/(patient)/appointments')} />
          </View>
        </CareCard>
      </ScrollView>

      {/* MODALS */}
      {/* 1. BP Modal */}
      <Modal visible={showAllBpModal} animationType="slide" transparent={true} onRequestClose={() => setShowAllBpModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>All Blood Pressure History</Text>
              <TouchableOpacity onPress={() => setShowAllBpModal(false)}><Ionicons name="close" size={22} color="#0F172A" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={modalStyles.scroll}>
              {visits.map((item, index) => (
                <View key={item.id || index} style={localStyles.rowCardItem}>
                  <View style={localStyles.rowIconContainer}>
                    <Ionicons name="pulse" size={16} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={localStyles.rowTitle}>BP: {item.bp || item.bloodPressure || 'N/A'}</Text>
                    <Text style={localStyles.rowSubtitle}>{item.date || 'Date not recorded'}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. Weight Modal */}
      <Modal visible={showAllWeightModal} animationType="slide" transparent={true} onRequestClose={() => setShowAllWeightModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>All Weight History</Text>
              <TouchableOpacity onPress={() => setShowAllWeightModal(false)}><Ionicons name="close" size={22} color="#0F172A" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={modalStyles.scroll}>
              {weightItems.map((item, index) => (
                <View key={item.id || index} style={localStyles.rowCardItem}>
                  <View style={[localStyles.rowIconContainer, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="scale-outline" size={16} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={localStyles.rowTitle}>{item.weight} kg</Text>
                    <Text style={localStyles.rowSubtitle}>{item.date || 'Date not recorded'}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. Prenatal Visits Modal */}
      <Modal visible={showAllVisitsModal} animationType="slide" transparent={true} onRequestClose={() => setShowAllVisitsModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>All Prenatal Visits</Text>
              <TouchableOpacity onPress={() => setShowAllVisitsModal(false)}><Ionicons name="close" size={22} color="#0F172A" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={modalStyles.scroll}>
              {visits.map((visit, index) => (
                <View key={visit.id || index} style={localStyles.expandedItemCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={localStyles.visitTitle}>{visit.visitNo || 'Prenatal visit'}</Text>
                    <Text style={localStyles.visitDate}>{visit.date || 'Date not recorded'}</Text>
                  </View>
                  <Text style={localStyles.rowSubtitle}>Gestational age: {visit.gestationalAge || 'Not recorded'}</Text>
                  <View style={localStyles.visitBadgeRow}>
                    <Text style={localStyles.visitBadgeText}>BP: {visit.bp || visit.bloodPressure || 'N/A'}</Text>
                    <Text style={localStyles.visitBadgeText}>Weight: {visit.weight ? `${visit.weight} kg` : 'N/A'}</Text>
                  </View>
                  {!!visit.notes && <Text style={localStyles.visitNotes}>"{visit.notes}"</Text>}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. Recent Health Records Modal */}
      <Modal visible={showAllRecordsModal} animationType="slide" transparent={true} onRequestClose={() => setShowAllRecordsModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>All Health Records</Text>
              <TouchableOpacity onPress={() => setShowAllRecordsModal(false)}><Ionicons name="close" size={22} color="#0F172A" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={modalStyles.scroll}>
              {medicalHistory.map((item, index) => (
                <View key={item.id || index} style={localStyles.expandedItemCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={localStyles.visitTitle}>{item.title}</Text>
                    <Text style={localStyles.visitDate}>{item.date || 'Date not recorded'}</Text>
                  </View>
                  <Text style={localStyles.visitNotes}>{item.notes || 'No additional notes.'}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  overviewBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E2E8F0',
  },
  overviewLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  overviewValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    gap: 6,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
  },
  cardHeaderAction: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  actionLinkBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  actionLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  actionLinkBtnPrimary: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F0FDFA',
  },
  actionLinkTextPrimary: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  rowCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  rowIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  expandedItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  visitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  visitDate: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '600',
  },
  visitBadgeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  visitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  visitNotes: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 6,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  statusBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
    textTransform: 'capitalize',
  },
});

const modalStyles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  } as ViewStyle,
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  } as TextStyle,
  scroll: {
    paddingBottom: 20,
  } as ViewStyle,
};