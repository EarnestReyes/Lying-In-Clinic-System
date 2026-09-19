import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../src/theme/colors';

export function QueueHeader({ title, onBack, rightActionLabel, onRightAction }: { title?: string; onBack?: () => void; rightActionLabel?: string; onRightAction?: () => void }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: Colors.surface }}>
      <View style={queueStyles.header}>
        <TouchableOpacity 
          style={queueStyles.backButton} 
          onPress={onBack ? onBack : () => router.back()} 
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        
        <Text style={queueStyles.headerTitle} numberOfLines={1}>{title || 'Queue Management'}</Text>

        {rightActionLabel && onRightAction ? (
          <TouchableOpacity 
            style={queueStyles.editToggleButton} 
            onPress={onRightAction} 
            activeOpacity={0.8}
          >
            <Text style={queueStyles.editToggleText}>{rightActionLabel}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
    </SafeAreaView>
  );
}

export function QueueButton({ label, onPress, disabled = false }: { label: string; onPress(): void; disabled?: boolean }) {
  return (
    <TouchableOpacity 
      accessibilityRole="button" 
      accessibilityState={{ disabled }} 
      disabled={disabled} 
      onPress={onPress} 
      style={[queueStyles.button, disabled && { opacity: 0.5 }]}
    >
      <Text style={queueStyles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function QueueCard({ children }: { children: React.ReactNode }) { 
  return <View style={queueStyles.card}>{children}</View>; 
}

export const queueStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.pageBackground },
  page: { flex: 1, backgroundColor: Colors.pageBackground },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border, 
    backgroundColor: Colors.surface 
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
    color: Colors.textPrimary, 
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
    color: Colors.primary,
  },

  content: { padding: 24, gap: 18, width: '100%', maxWidth: 1100, alignSelf: 'center', paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  heading: { fontSize: 19, fontWeight: '700', color: Colors.textPrimary },
  text: { fontSize: 15, color: Colors.textSecondary, lineHeight: 23 },
  card: { backgroundColor: Colors.surface, padding: 22, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  button: { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 10, alignSelf: 'flex-start' },
  buttonText: { color: Colors.surface, fontWeight: '700', fontSize: 15 },
  error: { color: Colors.danger, lineHeight: 23 },
  badge: { color: Colors.primaryDark, fontWeight: '700', fontSize: 16 },
});