import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminNavigation, adminNavigation } from '../src/navigation/AdminNavigation';
import { authService } from '../src/services/authService';
import { CLINIC } from '../src/config/clinic';
import { Colors } from '../src/theme/colors';

const STORAGE_KEY = 'staff-sidebar-collapsed';

export function AdminSidebar({ navigation = adminNavigation }: { navigation?: AdminNavigation }) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [preference, setPreference] = useState<boolean | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const [tooltip, setTooltip] = useState('');
  const interacted = useRef(false);
  const collapsed = preference ?? width < 1000;

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (mounted && !interacted.current && (value === 'true' || value === 'false')) setPreference(value === 'true');
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const toggle = () => {
    interacted.current = true;
    setPreference(!collapsed);
    setTooltip('');
    void AsyncStorage.setItem(STORAGE_KEY, String(!collapsed)).catch(() => {});
  };
  const logout = async () => {
    setLoggingOut(true); setError('');
    try { await authService.logout(); router.replace('/(auth)/login'); }
    catch { setError('Unable to sign out. Try again.'); }
    finally { setLoggingOut(false); }
  };

  return <View style={[styles.sidebar, { width: collapsed ? 76 : 248 }]}>
    <View style={[styles.brand, collapsed && styles.centered]}>
      <View style={styles.logo}><Ionicons name="medical" size={22} color={Colors.surface} /></View>
      {!collapsed && <Text style={styles.brandText}>{CLINIC.name}</Text>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? 'Expand menu' : 'Collapse menu'}
      accessibilityState={{ expanded: !collapsed }} onPress={toggle}
      style={({ hovered, pressed }) => [styles.item, collapsed && styles.centered, (hovered || pressed) && styles.hover]}>
      <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={20} color={Colors.textSecondary} />
      {!collapsed && <Text style={styles.label}>Collapse menu</Text>}
    </Pressable>
    <ScrollView style={styles.menu} contentContainerStyle={styles.menuContent}>
      {navigation.sections.map(section => <View key={section}>
        {collapsed ? <View style={styles.divider} /> : <Text style={styles.section}>{section}</Text>}
        {navigation.itemsIn(section).map(item => {
          const active = navigation.isActive(item, pathname);
          return <View key={item.path}>
            <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: active }}
              onHoverIn={() => setTooltip(item.path)} onHoverOut={() => setTooltip('')}
              onFocus={() => setTooltip(item.path)} onBlur={() => setTooltip('')}
              onPress={() => { setTooltip(''); if (!active || pathname !== item.path) router.navigate(`/(admin)${item.path}` as Href); }}
              style={({ hovered, pressed }) => [styles.item, collapsed && styles.centered, (hovered || pressed) && styles.hover, active && styles.active]}>
              <Ionicons name={item.icon} size={21} color={active ? Colors.primaryDark : Colors.textMuted} />
              {!collapsed && <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>}
            </Pressable>
            {collapsed && tooltip === item.path && <Text style={styles.compactLabel}>{item.label}</Text>}
          </View>;
        })}
      </View>)}
    </ScrollView>
    <View style={styles.footer}>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel="Log out" disabled={loggingOut}
        accessibilityState={{ disabled: loggingOut }} onPress={logout}
        style={({ hovered, pressed }) => [styles.item, collapsed && styles.centered, (hovered || pressed) && styles.hover]}>
        <Ionicons name="log-out-outline" size={21} color={Colors.danger} />
        {!collapsed && <Text style={[styles.label, styles.error]}>{loggingOut ? 'Signing out…' : 'Log Out'}</Text>}
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  sidebar: { backgroundColor: Colors.surface, borderRightWidth: 1, borderRightColor: Colors.border, paddingHorizontal: 12, paddingTop: 22, flexShrink: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22, paddingHorizontal: 4 },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, flexShrink: 1 },
  menu: { flex: 1 },
  menuContent: { paddingBottom: 16 },
  section: { fontSize: 11, fontWeight: '700', color: Colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 22, marginBottom: 10, paddingHorizontal: 10 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 14, marginHorizontal: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, marginBottom: 4 },
  centered: { justifyContent: 'center', paddingHorizontal: 0 },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', flexShrink: 1 },
  compactLabel: { fontSize: 10, textAlign: 'center', color: Colors.textSecondary, marginBottom: 8 },
  active: { backgroundColor: Colors.primaryLight },
  activeLabel: { color: Colors.primaryDark, fontWeight: '700' },
  hover: { backgroundColor: Colors.surfaceMuted },
  footer: { borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: 14 },
  error: { color: Colors.danger, fontSize: 12 },
});
