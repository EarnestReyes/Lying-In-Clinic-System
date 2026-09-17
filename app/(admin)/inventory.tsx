import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Import Firebase and your Inventory Service / Models
import { db } from '../../src/config/firebase'; 
import { collection, onSnapshot, query } from 'firebase/firestore';
import { fetchInventoryItems, addInventoryItem } from '../../src/services/inventoryService';
import { InventoryItem } from '../../src/models/inventory';

// Fallback Mock inventory data for a lying-in clinic (used if offline or before firestore sync)
const INITIAL_INVENTORY_DATA: InventoryItem[] = [
  {
    id: '1',
    itemName: 'Iron + Folic Acid Tablets',
    category: 'Vitamins & Supplements',
    stock: 450,
    unit: 'tablets',
    minThreshold: 100,
    lastRestocked: 'Sept 1, 2026',
  },
  {
    id: '2',
    itemName: 'Tetanus Toxoid Vaccine',
    category: 'Vaccines',
    stock: 14,
    unit: 'vials',
    minThreshold: 20,
    lastRestocked: 'Aug 15, 2026',
  },
  {
    id: '3',
    itemName: 'Ultrasound Gel',
    category: 'Equipment & Supplies',
    stock: 5,
    unit: 'bottles',
    minThreshold: 8,
    lastRestocked: 'Aug 10, 2026',
  },
  {
    id: '4',
    itemName: 'Disposable Examination Gloves',
    category: 'PPE & Consumables',
    stock: 1200,
    unit: 'pairs',
    minThreshold: 300,
    lastRestocked: 'Sept 5, 2026',
  },
  {
    id: '5',
    itemName: 'Oxytocin Injection (1 IU/mL)',
    category: 'Emergency Medications',
    stock: 35,
    unit: 'ampoules',
    minThreshold: 15,
    lastRestocked: 'Aug 28, 2026',
  },
];

export default function InventoryScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  
  // Real-time & Service States
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>(INITIAL_INVENTORY_DATA);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Item Form States
  const [formItemName, setFormItemName] = useState('');
  const [formCategory, setFormCategory] = useState('Vitamins & Supplements');
  const [formStock, setFormStock] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formThreshold, setFormThreshold] = useState('');
  const [formRestocked, setFormRestocked] = useState('');

  // Hook up real-time Firestore synchronization listener
  useEffect(() => {
    setLoading(true);
    
    // Optional: Initial fetch via service
    fetchInventoryItems().then((data: any) => {
      if (data && data.length > 0) {
        processAndSetInventory(data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    // Real-time listener setup
    const q = query(collection(db, "inventory"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const items: any = [];
      querySnapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      if (items.length > 0) {
        processAndSetInventory(items);
      }
    }, (error) => {
      console.error("Error with real-time inventory snapshot: ", error);
    });
    
    return () => unsubscribe();
  }, []);

  const processAndSetInventory = (rawData: any[]) => {
    const formatted: InventoryItem[] = rawData.map(data => {
      const stockCount = Number(data.stock) || 0;
      const threshold = Number(data.minThreshold) || 0;
      return {
        id: data.id,
        itemName: data.itemName || '',
        category: data.category || 'General',
        stock: stockCount,
        unit: data.unit || 'units',
        minThreshold: threshold,
        status: stockCount <= threshold ? 'Low Stock' : 'In Stock',
        statusColor: stockCount <= threshold ? '#EF4444' : '#10B981',
        lastRestocked: data.lastRestocked || 'N/A',
      };
    });
    setInventoryList(formatted);
  };

  // Handle saving a new inventory item using inventoryService
  const handleAddItem = async () => {
    if (!formItemName || !formStock || !formUnit) {
      Alert.alert("Missing Fields", "Please provide the item name, stock count, and unit type.");
      return;
    }

    try {
      setActionLoading(true);
      await addInventoryItem({
        itemName: formItemName,
        category: formCategory,
        stock: Number(formStock),
        unit: formUnit,
        minThreshold: Number(formThreshold) || 10,
        lastRestocked: formRestocked || 'Today',
      });

      setModalVisible(false);
      clearForm();
      Alert.alert("Success", "New item added to inventory successfully.");
    } catch (error) {
      console.error("Error adding inventory item:", error);
      Alert.alert("Error", "Could not save the inventory item to the database.");
    } finally {
      setActionLoading(false);
    }
  };

  const clearForm = () => {
    setFormItemName('');
    setFormCategory('Vitamins & Supplements');
    setFormStock('');
    setFormUnit('');
    setFormThreshold('');
    setFormRestocked('');
  };

  // Filter items based on tabs and search query
  const filteredInventory = inventoryList.filter(item => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'All') return matchesSearch;
    if (activeTab === 'Low Stock') return matchesSearch && (item.stock <= item.minThreshold);
    return matchesSearch && item.category === activeTab;
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
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]} activeOpacity={0.8}>
            <Ionicons name="medkit" size={18} color="#0D9488" style={styles.navIcon} />
            <Text style={[styles.navText, styles.navTextActive]}>Inventory</Text>
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
                placeholder="Search medical supplies..."
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
            
            <Text style={styles.breadcrumb}>Dashboard &gt; <Text style={{ color: '#0F172A' }}>Medical Inventory</Text></Text>

            <View style={styles.pageHeaderRow}>
              <View>
                <Text style={styles.pageTitle}>Inventory & Stock</Text>
                <Text style={styles.pageSub}>Monitor vaccines, vitamins, and clinical equipment</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.primaryButton} 
                activeOpacity={0.8}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryButtonText}>Add New Item</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabRow}>
              {['All', 'Low Stock', 'Vaccines', 'Vitamins & Supplements'].map(tab => (
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

            {/* Inventory Items List */}
            <View style={styles.listContainer}>
              {loading ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color="#0D9488" />
                  <Text style={styles.emptyText}>Syncing inventory data...</Text>
                </View>
              ) : filteredInventory.length > 0 ? (
                filteredInventory.map(item => {
                  const isLow = item.stock <= item.minThreshold;
                  const currentStatus = isLow ? 'Low Stock' : 'In Stock';
                  const currentStatusColor = isLow ? '#EF4444' : '#10B981';

                  return (
                    <View key={item.id} style={styles.inventoryCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.itemInfoWrapper}>
                          <View style={styles.itemIconBox}>
                            <Ionicons name="medkit-outline" size={20} color="#0D9488" />
                          </View>
                          <View>
                            <Text style={styles.itemName}>{item.itemName}</Text>
                            <Text style={styles.itemCategory}>{item.category}</Text>
                          </View>
                        </View>
                        
                        <View style={[styles.statusBadge, { backgroundColor: `${currentStatusColor}15` }]}>
                          <View style={[styles.statusDot, { backgroundColor: currentStatusColor }]} />
                          <Text style={[styles.statusText, { color: currentStatusColor }]}>{currentStatus}</Text>
                        </View>
                      </View>

                      <View style={styles.cardDivider} />

                      <View style={styles.cardFooter}>
                        <View style={styles.stockCountRow}>
                          <Text style={styles.stockNumber}>{item.stock}</Text>
                          <Text style={styles.stockUnit}> {item.unit} available</Text>
                        </View>
                        <View style={styles.footerInfoItem}>
                          <Ionicons name="time-outline" size={14} color="#64748B" />
                          <Text style={styles.footerInfoText}>Restocked: {item.lastRestocked || 'N/A'}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="cube-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyText}>No inventory items found.</Text>
                </View>
              )}
            </View>

          </ScrollView>

        </View>

      </View>

      {/* Add New Inventory Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Inventory Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <View>
                <Text style={styles.inputLabel}>Item Name *</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="e.g. Paracetamol Syrup"
                  value={formItemName}
                  onChangeText={setFormItemName}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Category</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="e.g. Vitamins & Supplements"
                  value={formCategory}
                  onChangeText={setFormCategory}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Stock Count *</Text>
                  <TextInput 
                    style={styles.modalInput} 
                    placeholder="e.g. 100"
                    keyboardType="numeric"
                    value={formStock}
                    onChangeText={setFormStock}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Unit Type *</Text>
                  <TextInput 
                    style={styles.modalInput} 
                    placeholder="e.g. bottles / boxes"
                    value={formUnit}
                    onChangeText={setFormUnit}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Min Threshold</Text>
                  <TextInput 
                    style={styles.modalInput} 
                    placeholder="e.g. 15"
                    keyboardType="numeric"
                    value={formThreshold}
                    onChangeText={setFormThreshold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Last Restocked</Text>
                  <TextInput 
                    style={styles.modalInput} 
                    placeholder="e.g. Sept 15, 2026"
                    value={formRestocked}
                    onChangeText={setFormRestocked}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.modalSubmitButton} 
                onPress={handleAddItem}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Item</Text>
                )}
              </TouchableOpacity>
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
    gap: 12,
  },
  inventoryCard: {
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
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemCategory: {
    fontSize: 12,
    color: '#64748B',
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stockNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 4,
  },
  stockUnit: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  footerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerInfoText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 450,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  modalSubmitButton: {
    backgroundColor: '#0D9488',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});