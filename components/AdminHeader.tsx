import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { Reminder } from '../src/models/reminder';
import { adminNavigation } from '../src/navigation/AdminNavigation';
import { subscribeDashboardReminders } from '../src/services/dashboardService';
import { Colors } from '../src/theme/colors';
import { PatientRecordSearch } from './PatientRecordSearch';

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { firebaseUser, userName, userPhotoUrl, userRole, loading } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => subscribeDashboardReminders(setReminders, console.error), []);
  useEffect(() => setPhotoFailed(false), [userPhotoUrl]);

  const compact = width < 1100;
  const activeItem = adminNavigation.items.find(item => adminNavigation.isActive(item, pathname));
  const pageTitle = pathname.endsWith('/chatPatient') ? 'Patient Chat' : activeItem?.label ?? 'Staff Portal';
  const displayName = loading ? 'Loading staff...' : userName || firebaseUser?.displayName || firebaseUser?.email || 'Staff';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'S';
  const roleLabel = userRole === 'midwife' ? 'Midwife' : userRole === 'admin' ? 'Administrator' : 'Staff';
  const onChat = () => {
    if (!pathname.endsWith('/chatPatient')) router.navigate('/(admin)/chatPatient');
  };

  return <>
    <View style={[styles.header, compact && styles.headerCompact]}>
      <Text numberOfLines={1} style={styles.pageTitle}>{pageTitle}</Text>
      {!compact && <PatientRecordSearch />}
      <View style={styles.actions}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open sent reminders" activeOpacity={0.75} style={styles.iconButton} onPress={() => setShowNotifications(true)}>
          <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open patient chat" activeOpacity={0.75} style={[styles.chatButton, pathname.endsWith('/chatPatient') && styles.activeButton]} onPress={onChat}>
          <Ionicons name="chatbubble-ellipses-outline" size={19} color={Colors.textSecondary} />
          {!compact && <Text style={styles.chatText}>Chat</Text>}
        </TouchableOpacity>
        <View style={styles.profile}>
          {userPhotoUrl && !photoFailed
            ? <Image source={{ uri: userPhotoUrl }} style={styles.avatarImage} onError={() => setPhotoFailed(true)} />
            : <View style={styles.avatarFallback}><Text style={styles.avatarInitials}>{initials}</Text></View>}
          <View style={styles.profileText}>
            <Text numberOfLines={1} style={styles.staffName}>{displayName}</Text>
            {!compact && <Text style={styles.staffRole}>{roleLabel}</Text>}
          </View>
        </View>
      </View>
    </View>

    <Modal visible={showNotifications} transparent animationType="fade" onRequestClose={() => setShowNotifications(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.notificationModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sent Reminders</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close sent reminders" hitSlop={10} onPress={() => setShowNotifications(false)}>
              <Ionicons name="close" size={21} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.reminderList} contentContainerStyle={styles.reminderListContent}>
            {reminders.length ? reminders.map(item => <View key={item.id} style={styles.reminderRow}>
              <Text style={styles.reminderTitle}>{item.title}</Text>
              <Text style={styles.reminderStatus}>{item.completed ? 'Completed' : 'Pending'} · {item.patientUid}</Text>
            </View>) : <Text style={styles.emptyText}>No reminders sent yet.</Text>}
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} activeOpacity={0.8} onPress={() => setShowNotifications(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  header: { minHeight: 70, zIndex: 300, elevation: 300, flexDirection: 'row', alignItems: 'center', gap: 22, paddingHorizontal: 28, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerCompact: { paddingHorizontal: 16, gap: 12 },
  pageTitle: { flex: 1, minWidth: 100, color: Colors.textPrimary, fontSize: 19, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0 },
  iconButton: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceMuted, borderWidth: 1, borderColor: Colors.border },
  chatButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceMuted, borderWidth: 1, borderColor: Colors.border },
  activeButton: { backgroundColor: Colors.primaryLight, borderColor: Colors.primarySoft },
  chatText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
  profile: { minWidth: 0, maxWidth: 220, marginLeft: 2, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarImage: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surfaceMuted },
  avatarFallback: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight },
  avatarInitials: { color: Colors.primaryDark, fontSize: 13, fontWeight: '800' },
  profileText: { minWidth: 0, maxWidth: 160 },
  staffName: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800' },
  staffRole: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  modalOverlay: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.45)' },
  notificationModal: { width: '100%', maxWidth: 440, maxHeight: '75%', padding: 20, borderRadius: 16, backgroundColor: Colors.surface },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  reminderList: { flexGrow: 0 },
  reminderListContent: { paddingBottom: 4 },
  reminderRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted },
  reminderTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  reminderStatus: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  emptyText: { color: Colors.textMuted, fontSize: 13, paddingVertical: 18, textAlign: 'center' },
  closeButton: { marginTop: 14, paddingVertical: 11, borderRadius: 9, alignItems: 'center', backgroundColor: Colors.primary },
  closeButtonText: { color: Colors.surface, fontSize: 13, fontWeight: '700' },
});
