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
  doc, deleteDoc, updateDoc, getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { emitTwinEvent } from './twinEventService';
import { valutaOnboarding, sintesiPerTwin, Risposte } from '../domain/onboarding';
import { ONBOARDING_VERSION } from '../data/onboardingForm';
import { TipoSoggetto, vaSulGemello } from '../domain/interessato';

const COLLECTION = 'onboardings';

export interface SchedaOnboarding {
  id: string;
  /** vuoto finché la scheda appartiene a un interessato */
  studentId: string;
  studentName?: string;
  /** 'allievo' oppure 'interessato' — vedi domain/interessato */
  tipoSoggetto: TipoSoggetto;
  /** il nome di chi è venuto in consulenza, se non è (ancora) un allievo */
  ospiteNome?: string;
  ospiteTelefono?: string;
  coachId: string;
  date: Date;
  risposte: Risposte;
  checklist: string[];
  noteCoach?: string;
  version: number;
}

export const saveOnboarding = async (input: {
  /** vuoto per un interessato */
  studentId?: string;
  studentName?: string;
  tipoSoggetto: TipoSoggetto;
  ospiteNome?: string;
  ospiteTelefono?: string;
  coachId: string;
  risposte: Risposte;
  checklist: string[];
  noteCoach?: string;
}): Promise<string> => {
  const esito = valutaOnboarding(input.risposte);

  const ref = await addDoc(collection(db, COLLECTION), {
    studentId: input.studentId || '',
    studentName: input.studentName || null,
    tipoSoggetto: input.tipoSoggetto,
    ospiteNome: input.ospiteNome?.trim() || null,
    ospiteTelefono: input.ospiteTelefono?.trim() || null,
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
  //
  // E SOLO per un allievo vero: un interessato non ha un gemello, non
  // ha un account, e potrebbe non averli mai. Scriverci sopra vorrebbe
  // dire creare metà persona nel sistema, e doverla poi cancellare da
  // due posti invece che da uno. Vedi domain/interessato.
  if (vaSulGemello(input.tipoSoggetto) && input.studentId) {
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
  }

  return ref.id;
};

/**
 * Le schede di chi è venuto in consulenza e non è (ancora) un allievo.
 * Dalla più recente: è l'ordine con cui si decide che farne.
 */
export const elencaInteressati = async (): Promise<SchedaOnboarding[]> => {
  try {
    const snap = await getDocs(query(
      collection(db, COLLECTION),
      where('tipoSoggetto', '==', 'interessato'),
      orderBy('date', 'desc'),
      limit(100)
    ));
    return snap.docs.map((d) => leggiScheda(d.id, d.data()));
  } catch {
    return [];
  }
};

/**
 * Cancella la scheda di un interessato.
 *
 * Le schede degli ALLIEVI non si cancellano — né da qui né dalle
 * regole: sono il primo atto del loro percorso. Questa esiste perché
 * una persona che non è entrata non deve lasciare i suoi dati di
 * salute in casa nostra.
 */
export const cancellaInteressato = async (schedaId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, schedaId));
};

/**
 * La persona è entrata: la scheda diventa sua.
 *
 * Da qui in poi non si cancella più — ed è ora, non prima, che
 * l'evento arriva sul gemello: è il primo atto del percorso, e la sua
 * data è quella della consulenza, non quella della registrazione.
 */
export const collegaAllievo = async (
  schedaId: string,
  studentId: string,
  studentName: string
): Promise<void> => {
  const riferimento = doc(db, COLLECTION, schedaId);
  const attuale = await getDoc(riferimento);
  if (!attuale.exists()) throw new Error('La scheda non esiste più.');

  await updateDoc(riferimento, {
    studentId,
    studentName,
    tipoSoggetto: 'allievo',
  });

  const dati = attuale.data();
  const esito = dati?.esitoSnapshot || valutaOnboarding(dati?.risposte || {});
  emitTwinEvent(
    'person.onboarded',
    sintesiPerTwin(esito),
    {
      subjectUid: studentId,
      source: 'coach',
      confidence: 1.0,
      sourceRef: { collection: COLLECTION, doc_id: schedaId },
    }
  );
};

const leggiScheda = (id: string, x: Record<string, any>): SchedaOnboarding => ({
  id,
  studentId: x.studentId || '',
  studentName: x.studentName || undefined,
  // Le schede scritte prima del 12 settembre 2026 non hanno il campo:
  // erano tutte di allievi, perché non si poteva fare altrimenti.
  tipoSoggetto: x.tipoSoggetto || 'allievo',
  ospiteNome: x.ospiteNome || undefined,
  ospiteTelefono: x.ospiteTelefono || undefined,
  coachId: x.coachId,
  date: x.date?.toDate?.() || new Date(),
  risposte: x.risposte || {},
  checklist: x.checklist || [],
  noteCoach: x.noteCoach || undefined,
  version: x.version || 1,
});

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
    return leggiScheda(d.id, d.data());
  } catch {
    return null;
  }
};
