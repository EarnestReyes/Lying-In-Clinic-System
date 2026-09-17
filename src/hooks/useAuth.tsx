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
  getDoc,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";

import { UserRole } from "../models/User";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userRole: UserRole | null;
  userName: string | null;
  loading: boolean;
}

const AuthContext =
  createContext<AuthContextType>({
    firebaseUser: null,
    userRole: null,
    userName: null,
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

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          try {
            setFirebaseUser(user);

            // No logged-in user
            if (!user) {
              setUserRole(null);
              setUserName(null);
              setLoading(false);
              return;
            }

            // Get user profile from Firestore
            const userRef = doc(
              db,
              "users",
              user.uid
            );

            const snapshot =
              await getDoc(userRef);

            if (snapshot.exists()) {
              const data =
                snapshot.data();

              setUserRole(
                data.role ?? "patient"
              );

              setUserName(
                data.fullName ??
                  user.displayName ??
                  user.email ??
                  "User"
              );
            } else {
              // If Firestore profile doesn't exist yet
              setUserRole("patient");

              setUserName(
                user.displayName ??
                  user.email ??
                  "User"
              );
            }
          } catch (error) {
            console.error(
              "Auth state error:",
              error
            );

            setUserRole(null);
            setUserName(null);
          } finally {
            setLoading(false);
          }
        }
      );

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userRole,
        userName,
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