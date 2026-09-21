import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appointment } from '../src/models/Appointment';
import { changePatientAppointment } from '../src/services/appointmentService';
import { canPatientChange } from '../src/utils/patientAppointments';
import { CareButton, CareCard, CareField, s } from './care/CareUI';

export function AppointmentDetails({ item, close }: { item: Appointment; close: () => void }) {
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const lock = useRef(false);
  const change = async (status: 'confirmed' | 'cancelled') => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setError('');
    try { await changePatientAppointment(item.id, status, reason); Alert.alert('Appointment updated', `Your appointment is ${status}.`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update appointment.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Modal animationType="slide" onRequestClose={close}>
    <SafeAreaView style={s.safeArea}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <CareButton label="Close details" secondary onPress={close} disabled={busy} />
        <CareCard title={item.purpose || item.service || 'Appointment'}>
          <Text style={s.badge}>{item.status}</Text>
          <Text style={s.text}>{item.appointmentDate || item.date} · {item.appointmentTime || item.time}</Text>
          <Text style={s.text}>Assigned clinician: {item.doctor || item.assignedStaff || item.assignedMidwife || 'Not assigned'}</Text>
          <Text style={s.text}>Notes: {item.notes || 'No notes provided.'}</Text>
          {!!item.cancellationReason && <Text style={s.text}>Cancellation reason: {item.cancellationReason}</Text>}
          {!!error && <Text style={s.error}>{error}</Text>}
          {canPatientChange(item, 'confirmed') && <CareButton label={busy ? 'Saving…' : 'Confirm appointment'} disabled={busy} onPress={() => change('confirmed')} />}
          {canPatientChange(item, 'cancelled') && <>
            <CareField label="Cancellation reason (optional)" value={reason} onChange={setReason} maxLength={500} />
            <CareButton label="Cancel appointment" danger disabled={busy} onPress={() => Alert.alert('Cancel appointment?', 'The clinic will see that you cancelled this appointment.', [{ text: 'Keep appointment', style: 'cancel' }, { text: 'Cancel appointment', style: 'destructive', onPress: () => change('cancelled') }])} />
          </>}
        </CareCard>
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
