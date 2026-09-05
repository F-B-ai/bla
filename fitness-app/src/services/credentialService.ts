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
  // Le modifiche credenziali passano dalle Cloud Functions (Admin SDK,
  // verifica ruolo server-side): mai più login "come l'utente" con
  // password salvate in chiaro (vulnerabilità V1, bonificata in M0).
  if (request.requestType === 'email' && request.newEmail) {
    const { adminSetUserEmail } = await import('./adminAuthService');
    await adminSetUserEmail(request.userId, request.newEmail);
    await updateDoc(doc(db, 'users', request.userId), { email: request.newEmail });
  } else if (request.requestType === 'password' && request.newPassword) {
    const { adminSetUserPassword } = await import('./adminAuthService');
    await adminSetUserPassword(request.userId, request.newPassword);
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
