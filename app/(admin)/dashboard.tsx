import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CLINIC } from '../../src/config/clinic';
import { Colors } from '../../src/theme/colors';
import { ClinicLocation } from '../../src/models/ClinicLocation';
import { subscribeClinicLocation } from '../../src/services/clinicLocationService';

import { fetchPatients } from '../../src/services/patientService';
import { sendReminderToPatient } from '../../src/(patient)/remindersService';
import { subscribeDashboardPatients } from '../../src/services/dashboardService';
import { subscribeQueue } from '../../src/services/queueService';
import { useClinicDay } from '../../src/hooks/useClinicDay';

type AdmissionPeriod = 'day' | 'week' | 'month' | 'year';
const buildAdmissionBuckets = (period: AdmissionPeriod) => {
  const today = new Date();
  const buckets: { key: string; label: string; count: number }[] = [];
  const add = (date: Date, label: string) => buckets.push({ key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`, label, count: 0 });
  if (period === 'day') for (let index = 6; index >= 0; index--) { const date = new Date(today); date.setDate(today.getDate() - index); add(date, date.toLocaleDateString('en-US', { weekday: 'short' })); }
  if (period === 'week') for (let index = 7; index >= 0; index--) { const date = new Date(today); date.setDate(today.getDate() - index * 7); add(date, `W${8 - index}`); }
  if (period === 'month') for (let index = 11; index >= 0; index--) { const date = new Date(today.getFullYear(), today.getMonth() - index, 1); buckets.push({ key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString('en-US', { month: 'short' }), count: 0 }); }
  if (period === 'year') for (let index = 4; index >= 0; index--) { const year = today.getFullYear() - index; buckets.push({ key: String(year), label: String(year), count: 0 }); }
  return buckets;
};

export default function AdminDashboard() {
  const router = useRouter();
  const queueDay = useClinicDay();
  const [queueError, setQueueError] = useState(false);

  // Loading state for initial data sync
  const [loading, setLoading] = useState(true);

  // Real-time metrics hooked into Firestore collections
  const [metrics, setMetrics] = useState({
    activePregnancies: 0,
    todayQueue: 0,
    attentionFlags: 0,
    monthlyDeliveries: 0,
  });
  const [dashboardStats, setDashboardStats] = useState({ monthlyAdmissions: [] as { label: string; count: number }[], averageBmi: null as number | null, bmiCount: 0, bmiLabel: 'No BMI data' });
  const [admissionPeriod, setAdmissionPeriod] = useState<AdmissionPeriod>('month');
  const [showQuickReminder, setShowQuickReminder] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPatient, setQuickPatient] = useState<any>(null);
  const [quickPatients, setQuickPatients] = useState<any[]>([]);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickUrgent, setQuickUrgent] = useState(false);
  const [clinicLocation, setClinicLocation] = useState<ClinicLocation>(CLINIC);

  // Real-time Firestore Listeners
  useEffect(() => {
    setLoading(true);

    try {
      // 1. Listen to Active Patients / Pregnancies
      const unsubscribePatients = subscribeDashboardPatients((patients) => {
        let activeCount = 0;
        let riskCount = 0;
        let deliveriesCount = 0;

        const currentMonthYear = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }); // e.g., "Sep 2026"

        const monthlyAdmissions = buildAdmissionBuckets(admissionPeriod);
        const bmiValues: number[] = [];
        patients.forEach((data) => {
          
          // Count active pregnancies based on status or flags
          if (data.status === 'Active' || data.status === 'Routine' || !data.status) {
            activeCount++;
          }

          // Count risk flags (e.g., elevated BP or flagged status)
          if (data.status === 'Follow-up' || data.status === 'Review Required') {
            riskCount++;
          }

          // Count monthly deliveries if applicable
          if (data.deliveryDate && data.deliveryDate.includes('Sep')) {
            deliveriesCount++;
          }
          const admissionSource = data.createdAt || data.registeredAt || data.admissionDate || data.lastVisit || data.date;
          const admissionValue = admissionSource?.toDate?.() || (admissionSource ? new Date(admissionSource) : null);
          if (admissionValue && !Number.isNaN(admissionValue.getTime())) {
            const admissionMidnight = new Date(admissionValue.getFullYear(), admissionValue.getMonth(), admissionValue.getDate());
            const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
            const weekIndex = 7 - Math.floor((todayMidnight.getTime() - admissionMidnight.getTime()) / (7 * 24 * 60 * 60 * 1000));
            const key = admissionPeriod === 'month' ? `${admissionValue.getFullYear()}-${admissionValue.getMonth()}` : admissionPeriod === 'year' ? String(admissionValue.getFullYear()) : `${admissionValue.getFullYear()}-${admissionValue.getMonth()}-${admissionValue.getDate()}`;
            const bucket = admissionPeriod === 'week' ? monthlyAdmissions[weekIndex] : monthlyAdmissions.find((item) => item.key === key);
            if (bucket) bucket.count++;
          }
          const heightCm = Number(data.heightCm || data.height);
          const weightKg = Number(data.weight);
          if (heightCm > 0 && weightKg > 0) bmiValues.push(weightKg / Math.pow(heightCm / 100, 2));
        });

        const averageBmi = bmiValues.length ? bmiValues.reduce((sum, bmi) => sum + bmi, 0) / bmiValues.length : null;
        const bmiLabel = averageBmi == null ? 'No BMI data' : averageBmi < 18.5 ? 'Underweight' : averageBmi < 25 ? 'Normal' : averageBmi < 30 ? 'Overweight' : 'Obese';
        setDashboardStats({ monthlyAdmissions: monthlyAdmissions.map(({ label, count }) => ({ label, count })), averageBmi, bmiCount: bmiValues.length, bmiLabel });

        setMetrics(prev => ({
          ...prev,
          activePregnancies: activeCount > 0 ? activeCount : patients.length,
          attentionFlags: riskCount,
          monthlyDeliveries: deliveriesCount > 0 ? deliveriesCount : 0, // fallback default if none logged yet
        }));
        setLoading(false);
      }, (error) => {
        console.error("Error fetching patients snapshot:", error);
        setLoading(false);
      });

      const unsubscribeAppointments = subscribeQueue(queueDay, (tickets) => {
        setQueueError(false);
        setMetrics(prev => ({ ...prev, todayQueue: tickets.filter(ticket => ['Waiting', 'In Consultation'].includes(ticket.status)).length }));
      }, () => setQueueError(true));

      // Cleanup listeners on unmount
      return () => {
        unsubscribePatients();
        unsubscribeAppointments();
      };
    } catch (error) {
      console.error("Firestore connection error:", error);
      setLoading(false);
    }
  }, [admissionPeriod, queueDay]);

  useEffect(() => subscribeClinicLocation(setClinicLocation, console.error), []);
  const openQuickReminder = async () => { const patients = await fetchPatients(); if (!patients.length) return Alert.alert('No patients', 'Add a patient before sending a reminder.'); setQuickPatients(patients); setQuickPatient(null); setQuickSearch(''); setQuickUrgent(false); setQuickTitle(''); setShowQuickReminder(true); };
  const sendQuickReminder = async () => { if (!quickPatient || !quickTitle.trim()) return; await sendReminderToPatient({ patientUid: quickPatient.id, patientId: quickPatient.id, title: quickTitle.trim(), date: new Date().toLocaleDateString('en-US'), time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), type: 'General', priority: quickUrgent ? 'urgent' : 'normal' }); setShowQuickReminder(false); };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Outer App Shell Container */}
      <View style={styles.appShell}>
        
        {/* Main Content Area */}
        <View style={styles.mainContent}>
          
          {/* Scrollable Dashboard Body */}
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            
            {/* Breadcrumb & Welcome Banner */}
            <Text style={styles.breadcrumb}>Dashboard &gt; <Text style={{ color: '#0F172A' }}>Midwife Overview</Text></Text>

            <View style={styles.welcomeBanner}>
              <View style={styles.welcomeTextWrapper}>
                <Text style={styles.welcomeTitle}>Good Morning, Midwife</Text>
                <Text style={styles.welcomeSubtitle}>
                  Have a productive shift. Database reports {metrics.attentionFlags} patient records needing administrative attention.
                </Text>
                <TouchableOpacity 
                  style={styles.bannerActionButton} 
                  activeOpacity={0.8}
                  onPress={() => router.push('/(admin)/patients' as any)}
                >
                  <Text style={styles.bannerActionText}>Review Patient Alerts</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.bannerIllustrationBox}>
                <Ionicons name="fitness" size={72} color="rgba(255,255,255,0.25)" />
              </View>
            </View>

            {/* Metric Cards Grid */}
            <View style={styles.metricsGrid}>
              
              <View style={styles.metricCard}>
                <View style={styles.metricHeaderRow}>
                  <Text style={styles.metricLabel}>Active Pregnancies</Text>
                  <View style={styles.trendBadgeBlue}>
                    <Ionicons name="arrow-up" size={10} color="#0284C7" />
                    <Text style={styles.trendTextBlue}>Live DB</Text>
                  </View>
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color="#0D9488" style={{ marginVertical: 8, alignSelf: 'flex-start' }} />
                ) : (
                  <Text style={styles.metricValue}>{metrics.activePregnancies}</Text>
                )}
                <Text style={styles.metricSub}>Registered patients</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeaderRow}>
                  <Text style={styles.metricLabel}>Today's Queue</Text>
                  <View style={styles.trendBadgeAmber}>
                    <Ionicons name="time" size={10} color="#D97706" />
                    <Text style={styles.trendTextAmber}>Queue</Text>
                  </View>
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color="#D97706" style={{ marginVertical: 8, alignSelf: 'flex-start' }} />
                ) : (
                  <Text style={styles.metricValue}>{queueError ? '—' : metrics.todayQueue}</Text>
                )}
                <TouchableOpacity onPress={() => router.push('/(admin)/queue' as any)}><Text style={styles.metricSub}>{queueError ? 'Queue unavailable · Open queue' : 'Checked-in patients · Open live queue'}</Text></TouchableOpacity>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeaderRow}>
                  <Text style={styles.metricLabel}>Attention Follow-ups</Text>
                  <View style={styles.trendBadgeRed}>
                    <Ionicons name="warning" size={10} color="#DC2626" />
                    <Text style={styles.trendTextRed}>Urgent</Text>
                  </View>
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color="#DC2626" style={{ marginVertical: 8, alignSelf: 'flex-start' }} />
                ) : (
                  <Text style={styles.metricValue}>{metrics.attentionFlags}</Text>
                )}
                <Text style={styles.metricSub}>Administrative follow-up records</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeaderRow}>
                  <Text style={styles.metricLabel}>Deliveries (Sep)</Text>
                  <View style={styles.trendBadgeGreen}>
                    <Ionicons name="heart" size={10} color="#16A34A" />
                    <Text style={styles.trendTextGreen}>Stable</Text>
                  </View>
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color="#16A34A" style={{ marginVertical: 8, alignSelf: 'flex-start' }} />
                ) : (
                  <Text style={styles.metricValue}>{metrics.monthlyDeliveries}</Text>
                )}
                <Text style={styles.metricSub}>Healthy newborns</Text>
              </View>

            </View>

            <View style={styles.clinicMapCard}>
              <View style={styles.mapPreview}>
                <View style={styles.mapRoadHorizontal} />
                <View style={styles.mapRoadVertical} />
                <View style={styles.mapPin}><Ionicons name="location" size={22} color={Colors.surface} /></View>
                <Text style={styles.mapPreviewLabel}>Clinic location</Text>
              </View>
              <View style={styles.clinicMapContent}>
                <View style={styles.clinicMapHeading}><View style={styles.clinicMapIcon}><Ionicons name="navigate-outline" size={18} color={Colors.primary} /></View><View><Text style={styles.cardTitle}>Clinic Location</Text><Text style={styles.cardSub}>Open directions to your clinic</Text></View></View>
                <Text style={styles.clinicAddress}>{clinicLocation.address}</Text>
                <TouchableOpacity style={styles.openMapButton} activeOpacity={0.85} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicLocation.address)}`)}>
                  <Ionicons name="map-outline" size={16} color={Colors.surface} />
                  <Text style={styles.openMapButtonText}>Open in Maps</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Section Cards */}
            <View style={styles.bottomGrid}>
              
              <View style={styles.chartCard}>
                <View style={styles.chartTitleRow}><Text style={styles.cardTitle}>Patient Admissions</Text><View style={styles.admissionFilterRow}>{(['day', 'week', 'month', 'year'] as AdmissionPeriod[]).map((period) => <TouchableOpacity key={period} onPress={() => setAdmissionPeriod(period)} style={[styles.admissionFilter, admissionPeriod === period && styles.admissionFilterActive]}><Text style={[styles.admissionFilterText, admissionPeriod === period && styles.admissionFilterTextActive]}>{period}</Text></TouchableOpacity>)}</View></View>
                <Text style={styles.cardSub}>Patient registrations by {admissionPeriod}; the tallest bar is the busiest period.</Text>
                <View style={styles.fakeChartBox}>
                  {dashboardStats.monthlyAdmissions.map((item, index, all) => <View key={item.label} style={styles.chartColumn}><View style={[styles.chartBar, { height: `${Math.max(8, (item.count / Math.max(...all.map((entry) => entry.count), 1)) * 100)}%`, backgroundColor: index === all.length - 1 ? '#0D9488' : '#CCFBF1' }]} /><Text style={styles.chartLabel}>{item.label}</Text><Text style={styles.chartCount}>{item.count}</Text></View>)}
                </View>
              </View>

              <View style={styles.bmiCard}>
                <Text style={styles.cardTitle}>Average Maternal BMI Status</Text>
                <Text style={styles.cardSub}>Record-management statistic; not a diagnosis</Text>
                <View style={styles.bmiStatsRow}>
                  <View style={[styles.bmiStatItem, styles.bmiStatItemActive]}>
                    <Text style={[styles.bmiNum, { color: '#0D9488' }]}>{dashboardStats.averageBmi?.toFixed(1) || '—'}</Text>
                    <Text style={[styles.bmiCategory, { color: '#0D9488', fontWeight: '700' }]}>{dashboardStats.bmiLabel}</Text>
                    <Text style={styles.bmiCategory}>{dashboardStats.bmiCount} patient{dashboardStats.bmiCount === 1 ? '' : 's'} included</Text>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={styles.progressBarFill} />
                </View>
              </View>

            </View>

          </ScrollView>

        </View>

      </View>

      <Modal visible={showQuickReminder} transparent animationType="fade"><View style={styles.modalOverlay}><View style={styles.notificationModal}><Text style={styles.cardTitle}>Quick Send Reminder</Text><TextInput value={quickSearch} onChangeText={setQuickSearch} placeholder="Search patient name" style={styles.quickInput} />{quickSearch ? quickPatients.filter((patient) => String(patient.name || patient.fullName || '').toLowerCase().includes(quickSearch.toLowerCase())).slice(0, 4).map((patient) => <TouchableOpacity key={patient.id} style={styles.reminderRow} onPress={() => { setQuickPatient(patient); setQuickSearch(patient.name || patient.fullName); }}><Text style={styles.reminderTitle}>{patient.name || patient.fullName}</Text><Text style={styles.reminderStatus}>{patient.contactNumber || 'No phone number'}</Text></TouchableOpacity>) : null}<TextInput value={quickTitle} onChangeText={setQuickTitle} placeholder="Reminder message" style={styles.quickInput} /><TouchableOpacity style={[styles.urgentButton, quickUrgent && styles.urgentButtonActive]} onPress={() => setQuickUrgent(!quickUrgent)}><Text style={styles.urgentText}>{quickUrgent ? 'Urgent reminder' : 'Normal reminder'}</Text></TouchableOpacity><TouchableOpacity style={styles.closeModal} onPress={sendQuickReminder}><Text style={styles.closeModalText}>Send Reminder</Text></TouchableOpacity></View></View></Modal>
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
  mainContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    flexDirection: 'column',
  },
  scrollBody: {
    padding: 30,
  },
  breadcrumb: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    fontWeight: '500',
  },
  welcomeBanner: {
    backgroundColor: '#0D9488',
    borderRadius: 20,
    padding: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  welcomeTextWrapper: {
    flex: 1,
    marginRight: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#CCFBF1',
    lineHeight: 20,
    marginBottom: 16,
  },
  bannerActionButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bannerActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  bannerIllustrationBox: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  clinicMapCard: {
    flexDirection: 'row',
    minHeight: 172,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  mapPreview: {
    width: '38%',
    backgroundColor: Colors.infoPale,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapRoadHorizontal: { position: 'absolute', width: '125%', height: 24, backgroundColor: Colors.surface, transform: [{ rotate: '-16deg' }] },
  mapRoadVertical: { position: 'absolute', width: 20, height: '130%', backgroundColor: Colors.surface, transform: [{ rotate: '31deg' }] },
  mapPin: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: Colors.primarySoft, zIndex: 1 },
  mapPreviewLabel: { position: 'absolute', bottom: 13, backgroundColor: Colors.surface, color: Colors.textSecondary, fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  clinicMapContent: { flex: 1, padding: 20, justifyContent: 'space-between' },
  clinicMapHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clinicMapIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  clinicAddress: { fontSize: 12, color: Colors.textMuted, lineHeight: 18, marginTop: 9, marginBottom: 12 },
  openMapButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.primary, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 },
  openMapButtonText: { color: Colors.surface, fontSize: 12, fontWeight: '800' },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  trendBadgeBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  trendTextBlue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  trendBadgeAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  trendTextAmber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  trendBadgeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  trendTextRed: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  trendBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  trendTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  bottomGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  chartCard: {
    flex: 1.2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bmiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  fakeChartBox: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  chartBar: {
    width: 20,
    backgroundColor: '#CCFBF1',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  notificationModal: { width: '100%', maxWidth: 430, maxHeight: '75%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  reminderRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  reminderTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  reminderStatus: { fontSize: 11, color: '#64748B', marginTop: 2 },
  closeModal: { backgroundColor: '#0D9488', borderRadius: 9, paddingVertical: 10, alignItems: 'center', marginTop: 14 },
  closeModalText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  quickInput: { borderWidth: 1, borderColor: '#CFE8E5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, color: '#0F172A' },
  urgentButton: { borderWidth: 1, borderColor: '#FDE68A', backgroundColor: '#FFFBEB', borderRadius: 9, paddingVertical: 9, alignItems: 'center', marginTop: 10 }, urgentButtonActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }, urgentText: { color: '#92400E', fontSize: 12, fontWeight: '700' },
  chartTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  admissionFilterRow: { flexDirection: 'row', gap: 4 },
  admissionFilter: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F1F5F9' },
  admissionFilterActive: { backgroundColor: '#0D9488' },
  admissionFilterText: { fontSize: 9, color: '#64748B', fontWeight: '700', textTransform: 'capitalize' },
  admissionFilterTextActive: { color: '#FFFFFF' },
  chartColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  chartLabel: { fontSize: 9, color: '#64748B', marginTop: 4 },
  chartCount: { fontSize: 9, color: '#0F172A', fontWeight: '700' },
  bmiStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bmiStatItem: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#F8FAFC',
  },
  bmiStatItemActive: {
    backgroundColor: '#CCFBF1',
  },
  bmiNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  bmiCategory: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '75%',
    height: '100%',
    backgroundColor: '#0D9488',
    borderRadius: 4,
  },
});
