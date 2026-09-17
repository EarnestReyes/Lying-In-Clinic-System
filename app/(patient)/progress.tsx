import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ProgressScreen() {
  const router = useRouter();
  const [selectedWeek, setSelectedWeek] = useState(31);

  // Weekly milestones data tailored for the patient portal
  const weeklyData: Record<number, { title: string; size: string; weight: string; length: string; notes: string }> = {
    30: {
      title: 'Week 30: Baby is practicing breathing movements',
      size: 'Cabbage',
      weight: 'approx. 1.3 kg',
      length: '39.9 cm',
      notes: 'Your baby’s brain is developing rapidly, and they can now turn their head from side to side.',
    },
    31: {
      title: 'Week 31: All five senses are working!',
      size: 'Coconut',
      weight: 'approx. 1.5 kg',
      length: '41.1 cm',
      notes: 'Baby can process information, track lights with their eyes, and taste what you eat through amniotic fluid.',
    },
    32: {
      title: 'Week 32: Fingernails and toenails are fully formed',
      size: 'Jicama',
      weight: 'approx. 1.7 kg',
      length: '42.4 cm',
      notes: 'You might feel more frequent kicks and stretches as space gets tighter inside the womb.',
    },
  };

  const currentMilestone = weeklyData[selectedWeek] || weeklyData[31];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>PREGNANCY JOURNEY</Text>
          <Text style={styles.headerTitle}>Weekly Milestones</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Week Selector Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekSelectorContainer}>
          {[29, 30, 31, 32, 33, 34, 35].map((week) => (
            <TouchableOpacity
              key={week}
              style={[styles.weekChip, selectedWeek === week && styles.weekChipActive]}
              onPress={() => setSelectedWeek(week)}
              activeOpacity={0.8}
            >
              <Text style={[styles.weekChipText, selectedWeek === week && styles.weekChipTextActive]}>
                Week {week}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hero Milestone Card */}
        <View style={styles.milestoneCard}>
          <View style={styles.milestoneBadgeRow}>
            <Ionicons name="sparkles" size={14} color="#0D9488" />
            <Text style={styles.milestoneBadgeText}>Current Milestone</Text>
          </View>
          <Text style={styles.milestoneTitle}>{currentMilestone.title}</Text>
          <Text style={styles.milestoneNotes}>{currentMilestone.notes}</Text>

          {/* Size Comparison Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Baby Size</Text>
              <Text style={styles.statValue}>{currentMilestone.size}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>{currentMilestone.weight}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Length</Text>
              <Text style={styles.statValue}>{currentMilestone.length}</Text>
            </View>
          </View>
        </View>

        {/* Symptoms Tracker Section */}
        <Text style={styles.sectionTitle}>Common Symptoms This Week</Text>
        
        <View style={styles.symptomCard}>
          <View style={styles.symptomIconBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#D97706" />
          </View>
          <View style={styles.symptomContent}>
            <Text style={styles.symptomTitle}>Shortness of Breath</Text>
            <Text style={styles.symptomSub}>Your uterus is pressing against your diaphragm. Practice good posture to give your lungs more space.</Text>
          </View>
        </View>

        <View style={styles.symptomCard}>
          <View style={[styles.symptomIconBox, { backgroundColor: '#FCE7F3' }]}>
            <Ionicons name="body-outline" size={20} color="#DB2777" />
          </View>
          <View style={styles.symptomContent}>
            <Text style={styles.symptomTitle}>Lower Back Aches</Text>
            <Text style={styles.symptomSub}>Relieve tension with gentle stretching or warm compresses as advised by your midwife.</Text>
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
  weekSelectorContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  weekChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  weekChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  weekChipTextActive: {
    color: '#FFFFFF',
  },
  milestoneCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  milestoneBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
    marginLeft: 6,
  },
  milestoneTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  milestoneNotes: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  symptomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  symptomIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  symptomContent: {
    flex: 1,
  },
  symptomTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  symptomSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
});