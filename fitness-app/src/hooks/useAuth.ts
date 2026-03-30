import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { User, UserRole } from '../types';
import { getUserProfile, signIn, signOut } from '../services/authService';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  isOwner: boolean;
  isManager: boolean;
  isCollaborator: boolean;
  isStudent: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userProfile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!auth) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await getUserProfile(fbUser.uid);
          setState({
            firebaseUser: fbUser,
            userProfile: profile,
            loading: false,
            error: null,
          });
        } catch (err) {
          console.error('AuthProvider: error fetching profile', err);
          setState({
            firebaseUser: fbUser,
            userProfile: null,
            loading: false,
            error: 'Errore nel caricamento del profilo',
          });
        }
      } else {
        setState({
          firebaseUser: null,
          userProfile: null,
          loading: false,
          error: null,
        });
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const profile = await signIn(email, password);
      setState((prev) => ({ ...prev, userProfile: profile, loading: false }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore di login';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setState({
      firebaseUser: null,
      userProfile: null,
      loading: false,
      error: null,
    });
  }, []);

  const value: AuthContextValue = {
    user: state.userProfile,
    firebaseUser: state.firebaseUser,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.firebaseUser,
    role: state.userProfile?.role ?? null,
    isOwner: state.userProfile?.role === 'owner',
    isManager: state.userProfile?.role === 'manager',
    isCollaborator: state.userProfile?.role === 'collaborator',
    isStudent: state.userProfile?.role === 'student',
    login,
    logout,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
