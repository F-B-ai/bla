// ============================================================
// MIND MOVEMENT™ SERVICE — la valutazione integrata
// ------------------------------------------------------------
// Il momento in cui il metodo proprietario incontra il twin:
// la sintesi AI legge i test somministrati dal coach INSIEME ai
// dati oggettivi già raccolti dall'app (cammino, squat, postura,
// trend readiness) e restituisce il quadro nei 4 domini.
// L'AI collega e suggerisce; l'interpretazione resta del coach.
// ============================================================

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { emitTwinEvent, getPersonId } from './twinEventService';
import { callClaude } from './aiService';
import {
  MMResult,
  MMAssessmentScores,
  computeMMScores,
  describeResult,
} from '../domain/mindMovement';
import { MM_TESTS } from '../data/mindMovementProtocol';

const COLLECTION = 'mindMovementAssessments';

export interface MMAssessment {
  id: string;
  studentId: string;
  assessorId: string;
  date: Date;
  results: MMResult[];
  scores: MMAssessmentScores;
  aiSynthesis: string;
}

// ------------------------------------------------------------
// Contesto oggettivo dal twin (gli "occhi" dell'app)
// ------------------------------------------------------------

const getTwinContext = async (subjectUid: string): Promise<Record<string, unknown>> => {
  const ctx: Record<string, unknown> = {};
  try {
    const personId = await getPersonId(subjectUid);
    // ultimi eventi di valutazione oggettiva (90gg)
    const cutoff = new Date(Date.now() - 90 * 86400000);
    const snap = await getDocs(
      query(
        collection(db, 'human_events'),
        where('person_id', '==', personId),
        where('ts', '>=', Timestamp.fromDate(cutoff)),
        orderBy('ts', 'desc'),
        limit(300)
      )
    );
    const events = snap.docs.map((d) => d.data());
    const latest = (type: string) => events.find((e) => e.type === type)?.payload || null;
    ctx.analisi_cammino = latest('movement.gait_assessed');
    ctx.analisi_squat = latest('movement.squat_assessed');
    ctx.valutazione_posturale = latest('posture.assessed');
    // stati derivati dal Brain
    const twin = await getDoc(doc(db, 'twins', personId));
    if (twin.exists()) {
      const t = twin.data();
      ctx.readiness = t.readiness || null;
      ctx.aderenza = t.adherence || null;
    }
  } catch {
    /* contesto parziale: la valutazione vive comunque */
  }
  return ctx;
};

// ------------------------------------------------------------
// Sintesi AI integrata
// ------------------------------------------------------------

const SYNTHESIS_SYSTEM = `Sei l'assistente del Protocollo di Valutazione Neuro-Recettoriale Integrata Mind Movement™. Ricevi: (1) gli esiti dei test somministrati dal coach nei 4 domini (neuro-recettoriale, neurovegetativo, neuromotorio, somato-emozionale) e (2) i dati oggettivi raccolti dall'app (analisi del cammino, squat, postura, trend readiness).

Il principio del metodo: la postura è un OUTPUT del cervello — non cerchiamo la "postura corretta" ma i sistemi che generano compensi e strategie adattative.

Regole ferree:
- MAI diagnosi, MAI nomi di patologie, MAI linguaggio clinico. Sei uno strumento di valutazione funzionale e benessere. Se qualcosa merita approfondimento: "da approfondire con un professionista sanitario".
- CERCA LE CONNESSIONI TRA DOMINI: è il cuore del metodo (es. respiro toracico + apnea sotto compito + equilibrio che crolla a occhi chiusi = quadro coerente da raccontare).
- INCROCIA test manuali e dati app: se il coach segna squat compromesso E l'analisi AI mostra valgismo, dillo; se divergono, segnalalo.
- Commenta SOLO ciò che ricevi. Domini non valutati: non inventare.

Rispondi in italiano, per il coach, con questa struttura:
1) IL QUADRO (3-4 frasi: la storia che i 4 domini raccontano insieme)
2) LE CONNESSIONI (2-3 collegamenti tra domini/dati, i più significativi)
3) PRIORITÀ DI LAVORO (max 3, in ordine, con un suggerimento pratico ciascuna)
4) DA RIVALUTARE (cosa ritestare e indicativamente quando)
Massimo 220 parole. Tono: collega esperto, mai software.`;

export const generateSynthesis = async (
  studentUid: string,
  studentName: string,
  results: MMResult[],
  scores: MMAssessmentScores
): Promise<string> => {
  const twinCtx = await getTwinContext(studentUid);
  const testDetails = results.map((r) => {
    const t = MM_TESTS.find((x) => x.id === r.testId);
    return t ? { dominio: t.dominio, test: t.nome, esito: describeResult(t, r.value), nota: r.nota || undefined } : null;
  }).filter(Boolean);

  return callClaude(
    [{
      role: 'user',
      content: JSON.stringify({
        allievo: studentName,
        punteggi_domini: scores.domains.map((d) => ({
          dominio: d.nome, punteggio: d.score, test_fatti: `${d.testDone}/${d.testTotal}`,
          da_attenzionare: d.flags,
        })),
        esiti_test: testDetails,
        dati_oggettivi_app: twinCtx,
      }),
    }],
    SYNTHESIS_SYSTEM,
    1000,
    undefined,
    'claude-sonnet-4-5',
    'mindmovement'
  );
};

// ------------------------------------------------------------
// Persistenza
// ------------------------------------------------------------

export const saveMMAssessment = async (input: {
  studentId: string;
  assessorId: string;
  results: MMResult[];
  scores: MMAssessmentScores;
  aiSynthesis: string;
}): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    date: Timestamp.now(),
  });

  emitTwinEvent(
    'mindmovement.assessed',
    {
      protocol_version: input.scores.protocolVersion,
      overall: input.scores.overall,
      domini: input.scores.domains.map((d) => ({
        dominio: d.key, score: d.score, flags: d.flags.length,
      })),
      test_compilati: input.scores.compiled,
    },
    {
      subjectUid: input.studentId,
      source: 'coach',
      confidence: 1.0, // somministrato dal professionista (02 §3.1)
      sourceRef: { collection: COLLECTION, doc_id: ref.id },
    }
  );

  return ref.id;
};

export const getStudentMMAssessments = async (studentId: string): Promise<MMAssessment[]> => {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where('studentId', '==', studentId), orderBy('date', 'desc'), limit(10))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId,
      assessorId: data.assessorId,
      date: data.date?.toDate?.() || new Date(),
      results: data.results || [],
      scores: data.scores,
      aiSynthesis: data.aiSynthesis || '',
    };
  });
};

export { computeMMScores };
export type { MMResult, MMAssessmentScores };
