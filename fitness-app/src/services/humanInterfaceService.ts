// ============================================================
// HUMAN INTERFACE — servizio
// ------------------------------------------------------------
// Legge gli eventi di valutazione dal gemello e li consegna al
// dominio, che ne fa il quadro. Nessuna logica qui dentro: qui
// si prendono i dati, si ragiona altrove (e si testa altrove).
// ============================================================

import { getPersonTimeline } from './twinEventService';
import { costruisciQuadro, EventoQuadro, Quadro } from '../domain/humanInterface';

/** Solo gli eventi che raccontano una valutazione. */
const TIPI_VALUTAZIONE = new Set([
  'posture.assessed',
  'body.composition_estimated',
  'movement.gait_assessed',
  'movement.squat_assessed',
  'mindmovement.assessed',
]);

/**
 * Il quadro di una persona. Legge fino a 300 eventi indietro:
 * le valutazioni sono rare (poche l'anno), quindi bastano a
 * coprire tutta la storia di un allievo.
 */
export const getQuadro = async (subjectUid: string): Promise<Quadro> => {
  const eventi: EventoQuadro[] = [];
  let cursore: any = null;

  for (let pagina = 0; pagina < 6; pagina++) {
    const page = await getPersonTimeline(subjectUid, 50, cursore);
    for (const e of page.events) {
      if (!TIPI_VALUTAZIONE.has(e.type)) continue;
      eventi.push({
        type: e.type,
        ts: e.ts instanceof Date ? e.ts : new Date(e.ts as any),
        payload: (e.payload || {}) as Record<string, any>,
      });
    }
    if (!page.cursor || page.events.length === 0) break;
    cursore = page.cursor;
  }

  return costruisciQuadro(eventi);
};

export type { Quadro };
