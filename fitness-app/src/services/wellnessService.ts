import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const WELLNESS_COLLECTION = 'wellnessChecks';

// ============================================================
// STATO ESSĒRE — check-in quotidiano mente-corpo
// 4 dimensioni (1-5): sonno, energia, umore, dolori muscolari.
// Il punteggio 0-100 guida il consiglio di allenamento del giorno
// ed è visibile al coach.
// ============================================================

export interface WellnessCheck {
  id: string;
  studentId: string;
  studentName: string;
  sleep: number; // 1-5
  energy: number; // 1-5
  mood: number; // 1-5
  soreness: number; // 1-5 (5 = molto dolorante)
  score: number; // 0-100
  timestamp: Date;
}

export { computeScore, adviceForScore } from '../domain/formulas';
export type { ScoreAdvice } from '../domain/formulas';
import { computeScore, computeReadinessV2, FORMULA_VERSION } from '../domain/formulas';
import { emitTwinEvent } from './twinEventService';

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const fromDoc = (id: string, data: Record<string, any>): WellnessCheck => ({
  id,
  studentId: data.studentId,
  studentName: data.studentName || '',
  sleep: data.sleep || 3,
  energy: data.energy || 3,
  mood: data.mood || 3,
  soreness: data.soreness || 3,
  score: data.score || 0,
  timestamp: data.timestamp ? (data.timestamp as Timestamp).toDate() : new Date(),
});

// Ritorna il check-in di oggi dello studente, se esiste.
// NB: filtro solo per data lato server (nessun indice composito
// richiesto) e per studente lato client.
export const getTodayCheck = async (studentId: string): Promise<WellnessCheck | null> => {
  const snap = await getDocs(
    query(
      collection(db, WELLNESS_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(startOfToday()))
    )
  );
  const d = snap.docs.find((x) => x.data().studentId === studentId);
  return d ? fromDoc(d.id, d.data()) : null;
};

export const saveDailyCheck = async (
  studentId: string,
  studentName: string,
  values: { sleep: number; energy: number; mood: number; soreness: number }
): Promise<WellnessCheck> => {
  const score = computeScore(values.sleep, values.energy, values.mood, values.soreness);
  const ref = await addDoc(collection(db, WELLNESS_COLLECTION), {
    studentId,
    studentName,
    ...values,
    score,
    timestamp: Timestamp.now(),
  });

  // Dual-write twin (M3, strangler): il doc legacy resta la fonte UI.
  // Il log porta la v1 (mostrata) E la v2 (canonica, per calibrazione).
  const v2 = computeReadinessV2(values.sleep, values.energy, values.mood, values.soreness);
  emitTwinEvent(
    'wellness.checkin_submitted',
    {
      sleep: values.sleep,
      energy: values.energy,
      mood: values.mood,
      soreness: values.soreness,
      score,
      formula_version: FORMULA_VERSION,
      score_v2: v2.score,
      formula_v2_version: v2.version,
    },
    { subjectUid: studentId, sourceRef: { collection: WELLNESS_COLLECTION, doc_id: ref.id } }
  );

  return {
    id: ref.id,
    studentId,
    studentName,
    ...values,
    score,
    timestamp: new Date(),
  };
};

// Storico recente dello studente (per trend personale)
export const getRecentChecks = async (
  studentId: string,
  days: number = 14
): Promise<WellnessCheck[]> => {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const snap = await getDocs(
    query(
      collection(db, WELLNESS_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(start)),
      orderBy('timestamp', 'desc'),
      limit(500)
    )
  );
  return snap.docs
    .filter((d) => d.data().studentId === studentId)
    .slice(0, days)
    .map((d) => fromDoc(d.id, d.data()));
};

// Tutti i check-in di oggi (vista coach/owner)
export const getAllTodayChecks = async (): Promise<WellnessCheck[]> => {
  const snap = await getDocs(
    query(
      collection(db, WELLNESS_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(startOfToday())),
      orderBy('timestamp', 'desc')
    )
  );
  return snap.docs.map((d) => fromDoc(d.id, d.data()));
};
