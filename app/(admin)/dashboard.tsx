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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Firebase Imports
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/config/firebase'; // Adjust path based on your directory structure

export default function AdminDashboard() {
  const router = useRouter();

  // Loading state for initial data sync
  const [loading, setLoading] = useState(true);

  // Real-time metrics hooked into Firestore collections
  const [metrics, setMetrics] = useState({
    activePregnancies: 0,
    todayQueue: 0,
    aiRiskFlags: 0,
    monthlyDeliveries: 0,
  });

  // Real-time Firestore Listeners
  useEffect(() => {
    setLoading(true);

    try {
      // 1. Listen to Active Patients / Pregnancies
      const patientsQuery = query(collection(db, "patients"));
      const unsubscribePatients = onSnapshot(patientsQuery, (snapshot) => {
        let activeCount = 0;
        let riskCount = 0;
        let deliveriesCount = 0;

        const currentMonthYear = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }); // e.g., "Sep 2026"

        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Count active pregnancies based on status or flags
          if (data.status === 'Active' || data.status === 'Routine' || !data.status) {
            activeCount++;
          }

          // Count risk flags (e.g., elevated BP or flagged status)
          if (data.status === 'High Risk' || data.flagColor === '#DC2626' || data.isHighRisk) {
            riskCount++;
          }

          // Count monthly deliveries if applicable
          if (data.deliveryDate && data.deliveryDate.includes('Sep')) {
            deliveriesCount++;
          }
        });

        setMetrics(prev => ({
          ...prev,
          activePregnancies: activeCount > 0 ? activeCount : snapshot.size,
          aiRiskFlags: riskCount,
          monthlyDeliveries: deliveriesCount > 0 ? deliveriesCount : 0, // fallback default if none logged yet
        }));
        setLoading(false);
      }, (error) => {
        console.error("Error fetching patients snapshot:", error);
        setLoading(false);
      });

      // 2. Listen to Today's Appointments / Queue
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const appointmentsQuery = query(collection(db, "appointments"));
      const unsubscribeAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
        let queueCount = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Check if appointment is scheduled for today or matches current queue
          if (data.date === todayStr || data.status === 'Scheduled' || data.status === 'Queue') {
            queueCount++;
          }
        });

        setMetrics(prev => ({
          ...prev,
          todayQueue: queueCount > 0 ? queueCount : snapshot.size > 0 ? snapshot.size : 0
        }));
      }, (error) => {
        console.error("Error fetching appointments snapshot:", error);
      });

      // Cleanup listeners on unmount
      return () => {
        unsubscribePatients();
        unsubscribeAppointments();
      };
    } catch (error) {
      console.error("Firestore connection error:", error);
      setLoading(false);
    }
  }, []);

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
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]} activeOpacity={0.8}>
            <Ionicons name="grid" size={18} color="#0D9488" style={styles.navIcon} />
            <Text style={[styles.navText, styles.navTextActive]}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} activeOpacity={0.8} onPress={() => router.push('/(admin)/patients' as any)}>
            <Ionicons name="people-outline" size={18} color="#64748B" style={styles.navIcon} />
            <Text style={styles.navText}>Patients</Text>
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
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={14} color="#0D9488" />
                </View>
                <View>
                  <Text style={styles.adminName}>Midwife Admin</Text>
                  <Text style={styles.adminRole}>Lying-In Staff</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Scrollable Dashboard Body */}
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            
            {/* Breadcrumb & Welcome Banner */}
            <Text style={styles.breadcrumb}>Dashboard &gt; <Text style={{ color: '#0F172A' }}>Midwife Overview</Text></Text>

            <View style={styles.welcomeBanner}>
              <View style={styles.welcomeTextWrapper}>
                <Text style={styles.welcomeTitle}>Good Morning, Midwife</Text>
                <Text style={styles.welcomeSubtitle}>
                  Have a productive shift. Database reports {metrics.aiRiskFlags} patient records flagged for urgent review.
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
                  <Text style={styles.metricValue}>{metrics.todayQueue}</Text>
                )}
                <Text style={styles.metricSub}>Scheduled checkups</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeaderRow}>
                  <Text style={styles.metricLabel}>AI Risk Flags</Text>
                  <View style={styles.trendBadgeRed}>
                    <Ionicons name="warning" size={10} color="#DC2626" />
                    <Text style={styles.trendTextRed}>Urgent</Text>
                  </View>
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color="#DC2626" style={{ marginVertical: 8, alignSelf: 'flex-start' }} />
                ) : (
                  <Text style={styles.metricValue}>{metrics.aiRiskFlags}</Text>
                )}
                <Text style={styles.metricSub}>Elevated BP alerts</Text>
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

            {/* Bottom Section Cards */}
            <View style={styles.bottomGrid}>
              
              <View style={styles.chartCard}>
                <Text style={styles.cardTitle}>Monthly Patient Admissions</Text>
                <Text style={styles.cardSub}>Growth overview across 2026</Text>
                <View style={styles.fakeChartBox}>
                  <View style={[styles.chartBar, { height: '40%' }]} />
                  <View style={[styles.chartBar, { height: '65%' }]} />
                  <View style={[styles.chartBar, { height: '50%' }]} />
                  <View style={[styles.chartBar, { height: '80%' }]} />
                  <View style={[styles.chartBar, { height: '60%' }]} />
                  <View style={[styles.chartBar, { height: '90%', backgroundColor: '#0D9488' }]} />
                </View>
              </View>

              <View style={styles.bmiCard}>
                <Text style={styles.cardTitle}>Average Maternal BMI Status</Text>
                <Text style={styles.cardSub}>Active patient population distribution</Text>
                <View style={styles.bmiStatsRow}>
                  <View style={styles.bmiStatItem}>
                    <Text style={styles.bmiNum}>2</Text>
                    <Text style={styles.bmiCategory}>Underweight</Text>
                  </View>
                  <View style={[styles.bmiStatItem, styles.bmiStatItemActive]}>
                    <Text style={[styles.bmiNum, { color: '#0D9488' }]}>19</Text>
                    <Text style={[styles.bmiCategory, { color: '#0D9488', fontWeight: '700' }]}>Normal (45.5kg)</Text>
                  </View>
                  <View style={styles.bmiStatItem}>
                    <Text style={styles.bmiNum}>3</Text>
                    <Text style={styles.bmiCategory}>Overweight</Text>
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
  avatarPlaceholder: {
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
    width: 24,
    backgroundColor: '#CCFBF1',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
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