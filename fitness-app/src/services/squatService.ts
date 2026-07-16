// ============================================================
// SQUAT SERVICE — analisi dello squat (AI Biomechanics v2)
// ------------------------------------------------------------
// Riusa l'intera pipeline on-device del cammino (gaitService):
// video → scheletro SUL DISPOSITIVO → metriche deterministiche
// (src/domain/squat) → interpretazione AI → doc legacy + twin.
// ============================================================

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { computeSquatMetrics, SquatMetrics, SquatView } from '../domain/squat';
import { emitTwinEvent } from './twinEventService';
import { callClaude } from './aiService';

const COLLECTION = 'squatAssessments';

const NARRATIVE_SYSTEM = `Sei l'assistente biomeccanico di una palestra. Ricevi METRICHE GIÀ CALCOLATE dall'analisi dello squat di un allievo e le spieghi al coach in italiano.

Regole ferree:
- NON sei un medico: screening wellness. MAI diagnosi, MAI nomi di patologie. Se qualcosa merita approfondimento clinico: "da approfondire con un professionista sanitario".
- Commenta SOLO i numeri ricevuti, non inventare.
- Riferimenti indicativi: profondità "parallelo" o "profondo" ok se controllata; tronco al fondo < 40° tipico per back squat (dipende dalle leve individuali: non giudicare severamente); tempo controllato ~1.5-3s discesa; valgismo al fondo < 15%; deriva bacino < 10%.
- Struttura: 1) In sintesi (2 frasi), 2) Cosa guardare (max 3 punti dal più rilevante), 3) Spunti pratici da sala (max 3, es. box squat, goblet, tempo, banda alle ginocchia).
- Tono pratico, da collega esperto. Max 140 parole.`;

export const interpretSquatMetrics = async (
  metrics: SquatMetrics,
  studentName: string
): Promise<string> =>
  callClaude(
    [{ role: 'user', content: `Allievo: ${studentName}. Metriche squat (vista ${metrics.view}):\n${JSON.stringify(metrics, null, 1)}` }],
    NARRATIVE_SYSTEM,
    700,
    undefined,
    'claude-sonnet-4-5',
    'squat'
  );

export const saveSquatAssessment = async (input: {
  studentId: string;
  assessorId: string;
  view: SquatView;
  metrics: SquatMetrics;
  aiNarrative: string;
}): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    date: Timestamp.now(),
  });

  const m = input.metrics;
  emitTwinEvent(
    'movement.squat_assessed',
    {
      view: m.view,
      metrics_version: m.version,
      reps: m.reps ?? null,
      bottom_knee_angle_deg: m.bottom_knee_angle_deg ?? null,
      depth: m.depth ?? null,
      trunk_lean_bottom_deg: m.trunk_lean_bottom_deg ?? null,
      tempo_down_s: m.tempo_down_s ?? null,
      tempo_up_s: m.tempo_up_s ?? null,
      knee_valgus_bottom_pct: m.knee_valgus_bottom_pct ?? null,
      hip_shift_pct: m.hip_shift_pct ?? null,
    },
    {
      subjectUid: input.studentId,
      source: 'ai',
      confidence: 0.65, // pose 2D monoculare: proxy per screening (02 §3.1)
      sourceRef: { collection: COLLECTION, doc_id: ref.id },
    }
  );

  return ref.id;
};

export { computeSquatMetrics };
export type { SquatMetrics, SquatView };
