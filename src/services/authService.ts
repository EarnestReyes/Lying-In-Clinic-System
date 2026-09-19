import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { db } from '../config/firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { User as AppUser } from '../models/User';

/**
 * Authentication Service for Lying-In Management System
 */
export const authService = {
  /**
   * Sign in an existing user (Staff or Patient) using email and password.
   */
  login: async (email: string, pass: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in.');
    }
  },

  /**
   * Sign out the currently authenticated user.
   */
  logout: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out.');
    }
  },

  /**
   * Send a password reset email to the specified address.
   */
  resetPassword: async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send password reset email.');
    }
  },

  /**
   * Get the currently active authenticated user synchronously (can be null).
   */
  getCurrentUser: (): User | null => {
    return auth.currentUser;
  },

  /**
   * Listen to real-time authentication state changes.
   */
  onAuthStateChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  getUserProfile: async (uid: string): Promise<AppUser | null> => {
    const snapshot = await getDoc(doc(db, 'users', uid));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as AppUser) : null;
  },

  registerPatientAccount: async (email: string, password: string, fullName: string): Promise<string> => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', credential.user.uid), {
      email,
      fullName,
      role: 'patient',
      createdAt: serverTimestamp(),
    });
    return credential.user.uid;
  },
};
