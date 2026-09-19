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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createPayment } from '../../../src/services/paymentService';

export default function RecordFinancialScreen() {
  const router = useRouter();

  // Form State
  const [patientName, setPatientName] = useState('');
  const [expenseItems, setExpenseItems] = useState([
    { name: '', amount: '' },
  ]);
  
  const [assistanceItems, setAssistanceItems] = useState<{ provider: string; amount: string; status: string }[]>([]);
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    const items = expenseItems.filter((item) => item.name.trim() && Number(item.amount) > 0).map((item) => ({ name: item.name.trim(), amount: Number(item.amount) }));
    const assistance = assistanceItems.filter((item) => item.provider.trim() && Number(item.amount) > 0).map((item) => ({ provider: item.provider.trim(), amount: Number(item.amount), status: item.status || 'Pending' }));
    if (!patientName.trim() || !items.length) {
      Alert.alert('Missing information', 'Enter a patient name and at least one expense with a positive amount.');
      return;
    }
    try {
      setSaving(true);
      await createPayment({
        patientId: '', // Legacy name-only entry; patient selection will populate this for future records.
        patientName: patientName.trim(),
        amount: remainingBalance,
        description: items.map((item) => item.name).join(', '),
        status: remainingBalance === 0 ? 'paid' : 'pending',
        paymentDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        items,
        assistance,
        totalAmount: totalExpenses,
        totalAssistance,
        patientBalance: remainingBalance,
      } as any);
      Alert.alert('Financial record saved', 'Expenses and assistance were saved successfully.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      console.error('Unable to save financial record:', error);
      Alert.alert('Unable to save', 'The financial record was not saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Outer App Shell Container */}
      <View style={styles.appShell}>
        
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
                <TouchableOpacity style={styles.smallAddButton} onPress={() => setExpenseItems((items) => [...items, { name: '', amount: '' }])}>
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
                <TouchableOpacity style={styles.smallAddButton} onPress={() => setAssistanceItems((items) => [...items, { provider: '', amount: '', status: 'Pending' }])}>
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
              <TouchableOpacity style={styles.submitButton} activeOpacity={0.8} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} /><Text style={styles.submitButtonText}>Save Financial Record</Text></>}
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
