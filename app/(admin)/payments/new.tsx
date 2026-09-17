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

export default function RecordFinancialScreen() {
  const router = useRouter();

  // Form State
  const [patientName, setPatientName] = useState('Maria Santos');
  const [expenseItems, setExpenseItems] = useState([
    { name: 'Prenatal Checkup', amount: '500' },
    { name: 'Laboratory Panel', amount: '1000' },
    { name: 'Delivery Package (NSD)', amount: '12000' },
  ]);
  
  const [assistanceItems, setAssistanceItems] = useState([
    { provider: 'PhilHealth', amount: '8000', status: 'Approved' },
    { provider: 'LGU Assistance', amount: '3000', status: 'Approved' },
  ]);

  // State Update Helpers
  const handleExpenseChange = (text: string, index: number, field: 'name' | 'amount') => {
    const updated = [...expenseItems];
    updated[index][field] = text;
    setExpenseItems(updated);
  };

  const handleAssistanceChange = (text: string, index: number, field: 'provider' | 'amount') => {
    const updated = [...assistanceItems];
    updated[index][field] = text;
    setAssistanceItems(updated);
  };

  // Calculation helpers
  const totalExpenses = expenseItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
  const totalAssistance = assistanceItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
  const remainingBalance = Math.max(0, totalExpenses - totalAssistance);

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
            <Text style={styles.logoText}>Pre Clinic</Text>
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

          <TouchableOpacity style={[styles.navItem, styles.navItemActive]} activeOpacity={0.8} onPress={() => router.push('/(admin)/payments' as any)}>
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
            <TouchableOpacity 
              style={styles.backButtonRow} 
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color="#0D9488" />
              <Text style={styles.backButtonText}>Back to Financial Tracking</Text>
            </TouchableOpacity>

            <View style={styles.topNavRight}>
              <TouchableOpacity style={styles.topIconButton}>
                <Ionicons name="notifications-outline" size={18} color="#64748B" />
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

          {/* Scrollable Form Body */}
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            
            <Text style={styles.breadcrumb}>Financial Tracking &gt; <Text style={{ color: '#0F172A' }}>Record Expenses & Assistance</Text></Text>

            <View style={styles.pageHeaderRow}>
              <View>
                <Text style={styles.pageTitle}>New Financial Record</Text>
                <Text style={styles.pageSub}>Input itemized clinic services and log assistance sources</Text>
              </View>
            </View>

            {/* Form Card Container */}
            <View style={styles.formCard}>
              
              {/* Patient Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Patient Name</Text>
                <TextInput 
                  style={styles.textInput}
                  value={patientName}
                  onChangeText={setPatientName}
                  placeholder="Enter patient full name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.cardDivider} />

              {/* Itemized Expenses Section */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>1. Itemized Service Expenses</Text>
                <TouchableOpacity style={styles.smallAddButton}>
                  <Ionicons name="add" size={14} color="#0D9488" style={{ marginRight: 2 }} />
                  <Text style={styles.smallAddButtonText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {expenseItems.map((item, index) => (
                <View key={index} style={styles.dynamicRow}>
                  <TextInput 
                    style={[styles.textInput, { flex: 2 }]}
                    value={item.name}
                    onChangeText={(text) => handleExpenseChange(text, index, 'name')}
                    placeholder="Service or item name"
                    placeholderTextColor="#94A3B8"
                  />
                  <View style={[styles.textInput, { flex: 1, flexDirection: 'row', alignItems: 'center' }]}>
                    <Text style={{ color: '#64748B', marginRight: 4, fontWeight: '600' }}>₱</Text>
                    <TextInput 
                      style={{ flex: 1, color: '#0F172A', fontWeight: '700' }}
                      value={item.amount}
                      onChangeText={(text) => handleExpenseChange(text, index, 'amount')}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              ))}

              <View style={styles.cardDivider} />

              {/* Financial Assistance Section */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>2. Financial Assistance Providers</Text>
                <TouchableOpacity style={styles.smallAddButton}>
                  <Ionicons name="add" size={14} color="#0D9488" style={{ marginRight: 2 }} />
                  <Text style={styles.smallAddButtonText}>Add Provider</Text>
                </TouchableOpacity>
              </View>

              {assistanceItems.map((asst, index) => (
                <View key={index} style={styles.dynamicRow}>
                  <TextInput 
                    style={[styles.textInput, { flex: 2 }]}
                    value={asst.provider}
                    onChangeText={(text) => handleAssistanceChange(text, index, 'provider')}
                    placeholder="Provider (e.g. PhilHealth, LGU)"
                    placeholderTextColor="#94A3B8"
                  />
                  <View style={[styles.textInput, { flex: 1, flexDirection: 'row', alignItems: 'center' }]}>
                    <Text style={{ color: '#0D9488', marginRight: 4, fontWeight: '600' }}>₱</Text>
                    <TextInput 
                      style={{ flex: 1, color: '#0F172A', fontWeight: '700' }}
                      value={asst.amount}
                      onChangeText={(text) => handleAssistanceChange(text, index, 'amount')}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              ))}

              <View style={styles.cardDivider} />

              {/* Summary Calculation Box */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Expenses:</Text>
                  <Text style={styles.summaryVal}>₱{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Assistance Coverage:</Text>
                  <Text style={[styles.summaryVal, { color: '#0D9488' }]}>- ₱{totalAssistance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={[styles.summaryRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#CCFBF1' }]}>
                  <Text style={styles.balanceLabel}>Remaining Patient Balance:</Text>
                  <Text style={styles.balanceVal}>₱{remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                </View>
              </View>

              {/* Submit Action Button */}
              <TouchableOpacity style={styles.submitButton} activeOpacity={0.8} onPress={() => router.back()}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Save Financial Record</Text>
              </TouchableOpacity>

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
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
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
    maxWidth: 900,
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
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0F172A',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  smallAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  smallAddButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  dynamicRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  summaryBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F766E',
  },
  balanceVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F766E',
  },
  submitButton: {
    backgroundColor: '#0D9488',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});