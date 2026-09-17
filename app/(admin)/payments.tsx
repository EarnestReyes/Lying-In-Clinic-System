import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Mock Patient Financial Assistance records
const FINANCIAL_RECORDS = [
  {
    id: 'FIN-2026-001',
    patientName: 'Maria Santos',
    date: 'Sept 15, 2026',
    items: [
      { name: 'Prenatal Checkup', amount: '₱500.00' },
      { name: 'Laboratory Panel', amount: '₱1,000.00' },
      { name: 'Delivery Package (NSD)', amount: '₱12,000.00' },
    ],
    totalAmount: '₱13,500.00',
    assistance: [
      { provider: 'PhilHealth', amount: '₱8,000.00', status: 'Approved' },
      { provider: 'LGU Assistance', amount: '₱3,000.00', status: 'Approved' },
    ],
    patientBalance: '₱2,500.00',
    status: 'Pending Balance',
    statusColor: '#F59E0B', // Amber
  },
  {
    id: 'FIN-2026-002',
    patientName: 'Angelica Cruz',
    date: 'Sept 16, 2026',
    items: [
      { name: 'Prenatal Checkup', amount: '₱500.00' },
      { name: 'Routine Supplements', amount: '₱350.00' },
    ],
    totalAmount: '₱850.00',
    assistance: [
      { provider: 'PhilHealth', amount: '₱0.00', status: 'N/A' },
    ],
    patientBalance: '₱850.00',
    status: 'Fully Paid',
    statusColor: '#10B981', // Green
  },
  {
    id: 'FIN-2026-003',
    patientName: 'Jessa Reyes',
    date: 'Sept 16, 2026',
    items: [
      { name: 'Newborn Screening', amount: '₱1,750.00' },
    ],
    totalAmount: '₱1,750.00',
    assistance: [
      { provider: 'HMO / Insurance', amount: '₱1,000.00', status: 'Pending Approval' },
    ],
    patientBalance: '₱750.00',
    status: 'Pending Assistance',
    statusColor: '#3B82F6', // Blue
  },
  {
    id: 'FIN-2026-004',
    patientName: 'Sarah Geronimo',
    date: 'Sept 13, 2026',
    items: [
      { name: 'Ultrasound Examination', amount: '₱600.00' },
    ],
    totalAmount: '₱600.00',
    assistance: [],
    patientBalance: '₱0.00',
    status: 'Fully Paid',
    statusColor: '#10B981',
  },
];

export default function PatientFinancialScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const filteredRecords = FINANCIAL_RECORDS.filter(record => {
    const matchesSearch = record.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'All') return matchesSearch;
    if (activeTab === 'Pending Balance') return matchesSearch && record.status === 'Pending Balance';
    if (activeTab === 'Pending Assistance') return matchesSearch && record.status === 'Pending Assistance';
    if (activeTab === 'Fully Paid') return matchesSearch && record.status === 'Fully Paid';
    return matchesSearch;
  });

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

          <TouchableOpacity style={[styles.navItem, styles.navItemActive]} activeOpacity={0.8}>
            <Ionicons name="wallet" size={18} color="#0D9488" style={styles.navIcon} />
            <Text style={[styles.navText, styles.navTextActive]}>Financial Tracking</Text>
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
                placeholder="Search patient name, reference..."
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
            
            <Text style={styles.breadcrumb}>Dashboard &gt; <Text style={{ color: '#0F172A' }}>Financial & Assistance Tracking</Text></Text>

            <View style={styles.pageHeaderRow}>
              <View>
                <Text style={styles.pageTitle}>Patient Financial Assistance</Text>
                <Text style={styles.pageSub}>Record service expenses, log assistance providers, and track remaining balances</Text>
              </View>
              
              <TouchableOpacity 
                    style={styles.primaryButton} 
                    activeOpacity={0.8}
                    onPress={() => router.push('/(admin)/payments/new' as any)}
                    >
                    <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryButtonText}>Record Patient Expenses</Text>
                </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabRow}>
              {['All', 'Pending Balance', 'Pending Assistance', 'Fully Paid'].map(tab => (
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

            {/* Financial Cards List */}
            <View style={styles.listContainer}>
              {filteredRecords.length > 0 ? (
                filteredRecords.map(record => (
                  <View key={record.id} style={styles.financialCard}>
                    
                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.itemInfoWrapper}>
                        <View style={styles.itemIconBox}>
                          <Ionicons name="receipt-outline" size={20} color="#0D9488" />
                        </View>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.recordId}>{record.id}</Text>
                            <Text style={styles.recordDate}>• {record.date}</Text>
                          </View>
                          <Text style={styles.patientName}>{record.patientName}</Text>
                        </View>
                      </View>
                      
                      <View style={[styles.statusBadge, { backgroundColor: `${record.statusColor}15` }]}>
                        <View style={[styles.statusDot, { backgroundColor: record.statusColor }]} />
                        <Text style={[styles.statusText, { color: record.statusColor }]}>{record.status}</Text>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    {/* Breakdown Section: Itemized Expenses vs Assistance */}
                    <View style={styles.breakdownGrid}>
                      
                      {/* Left Side: Service Items Breakdown */}
                      <View style={styles.breakdownColumn}>
                        <Text style={styles.columnTitle}>Itemized Expenses</Text>
                        {record.items.map((item, idx) => (
                          <View key={idx} style={styles.rowItem}>
                            <Text style={styles.rowItemName}>{item.name}</Text>
                            <Text style={styles.rowItemAmount}>{item.amount}</Text>
                          </View>
                        ))}
                        <View style={[styles.rowItem, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                          <Text style={styles.totalRowText}>Total Expenses</Text>
                          <Text style={styles.totalRowAmount}>{record.totalAmount}</Text>
                        </View>
                      </View>

                      {/* Right Side: Financial Assistance & Balance */}
                      <View style={styles.breakdownColumnSecondary}>
                        <Text style={styles.columnTitle}>Assistance & Balance</Text>
                        {record.assistance.length > 0 ? (
                          record.assistance.map((asst, idx) => (
                            <View key={idx} style={styles.rowItem}>
                              <View>
                                <Text style={styles.rowItemName}>{asst.provider}</Text>
                                <Text style={styles.assistanceStatusText}>({asst.status})</Text>
                              </View>
                              <Text style={[styles.rowItemAmount, { color: '#0D9488' }]}>{asst.amount}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.noAssistanceText}>No financial assistance logged.</Text>
                        )}

                        <View style={[styles.balanceBox, { marginTop: 8 }]}>
                          <Text style={styles.balanceLabel}>Patient Balance:</Text>
                          <Text style={styles.balanceValue}>{record.patientBalance}</Text>
                        </View>
                      </View>

                    </View>

                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="wallet-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyText}>No financial records found.</Text>
                </View>
              )}
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
    marginBottom: 20,
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 16,
  },
  financialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
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
  itemInfoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  recordId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  recordDate: {
    fontSize: 12,
    color: '#64748B',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
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
  breakdownGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  breakdownColumn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownColumnSecondary: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  columnTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rowItemName: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  rowItemAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalRowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalRowAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  assistanceStatusText: {
    fontSize: 10,
    color: '#64748B',
  },
  noAssistanceText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  balanceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#99F6E4',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F766E',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
});