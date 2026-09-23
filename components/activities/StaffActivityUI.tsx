import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityDefinition } from '../../src/models/Activity';
import { CareButton, s } from '../care/CareUI';

export const verificationLabel = (type: ActivityDefinition['verificationType']) => ({ pose: 'Camera movement detection', timer: 'Timer verification', manual: 'Patient confirmation' })[type];
export const targetLabel = (activity: ActivityDefinition) => activity.verificationType === 'pose' ? `${activity.targetRepetitions} repetitions` : activity.verificationType === 'timer' ? `${activity.targetDurationSeconds} seconds` : 'Manual confirmation';
export const dateLabel = (date?: Date | null) => date ? date.toLocaleString() : 'Not recorded';
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unable to save. Please try again.';

export function ActivityPreview({ activity }: { activity: ActivityDefinition }) {
  return <View style={{ gap: 10 }}>
    <Text style={s.heading}>{activity.name}</Text>
    <Text style={s.text}>{activity.description}</Text>
    <Text style={s.muted}>Verification: {verificationLabel(activity.verificationType)}</Text>
    <Text style={s.muted}>Target: {targetLabel(activity)}</Text>
    {activity.instructions.map((instruction, index) => <Text key={index} style={s.text}>{index + 1}. {instruction}</Text>)}
    {!!activity.safetyNotice && <Text style={s.notice}>{activity.safetyNotice}</Text>}
  </View>;
}

export function ActivityDialog({ title, children, onClose, busy = false }: { title: string; children: React.ReactNode; onClose(): void; busy?: boolean }) {
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
        <View accessibilityViewIsModal style={[s.card, { maxWidth: 700, width: '100%', maxHeight: '100%', alignSelf: 'center' }]}>
          <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.heading}>{title}</Text><CareButton label="Close" secondary disabled={busy} onPress={onClose} /></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingBottom: 12 }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
