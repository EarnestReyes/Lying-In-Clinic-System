import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { fetchPatientProfile, updatePatientProfile, PatientProfile } from '../../src/(patient)/profileService';
import { useAuth } from '../../src/hooks/useAuth';
import { PatientAccountActions } from '../../components/PatientAccountActions';
import { uploadPatientFile } from '../../src/services/patientDocumentService';
import { CareButton, CareCard, CareField, CareHeader, s } from '../../components/care/CareUI';
import { Colors as C } from '../../src/theme/colors';
import { useRouter } from 'expo-router';

export default function PatientProfileScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [name, setName] = useState(''); 
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(true); 
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0); 
  const [editing, setEditing] = useState(false); 
  const lock = useRef(false);

  useEffect(() => {
    let active = true; 
    setLoading(true); 
    setError('');
    if (!firebaseUser) { setLoading(false); return; }
    fetchPatientProfile(firebaseUser.uid)
      .then(data => { 
        if (active) { 
          setProfile(data); 
          setName(data?.name || ''); 
          setPhone(data?.contactNumber || data?.phone || ''); 
        } 
      })
      .catch(() => { if (active) setError('Unable to load profile. Please retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [firebaseUser?.uid, retry]);

  const pick = async (camera: boolean) => {
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        throw new Error('Camera permission is required. You can choose a photo from your library instead.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) setPhoto(result.assets[0]);
    } catch (e) { 
      setError(e instanceof Error ? e.message : 'Unable to open photo picker.'); 
    }
  };

  const save = async () => {
    if (!firebaseUser || lock.current) return;
    if (!name.trim()) { setError('Enter your name.'); return; }
    lock.current = true; setBusy(true); setError(''); setProgress(0);
    try {
      let profileImage = profile?.profileImage;
      if (photo) {
        const mimeType = photo.mimeType || 'image/jpeg';
        if (!['image/jpeg', 'image/png'].includes(mimeType)) throw new Error('Choose a JPG or PNG profile picture.');
        const extension = mimeType === 'image/png' ? 'png' : 'jpg';
        profileImage = await uploadPatientFile(firebaseUser.uid, { uri: photo.uri, name: `avatar.${extension}`, mimeType, size: photo.fileSize }, `patients/${firebaseUser.uid}/profile/avatar.${extension}`, setProgress);
      }
      const changes = { name: name.trim(), contactNumber: phone.trim(), phone: phone.trim(), ...(profileImage ? { profileImage } : {}) };
      await updatePatientProfile(firebaseUser.uid, changes);
      setProfile(previous => ({ ...previous, ...changes })); 
      setPhoto(null); 
      setEditing(false); 
      Alert.alert('Profile saved', 'Your changes are saved to your account.');
    } catch (e) { 
      setError(e instanceof Error ? e.message : 'Unable to save profile.'); 
    } finally { 
      lock.current = false; 
      setBusy(false); 
    }
  };

  const avatar = photo?.uri || profile?.profileImage || undefined;
  
  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'left', 'right']}>
      <CareHeader 
        title="Profile" 
        rightActionLabel={!editing ? "Settings" : undefined}
        onRightAction={!editing ? () => router.push('/(patient)/settings' as any) : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {!!error && (
            <>
              <Text style={s.error}>{error}</Text>
              <CareButton label="Reload profile" disabled={busy} onPress={() => setRetry(value => value + 1)} />
            </>
          )}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={C.primary} size="large" />
          ) : (
            <>
              {/* Profile Header Card */}
              <View style={localStyles.profileTopSection}>
                <View style={localStyles.avatarContainer}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={localStyles.avatarImage} />
                  ) : (
                    <View style={localStyles.avatarPlaceholder}>
                      <Ionicons name="person-outline" size={44} color={C.primary} />
                    </View>
                  )}
                  <TouchableOpacity 
                    style={localStyles.cameraBadgeButton} 
                    activeOpacity={0.8}
                    onPress={() => { setEditing(true); pick(false); }}
                  >
                    <Ionicons name="camera-outline" size={14} color={C.surface} />
                  </TouchableOpacity>
                </View>

                <Text style={localStyles.profileNameText}>{profile?.name || 'Patient'}</Text>
                <Text style={localStyles.profileEmailText}>{profile?.email || firebaseUser?.email}</Text>
              </View>

              {/* Action Banner Shortcut Card */}
              <TouchableOpacity style={localStyles.bannerShortcutCard} activeOpacity={0.85}>
                <View style={localStyles.bannerShortcutIconBox}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={localStyles.bannerShortcutTitle}>Connect health records with us!</Text>
                  <Text style={localStyles.bannerShortcutSub}>Sync up seamlessly</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
              </TouchableOpacity>

              {/* Quick Grid Cards Section */}
              <View style={localStyles.gridRowContainer}>
                <TouchableOpacity style={localStyles.gridHalfCard} activeOpacity={0.85} onPress={() => setEditing(true)}>
                  <View style={localStyles.gridIconHeader}>
                    <View style={[localStyles.miniIconBox, { backgroundColor: C.primaryPale }]}>
                      <Ionicons name="sparkles-outline" size={16} color={C.primary} />
                    </View>
                    <View style={localStyles.tagPill}>
                      <Text style={localStyles.tagPillText}>Edit</Text>
                    </View>
                  </View>
                  <Text style={localStyles.gridCardTitle}>Update Profile</Text>
                  <Text style={localStyles.gridCardSub}>Modify your details</Text>
                </TouchableOpacity>

                <TouchableOpacity style={localStyles.gridHalfCard} activeOpacity={0.85} onPress={() => router.push('/(patient)/reminders' as any)}>
                  <View style={localStyles.gridIconHeader}>
                    <View style={[localStyles.miniIconBox, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name="calendar-outline" size={16} color="#0284C7" />
                    </View>
                  </View>
                  <Text style={localStyles.gridCardTitle}>My Schedule</Text>
                  <Text style={localStyles.gridCardSub}>Stay updated on visits</Text>
                </TouchableOpacity>
              </View>

              {/* Edit Mode Inline Controls */}
              {editing && (
                <CareCard title="Edit Personal Details">
                  <View style={s.row}>
                    <CareButton label="Choose photo" disabled={busy} secondary onPress={() => pick(false)} />
                    <CareButton label="Take photo" disabled={busy} secondary onPress={() => pick(true)} />
                  </View>
                  {!!photo && <Text style={s.notice}>Photo preview selected — Save profile to upload.</Text>}
                  <CareField label="Full name" value={name} onChange={setName} maxLength={150} />
                  <CareField label="Contact number" value={phone} onChange={setPhone} maxLength={30} />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <CareButton label={busy ? `Saving ${progress}%` : 'Save profile'} disabled={busy} onPress={save} />
                    <CareButton label="Cancel" secondary disabled={busy} onPress={() => { setName(profile?.name || ''); setPhone(profile?.contactNumber || profile?.phone || ''); setPhoto(null); setEditing(false); }} />
                  </View>
                </CareCard>
              )}

              {/* Personal & Pregnancy Information Grouped Section List */}
              <View style={localStyles.sectionGroupCard}>
                <Text style={localStyles.groupHeaderTitle}>Personal Information</Text>

                <View style={localStyles.listRowItem}>
                  <View style={localStyles.rowItemIconBox}>
                    <Ionicons name="call-outline" size={18} color={C.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={localStyles.rowItemTitle}>Contact Number</Text>
                    <Text style={localStyles.rowItemValue}>{profile?.contactNumber || profile?.phone || 'Not recorded'}</Text>
                  </View>
                </View>

                <View style={localStyles.listRowItem}>
                  <View style={localStyles.rowItemIconBox}>
                    <Ionicons name="medical-outline" size={18} color={C.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={localStyles.rowItemTitle}>Gestational Age</Text>
                    <Text style={localStyles.rowItemValue}>{profile?.pregnancyWeek != null ? `${profile.pregnancyWeek} weeks` : 'Not recorded'}</Text>
                  </View>
                </View>

                <View style={localStyles.listRowItem}>
                  <View style={localStyles.rowItemIconBox}>
                    <Ionicons name="calendar-number-outline" size={18} color={C.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={localStyles.rowItemTitle}>Expected Delivery (EDD)</Text>
                    <Text style={localStyles.rowItemValue}>{profile?.edd || 'Not recorded'}</Text>
                  </View>
                </View>

                <View style={localStyles.listRowItem}>
                  <View style={localStyles.rowItemIconBox}>
                    <Ionicons name="pulse-outline" size={18} color={C.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={localStyles.rowItemTitle}>Gravida / Para</Text>
                    <Text style={localStyles.rowItemValue}>{profile?.gravidaPara || 'Not recorded'}</Text>
                  </View>
                </View>

                <View style={[localStyles.listRowItem, { borderBottomWidth: 0 }]}>
                  <View style={localStyles.rowItemIconBox}>
                    <Ionicons name="water-outline" size={18} color={C.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={localStyles.rowItemTitle}>Blood Type & Emergency</Text>
                    <Text style={localStyles.rowItemValue}>{profile?.bloodType || 'N/A'} • {profile?.emergencyContact || 'No emergency contact'}</Text>
                  </View>
                </View>
              </View>

              <PatientAccountActions disabled={busy || editing} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  profileTopSection: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 6,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: C.border,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadgeButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: C.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.surface,
  },
  profileNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 2,
  },
  profileEmailText: {
    fontSize: 13,
    color: C.textMuted,
  },
  bannerShortcutCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  bannerShortcutIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerShortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textPrimary,
  },
  bannerShortcutSub: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
  },
  gridRowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  gridHalfCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  gridIconHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagPill: {
    backgroundColor: C.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.primaryDark,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.textPrimary,
    marginTop: 10,
  },
  gridCardSub: {
    fontSize: 11,
    color: C.textMuted,
  },
  sectionGroupCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  groupHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 12,
  },
  listRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  rowItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.pageBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowItemTitle: {
    fontSize: 12,
    color: C.textMuted,
  },
  rowItemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 1,
  },
});