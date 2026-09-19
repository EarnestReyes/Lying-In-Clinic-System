import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CLINIC } from '../../src/config/clinic';

export default function ContactScreen() {
  const router = useRouter();

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleOpenMap = () => {
    router.push('/(patient)/clinic-map' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>SUPPORT & EMERGENCY</Text>
          <Text style={styles.headerTitle}>Clinic Contacts</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Emergency Hotline Card */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyBadgeRow}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.emergencyBadgeText}>24/7 EMERGENCY HOTLINE</Text>
          </View>
          <Text style={styles.emergencyTitle}>Labor & Delivery Triage</Text>
          <Text style={styles.emergencySub}>Call immediately if you experience regular contractions, water breakage, or bleeding.</Text>
          
          <TouchableOpacity 
            style={styles.callButton} 
            activeOpacity={0.8}
            onPress={() => handleCall('09123456789')}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.callButtonText}>Call Emergency Line</Text>
          </TouchableOpacity>
        </View>

        {/* Clinic Info Sections */}
        <Text style={styles.sectionTitle}>Clinic Information</Text>

        <TouchableOpacity style={styles.infoCard} activeOpacity={0.8} onPress={() => handleCall('09987654321')}>
          <View style={[styles.infoIconBox, { backgroundColor: '#CCFBF1' }]}>
            <Ionicons name="call-outline" size={20} color="#0D9488" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Front Desk & Inquiries</Text>
            <Text style={styles.infoValue}>+63 998 765 4321</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.infoCard} activeOpacity={0.8} onPress={handleOpenMap}>
          <View style={[styles.infoIconBox, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="location-outline" size={20} color="#4F46E5" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Clinic Address</Text>
            <Text style={styles.infoValue}>{CLINIC.address}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.infoCardStatic}>
          <View style={[styles.infoIconBox, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time-outline" size={20} color="#D97706" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Operating Hours</Text>
            <Text style={styles.infoValue}>Prenatal Consultation: Mon - Sat (8:00 AM - 5:00 PM)</Text>
            <Text style={[styles.infoValue, { color: '#0D9488', marginTop: 2, fontWeight: '700' }]}>Delivery & Emergency: Open 24/7</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emergencyCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  emergencyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  emergencyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#991B1B',
    marginBottom: 6,
  },
  emergencySub: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
    marginBottom: 16,
  },
  callButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoCardStatic: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
  },
});
