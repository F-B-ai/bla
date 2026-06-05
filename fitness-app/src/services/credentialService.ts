import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { CredentialChangeRequest, CredentialRequestType } from '../types';

const REQUESTS_COLLECTION = 'credentialRequests';

const getApiKey = (): string => {
  const apiKey = auth.app.options.apiKey;
  if (!apiKey) throw new Error('Firebase API key non trovata');
  return apiKey;
};

const restSignIn = async (
  email: string,
  password: string
): Promise<{ idToken: string; localId: string }> => {
  const apiKey = getApiKey();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Errore di autenticazione');
  return { idToken: data.idToken, localId: data.localId };
};

const restSendVerifyAndChangeEmail = async (
  idToken: string,
  newEmail: string
): Promise<void> => {
  const apiKey = getApiKey();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'VERIFY_AND_CHANGE_EMAIL',
        idToken,
        newEmail,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.error?.message || '';
    if (errMsg === 'EMAIL_EXISTS') throw new Error('Questa email è già in uso');
    if (errMsg === 'INVALID_EMAIL') throw new Error('Email non valida');
    throw new Error(errMsg || 'Errore invio email di verifica');
  }
};

const restUpdateAccount = async (
  idToken: string,
  updates: { email?: string; password?: string }
): Promise<void> => {
  const apiKey = getApiKey();
  const body: Record<string, unknown> = { idToken, returnSecureToken: false };
  if (updates.email) body.email = updates.email;
  if (updates.password) body.password = updates.password;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.error?.message || '';
    if (errMsg === 'EMAIL_EXISTS') throw new Error('Questa email è già in uso');
    if (errMsg === 'WEAK_PASSWORD') throw new Error('Password troppo debole (min 6 caratteri)');
    if (errMsg === 'INVALID_EMAIL') throw new Error('Email non valida');
    throw new Error(errMsg || 'Errore aggiornamento credenziali');
  }
};

// Owner changes another user's email
export const adminChangeUserEmail = async (
  userId: string,
  currentEmail: string,
  currentPassword: string,
  newEmail: string
): Promise<void> => {
  const { idToken } = await restSignIn(currentEmail, currentPassword);
  try {
    await restUpdateAccount(idToken, { email: newEmail });
  } catch (err: any) {
    if (err?.message?.includes('OPERATION_NOT_ALLOWED') || err?.message?.includes('verify')) {
      await restSendVerifyAndChangeEmail(idToken, newEmail);
      await updateDoc(doc(db, 'users', userId), { email: newEmail });
      throw new Error(
        'VERIFY_SENT: Email di verifica inviata a ' + newEmail +
        '. Il cambio sarà effettivo dopo che l\'utente confermerà cliccando il link nell\'email.'
      );
    }
    throw err;
  }
  await updateDoc(doc(db, 'users', userId), { email: newEmail });
};

// Owner changes another user's password
export const adminChangeUserPassword = async (
  userId: string,
  currentEmail: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const { idToken } = await restSignIn(currentEmail, currentPassword);
  await restUpdateAccount(idToken, { password: newPassword });
  await updateDoc(doc(db, 'users', userId), { managedPassword: newPassword });
};

// Owner changes own email
export const changeOwnEmail = async (
  currentPassword: string,
  newEmail: string
): Promise<void> => {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.email) throw new Error('Utente non autenticato');
  const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
  await reauthenticateWithCredential(fbUser, credential);
  await verifyBeforeUpdateEmail(fbUser, newEmail);
  await updateDoc(doc(db, 'users', fbUser.uid), { email: newEmail });
};

// Owner changes own password
export const changeOwnPasswordAndStore = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.email) throw new Error('Utente non autenticato');
  const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
  await reauthenticateWithCredential(fbUser, credential);
  await updatePassword(fbUser, newPassword);
};

// Get managed password
export const getManagedPassword = async (
  userId: string
): Promise<string | null> => {
  const { getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return snap.data()?.managedPassword || null;
};

// ==========================================
// Credential Change Requests (approval flow)
// ==========================================

export const createCredentialRequest = async (
  userId: string,
  userName: string,
  userSurname: string,
  currentEmail: string,
  requestType: CredentialRequestType,
  newValue: string
): Promise<string> => {
  const data: Record<string, unknown> = {
    userId,
    userName,
    userSurname,
    requestType,
    currentEmail,
    status: 'pending',
    createdAt: Timestamp.now(),
  };
  if (requestType === 'email') data.newEmail = newValue;
  else if (requestType === 'info') data.newInfo = newValue;
  else data.newPassword = newValue;

  const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), data);
  return docRef.id;
};

export const getPendingRequests = async (): Promise<CredentialChangeRequest[]> => {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as CredentialChangeRequest));
};

export const getUserRequests = async (
  userId: string
): Promise<CredentialChangeRequest[]> => {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const results = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as CredentialChangeRequest));
  results.sort((a, b) => {
    const da = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt
      ? (a.createdAt as any).seconds : new Date(a.createdAt as any).getTime() / 1000;
    const db2 = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt
      ? (b.createdAt as any).seconds : new Date(b.createdAt as any).getTime() / 1000;
    return db2 - da;
  });
  return results;
};

export const approveRequest = async (
  request: CredentialChangeRequest,
  reviewerId: string
): Promise<void> => {
  const managedPassword = await getManagedPassword(request.userId);
  if (!managedPassword) {
    throw new Error('Password gestita non trovata. Impossibile applicare la modifica.');
  }

  if (request.requestType === 'email' && request.newEmail) {
    await adminChangeUserEmail(
      request.userId,
      request.currentEmail,
      managedPassword,
      request.newEmail
    );
  } else if (request.requestType === 'password' && request.newPassword) {
    await adminChangeUserPassword(
      request.userId,
      request.currentEmail,
      managedPassword,
      request.newPassword
    );
  } else if (request.requestType === 'info' && request.newInfo) {
    try {
      const info = JSON.parse(request.newInfo);
      const update: Record<string, string> = {};
      if (info.name) update.name = info.name;
      if (info.surname) update.surname = info.surname;
      if (info.phone !== undefined) update.phone = info.phone;
      if (Object.keys(update).length > 0) {
        await updateDoc(doc(db, 'users', request.userId), update);
      }
    } catch {
      throw new Error('Dati non validi nella richiesta.');
    }
  }

  await updateDoc(doc(db, REQUESTS_COLLECTION, request.id), {
    status: 'approved',
    reviewedAt: Timestamp.now(),
    reviewedBy: reviewerId,
  });
};

export const denyRequest = async (
  requestId: string,
  reviewerId: string,
  reason?: string
): Promise<void> => {
  const updates: Record<string, unknown> = {
    status: 'denied',
    reviewedAt: Timestamp.now(),
    reviewedBy: reviewerId,
  };
  if (reason) updates.denialReason = reason;
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), updates);
};
