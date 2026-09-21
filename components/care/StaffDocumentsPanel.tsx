import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PatientDocument, PatientDocumentStatus } from '../../src/models/patientDocument';
import {
  approvePatientDocument,
  rejectPatientDocument,
  subscribeAllPatientDocuments,
} from '../../src/services/patientDocumentService';
import { Colors } from '../../src/theme/colors';
import { CareButton, CareCard, CareField, s } from './CareUI';

const filters: { label: string; value: PatientDocumentStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export function StaffDocumentsPanel() {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [filter, setFilter] = useState<PatientDocumentStatus>('pending');
  const [selected, setSelected] = useState<PatientDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setLoading(true); setError('');
    return subscribeAllPatientDocuments(items => {
      setDocuments(items); setLoading(false);
    }, () => {
      setError('Unable to load patient documents. Check your connection and deployed Firestore rules.');
      setLoading(false);
    });
  }, [retry]);

  const filtered = documents.filter(item => item.status === filter);
  return <>
    <View style={styles.filterRow}>
      {filters.map(item => {
        const count = documents.filter(document => document.status === item.value).length;
        return <Pressable key={item.value} accessibilityRole="button" onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}>
          <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label} ({count})</Text>
        </Pressable>;
      })}
    </View>
    {!!error && <><Text accessibilityRole="alert" style={s.error}>{error}</Text><CareButton label="Retry" onPress={() => setRetry(value => value + 1)} /></>}
    {loading && <ActivityIndicator color={Colors.primary} />}
    {!loading && !error && !filtered.length && <CareCard title={`No ${filter} documents`} subtitle="Patient submissions will appear here automatically." />}
    {filtered.map(item => <CareCard key={`${item.patientId}-${item.id}`} title={item.title} subtitle={`${item.category} · ${formatDate(item)}`}>
      <Text style={s.text}>Patient: {item.patientName}</Text>
      <StatusBadge status={item.status} />
      <CareButton label="Review Document" onPress={() => setSelected(item)} />
    </CareCard>)}
    {selected && <ReviewDocumentModal item={selected} onClose={() => setSelected(null)} />}
  </>;
}

function ReviewDocumentModal({ item, onClose }: { item: PatientDocument; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const image = item.fileType.startsWith('image/') || /\.(jpe?g|png)$/i.test(item.fileName);

  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); onClose(); }
    catch (reasonValue) { setError(reasonValue instanceof Error ? reasonValue.message : 'The review could not be saved.'); }
    finally { lock.current = false; setBusy(false); }
  };

  const approve = () => Alert.alert('Approve document?', 'The patient will see this submission as approved.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Approve', onPress: () => void run(() => approvePatientDocument(item)) },
  ]);

  const reject = () => {
    if (!reason.trim()) { setError('Enter a rejection reason for the patient.'); return; }
    Alert.alert('Reject document?', 'The patient will see the reason and can submit a new document.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject Document', style: 'destructive', onPress: () => void run(() => rejectPatientDocument(item, reason)) },
    ]);
  };

  return <Modal visible animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={styles.modalPage} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.modalHeader}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onClose}><Ionicons name="close" size={24} color={Colors.textPrimary} /></Pressable>
        <Text style={styles.modalTitle}>Review Document</Text><View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <CareCard title={item.title} subtitle={item.category}>
          <Detail label="Patient" value={item.patientName} />
          <Detail label="Submitted" value={formatDate(item)} />
          <Detail label="File" value={item.fileName} />
          <Detail label="Description" value={item.description || 'No description provided.'} />
          <StatusBadge status={item.status} />
          {item.status === 'rejected' && <Detail label="Rejection reason" value={item.rejectionReason || 'Not recorded'} />}
          {item.reviewerName && <Detail label="Reviewed by" value={item.reviewerName} />}
        </CareCard>
        {image && item.fileUrl ? <Image source={{ uri: item.fileUrl }} resizeMode="contain" style={styles.preview} accessibilityLabel={`Preview of ${item.title}`} /> : <CareCard title="Document preview" subtitle="PDF documents open in the device browser or configured viewer." />}
        <CareButton label="View Document" secondary disabled={busy || !item.fileUrl} onPress={() => void Linking.openURL(item.fileUrl).catch(() => setError('Unable to open this document.'))} />
        {item.status === 'pending' && <CareCard title="Review decision">
          {rejecting ? <>
            <CareField label="Rejection reason" value={reason} onChange={setReason} multiline placeholder="Tell the patient why this document cannot be accepted" maxLength={1000} />
            <View style={s.row}><CareButton label="Cancel" secondary disabled={busy} onPress={() => { setRejecting(false); setReason(''); setError(''); }} /><CareButton label={busy ? 'Saving…' : 'Reject Document'} danger disabled={busy || !reason.trim()} onPress={reject} /></View>
          </> : <View style={s.row}><CareButton label="Reject" danger disabled={busy} onPress={() => setRejecting(true)} /><CareButton label="Approve" disabled={busy} onPress={approve} /></View>}
        </CareCard>}
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function StatusBadge({ status }: { status: PatientDocumentStatus }) {
  const data = status === 'approved'
    ? { label: 'Approved', color: Colors.success, background: Colors.successPale, icon: 'checkmark-circle' as const }
    : status === 'rejected'
      ? { label: 'Rejected', color: Colors.danger, background: Colors.dangerPale, icon: 'close-circle' as const }
      : { label: 'Pending Review', color: Colors.warningDark, background: Colors.warningSoft, icon: 'time' as const };
  return <View style={[styles.status, { backgroundColor: data.background }]}><Ionicons name={data.icon} size={15} color={data.color} /><Text style={[styles.statusText, { color: data.color }]}>{data.label}</Text></View>;
}

function formatDate(item: PatientDocument) {
  return item.submittedAt?.toDate().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) || 'Submitting…';
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 42, paddingHorizontal: 15, borderRadius: 21, justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: Colors.surface },
  status: { alignSelf: 'flex-start', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12, fontWeight: '800' },
  modalPage: { flex: 1, backgroundColor: Colors.pageBackground },
  modalHeader: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '800' },
  modalContent: { width: '100%', maxWidth: 780, alignSelf: 'center', padding: 20, paddingBottom: 60, gap: 16 },
  detail: { gap: 3 },
  detailLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { color: Colors.textPrimary, fontSize: 14, lineHeight: 20 },
  preview: { width: '100%', height: 380, borderRadius: 16, backgroundColor: Colors.surfaceMuted },
});
