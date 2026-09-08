// ============================================================
// RESPIRO — persistenza e scrittura sul gemello
// ------------------------------------------------------------
// `breathing.session_completed` era dichiarato nella tassonomia
// v1.4 e nella whitelist delle regole Firestore fin da M3, ma
// nessun servizio l'ha mai emesso. Questo lo emette.
//
// L'evento è di prima persona (l'ha fatto l'allievo, non è una
// stima): confidence 1.0, source 'client'.
// ============================================================

import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { emitTwinEvent } from './twinEventService';
import { BREATHING_VERSION, PRATICA_BY_ID, respiriTotali } from '../domain/breathing';

const COLLECTION = 'breathingSessions';

export interface BreathingSession {
  id: string;
  studentId: string;
  praticaId: string;
  praticaNome: string;
  durataMinuti: number;
  /** completata fino in fondo, o interrotta prima */
  completata: boolean;
  date: Date;
}

export const saveBreathingSession = async (input: {
  studentId: string;
  praticaId: string;
  durataMinuti: number;
  /** minuti effettivamente respirati (se interrotta prima) */
  minutiEffettivi: number;
  completata: boolean;
}): Promise<string> => {
  const pratica = PRATICA_BY_ID[input.praticaId];
  const minuti = Math.max(0, Math.round(input.minutiEffettivi * 10) / 10);

  const ref = await addDoc(collection(db, COLLECTION), {
    studentId: input.studentId,
    praticaId: input.praticaId,
    praticaNome: pratica?.nome || input.praticaId,
    durataMinuti: input.durataMinuti,
    minutiEffettivi: minuti,
    completata: input.completata,
    version: BREATHING_VERSION,
    date: Timestamp.now(),
  });

  // La Timeline legge `duration_minutes`: il contratto era già scritto.
  emitTwinEvent(
    'breathing.session_completed',
    {
      pratica: input.praticaId,
      pratica_nome: pratica?.nome || input.praticaId,
      duration_minutes: minuti,
      respiri: pratica ? respiriTotali(pratica, minuti) : null,
      completata: input.completata,
      version: BREATHING_VERSION,
    },
    {
      subjectUid: input.studentId,
      source: 'app',
      confidence: 1.0, // atto di prima persona, non una stima
      sourceRef: { collection: COLLECTION, doc_id: ref.id },
    }
  );

  return ref.id;
};

/** Ha già respirato oggi? Serve a Oggi per non richiedere due volte. */
export const getTodayBreathing = async (
  studentId: string
): Promise<BreathingSession | null> => {
  const inizioGiornata = new Date();
  inizioGiornata.setHours(0, 0, 0, 0);
  try {
    const snap = await getDocs(query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      orderBy('date', 'desc'),
      limit(1)
    ));
    if (snap.empty) return null;
    const d = snap.docs[0];
    const x = d.data();
    const date = x.date?.toDate?.() || new Date(0);
    if (date < inizioGiornata) return null;
    return {
      id: d.id,
      studentId: x.studentId,
      praticaId: x.praticaId,
      praticaNome: x.praticaNome,
      durataMinuti: x.durataMinuti,
      completata: Boolean(x.completata),
      date,
    };
  } catch {
    return null;
  }
};
