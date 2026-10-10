import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { AppUser } from '../types';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const userData: AppUser = {
              uid: fbUser.uid,
              email: fbUser.email || data.email || '',
              displayName: data.displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              role: data.role || 'Operator',
              status: data.status || 'Active',
              ...data,
            };

            if (userData.status === 'Inactive') {
              await signOut(auth);
              setFirebaseUser(null);
              setUser(null);
              setLoading(false);
              return;
            }
            setFirebaseUser(fbUser);
            setUser(userData);
          } else {
            // Document doesn't exist — create default active profile
            const newUser: AppUser = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              role: 'Operator',
              status: 'Active',
            };
            try {
              await setDoc(doc(db, 'users', fbUser.uid), newUser);
            } catch (e) {
              console.warn('Could not save user doc to firestore:', e);
            }
            setFirebaseUser(fbUser);
            setUser(newUser);
          }
        } catch (err) {
          console.error('Error fetching user profile from firestore:', err);
          // Fail-safe fallback so authenticated user is never trapped in login loop
          const fallbackUser: AppUser = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            role: 'Operator',
            status: 'Active',
          };
          setFirebaseUser(fbUser);
          setUser(fallbackUser);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    try {
      const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as AppUser;
        if (userData.status === 'Inactive') {
          await signOut(auth);
          throw new Error('ACCOUNT_DEACTIVATED');
        }
      }
    } catch (err: any) {
      if (err.message === 'ACCOUNT_DEACTIVATED') {
        throw err;
      }
      console.warn('Firestore profile check error on login:', err);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        logout,
        isAdmin: user?.role === 'Admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
