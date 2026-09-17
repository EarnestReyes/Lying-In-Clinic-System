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
import { subscribePatientData } from '../../src/(patient)/patientService'; // Update path if needed

export default function PatientHomeScreen() {
  const router = useRouter();
  
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Your actual user UID from the database
  const patientUid = "spCRyTr79TaIAPDQMQLN6t1keqg2"; 

  useEffect(() => {
    const unsubscribe = subscribePatientData(patientUid, (data) => {
      if (data) {
        setPatientData(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate percentage out of 40 standard pregnancy weeks
  const currentWeeks = patientData?.pregnancyWeek || 0;
  const progressPercent = Math.min(Math.round((currentWeeks / 40) * 100), 100);

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

            {/* Quick Info Summary Grid */}
            <Text style={styles.sectionTitle}>Health Overview</Text>

            <View style={styles.servicesGrid}>
              <View style={styles.serviceCard}>
                <View style={[styles.serviceIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="water" size={20} color="#0284C7" />
                </View>
                <Text style={styles.serviceLabel}>Blood Type</Text>
                <Text style={styles.serviceValue}>{patientData?.bloodType || "N/A"}</Text>
              </View>

              <View style={styles.serviceCard}>
                <View style={[styles.serviceIconBox, { backgroundColor: '#CCFBF1' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#0D9488" />
                </View>
                <Text style={styles.serviceLabel}>Status</Text>
                <Text style={styles.serviceValue}>{patientData?.status || "Active"}</Text>
              </View>
            </View>

            {/* Quick Profile Management Banner Link */}
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

            {/* Clinic Notices Section */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionTitle}>Clinic Notices</Text>
            </View>

            <View style={styles.noticeCard}>
              <View style={styles.noticeIconBox}>
                <Ionicons name="information-circle" size={20} color="#0284C7" />
              </View>
              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>Upcoming Prenatal Guidance</Text>
                <Text style={styles.noticeSub}>
                  Your estimated delivery date is logged as {patientData?.edd || 'soon'}. Please make sure to prepare your lab results and monitor your blood type ({patientData?.bloodType || 'N/A'}) requirements.
                </Text>
              </View>
            </View>
          </>
        )}

      </ScrollView>

      {/* Floating AI Chat Button */}
      <TouchableOpacity 
        style={styles.floatingChatButton}
        activeOpacity={0.9}
        onPress={() => router.push('/(patient)/ai-chat' as any)}
      >
        <Ionicons name="chatbubbles" size={22} color="#FFFFFF" />
        <Text style={styles.floatingChatText}>AI Assistant</Text>
      </TouchableOpacity>
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
    marginBottom: 24,
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
    marginBottom: 12,
  },
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  serviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  serviceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
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
  noticeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
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
  floatingChatButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#0D9488',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    gap: 8,
  },
  floatingChatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});