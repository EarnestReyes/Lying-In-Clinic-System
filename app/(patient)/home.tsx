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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { subscribePatientData } from '../../src/(patient)/patientService';
import { auth } from '../../src/config/firebase';
import { subscribeRemindersForPatient } from '../../src/(patient)/remindersService';

type BPFilter = 'day' | 'week' | 'month';

export default function PatientHomeScreen() {
  const router = useRouter();
  
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clinicNotices, setClinicNotices] = useState<any[]>([]);
  const [bpFilter, setBpFilter] = useState<BPFilter>('week');

  const patientUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!patientUid) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribePatientData(patientUid, (data) => {
      if (data) {
        setPatientData(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [patientUid]);

  useEffect(() => {
    if (!patientUid) return;
    return subscribeRemindersForPatient(patientUid, (reminders) => setClinicNotices(reminders.filter((item) => !item.completed)), console.error);
  }, [patientUid]);

  // Calculate percentage out of 40 standard pregnancy weeks
  const currentWeeks = patientData?.pregnancyWeek || 0;
  const progressPercent = Math.min(Math.round((currentWeeks / 40) * 100), 100);

  // Blood pressure dataset based on selected filter
  const getBpDataPoints = () => {
    if (bpFilter === 'day') {
      return [
        { label: '8 AM', systolic: 120, diastolic: 80 },
        { label: '12 PM', systolic: 118, diastolic: 78 },
        { label: '4 PM', systolic: 122, diastolic: 82 },
        { label: '8 PM', systolic: 119, diastolic: 79 },
      ];
    }
    if (bpFilter === 'week') {
      return [
        { label: 'Mon', systolic: 120, diastolic: 80 },
        { label: 'Tue', systolic: 118, diastolic: 76 },
        { label: 'Wed', systolic: 124, diastolic: 82 },
        { label: 'Thu', systolic: 121, diastolic: 79 },
        { label: 'Fri', systolic: 119, diastolic: 78 },
        { label: 'Sat', systolic: 117, diastolic: 75 },
        { label: 'Sun', systolic: 120, diastolic: 80 },
      ];
    }
    return [
      { label: 'Wk 1', systolic: 118, diastolic: 78 },
      { label: 'Wk 2', systolic: 120, diastolic: 80 },
      { label: 'Wk 3', systolic: 122, diastolic: 81 },
      { label: 'Wk 4', systolic: 119, diastolic: 79 },
    ];
  };

  const bpPoints = getBpDataPoints();

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
          {/* Profile Shortcut Button */}
          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={() => router.push('/(patient)/profile' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={18} color="#0D9488" />
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity 
            style={[styles.headerIconButton, styles.logoutButtonOverride]} 
            onPress={() => router.replace('/(auth)/login' as any)}
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
                    {patientData?.pregnancyWeek || 0} Weeks Pregnant • {patientData?.gravidaPara || 'Prenatal'}
                  </Text>
                </View>
                
                <Text style={styles.bannerTitle}>
                  Due Date: {patientData?.edd || 'Not Set'}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  Last Clinic Visit: {patientData?.lastVisit || 'Recent'} 
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

            {/* Blood Pressure Monitoring Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleBox}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name="pulse" size={18} color="#0D9488" />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>Blood Pressure Log</Text>
                    <Text style={styles.cardSub}>Systolic / Diastolic mmHg trends</Text>
                  </View>
                </View>

                {/* Filter Row: Day / Week / Month */}
                <View style={styles.filterRow}>
                  {(['day', 'week', 'month'] as BPFilter[]).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setBpFilter(filter)}
                      style={[styles.filterButton, bpFilter === filter && styles.filterButtonActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterText, bpFilter === filter && styles.filterTextActive]}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Simulated Line Graph Body */}
              <View style={styles.graphContainer}>
                <View style={styles.graphGridLines}>
                  <View style={styles.gridLine}><Text style={styles.gridLabel}>140</Text></View>
                  <View style={styles.gridLine}><Text style={styles.gridLabel}>120</Text></View>
                  <View style={styles.gridLine}><Text style={styles.gridLabel}>100</Text></View>
                  <View style={styles.gridLine}><Text style={styles.gridLabel}>80</Text></View>
                </View>

                <View style={styles.graphColumnsRow}>
                  {bpPoints.map((item, index) => (
                    <View key={index} style={styles.graphColumn}>
                      <View style={styles.graphBarGroup}>
                        <View style={[styles.graphPoint, { bottom: `${(item.systolic / 160) * 100}%`, backgroundColor: '#0D9488' }]} />
                        <View style={[styles.graphPoint, { bottom: `${(item.diastolic / 160) * 100}%`, backgroundColor: '#38BDF8' }]} />
                      </View>
                      <Text style={styles.graphColumnLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.graphLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#0D9488' }]} />
                  <Text style={styles.legendText}>Systolic</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#38BDF8' }]} />
                  <Text style={styles.legendText}>Diastolic</Text>
                </View>
              </View>
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
                  <Text style={styles.shortcutSub}>View care plans, visit recaps, and preparation</Text>
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

            {/* Clinic Notices Section */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionTitle}>Clinic Notices</Text>
            </View>

            {clinicNotices.length ? clinicNotices.map((notice: any) => <View key={notice.id} style={[styles.noticeCard, notice.priority === 'urgent' && styles.urgentNoticeCard]}><View style={[styles.noticeIconBox, notice.priority === 'urgent' && styles.urgentNoticeIcon]}><Ionicons name={notice.priority === 'urgent' ? 'warning' : 'information-circle'} size={20} color={notice.priority === 'urgent' ? '#DC2626' : '#0284C7'} /></View><View style={styles.noticeContent}><Text style={styles.noticeTitle}>{notice.priority === 'urgent' ? 'Urgent Clinic Reminder' : 'Clinic Reminder'}</Text><Text style={styles.noticeSub}>{notice.title} · {notice.date} {notice.time}</Text></View></View>) : <View style={styles.noticeCard}><View style={styles.noticeIconBox}><Ionicons name="information-circle" size={20} color="#0284C7" /></View><View style={styles.noticeContent}><Text style={styles.noticeTitle}>No new clinic notices</Text><Text style={styles.noticeSub}>Staff reminders will appear here automatically.</Text></View></View>}
          </>
        )}

      </ScrollView>

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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  cardTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: '#0D9488',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  graphContainer: {
    height: 130,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    marginBottom: 8,
  },
  graphGridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    justifyContent: 'space-between',
  },
  gridLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    width: '100%',
    height: '25%',
  },
  gridLabel: {
    fontSize: 9,
    color: '#94A3B8',
    position: 'absolute',
    top: -6,
    left: 0,
  },
  graphColumnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingLeft: 24,
  },
  graphColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  graphBarGroup: {
    width: 8,
    height: '100%',
    position: 'relative',
  },
  graphPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: 0,
  },
  graphColumnLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '600',
  },
  graphLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
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
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noticeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  urgentNoticeCard: { borderColor: '#FECACA', backgroundColor: '#FFF7F7' },
  noticeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
});