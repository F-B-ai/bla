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
  method: 'qr' | 'manuale' = 'qr',
  /**
   * Chi è entrato: allievo, collaboratore, manager, nutrizionista.
   *
   * Dal 12 ottobre 2026 l'ingresso lo registra anche chi lavora qui, e
   * un registro che non distingue le due cose non serve a nessuno:
   * dieci presenze in un pomeriggio sono una cosa se sono allievi e
   * un'altra se sono tre collaboratori che entrano ed escono.
   */
  ruolo = 'student'
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
    ruolo,
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

/**
 * Gli ingressi per il documento del registro.
 *
 * Esiste a parte da `getRecentCheckins` perché quella serve a vedere
 * chi è entrato in settimana: sette giorni e duecento righe bastano e
 * avanzano. Qui si costruisce un documento che va letto da fuori, e un
 * documento che si ferma a duecento righe senza dirlo è un documento
 * che mente per omissione.
 */
export const getCheckinsPerRegistro = async (
  giorni = 180,
  massimo = 1000
): Promise<CheckinRecord[]> => {
  const da = new Date();
  da.setDate(da.getDate() - giorni);
  da.setHours(0, 0, 0, 0);

  const snapshot = await getDocs(
    query(
      collection(db, CHECKIN_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(da)),
      orderBy('timestamp', 'desc'),
      limit(massimo)
    )
  );

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId,
      studentName: data.studentName,
      timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
    } as CheckinRecord;
  });
};


/**
 * Questa persona ha già registrato l'ingresso oggi?
 *
 * Serve alla domanda che l'app fa all'apertura: chiederla a chi ha
 * già inquadrato il QR mezz'ora fa è il modo più rapido di far
 * disinstallare l'applicazione.
 */
export const ultimoIngressoDiOggi = async (
  userId: string
): Promise<Date | null> => {
  if (!userId) return null;
  const inizio = new Date();
  inizio.setHours(0, 0, 0, 0);
  try {
    const snapshot = await getDocs(
      query(
        collection(db, CHECKIN_COLLECTION),
        where('timestamp', '>=', Timestamp.fromDate(inizio))
      )
    );
    const miei = snapshot.docs
      .filter((d) => d.data().studentId === userId)
      .map((d) => {
        const t = d.data().timestamp;
        return t?.toDate ? t.toDate() : null;
      })
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime());
    return miei[0] || null;
  } catch {
    // Se la lettura non riesce NON si conclude che la persona non sia
    // entrata: si risponde «non lo so» tornando null, e chi chiama
    // deciderà di non insistere. Vedi il commento in IngressoGate.
    return null;
  }
};
