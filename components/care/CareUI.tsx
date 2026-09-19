import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Colors as C } from '../../src/theme/colors';

export function CareHeader({ title, onBack, rightActionLabel, onRightAction }: { title?: string; onBack?: () => void; rightActionLabel?: string; onRightAction?: () => void }) {
  return (
    <View style={s.header}>
      <TouchableOpacity 
        style={s.backButton} 
        onPress={onBack ? onBack : () => router.back()} 
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
      </TouchableOpacity>
      
      <Text style={s.headerTitle} numberOfLines={1}>{title || 'My Care Space'}</Text>

      {rightActionLabel && onRightAction ? (
        <TouchableOpacity 
          style={s.editToggleButton} 
          onPress={onRightAction} 
          activeOpacity={0.8}
        >
          <Text style={s.editToggleText}>{rightActionLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} /> // Spacer to keep title centered if no right action exists
      )}
    </View>
  );
}

export function CareCard({ title, subtitle, children }: { title?: string; subtitle?: string; children?: React.ReactNode }) {
  return <View style={s.card}>{title && <Text style={s.heading}>{title}</Text>}{subtitle && <Text style={s.muted}>{subtitle}</Text>}{children}</View>;
}

export function CareButton({ label, onPress, disabled, secondary = false, danger = false }: { label: string; onPress(): void; disabled?: boolean; secondary?: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.button, secondary && s.secondary, danger && { backgroundColor: C.dangerPale }, (disabled || pressed) && { opacity: 0.55 }]}>
    <Text style={[s.buttonText, secondary && { color: C.primaryDark }, danger && { color: C.danger }]}>{label}</Text>
  </Pressable>;
}

export function CareField({ label, value, onChange, multiline = false, placeholder, maxLength = 2000 }: { label: string; value: string; onChange(value: string): void; multiline?: boolean; placeholder?: string; maxLength?: number }) {
  return <View style={{ gap: 8 }}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
    multiline={multiline} maxLength={maxLength} placeholder={placeholder} placeholderTextColor={C.textFaint}
    style={[s.input, multiline && { minHeight: 100, textAlignVertical: 'top' }]} /></View>;
}

export function CareCheck({ checked, label, onPress, disabled }: { checked: boolean; label: string; onPress(): void; disabled?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled: !!disabled }} disabled={disabled} onPress={onPress} style={s.checkRow}>
    <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={25} color={checked ? C.primary : C.textFaint} /><Text style={[s.text, { flex: 1 }]}>{label}</Text>
  </Pressable>;
}

export const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.pageBackground },
  page: { flex: 1, backgroundColor: C.pageBackground },
  
  // Header styles matching your requested layout structure
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: C.border, 
    backgroundColor: C.surface 
  },
  backButton: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: C.textPrimary, 
    textAlign: 'center',
    flex: 1 
  },
  editToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
  },

  content: { padding: 20, paddingBottom: 110, gap: 18, maxWidth: 1080, width: '100%', alignSelf: 'center' },
  hero: { backgroundColor: C.primaryDeep, borderRadius: 24, padding: 24, gap: 12 },
  eyebrow: { color: C.primarySoft, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  heroTitle: { color: C.surface, fontSize: 28, fontWeight: '800' },
  heroText: { color: C.primaryLight, fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, gap: 14 },
  heading: { fontSize: 19, fontWeight: '800', color: C.textPrimary },
  text: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
  muted: { fontSize: 13, color: C.textMuted, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  badge: { alignSelf: 'flex-start', backgroundColor: C.primaryPale, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, color: C.primaryDark, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  button: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 17, paddingVertical: 12, minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  secondary: { backgroundColor: C.primaryPale },
  buttonText: { fontSize: 13, fontWeight: '700', color: C.surface },
  input: { borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.pageBackground, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.textPrimary, fontSize: 15 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 44 },
  separator: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14, gap: 10 },
  error: { color: C.danger, backgroundColor: C.dangerPale, borderRadius: 12, padding: 14, lineHeight: 21 },
  notice: { color: C.primaryDark, backgroundColor: C.primaryLight, borderRadius: 12, padding: 14, lineHeight: 21 },
});