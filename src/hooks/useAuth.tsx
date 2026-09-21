import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";

import { UserRole } from "../models/User";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userRole: UserRole | null;
  userName: string | null;
  userPhotoUrl: string | null;
  loading: boolean;
}

const AuthContext =
  createContext<AuthContextType>({
    firebaseUser: null,
    userRole: null,
    userName: null,
    userPhotoUrl: null,
    loading: true,
  });

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseUser | null>(null);

  const [userRole, setUserRole] =
    useState<UserRole | null>(null);

  const [userName, setUserName] =
    useState<string | null>(null);

  const [userPhotoUrl, setUserPhotoUrl] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let stopProfile: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, user => {
      stopProfile?.();
      setLoading(true); setFirebaseUser(user); setUserRole(null); setUserName(null); setUserPhotoUrl(null);
      if (!user) { setLoading(false); return; }
      stopProfile = onSnapshot(doc(db, 'users', user.uid), snapshot => {
        const data = snapshot.data();
        setUserRole(data?.role ?? null);
        setUserName(data?.fullName ?? user.displayName ?? user.email ?? 'User');
        setUserPhotoUrl(data?.profileImage ?? data?.photoURL ?? user.photoURL ?? null);
        setLoading(false);
      }, error => {
        console.error('Unable to load account profile:', error);
        setUserRole(null); setUserName(null); setUserPhotoUrl(user.photoURL ?? null); setLoading(false);
      });
    });
    return () => { stopProfile?.(); unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userRole,
        userName,
        userPhotoUrl,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
