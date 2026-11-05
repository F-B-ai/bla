import {
  collection,
  doc,
  onSnapshot,
  Unsubscribe,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  getDoc,
  query,
  where,
  limit,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TrainingSession, SessionStatus } from '../types';
import { ORE_LIMITE } from '../domain/annullamento';
import { senzaIndefiniti } from '../domain/salvataggio';
import { annota } from './registroService';
import { AzioneRegistro } from '../domain/registro';

const SESSIONS_COLLECTION = 'sessions';
// Il numero era scritto qui, e di nuovo in nutritionistService, e di
// nuovo in due schermate: quattro copie dello stesso 10. Adesso vive
// in domain/annullamento.ts insieme alla regola che lo usa.
const CANCELLATION_HOURS_LIMIT = ORE_LIMITE;

// ============================================================
// LE SEDUTE FINISCONO NEL REGISTRO
// ------------------------------------------------------------
// 2 novembre 2026. Il titolare: «il registro, mi devi dire tutto
// quello che avverrà». Sono andato a leggere i punti dove si annota
// e ho trovato il buco: erano sei, e nessuno riguardava le sedute.
//
// Avevo scritto al titolare che se qualcuno avesse inserito quaranta
// appuntamenti in una sera, il Registro ne avrebbe tenuto traccia.
// Non era vero: questo file non annotava niente. Sarebbe andato a
// una conversazione difficile contando su uno strumento che non
// esisteva.
//
// Il nome dell'allievo si risolve qui dentro e in modo asincrono,
// perché la riga deve restare leggibile anche quando quella scheda
// non ci sarà più — e perché chi fissa un appuntamento non deve
// aspettare una lettura in più per vederlo salvato.
// ============================================================
const annotaSeduta = (
  azione: AzioneRegistro,
  sessionId: string,
  studentId: string,
  dettaglio?: string
): void => {
  void (async () => {
    let nome = '';
    try {
      const snap = await getDoc(doc(db, 'users', studentId));
      if (snap.exists()) {
        const d = snap.data() as { name?: string; surname?: string };
        nome = `${d.name || ''} ${d.surname || ''}`.trim();
      }
    } catch {
      // senza nome la riga vale meno, ma esiste: meglio di niente
    }
    annota({ azione, oggetto: 'lezione', oggettoId: sessionId, oggettoNome: nome, dettaglio });
  })();
};

export const createSession = async (
  session: Omit<TrainingSession, 'id'>
): Promise<string> => {
  // `senzaIndefiniti`: un campo lasciato in bianco non si scrive. Senza
  // questo, una seduta creata senza costo — cioè quasi tutte quelle
  // dentro un pacchetto — faceva fallire l'intero salvataggio.
  const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), senzaIndefiniti({
    ...session,
    date: Timestamp.fromDate(session.date),
    createdAt: Timestamp.now(),
  }));
  annotaSeduta('creato', docRef.id, session.studentId,
    `${session.date.toLocaleDateString('it-IT')} ${session.startTime || ''}`.trim());
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

  const snap = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId)).catch(() => null);
  const sid = snap?.exists() ? String((snap.data() as { studentId?: string }).studentId || '') : '';
  annotaSeduta('modificato', sessionId, sid,
    isLate ? 'disdetta tardiva (conta come svolta)' : 'disdetta');

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

export const getAllSessions = async (maxResults = 500): Promise<TrainingSession[]> => {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    orderBy('date', 'desc'),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
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

  // Si legge PRIMA di scrivere: serve l'allievo per la riga del
  // registro, e dopo l'aggiornamento costerebbe una lettura uguale.
  const prima = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId)).catch(() => null);
  const sid = prima?.exists() ? String((prima.data() as { studentId?: string }).studentId || '') : '';

  await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), updateData);

  annotaSeduta('modificato', sessionId, sid,
    status === 'completed' ? 'segnata come svolta' : `stato: ${status}`);
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
  const data: Record<string, unknown> = senzaIndefiniti({ ...updates });
  if (updates.date) {
    data.date = Timestamp.fromDate(updates.date);
  }
  const prima = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId)).catch(() => null);
  const sid = prima?.exists() ? String((prima.data() as { studentId?: string }).studentId || '') : '';

  await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), data);

  annotaSeduta('modificato', sessionId, sid,
    updates.date ? `spostata al ${updates.date.toLocaleDateString('it-IT')}` : 'modificata');
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  // Il nome si legge PRIMA di cancellare: dopo non esiste piu'.
  const prima = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId)).catch(() => null);
  const d = prima?.exists() ? (prima.data() as { studentId?: string; date?: { toDate?: () => Date } }) : null;
  const sid = String(d?.studentId || '');

  await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionId));

  annotaSeduta('eliminato', sessionId, sid,
    d?.date?.toDate ? d.date.toDate().toLocaleDateString('it-IT') : undefined);
};

/**
 * Tutte le sedute, in tempo reale. Prima l'agenda si leggeva una
 * volta sola all'apertura: chi fissava un appuntamento doveva
 * chiudere e riaprire l'app per vederlo. Adesso arriva da solo.
 */
export const subscribeToSessions = (
  callback: (sessions: TrainingSession[]) => void,
  onError?: () => void
): Unsubscribe => {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    orderBy('date', 'desc'),
    limit(500)
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as TrainingSession))),
    () => { if (onError) onError(); }
  );
};

/** Le sedute di un singolo allievo, in tempo reale. */
export const subscribeToStudentSessions = (
  studentId: string,
  callback: (sessions: TrainingSession[]) => void,
  onError?: () => void
): Unsubscribe => {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('studentId', '==', studentId)
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as TrainingSession))),
    () => { if (onError) onError(); }
  );
};

/** Le sedute di un collaboratore, in tempo reale (stesso perimetro di prima). */
export const subscribeToCollaboratorSessions = (
  collaboratorId: string,
  callback: (sessions: TrainingSession[]) => void,
  onError?: () => void
): Unsubscribe => {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('collaboratorId', '==', collaboratorId)
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as TrainingSession))),
    () => { if (onError) onError(); }
  );
};
