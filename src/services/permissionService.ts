import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Linking } from 'react-native';
import { deleteField, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { PermissionResult } from '../models/permission';

const keyFor = (uid: string) => `permissions_onboarding_completed_${uid}`;
const listeners = new Map<string, Set<(completed: boolean) => void>>();
const sessionState = new Map<string, boolean>();

function emit(uid: string, completed: boolean) {
  sessionState.set(uid, completed);
  listeners.get(uid)?.forEach(listener => listener(completed));
}

function normalizePermission(response: Location.LocationPermissionResponse): PermissionResult {
  if (response.status === Location.PermissionStatus.GRANTED) return { state: 'granted', canAskAgain: response.canAskAgain };
  if (response.status === Location.PermissionStatus.UNDETERMINED) return { state: 'undetermined', canAskAgain: response.canAskAgain };
  return { state: response.canAskAgain ? 'denied' : 'blocked', canAskAgain: response.canAskAgain };
}

export function subscribePermissionOnboarding(uid: string, listener: (completed: boolean) => void) {
  const current = listeners.get(uid) ?? new Set();
  current.add(listener);
  listeners.set(uid, current);
  return () => {
    const registered = listeners.get(uid);
    registered?.delete(listener);
    if (!registered?.size) listeners.delete(uid);
  };
}

export async function hasCompletedPermissionOnboarding(uid: string): Promise<boolean> {
  if (!uid) return false;
  const inSession = sessionState.get(uid);
  if (inSession !== undefined) {
    emit(uid, inSession);
    return inSession;
  }

  let localCompleted = false;
  try {
    localCompleted = (await AsyncStorage.getItem(keyFor(uid))) === 'true';
  } catch (error) {
    console.warn('Unable to read local permission onboarding state:', error);
  }

  try {
    const snapshot = await getDoc(doc(db, 'users', uid));
    const remoteValue = snapshot.data()?.permissionsOnboardingCompleted;
    const completed = typeof remoteValue === 'boolean' ? remoteValue : localCompleted;
    emit(uid, completed);
    if (remoteValue === true && !localCompleted) void AsyncStorage.setItem(keyFor(uid), 'true').catch(() => undefined);
    if (remoteValue === false && localCompleted) void AsyncStorage.removeItem(keyFor(uid)).catch(() => undefined);
    if (localCompleted && remoteValue === undefined && snapshot.exists()) {
      void updateDoc(snapshot.ref, {
        permissionsOnboardingCompleted: true,
        permissionsOnboardingCompletedAt: new Date().toISOString(),
      }).catch(() => undefined);
    }
    return completed;
  } catch (error) {
    console.warn('Unable to read Firestore permission onboarding state:', error);
    emit(uid, localCompleted);
    return localCompleted;
  }
}

export async function markPermissionOnboardingCompleted(uid: string): Promise<void> {
  if (!uid) throw new Error('Please sign in again.');
  const completedAt = new Date().toISOString();
  const [remote, local] = await Promise.allSettled([
    updateDoc(doc(db, 'users', uid), {
      permissionsOnboardingCompleted: true,
      permissionsOnboardingCompletedAt: completedAt,
    }),
    AsyncStorage.setItem(keyFor(uid), 'true'),
  ]);
  if (remote.status === 'rejected' && local.status === 'rejected') {
    throw new Error('Your onboarding choice could not be saved. Check your connection and try again.');
  }
  emit(uid, true);
}

export async function resetPermissionOnboarding(uid: string): Promise<void> {
  if (!uid) throw new Error('A user ID is required.');
  const [remote, local] = await Promise.allSettled([
    updateDoc(doc(db, 'users', uid), {
      permissionsOnboardingCompleted: false,
      permissionsOnboardingCompletedAt: deleteField(),
    }),
    AsyncStorage.removeItem(keyFor(uid)),
  ]);
  if (remote.status === 'rejected' && local.status === 'rejected') throw new Error('Unable to reset permission onboarding.');
  emit(uid, false);
}

export async function getLocationPermissionStatus(): Promise<PermissionResult> {
  return normalizePermission(await Location.getForegroundPermissionsAsync());
}

export async function requestForegroundLocationPermission(): Promise<PermissionResult> {
  const current = await getLocationPermissionStatus();
  if (current.state === 'granted' || current.state === 'blocked') return current;
  return normalizePermission(await Location.requestForegroundPermissionsAsync());
}

export async function requestBackgroundLocationPermission(): Promise<PermissionResult> {
  const foreground = await getLocationPermissionStatus();
  if (foreground.state !== 'granted') return foreground;
  const current = normalizePermission(await Location.getBackgroundPermissionsAsync());
  if (current.state === 'granted' || current.state === 'blocked') return current;
  return normalizePermission(await Location.requestBackgroundPermissionsAsync());
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}
