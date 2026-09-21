import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  PATIENT_DOCUMENT_CATEGORIES,
  PatientDocument,
  PatientDocumentCategory,
  UploadFile,
} from '../../src/models/patientDocument';
import { subscribePatientDocuments, uploadPatientDocument } from '../../src/services/patientDocumentService';
import { Colors } from '../../src/theme/colors';
import { CareButton, CareCard, CareField, s } from './CareUI';

export function DocumentsPanel({ patientId, patientName, staff = false }: { patientId: string; patientName: string; staff?: boolean }) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [uploadVisible, setUploadVisible] = useState(false);

  useEffect(() => {
    setLoading(true); setError(''); setDocuments([]);
    return subscribePatientDocuments(patientId, items => {
      setDocuments(items); setLoading(false);
    }, () => {
      setError('Unable to load documents. Check your connection and clinic access.');
      setLoading(false);
    });
  }, [patientId, retry]);

  const openDocument = async (item: PatientDocument) => {
    try {
      if (!item.fileUrl) throw new Error('This file link is unavailable.');
      await Linking.openURL(item.fileUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open this document.');
    }
  };

  return <>
    <CareCard title={staff ? 'Patient documents' : 'My Documents'} subtitle={staff ? 'Submitted supporting files' : 'Medical and supporting files sent to your clinic'}>
      {!staff && <CareButton label="Upload Document" onPress={() => { setNotice(''); setError(''); setUploadVisible(true); }} />}
      {loading && <ActivityIndicator color={Colors.primary} />}
      {!!error && <><Text accessibilityRole="alert" style={s.error}>{error}</Text><CareButton label="Retry" secondary onPress={() => setRetry(value => value + 1)} /></>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
      {!loading && !error && !documents.length && <View style={styles.emptyState}>
        <View style={styles.emptyIcon}><Ionicons name="documents-outline" size={34} color={Colors.primary} /></View>
        <Text style={styles.emptyTitle}>No Documents Yet</Text>
        <Text style={styles.emptyText}>Upload medical or supporting documents here for clinic review.</Text>
        {!staff && <CareButton label="Upload Document" onPress={() => setUploadVisible(true)} />}
      </View>}
      {documents.map(item => <DocumentCard key={item.id} item={item} staff={staff} onOpen={() => void openDocument(item)} onReplacement={() => setUploadVisible(true)} />)}
      {staff && <Text style={s.muted}>Approve or reject submissions from the Document Review section.</Text>}
    </CareCard>
    {!staff && <UploadDocumentModal
      visible={uploadVisible}
      patientName={patientName}
      onClose={() => setUploadVisible(false)}
      onUploaded={() => { setUploadVisible(false); setNotice('Document submitted and pending staff review.'); }}
    />}
  </>;
}

function DocumentCard({ item, staff, onOpen, onReplacement }: { item: PatientDocument; staff: boolean; onOpen: () => void; onReplacement: () => void }) {
  const status = statusPresentation(item.status);
  return <View style={styles.documentCard}>
    <View style={styles.documentHeader}>
      <View style={styles.fileIcon}><Ionicons name={item.fileType.startsWith('image/') ? 'image-outline' : 'document-text-outline'} size={23} color={Colors.primary} /></View>
      <View style={styles.documentHeading}>
        <Text style={styles.documentTitle}>{item.title}</Text>
        <Text style={s.muted}>{item.category} · {formatDate(item.submittedAt)}</Text>
      </View>
    </View>
    {!!item.description && <Text style={s.text}>{item.description}</Text>}
    <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
      <Ionicons name={status.icon} size={15} color={status.color} />
      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
    </View>
    {item.status === 'rejected' && <View style={styles.rejectionBox}>
      <Text style={styles.rejectionLabel}>Reason from staff</Text>
      <Text style={styles.rejectionText}>{item.rejectionReason || 'No reason was provided. Please contact the clinic.'}</Text>
    </View>}
    <View style={s.row}>
      <CareButton label="View Document" secondary onPress={onOpen} />
      {!staff && item.status === 'rejected' && <CareButton label="Upload New Document" onPress={onReplacement} />}
    </View>
  </View>;
}

function UploadDocumentModal({ visible, patientName, onClose, onUploaded }: { visible: boolean; patientName: string; onClose: () => void; onUploaded: () => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PatientDocumentCategory>('Medical Certificate');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<UploadFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const lock = useRef(false);

  const reset = () => { setTitle(''); setCategory('Medical Certificate'); setDescription(''); setFile(null); setProgress(0); setError(''); };
  const close = () => { if (!busy) { reset(); onClose(); } };

  const chooseFile = async () => {
    if (busy) return;
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const selected = result.assets[0];
      const extension = selected.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(extension || '')) throw new Error('Choose a PDF, JPG, JPEG or PNG file.');
      if (selected.size !== undefined && selected.size > 10 * 1024 * 1024) throw new Error('Choose a file smaller than 10 MB.');
      setFile(selected);
      if (!title.trim()) setTitle(selected.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to choose a document.');
    }
  };

  const submit = async () => {
    if (lock.current) return;
    if (!title.trim()) { setError('Enter a document title.'); return; }
    if (!category) { setError('Choose a document category.'); return; }
    if (!file) { setError('Choose a document to upload.'); return; }
    lock.current = true; setBusy(true); setProgress(0); setError('');
    try {
      await uploadPatientDocument(patientName, { title, category, description }, file, setProgress);
      reset(); onUploaded();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The document could not be submitted. Please try again.');
    } finally {
      lock.current = false; setBusy(false);
    }
  };

  return <Modal visible={visible} animationType="slide" onRequestClose={close}>
    <KeyboardAvoidingView style={styles.modalPage} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.modalHeader}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={close} hitSlop={12}><Ionicons name="close" size={24} color={Colors.textPrimary} /></Pressable>
        <Text style={styles.modalTitle}>Upload Document</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Document Type</Text>
          <View style={styles.pickerWrap}><Picker enabled={!busy} selectedValue={category} onValueChange={value => setCategory(value)}>
            {PATIENT_DOCUMENT_CATEGORIES.map(item => <Picker.Item key={item} label={item} value={item} />)}
          </Picker></View>
        </View>
        <CareField label="Document Title" value={title} onChange={setTitle} placeholder="Example: Anatomy ultrasound" maxLength={160} />
        <CareField label="Description (Optional)" value={description} onChange={setDescription} placeholder="Add information that will help clinic staff review this file" maxLength={1000} multiline />
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Document</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void chooseFile()} style={styles.filePicker}>
            <Ionicons name="attach-outline" size={26} color={Colors.primary} />
            <View style={{ flex: 1 }}><Text style={styles.filePickerTitle}>{file ? 'Change Document' : 'Choose Document'}</Text><Text style={s.muted}>PDF, JPG, JPEG or PNG · Up to 10 MB</Text></View>
          </Pressable>
          {file && <View style={styles.selectedFile}>
            <Ionicons name="document-attach-outline" size={20} color={Colors.primary} />
            <Text style={styles.selectedFileName} numberOfLines={2}>{file.name}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Remove selected document" disabled={busy} onPress={() => setFile(null)} hitSlop={10}><Ionicons name="close-circle" size={22} color={Colors.textMuted} /></Pressable>
          </View>}
        </View>
        {busy && <View style={styles.uploading}><ActivityIndicator color={Colors.primary} /><Text style={s.text}>Uploading document… {progress}%</Text></View>}
        <CareButton label={busy ? 'Uploading…' : 'Submit Document'} disabled={busy || !file || !title.trim()} onPress={() => void submit()} />
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}

function formatDate(value: PatientDocument['submittedAt']) {
  return value?.toDate().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) || 'Submitting…';
}

function statusPresentation(status: PatientDocument['status']) {
  if (status === 'approved') return { label: 'Approved', color: Colors.success, background: Colors.successPale, icon: 'checkmark-circle' as const };
  if (status === 'rejected') return { label: 'Rejected', color: Colors.danger, background: Colors.dangerPale, icon: 'close-circle' as const };
  return { label: 'Pending Review', color: Colors.warningDark, background: Colors.warningSoft, icon: 'time' as const };
}

const styles = StyleSheet.create({
  emptyState: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: Colors.primaryPale, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '800' },
  emptyText: { color: Colors.textMuted, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginBottom: 4 },
  documentCard: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16, gap: 12 },
  documentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  documentHeading: { flex: 1 },
  fileIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: Colors.primaryPale, alignItems: 'center', justifyContent: 'center' },
  documentTitle: { color: Colors.textPrimary, fontSize: 15, lineHeight: 21, fontWeight: '800' },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12, fontWeight: '800' },
  rejectionBox: { backgroundColor: Colors.dangerPale, borderRadius: 12, padding: 13, gap: 4 },
  rejectionLabel: { color: Colors.danger, fontSize: 12, fontWeight: '800' },
  rejectionText: { color: Colors.dangerDark, fontSize: 13, lineHeight: 19 },
  modalPage: { flex: 1, backgroundColor: Colors.pageBackground },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, paddingTop: Platform.OS === 'android' ? 22 : 18, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '800' },
  modalContent: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 20, paddingBottom: 50, gap: 18 },
  pickerWrap: { borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface, borderRadius: 12, overflow: 'hidden' },
  filePicker: { minHeight: 82, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary, backgroundColor: Colors.primaryPale, borderRadius: 15, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 },
  filePickerTitle: { color: Colors.primaryDark, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  selectedFile: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12 },
  selectedFileName: { flex: 1, color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  uploading: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.primaryPale, padding: 13, borderRadius: 12 },
});
