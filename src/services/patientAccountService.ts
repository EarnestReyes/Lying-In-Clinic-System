import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, validatePassword } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { auth } from '../config/firebase';

async function reauthenticate(password: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Please sign in again.');
  if (!password) throw new Error('Enter your current password.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  return user;
}
export async function changePassword(current: string, next: string, confirmation: string) {
  if (next !== confirmation) throw new Error('New passwords do not match.');
  if (next === current) throw new Error('Choose a different new password.');
  const policy = await validatePassword(auth, next);
  if (!policy.isValid) throw new Error('Password does not meet the clinic password policy. Use at least 6 characters and include upper/lowercase letters, a number and a symbol if required.');
  const user = await reauthenticate(current);
  await updatePassword(user, next);
}
export async function deletePatientAccount(password: string, confirmation: string) {
  if (confirmation !== 'DELETE') throw new Error('Type DELETE to confirm.');
  const user = await reauthenticate(password);
  await user.getIdToken(true);
  await httpsCallable(getFunctions(auth.app), 'deletePatientAccount')({ confirmation });
  await auth.signOut();
}
/** Only discard app caches; never remove Firebase Auth persistence or clinical records. */
export async function clearPatientCache() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Please sign in again.');
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(`patient-cache:${uid}:`));
  if (keys.length) await AsyncStorage.multiRemove(keys);
  if (Platform.OS !== 'web') {
    for (const name of ['DocumentPicker', 'ImagePicker']) {
      const directory = new Directory(Paths.cache, name);
      if (directory.exists) directory.delete();
    }
  }
}
