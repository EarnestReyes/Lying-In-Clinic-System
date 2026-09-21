import React, { useEffect, useRef, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Import Firebase and your Inventory Service / Models
import { addInventoryItem, deleteInventoryItem, restockInventoryItem, subscribeInventoryItems } from '../../src/services/inventoryService';
import { INVENTORY_UNIT_TYPES, InventoryItem } from '../../src/models/inventory';
import { PatientRecordSearch } from '../../components/PatientRecordSearch';
import { CalendarDatePicker } from '../../components/CalendarDatePicker';
import { Picker } from '@react-native-picker/picker';

const STOCK_OPTIONS = [0, 5, 10, 20, 25, 50, 75, 100, 150, 200, 500];
const RESTOCK_OPTIONS = [1, 5, 10, 20, 25, 50, 75, 100, 150, 200, 500];

export default function InventoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compactForm = width < 820;
  const actionLock = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  
  // Real-time & Service States
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Item Form States
  const [formItemName, setFormItemName] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formCategory, setFormCategory] = useState('Vitamins & Supplements');
  const [formStock, setFormStock] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formThreshold, setFormThreshold] = useState('');
  const [formRestocked, setFormRestocked] = useState('');
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockSupplier, setRestockSupplier] = useState('');
  const [restockBatch, setRestockBatch] = useState('');
  const [restockExpiry, setRestockExpiry] = useState('');
  const [restockDate, setRestockDate] = useState('');
  const [archiveItem, setArchiveItem] = useState<InventoryItem | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<'add' | 'restock' | null>(null);

  // Hook up real-time Firestore synchronization listener
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = subscribeInventoryItems((items) => {
      processAndSetInventory(items);
      setLoading(false);
    }, (error) => {
      console.error("Error with real-time inventory snapshot: ", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const processAndSetInventory = (rawData: any[]) => {
    const formatted: InventoryItem[] = rawData.filter(data => data.isActive !== false).map(data => {
      const stockCount = Number(data.stock) || 0;
      const threshold = Number(data.minThreshold) || 0;
      return {
        id: data.id,
        itemName: data.itemName || '',
        category: data.category || 'General',
        stock: stockCount,
        unit: data.unit || 'units',
        supplier: data.supplier,
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
    if (actionLock.current) return;
    if (!formItemName.trim() || !formCategory || formStock === '' || !formUnit || formThreshold === '' || !formRestocked) {
      Alert.alert("Missing Fields", "Provide the item name, category, stock count, unit type, minimum threshold, and restock date.");
      return;
    }

    if (!Number.isFinite(Number(formStock)) || Number(formStock) < 0 || (formThreshold && (!Number.isFinite(Number(formThreshold)) || Number(formThreshold) < 0))) {
      Alert.alert('Invalid stock', 'Stock and minimum threshold must be zero or positive numbers.');
      return;
    }
    try {
      actionLock.current = true;
      setActionLoading(true);
      await addInventoryItem({
        itemName: formItemName.trim(),
        supplier: formSupplier.trim() || undefined,
        category: formCategory,
        stock: Number(formStock),
        unit: formUnit,
        minThreshold: Number(formThreshold),
        lastRestocked: formRestocked,
        isActive: true,
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

  const openRestockModal = (item: InventoryItem) => {
    setRestockItem(item);
    setRestockQuantity('');
    setRestockSupplier('');
    setRestockBatch('');
    setRestockExpiry('');
    setRestockDate(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  };

  const handleRestock = async () => {
    if (actionLock.current) return;
    const quantity = Number(restockQuantity);
    if (!restockItem || !Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert('Invalid quantity', 'Enter a restock quantity greater than zero.');
      return;
    }
    if (!restockDate) {
      Alert.alert('Restock date required', 'Select the date for this restock.');
      return;
    }
    try {
      actionLock.current = true;
      setActionLoading(true);
      await restockInventoryItem(restockItem.id, { quantity, restockDate, supplier: restockSupplier.trim() || undefined, batchNumber: restockBatch.trim() || undefined, expirationDate: restockExpiry.trim() || undefined });
      setRestockItem(null);
      Alert.alert('Restock recorded', `${quantity} ${restockItem.unit} added to ${restockItem.itemName}.`);
    } catch (error) {
      console.error('Error restocking inventory:', error);
      Alert.alert('Unable to restock', 'The stock update was not saved. Please try again.');
    } finally {
      actionLock.current = false;
      setActionLoading(false);
    }
  };

  const handleArchiveItem = async () => {
    if (!archiveItem) return;
    try {
      setActionLoading(true);
      await deleteInventoryItem(archiveItem.id);
      setInventoryList((items) => items.filter((item) => item.id !== archiveItem.id));
      setArchiveItem(null);
    } catch (error) {
      console.error('Error archiving inventory:', error);
      Alert.alert('Unable to archive', 'The inventory item was not archived. Please try again.');
    } finally {
      actionLock.current = false;
      setActionLoading(false);
    }
  };

  const clearForm = () => {
    setFormItemName('');
    setFormSupplier('');
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
        
        {/* Main Content Area */}
        <View style={styles.mainContent}>
          
          {/* Top Navigation Bar */}
          <View style={styles.topNavbar}>
            <PatientRecordSearch />

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
                      <View style={styles.cardActionRow}>
                        <TouchableOpacity style={styles.restockButton} onPress={() => openRestockModal(item)} disabled={actionLoading}>
                          <Ionicons name="add-circle-outline" size={15} color="#0D9488" />
                          <Text style={styles.restockButtonText}>Restock</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.archiveButton} onPress={() => setArchiveItem(item)} disabled={actionLoading}>
                          <Ionicons name="archive-outline" size={15} color="#DC2626" />
                          <Text style={styles.archiveButtonText}>Archive</Text>
                        </TouchableOpacity>
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
          <View style={[styles.modalContent, styles.addModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Inventory Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContent}>
              <View style={[styles.formRow, compactForm && styles.formRowCompact]}>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Item Name *</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="e.g. Paracetamol Syrup"
                  value={formItemName}
                  onChangeText={setFormItemName}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Supplier</Text>
                <TextInput style={styles.modalInput} placeholder="Supplier name" value={formSupplier} onChangeText={setFormSupplier} />
              </View>
              </View>

              <View style={[styles.formRow, compactForm && styles.formRowCompact]}>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Category *</Text>
                <View style={styles.modalPicker}><Picker selectedValue={formCategory} onValueChange={setFormCategory} style={styles.picker}>{['Vitamins & Supplements', 'Vaccines', 'Equipment & Supplies', 'PPE & Consumables', 'Emergency Medications', 'General'].map((category) => <Picker.Item key={category} label={category} value={category} />)}</Picker></View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Unit Type *</Text>
                <View style={styles.modalPicker}><Picker selectedValue={formUnit} onValueChange={setFormUnit} style={styles.picker}><Picker.Item label="Select unit type" value="" />{INVENTORY_UNIT_TYPES.map(unit => <Picker.Item key={unit} label={unit} value={unit} />)}</Picker></View>
              </View>
              </View>

              <View style={[styles.formRow, compactForm && styles.formRowCompact]}>
                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Stock Count *</Text>
                  <View style={styles.modalPicker}><Picker selectedValue={formStock} onValueChange={setFormStock} style={styles.picker}><Picker.Item label="Select stock count" value="" />{STOCK_OPTIONS.map(value => <Picker.Item key={value} label={String(value)} value={String(value)} />)}</Picker></View>
                </View>
                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>Minimum Threshold *</Text>
                  <TextInput 
                    style={styles.modalInput} 
                    placeholder="e.g. 10"
                    keyboardType="numeric"
                    value={formThreshold}
                    onChangeText={setFormThreshold}
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Restock Date *</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setDatePickerTarget('add')}><Ionicons name="calendar-outline" size={17} color="#0D9488" /><Text style={[styles.dateInputText, !formRestocked && styles.placeholderText]}>{formRestocked || 'Select date'}</Text></TouchableOpacity>
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

      <Modal visible={!!restockItem} animationType="slide" transparent onRequestClose={() => setRestockItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Restock Item</Text><Text style={styles.modalSubtitle}>{restockItem?.itemName}</Text></View><TouchableOpacity onPress={() => setRestockItem(null)} disabled={actionLoading}><Ionicons name="close" size={20} color="#64748B" /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={styles.formContent}>
              <View style={styles.currentStockPanel}><Text style={styles.detailCaption}>Current Stock</Text><Text style={styles.currentStockValue}>{restockItem?.stock} {restockItem?.unit}</Text></View>
              <View><Text style={styles.inputLabel}>Quantity to Add *</Text><View style={styles.modalPicker}><Picker selectedValue={restockQuantity} onValueChange={setRestockQuantity} style={styles.picker}><Picker.Item label="Select quantity" value="" />{RESTOCK_OPTIONS.map(value => <Picker.Item key={value} label={String(value)} value={String(value)} />)}</Picker></View></View>
              <View><Text style={styles.inputLabel}>Restock Date *</Text><TouchableOpacity style={styles.dateInput} onPress={() => setDatePickerTarget('restock')}><Ionicons name="calendar-outline" size={17} color="#0D9488" /><Text style={styles.dateInputText}>{restockDate || 'Select date'}</Text></TouchableOpacity></View>
              <View><Text style={styles.inputLabel}>Supplier (optional)</Text><TextInput style={styles.modalInput} value={restockSupplier} onChangeText={setRestockSupplier} placeholder="Supplier name" /></View>
              <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Text style={styles.inputLabel}>Batch No. (optional)</Text><TextInput style={styles.modalInput} value={restockBatch} onChangeText={setRestockBatch} placeholder="Batch number" /></View><View style={{ flex: 1 }}><Text style={styles.inputLabel}>Expiration (optional)</Text><TextInput style={styles.modalInput} value={restockExpiry} onChangeText={setRestockExpiry} placeholder="Date" /></View></View>
              <TouchableOpacity style={styles.modalSubmitButton} onPress={handleRestock} disabled={actionLoading}>{actionLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitText}>Record Restock</Text>}</TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!archiveItem} animationType="fade" transparent onRequestClose={() => setArchiveItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmIcon}><Ionicons name="archive-outline" size={23} color="#DC2626" /></View>
            <Text style={styles.confirmTitle}>Archive inventory item?</Text>
            <Text style={styles.confirmText}>{archiveItem?.itemName} will be hidden from active inventory. Its restock and medication history will be preserved.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setArchiveItem(null)} disabled={actionLoading}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmArchiveButton} onPress={handleArchiveItem} disabled={actionLoading}>{actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalSubmitText}>Archive</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CalendarDatePicker
        visible={datePickerTarget !== null}
        title={datePickerTarget === 'restock' ? 'Select Restock Date' : 'Select Initial Stock Date'}
        onClose={() => setDatePickerTarget(null)}
        onSelect={value => datePickerTarget === 'restock' ? setRestockDate(value) : setFormRestocked(value)}
      />

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
    position: 'relative', zIndex: 100, elevation: 100,
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
  cardActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  restockButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#CCFBF1' },
  restockButtonText: { color: '#0D9488', fontSize: 12, fontWeight: '700' },
  archiveButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#FEE2E2' },
  archiveButtonText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
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
  addModalContent: { maxWidth: 720, maxHeight: '88%' },
  formContent: { gap: 12 },
  formRow: { flexDirection: 'row', gap: 12 },
  formRowCompact: { flexDirection: 'column' },
  formField: { flex: 1, minWidth: 0 },
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
  confirmModalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 390, alignItems: 'center' },
  confirmIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  confirmText: { fontSize: 13, lineHeight: 19, color: '#64748B', textAlign: 'center', marginTop: 8 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch', justifyContent: 'flex-end' },
  confirmArchiveButton: { backgroundColor: '#DC2626', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10, justifyContent: 'center', alignItems: 'center' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
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
  dateInput: { height: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#CFE8E5', borderRadius: 10, backgroundColor: '#F8FFFE' },
  dateInputText: { color: '#0F172A', fontSize: 13 },
  placeholderText: { color: '#94A3B8' },
  currentStockPanel: { padding: 14, borderRadius: 10, backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#99F6E4' },
  detailCaption: { color: '#64748B', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  currentStockValue: { color: '#0F172A', fontSize: 18, fontWeight: '800', marginTop: 3 },
  modalSubmitButton: {
    backgroundColor: '#0D9488',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalPicker: { height: 44, borderWidth: 1, borderColor: '#CFE8E5', borderRadius: 10, backgroundColor: '#F8FFFE', overflow: 'hidden', justifyContent: 'center' },
  picker: { height: 44, color: '#0F172A', fontSize: 13 },
  modalCancelButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
