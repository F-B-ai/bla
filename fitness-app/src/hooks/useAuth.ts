import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { attendiAlMassimo, SECONDI_PROFILO } from '../domain/avvio';
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
  isNutritionist: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
          // La lettura del profilo NON può restare appesa.
          //
          // 12 ottobre 2026: l'app si fermava su «Caricamento…» senza
          // fine. Firestore tiene una copia locale sul telefono
          // (IndexedDB) e, quando quella si incarta — succede sulle app
          // installate dalla schermata home, e quando la stessa app è
          // aperta in due posti — la lettura non riesce e non
          // fallisce: resta lì. Un `catch` non serve contro una cosa
          // che non finisce mai; serve una sveglia.
          const profile = await attendiAlMassimo(
            getUserProfile(fbUser.uid),
            SECONDI_PROFILO * 1000,
            'La copia locale dei dati non risponde (timeout lettura profilo).'
          );
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
            // Il motivo vero, non una frase generica: è quello che
            // compare in fondo alla schermata di blocco, ed è l'unica
            // cosa che dice se riprovare, riparare o uscire.
            error: (err as { message?: string })?.message
              || 'Errore nel caricamento del profilo',
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

  const refreshProfile = useCallback(async () => {
    if (state.firebaseUser) {
      const profile = await getUserProfile(state.firebaseUser.uid);
      setState((prev) => ({ ...prev, userProfile: profile }));
    }
  }, [state.firebaseUser]);

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
    // Il nutrizionista non è un ruolo a sé: è un collaboratore con il
    // tipo 'nutritionist'. Chiederlo come ruolo non avrebbe mai dato
    // vero, e il permesso sarebbe stato muto invece che negato.
    isNutritionist: state.userProfile?.role === 'collaborator'
      && (state.userProfile as { collaboratorType?: string })?.collaboratorType === 'nutritionist',
    login,
    logout,
    refreshProfile,
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
