// ============================================================
// ONBOARDING — persistenza
// ------------------------------------------------------------
// La scheda completa (dati di salute compresi) resta in
// `onboardings`, leggibile da staff e interessato. Sul gemello
// va SOLO la sintesi: `person.onboarded` è l'evento di origine
// del percorso di una persona.
// ============================================================

import {
  collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { emitTwinEvent } from './twinEventService';
import { valutaOnboarding, sintesiPerTwin, Risposte } from '../domain/onboarding';
import { ONBOARDING_VERSION } from '../data/onboardingForm';

const COLLECTION = 'onboardings';

export interface SchedaOnboarding {
  id: string;
  studentId: string;
  studentName?: string;
  coachId: string;
  date: Date;
  risposte: Risposte;
  checklist: string[];
  noteCoach?: string;
  version: number;
}

export const saveOnboarding = async (input: {
  studentId: string;
  studentName?: string;
  coachId: string;
  risposte: Risposte;
  checklist: string[];
  noteCoach?: string;
}): Promise<string> => {
  const esito = valutaOnboarding(input.risposte);

  const ref = await addDoc(collection(db, COLLECTION), {
    studentId: input.studentId,
    studentName: input.studentName || null,
    coachId: input.coachId,
    risposte: input.risposte,
    checklist: input.checklist,
    noteCoach: input.noteCoach || null,
    version: ONBOARDING_VERSION,
    // istantanea dell'esito: resta leggibile anche se le regole cambiano
    esitoSnapshot: esito,
    date: Timestamp.now(),
  });

  // Sul gemello va solo la sintesi — mai anagrafica, mai clinica.
  emitTwinEvent(
    'person.onboarded',
    sintesiPerTwin(esito),
    {
      subjectUid: input.studentId,
      source: 'coach',
      confidence: 1.0, // raccolto dal professionista nel colloquio
      sourceRef: { collection: COLLECTION, doc_id: ref.id },
    }
  );

  return ref.id;
};

export const getOnboarding = async (
  studentId: string
): Promise<SchedaOnboarding | null> => {
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
    return {
      id: d.id,
      studentId: x.studentId,
      studentName: x.studentName || undefined,
      coachId: x.coachId,
      date: x.date?.toDate?.() || new Date(),
      risposte: x.risposte || {},
      checklist: x.checklist || [],
      noteCoach: x.noteCoach || undefined,
      version: x.version || 1,
    };
  } catch {
    return null;
  }
};
