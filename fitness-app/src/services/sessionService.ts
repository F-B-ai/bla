import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TrainingSession, SessionStatus } from '../types';

const SESSIONS_COLLECTION = 'sessions';
const CANCELLATION_HOURS_LIMIT = 10;

export const createSession = async (
  session: Omit<TrainingSession, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), {
    ...session,
    date: Timestamp.fromDate(session.date),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const cancelSession = async (
  sessionId: string,
  sessionDate: Date
): Promise<{ success: boolean; isLate: boolean }> => {
  const now = new Date();
  const hoursUntilSession =
    (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLate = hoursUntilSession < CANCELLATION_HOURS_LIMIT;

  const updateData: Partial<TrainingSession> = {
    status: isLate ? 'cancelled_late' : 'cancelled_by_student',
    cancelledAt: now,
    isCountedAsCompleted: isLate, // Se < 10 ore, conta come eseguita
  };

  await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), updateData);

  return { success: true, isLate };
};

const sortSessionsByDate = (items: TrainingSession[]) => {
  items.sort((a, b) => {
    const da = a.date && typeof a.date === 'object' && 'seconds' in a.date
      ? (a.date as any).seconds : new Date(a.date as any).getTime() / 1000;
    const db2 = b.date && typeof b.date === 'object' && 'seconds' in b.date
      ? (b.date as any).seconds : new Date(b.date as any).getTime() / 1000;
    return db2 - da;
  });
  return items;
};

export const getStudentSessions = async (
  studentId: string
): Promise<TrainingSession[]> => {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  return sortSessionsByDate(
    snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as TrainingSession))
  );
};

export const getCollaboratorSessions = async (
  collaboratorId: string
): Promise<TrainingSession[]> => {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('collaboratorId', '==', collaboratorId)
  );
  const snapshot = await getDocs(q);
  return sortSessionsByDate(
    snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as TrainingSession))
  );
};

export const getAllSessions = async (): Promise<TrainingSession[]> => {
  const snapshot = await getDocs(collection(db, SESSIONS_COLLECTION));
  return sortSessionsByDate(
    snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as TrainingSession))
  );
};

export const updateSessionStatus = async (
  sessionId: string,
  status: SessionStatus,
  notes?: string
): Promise<void> => {
  const updateData: Record<string, unknown> = { status };
  if (notes !== undefined) updateData.notes = notes;
  if (status === 'completed') updateData.isCountedAsCompleted = true;
  await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), updateData);
};

export const getCompletedSessionsCount = async (
  studentId: string
): Promise<number> => {
  const sessions = await getStudentSessions(studentId);
  return sessions.filter((s) => s.isCountedAsCompleted).length;
};

export const updateSession = async (
  sessionId: string,
  updates: Partial<Omit<TrainingSession, 'id'>>
): Promise<void> => {
  const data: Record<string, unknown> = { ...updates };
  if (updates.date) {
    data.date = Timestamp.fromDate(updates.date);
  }
  await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), data);
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionId));
};
