import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { emitTwinEvent } from './twinEventService';

const CHECKIN_COLLECTION = 'checkins';

export interface CheckinRecord {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: Date;
}

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

export const registerCheckin = async (
  studentId: string,
  studentName: string,
  method: 'qr' | 'manuale' = 'qr'
): Promise<{ success: boolean; alreadyCheckedIn?: boolean }> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Filtro solo per data lato server (nessun indice composito richiesto),
  // per studente lato client: i check-in di oggi sono pochi.
  const existing = await getDocs(
    query(
      collection(db, CHECKIN_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(todayStart))
    )
  );

  if (existing.docs.some((d) => d.data().studentId === studentId)) {
    return { success: false, alreadyCheckedIn: true };
  }

  const ref = await addDoc(collection(db, CHECKIN_COLLECTION), {
    studentId,
    studentName,
    timestamp: Timestamp.now(),
  });

  // Dual-write twin (M3): presenza in palestra
  emitTwinEvent(
    'gym.checkin',
    { method },
    { subjectUid: studentId, sourceRef: { collection: CHECKIN_COLLECTION, doc_id: ref.id } }
  );

  return { success: true };
};

/**
 * Ha varcato la porta oggi? La seduta non parte senza.
 * Regola del titolare: si entra dal QR, e l'allenamento si
 * registra solo per chi è davvero in palestra.
 */
export const hasCheckedInToday = async (studentId: string): Promise<boolean> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  try {
    const snap = await getDocs(
      query(
        collection(db, CHECKIN_COLLECTION),
        where('timestamp', '>=', Timestamp.fromDate(todayStart))
      )
    );
    return snap.docs.some((d) => d.data().studentId === studentId);
  } catch {
    // In caso di errore NON si blocca l'allievo: si lascia passare.
    // Meglio una seduta in più che una persona chiusa fuori.
    return true;
  }
};

export const getTodayCheckins = async (): Promise<CheckinRecord[]> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const snapshot = await getDocs(
    query(
      collection(db, CHECKIN_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(todayStart)),
      orderBy('timestamp', 'desc')
    )
  );

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId,
      studentName: data.studentName,
      timestamp: (data.timestamp as Timestamp).toDate(),
    };
  });
};

export const getRecentCheckins = async (days: number = 7): Promise<CheckinRecord[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const snapshot = await getDocs(
    query(
      collection(db, CHECKIN_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc'),
      limit(200)
    )
  );

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId,
      studentName: data.studentName,
      timestamp: (data.timestamp as Timestamp).toDate(),
    };
  });
};
