// ============================================================
// SISTEMA STELLATO — servizio (sessioni, persistenza, referto)
// Specifica §7: "Sessioni — entità sessione legata all'allievo,
// con tipo (1 o 2), data, operatore, stato. Una valutazione è
// completa solo con ENTRAMBE."
// ------------------------------------------------------------
// PRIVACY (§7): dati di categoria particolare. Restano
// nell'istanza della palestra, accesso riservato allo staff,
// nessun invio a terzi senza consenso esplicito.
// ============================================================

import {
  collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { emitTwinEvent } from './twinEventService';
import {
  computeStellato, StellatoOutcome, TestResult,
} from '../domain/stellato';
import { Sessione, CATALOG_VERSION } from '../data/stellatoProtocol';

const COLLECTION = 'stellatoSessions';

export interface StellatoSession {
  id: string;
  studentId: string;
  studentName?: string;
  assessorId: string;
  sessione: Sessione;
  date: Date;
  results: TestResult[];
  redFlags: string[];
  /** firma dell'operatore sulla proposta del sistema (§5 regola d'oro) */
  firmaOperatore?: {
    operatorId: string;
    accettata: boolean;
    prescrizioneFinale: string[];
    nota?: string;
    at: Date;
  };
  catalogVersion: number;
}

/** Salva una sessione (1 o 2). Nessuna prescrizione è valida senza firma. */
export const saveStellatoSession = async (input: {
  studentId: string;
  studentName?: string;
  assessorId: string;
  sessione: Sessione;
  results: TestResult[];
  redFlags: string[];
  firmaOperatore?: {
    operatorId: string;
    accettata: boolean;
    prescrizioneFinale: string[];
    nota?: string;
  };
}): Promise<string> => {
  const outcome = computeStellato({
    results: input.results,
    redFlags: input.redFlags,
  });

  const ref = await addDoc(collection(db, COLLECTION), {
    studentId: input.studentId,
    studentName: input.studentName || null,
    assessorId: input.assessorId,
    sessione: input.sessione,
    results: input.results,
    redFlags: input.redFlags,
    catalogVersion: CATALOG_VERSION,
    scoringVersion: outcome.scores.scoringVersion,
    // snapshot dell'esito: il referto resta riproducibile anche dopo
    // l'aggiornamento delle regole (§7)
    scoresSnapshot: outcome.scores,
    decisionSnapshot: outcome.decision,
    firmaOperatore: input.firmaOperatore
      ? { ...input.firmaOperatore, at: Timestamp.now() }
      : null,
    date: Timestamp.now(),
  });

  // Evento twin: solo la sintesi, mai i dati grezzi di salute.
  emitTwinEvent(
    'mindmovement.assessed',
    {
      protocollo: 'sistema_stellato',
      sessione: input.sessione,
      catalog_version: CATALOG_VERSION,
      catene: outcome.scores.chains.map((c) => ({
        catena: c.key, score: c.score, asimmetria: c.asimmetria,
      })),
      catena_prioritaria: outcome.decision.catenaPrioritaria,
      recettore_causativo: outcome.decision.recettoreCausativo?.recettore || null,
      bloccato_red_flag: outcome.decision.bloccato,
      test_compilati: outcome.scores.compilati,
    },
    {
      subjectUid: input.studentId,
      source: 'coach',
      confidence: 1.0, // somministrato dal professionista
      sourceRef: { collection: COLLECTION, doc_id: ref.id },
    }
  );

  return ref.id;
};

export const getStudentStellatoSessions = async (
  studentId: string
): Promise<StellatoSession[]> => {
  const snap = await getDocs(
    query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      orderBy('date', 'desc'),
      limit(20)
    )
  );
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      studentId: x.studentId,
      studentName: x.studentName || undefined,
      assessorId: x.assessorId,
      sessione: x.sessione,
      date: x.date?.toDate?.() || new Date(),
      results: x.results || [],
      redFlags: x.redFlags || [],
      firmaOperatore: x.firmaOperatore
        ? { ...x.firmaOperatore, at: x.firmaOperatore.at?.toDate?.() || new Date() }
        : undefined,
      catalogVersion: x.catalogVersion || 1,
    };
  });
};

/**
 * Una valutazione è COMPLETA solo con entrambe le sessioni (§7).
 * Unisce i risultati delle due sessioni più recenti e calcola
 * l'Esame del Sistema Stellato completo.
 */
export const computeCombined = (
  sessions: StellatoSession[]
): { outcome: StellatoOutcome; completa: boolean; hasS1: boolean; hasS2: boolean } => {
  const s1 = sessions.find((s) => s.sessione === 1);
  const s2 = sessions.find((s) => s.sessione === 2);
  const results = [...(s1?.results || []), ...(s2?.results || [])];
  const redFlags = Array.from(new Set([...(s1?.redFlags || []), ...(s2?.redFlags || [])]));
  return {
    outcome: computeStellato({ results, redFlags }),
    completa: Boolean(s1 && s2),
    hasS1: Boolean(s1),
    hasS2: Boolean(s2),
  };
};

export { computeStellato };
export type { TestResult, StellatoOutcome };
