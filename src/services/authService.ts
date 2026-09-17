import { 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { auth } from '../config/firebase';

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
};