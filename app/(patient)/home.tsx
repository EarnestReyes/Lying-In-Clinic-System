import { ClinicalPatient } from '../../src/hooks/usePatientClinicalRecord';
import { Reminder } from '../../src/models/reminder';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { subscribePatientClinicalRecord } from '../../src/services/patientRecordService';
import { clinicalNotices } from '../../src/utils/clinicalRecords';

import { auth } from '../../src/config/firebase';
import { authService } from '../../src/services/authService';
import { subscribeRemindersForPatient } from '../../src/(patient)/remindersService';

import { SafeAreaView } from 'react-native-safe-area-context';
import { BloodPressureChart } from '../../components/BloodPressureChart';

export default function PatientHomeScreen() {
  const router = useRouter();
  
  const [patientData, setPatientData] = useState<ClinicalPatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [clinicNoticesState, setClinicNoticesState] = useState<Reminder[]>([]);
  const [recordError, setRecordError] = useState('');
  
  // State to manage whether all clinic notices are expanded inline or via modal
  const [showAllNoticesInline, setShowAllNoticesInline] = useState(false);
  const [showAllNoticesModal, setShowAllNoticesModal] = useState(false);

  // State to manage Blood Pressure history list collapse/expansion & modal view
  const [showAllBpModal, setShowAllBpModal] = useState(false);
  const [showAllBpInline, setShowAllBpInline] = useState(false);

  const combinedClinicNotices = [...clinicNoticesState, ...clinicalNotices(patientData)].sort((a, b) => (b.createdAt?.toMillis?.() || Date.parse(b.date) || 0) - (a.createdAt?.toMillis?.() || Date.parse(a.date) || 0));

  // Determine which notices to display based on the toggle state (show max 3 when collapsed)
  const displayedNotices = showAllNoticesInline ? combinedClinicNotices : combinedClinicNotices.slice(0, 3);

  // Sort visits chronologically or reverse-chronologically for BP history
  const prenatalVisits = patientData?.prenatalVisits || [];
  const sortedVisits = [...prenatalVisits].reverse();
  const displayedVisits = showAllBpInline ? sortedVisits : sortedVisits.slice(0, 3);

  const patientUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!patientUid) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribePatientClinicalRecord(patientUid, (data) => {
      setPatientData(data);
      setRecordError('');
      setLoading(false);
    }, () => { setRecordError('Clinic records could not be loaded. Please check your connection or contact the clinic.'); setLoading(false); });

    return () => unsubscribe();
  }, [patientUid]);

  useEffect(() => {
    if (!patientUid) return;
    return subscribeRemindersForPatient(patientUid, (reminders) => setClinicNoticesState(reminders.filter((item) => !item.completed)), console.error);
  }, [patientUid]);

  // Calculate percentage out of 40 standard pregnancy weeks
  const currentWeeks = Number(patientData?.pregnancyWeek) || 0;
  const progressPercent = Math.max(0, Math.min(Math.round((currentWeeks / 40) * 100), 100));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Modern Header with Database Profile Picture & Actions */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => router.push('/(patient)/profile' as any)}
          >
            {patientData?.profileImage ? (
              <Image source={{ uri: patientData.profileImage }} style={styles.headerAvatarImage} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person" size={16} color="#0D9488" />
              </View>
            )}
          </TouchableOpacity>
          <View>
            <Text style={styles.headerSubtitle}>PATIENT PORTAL</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {patientData?.name ? `Hello, ${patientData.name.split(' ')[0]}` : "Welcome!"}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={() => router.push('/(patient)/profile' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={18} color="#0D9488" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.headerIconButton, styles.logoutButtonOverride]} 
            onPress={() => Alert.alert('Log out?', 'You can sign in again anytime.', [{ text: 'Stay', style: 'cancel' }, { text: 'Log out', onPress: async () => { try { await authService.logout(); router.replace('/(auth)/login'); } catch { setRecordError('Unable to sign out. Please try again.'); } } }])}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0D9488" />
            <Text style={styles.loaderText}>Syncing your health portal...</Text>
          </View>
        ) : (
          <>
            {/* Modern Hero Pregnancy Progress Card */}
            <View style={styles.bannerCard}>
              <View style={styles.bannerGlowCircle} />
              <View style={styles.bannerTextContainer}>
                <View style={styles.progressBadgeRow}>
                  <View style={styles.heartIconBox}>
                    <Ionicons name="heart" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={styles.bannerBadgeText}>
                    {patientData?.pregnancyWeek ? `${patientData.pregnancyWeek} Weeks Pregnant` : 'Gestational age not recorded'} • {patientData?.gravidaPara || 'Prenatal'}
                  </Text>
                </View>
                
                <Text style={styles.bannerTitle}>
                  Due Date: {patientData?.edd || 'Not Set'}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  Last Clinic Visit: {patientData?.lastVisit || 'Not recorded'}
                </Text>
                
                <View style={styles.progressBarWrapper}>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${progressPercent}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressPercentText}>{progressPercent}% of term</Text>
                </View>
              </View>
            </View>

            {!!recordError && <Text accessibilityRole="alert" style={{ color: "#B91C1C", marginBottom: 16 }}>{recordError}</Text>}
            
            <BloodPressureChart visits={patientData?.prenatalVisits} />

            {/* Blood Pressure / Visit History List Section with Shrink & Modal support */}
            <View style={styles.noticesContainerCard}>
              <View style={styles.listHeaderRow}>
                <Text style={styles.sectionTitle}>Blood Pressure History</Text>
                {sortedVisits.length > 3 && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => setShowAllBpInline(!showAllBpInline)}>
                      <Text style={styles.seeAllText}>
                        {showAllBpInline ? 'Show less' : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowAllBpModal(true)}>
                      <Text style={styles.seeAllText}>See all</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {sortedVisits.length ? (
                displayedVisits.map((visit: any, index: number) => (
                  <View key={visit.id || index} style={styles.noticeCard}>
                    <View style={styles.noticeIconBox}>
                      <Ionicons name="pulse" size={20} color="#0D9488" />
                    </View>
                    <View style={styles.noticeContent}>
                      <Text style={styles.noticeTitle}>
                        BP: {visit.bloodPressure || visit.bp || 'N/A'}
                      </Text>
                      <Text style={styles.noticeSub}>
                        Date: {visit.date || visit.visitDate || 'Not recorded'} {visit.weight ? `• Weight: ${visit.weight}` : ''}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={[styles.noticeCard, { borderWidth: 0 }]}>
                  <View style={styles.noticeIconBox}>
                    <Ionicons name="information-circle" size={20} color="#0284C7" />
                  </View>
                  <View style={styles.noticeContent}>
                    <Text style={styles.noticeTitle}>No blood pressure records</Text>
                    <Text style={styles.noticeSub}>Your historical blood pressure readings from clinic visits will appear here.</Text>
                  </View>
                </View>
              )}
            </View>

            {/* My Care Hub Card Shortcut */}
            <TouchableOpacity 
              style={styles.myCareCard} 
              onPress={() => router.push('/(patient)/care' as any)}
              activeOpacity={0.9}
            >
              <View style={styles.profileShortcutContent}>
                <View style={[styles.shortcutIconBox, { backgroundColor: '#CCFBF1' }]}>
                  <Ionicons name="heart-circle-outline" size={24} color="#0D9488" />
                </View>
                <View>
                  <Text style={styles.shortcutTitle}>My Care Hub</Text>
                  <Text style={styles.shortcutSub}>Documents, care plans and visit recaps</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Reminders Shortcut Card */}
            <TouchableOpacity 
              style={styles.profileBannerShortcut} 
              onPress={() => router.push('/(patient)/reminders' as any)}
              activeOpacity={0.9}
            >
              <View style={styles.profileShortcutContent}>
                <View style={styles.shortcutIconBox}>
                  <Ionicons name="id-card-outline" size={22} color="#0D9488" />
                </View>
                <View>
                  <Text style={styles.shortcutTitle}>Reminders</Text>
                  <Text style={styles.shortcutSub}>Manage and see reminders here</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Nearby Clinics Card */}
            <TouchableOpacity
              style={styles.nearbyClinicsCard}
              activeOpacity={0.88}
              onPress={() => router.push('/(patient)/clinic-map' as any)}
            >
              <View style={styles.nearbyClinicsIcon}>
                <Ionicons name="location" size={21} color="#4F46E5" />
              </View>
              <View style={styles.nearbyClinicsContent}>
                <Text style={styles.nearbyClinicsTitle}>Nearby Clinics</Text>
                <Text style={styles.nearbyClinicsSub}>View the location of your registered clinic</Text>
              </View>
              <View style={styles.nearbyClinicsAction}>
                <Text style={styles.nearbyClinicsActionText}>View</Text>
                <Ionicons name="chevron-forward" size={15} color="#4F46E5" />
              </View>
            </TouchableOpacity>

            {/* Clinic Notices Section Container with Shrink & Modal support */}
            <View style={styles.noticesContainerCard}>
              <View style={styles.listHeaderRow}>
                <Text style={styles.sectionTitle}>Clinic Notices</Text>
                {combinedClinicNotices.length > 3 && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => setShowAllNoticesInline(!showAllNoticesInline)}>
                      <Text style={styles.seeAllText}>
                        {showAllNoticesInline ? 'Show less' : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowAllNoticesModal(true)}>
                      <Text style={styles.seeAllText}>See all</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {combinedClinicNotices.length ? (
                displayedNotices.map((notice: any) => (
                  <View 
                    key={notice.id} 
                    style={[
                      styles.noticeCard, 
                      notice.priority === 'urgent' && styles.urgentNoticeCard
                    ]}
                  >
                    <View style={[styles.noticeIconBox, notice.priority === 'urgent' && styles.urgentNoticeIcon]}>
                      <Ionicons name={notice.priority === 'urgent' ? 'warning' : 'information-circle'} size={20} color={notice.priority === 'urgent' ? '#DC2626' : '#0284C7'} />
                    </View>
                    <View style={styles.noticeContent}>
                      <Text style={styles.noticeTitle}>
                        {notice.priority === 'urgent' ? 'Urgent Clinic Reminder' : notice.kind || 'Clinic Reminder'}
                      </Text>
                      <Text style={styles.noticeSub}>{notice.title} • {notice.date} {notice.time}</Text>
                      {!!notice.detail && <Text style={[styles.noticeSub, { marginTop: 6 }]}>{notice.detail}</Text>}
                    </View>
                  </View>
                ))
              ) : (
                <View style={[styles.noticeCard, { borderWidth: 0 }]}>
                  <View style={styles.noticeIconBox}>
                    <Ionicons name="information-circle" size={20} color="#0284C7" />
                  </View>
                  <View style={styles.noticeContent}>
                    <Text style={styles.noticeTitle}>No new clinic notices</Text>
                    <Text style={styles.noticeSub}>Staff reminders, checkups and medical history updates appear here automatically.</Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}

      </ScrollView>

      {/* Full History Modal for Blood Pressure */}
      <Modal
        visible={showAllBpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAllBpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Blood Pressure History</Text>
              <TouchableOpacity onPress={() => setShowAllBpModal(false)}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {sortedVisits.map((visit: any, index: number) => (
                <View key={visit.id || index} style={styles.noticeCard}>
                  <View style={styles.noticeIconBox}>
                    <Ionicons name="pulse" size={20} color="#0D9488" />
                  </View>
                  <View style={styles.noticeContent}>
                    <Text style={styles.noticeTitle}>
                      BP: {visit.bloodPressure || visit.bp || 'N/A'}
                    </Text>
                    <Text style={styles.noticeSub}>
                      Date: {visit.date || visit.visitDate || 'Not recorded'} {visit.weight ? `• Weight: ${visit.weight}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full History Modal for Clinic Notices */}
      <Modal
        visible={showAllNoticesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAllNoticesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Clinic Notices</Text>
              <TouchableOpacity onPress={() => setShowAllNoticesModal(false)}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {combinedClinicNotices.map((notice: any) => (
                <View 
                  key={notice.id} 
                  style={[
                    styles.noticeCard, 
                    notice.priority === 'urgent' && styles.urgentNoticeCard
                  ]}
                >
                  <View style={[styles.noticeIconBox, notice.priority === 'urgent' && styles.urgentNoticeIcon]}>
                    <Ionicons name={notice.priority === 'urgent' ? 'warning' : 'information-circle'} size={20} color={notice.priority === 'urgent' ? '#DC2626' : '#0284C7'} />
                  </View>
                  <View style={styles.noticeContent}>
                    <Text style={styles.noticeTitle}>
                      {notice.priority === 'urgent' ? 'Urgent Clinic Reminder' : notice.kind || 'Clinic Reminder'}
                    </Text>
                    <Text style={styles.noticeSub}>{notice.title} • {notice.date} {notice.time}</Text>
                    {!!notice.detail && <Text style={[styles.noticeSub, { marginTop: 6 }]}>{notice.detail}</Text>}
                  </View>
                </View>
              ))}
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
    backgroundColor: '#F8FAFC',
    position: 'relative',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoutButtonOverride: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 95,
  },
  loaderContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  bannerCard: {
    backgroundColor: '#0F766E',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  bannerGlowCircle: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bannerTextContainer: {
    flex: 1,
  },
  progressBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heartIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bannerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#99F6E4',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#CCFBF1',
    marginBottom: 18,
    fontWeight: '500',
  },
  progressBarWrapper: {
    gap: 6,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#5EEAD4',
    borderRadius: 4,
  },
  progressPercentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#99F6E4',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  noticesContainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  myCareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  profileBannerShortcut: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  nearbyClinicsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  nearbyClinicsIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nearbyClinicsContent: { flex: 1 },
  nearbyClinicsTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  nearbyClinicsSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  nearbyClinicsAction: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  nearbyClinicsActionText: { color: '#4F46E5', fontSize: 11, fontWeight: '800' },
  profileShortcutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shortcutIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  shortcutSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noticeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  urgentNoticeCard: { borderColor: '#FECACA', backgroundColor: '#FFF7F7' },
  noticeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  urgentNoticeIcon: { backgroundColor: '#FEE2E2' },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  noticeSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContentContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
});