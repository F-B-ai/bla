import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, where, Timestamp, updateDoc, arrayUnion, deleteDoc, arrayRemove, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, UserRole, Collaborator, Student, Manager } from '../types';

/**
 * Crea un utente su Firebase Auth usando la REST API di Firebase
 * per evitare il logout dell'utente corrente (owner/manager/coach).
 */
const createUserWithRestApi = async (email: string, password: string): Promise<string> => {
  const apiKey = auth.app.options.apiKey;
  if (!apiKey) throw new Error('Firebase API key non trovata');

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: false,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    // Traduci errori Firebase REST API
    const errorCode = data?.error?.message || '';
    if (errorCode === 'EMAIL_EXISTS') {
      throw { code: 'auth/email-already-in-use' };
    } else if (errorCode === 'WEAK_PASSWORD') {
      throw { code: 'auth/weak-password' };
    } else if (errorCode === 'INVALID_EMAIL') {
      throw { code: 'auth/invalid-email' };
    }
    throw new Error(data?.error?.message || 'Errore durante la creazione dell\'utente');
  }

  return data.localId; // UID dell'utente creato
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
  if (!userDoc.exists()) {
    throw new Error('Utente non trovato nel database');
  }
  return { ...userDoc.data(), id: userDoc.id } as User;
};

export const registerOwner = async (
  email: string,
  password: string,
  name: string,
  surname: string,
  phone: string
): Promise<User> => {
  // Controlla se esiste gia' un owner
  const q = query(collection(db, 'users'), where('role', '==', 'owner'));
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error('Esiste già un amministratore registrato');
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const userData: Omit<User, 'id'> = {
    email,
    name,
    surname,
    phone,
    role: 'owner',
    createdAt: new Date(),
    isActive: true,
  };

  await setDoc(doc(db, 'users', credential.user.uid), {
    ...userData,
    createdAt: Timestamp.now(),
  });

  return { id: credential.user.uid, ...userData };
};

export const registerManager = async (
  email: string,
  password: string,
  name: string,
  surname: string,
  phone: string,
  commissionPercentage: number = 10,
  specializations: string[] = []
): Promise<Manager> => {
  const uid = await createUserWithRestApi(email, password);

  const managerData: Omit<Manager, 'id'> = {
    email,
    name,
    surname,
    phone,
    role: 'manager',
    assignedCollaborators: [],
    assignedStudents: [],
    commissionPercentage,
    specializations,
    createdAt: new Date(),
    isActive: true,
  };

  await setDoc(doc(db, 'users', uid), {
    ...managerData,
    createdAt: Timestamp.now(),
  });

  return { id: uid, ...managerData };
};

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

export const getCurrentUser = (): Promise<FirebaseUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  return { ...userDoc.data(), id: userDoc.id } as User;
};

export const getUserRole = async (uid: string): Promise<UserRole | null> => {
  const user = await getUserProfile(uid);
  return user?.role ?? null;
};

export const registerCollaborator = async (
  email: string,
  password: string,
  name: string,
  surname: string,
  phone: string,
  commissionPercentage: number,
  specializations: string[]
): Promise<Collaborator> => {
  const uid = await createUserWithRestApi(email, password);

  const collaboratorData: Omit<Collaborator, 'id'> = {
    email,
    name,
    surname,
    phone,
    role: 'collaborator',
    commissionPercentage,
    specializations,
    assignedStudents: [],
    createdAt: new Date(),
    isActive: true,
  };

  await setDoc(doc(db, 'users', uid), {
    ...collaboratorData,
    createdAt: Timestamp.now(),
  });

  return { id: uid, ...collaboratorData };
};

export const registerStudent = async (
  email: string,
  password: string,
  name: string,
  surname: string,
  phone: string,
  assignedCollaboratorId: string,
  goals: string,
  medicalNotes?: string,
  assignedManagerId?: string,
  managerCommissionPercentage?: number,
  coachCommissionPercentage?: number
): Promise<Student> => {
  const uid = await createUserWithRestApi(email, password);

  const studentData: Omit<Student, 'id'> = {
    email,
    name,
    surname,
    phone,
    role: 'student',
    assignedCollaboratorId,
    assignedManagerId: assignedManagerId || '',
    managerCommissionPercentage: managerCommissionPercentage ?? 0,
    coachCommissionPercentage: coachCommissionPercentage ?? 0,
    startDate: new Date(),
    goals,
    medicalNotes: medicalNotes || '',
    nutritionalConsultations: 0,
    createdAt: new Date(),
    isActive: true,
  };

  await setDoc(doc(db, 'users', uid), {
    ...studentData,
    createdAt: Timestamp.now(),
    startDate: Timestamp.now(),
  });

  // Aggiorna la lista allievi del collaboratore/manager
  if (assignedCollaboratorId) {
    await updateDoc(doc(db, 'users', assignedCollaboratorId), {
      assignedStudents: arrayUnion(uid),
    });
  }

  return { id: uid, ...studentData };
};

// --- Sistema inviti allievi ---

export interface StudentInvite {
  id: string;
  inviteCode: string;
  email: string;
  name: string;
  surname: string;
  assignedCollaboratorId: string;
  assignedCollaboratorName: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  usedAt?: Date;
  isUsed: boolean;
}

const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createStudentInvite = async (
  email: string,
  name: string,
  surname: string,
  assignedCollaboratorId: string,
  assignedCollaboratorName: string,
  createdBy: string,
  createdByName: string
): Promise<StudentInvite> => {
  const inviteCode = generateInviteCode();

  const inviteData = {
    inviteCode,
    email,
    name,
    surname,
    assignedCollaboratorId,
    assignedCollaboratorName,
    createdBy,
    createdByName,
    createdAt: Timestamp.now(),
    isUsed: false,
  };

  const docRef = await addDoc(collection(db, 'studentInvites'), inviteData);
  return { id: docRef.id, ...inviteData, createdAt: new Date() } as StudentInvite;
};

export const validateInviteCode = async (inviteCode: string): Promise<StudentInvite | null> => {
  const q = query(
    collection(db, 'studentInvites'),
    where('inviteCode', '==', inviteCode.toUpperCase()),
    where('isUsed', '==', false)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { ...d.data(), id: d.id } as StudentInvite;
};

export const getStudentInvites = async (): Promise<StudentInvite[]> => {
  const snapshot = await getDocs(collection(db, 'studentInvites'));
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as StudentInvite));
};

export const registerStudentWithInvite = async (
  inviteCode: string,
  email: string,
  password: string,
  phone: string,
  goals: string
): Promise<Student> => {
  // Valida il codice invito
  const invite = await validateInviteCode(inviteCode);
  if (!invite) {
    throw new Error('Codice invito non valido o già utilizzato');
  }

  // L'allievo si registra - usa createUserWithEmailAndPassword direttamente
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  const studentData: Omit<Student, 'id'> = {
    email,
    name: invite.name,
    surname: invite.surname,
    phone,
    role: 'student',
    assignedCollaboratorId: invite.assignedCollaboratorId,
    startDate: new Date(),
    goals,
    medicalNotes: '',
    nutritionalConsultations: 0,
    createdAt: new Date(),
    isActive: true,
  };

  await setDoc(doc(db, 'users', uid), {
    ...studentData,
    createdAt: Timestamp.now(),
    startDate: Timestamp.now(),
  });

  // Aggiorna la lista allievi del collaboratore
  if (invite.assignedCollaboratorId) {
    await updateDoc(doc(db, 'users', invite.assignedCollaboratorId), {
      assignedStudents: arrayUnion(uid),
    });
  }

  // Segna l'invito come usato
  await updateDoc(doc(db, 'studentInvites', invite.id), {
    isUsed: true,
    usedAt: Timestamp.now(),
  });

  return { id: uid, ...studentData };
};

export const getManagers = async (): Promise<Manager[]> => {
  const q = query(collection(db, 'users'), where('role', '==', 'manager'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Manager));
};

export const getCollaborators = async (): Promise<Collaborator[]> => {
  const q = query(collection(db, 'users'), where('role', '==', 'collaborator'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Collaborator));
};

export const getStudents = async (): Promise<Student[]> => {
  const q = query(collection(db, 'users'), where('role', '==', 'student'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Student));
};

// --- Disattiva / Elimina utenti ---

export const toggleUserActive = async (userId: string, isActive: boolean): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    await updateDoc(userRef, { isActive });
  } else {
    await setDoc(userRef, { isActive }, { merge: true });
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  // Rimuove il documento utente da Firestore
  // Nota: non elimina l'account Firebase Auth (richiede admin SDK lato server)
  await deleteDoc(doc(db, 'users', userId));
};

export const removeStudentFromCollaborator = async (
  collaboratorId: string,
  studentId: string
): Promise<void> => {
  const collabRef = doc(db, 'users', collaboratorId);
  const collabSnap = await getDoc(collabRef);
  if (collabSnap.exists()) {
    await updateDoc(collabRef, {
      assignedStudents: arrayRemove(studentId),
    });
  }
};
