import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function CalendarDatePicker({ visible, title = 'Select Date', onClose, onSelect }: { visible: boolean; title?: string; onClose(): void; onSelect(value: string): void }) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  useEffect(() => {
    if (visible) setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, [visible]);

  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => index + 1);
  const padding = Array.from({ length: new Date(month.getFullYear(), month.getMonth(), 1).getDay() });

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.titleRow}><Text style={styles.title}>{title}</Text><TouchableOpacity accessibilityLabel="Close calendar" hitSlop={10} onPress={onClose}><Ionicons name="close" size={21} color="#64748B" /></TouchableOpacity></View>
        <View style={styles.monthRow}>
          <TouchableOpacity disabled={month <= new Date(now.getFullYear(), now.getMonth(), 1)} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Ionicons name="chevron-back" size={22} color="#0D9488" /></TouchableOpacity>
          <Text style={styles.month}>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Ionicons name="chevron-forward" size={22} color="#0D9488" /></TouchableOpacity>
        </View>
        <View style={styles.grid}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <Text key={`${label}${index}`} style={styles.weekday}>{label}</Text>)}
          {padding.map((_, index) => <View key={`blank-${index}`} style={styles.day} />)}
          {days.map(day => {
            const date = new Date(month.getFullYear(), month.getMonth(), day);
            const disabled = date < now;
            return <TouchableOpacity key={day} disabled={disabled} style={styles.day} onPress={() => { onSelect(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })); onClose(); }}>
              <Text style={[styles.dayText, disabled && styles.disabled]}>{day}</Text>
            </TouchableOpacity>;
          })}
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { width: '100%', maxWidth: 380, padding: 22, borderRadius: 18, backgroundColor: '#FFFFFF' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  month: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.285%', paddingVertical: 7, color: '#64748B', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  day: { width: '14.285%', height: 40, alignItems: 'center', justifyContent: 'center' },
  dayText: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  disabled: { color: '#CBD5E1' },
});
