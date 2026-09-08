// ============================================================
// ONBOARDING — dominio puro
// ------------------------------------------------------------
// Dalla scheda compilata al primo evento del gemello.
//
// DUE REGOLE FERREE
//  1. I dati di salute NON escono dalla scheda. Sul gemello va
//     solo la sintesi (che c'è un limite da rispettare, non
//     quale sia): il dettaglio clinico resta nel documento,
//     leggibile da staff e interessato.
//  2. Le controindicazioni si portano in evidenza da sole. Se
//     una persona dichiara infortuni o terapie, il coach lo deve
//     vedere PRIMA di consegnare un programma — non dopo.
// ============================================================

import { SEZIONI, CAMPI_TUTTI, CHECKLIST } from '../data/onboardingForm';

export const ONBOARDING_SCORING_VERSION = 1;

export type Risposte = Record<string, string | string[] | number | undefined>;

export interface Attenzione {
  campo: string;
  etichetta: string;
  motivo: string;
}

export interface EsitoOnboarding {
  version: number;
  /** quanti campi compilati su quanti */
  compilati: number;
  totali: number;
  /** sezioni ancora incomplete, per nome */
  sezioniIncomplete: string[];
  /** cose che il coach deve vedere prima di prescrivere */
  attenzioni: Attenzione[];
  /** true se la persona dichiara limiti fisici o terapie in corso */
  haControindicazioni: boolean;
  /** obiettivi scelti, per la sintesi sul gemello */
  obiettivi: string[];
  /** orizzonte temporale dichiarato */
  orizzonte: string | null;
  /** stress dichiarato 1-10, null se non compilato */
  stress: number | null;
}

const vuoto = (v: unknown): boolean =>
  v === undefined || v === null || v === '' ||
  (Array.isArray(v) && v.length === 0);

const comeArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * Le risposte che devono saltare all'occhio. Non è una diagnosi:
 * è una lista di "guarda qui prima di far allenare questa persona".
 */
const trovaAttenzioni = (r: Risposte): Attenzione[] => {
  const out: Attenzione[] = [];

  const inf = comeArray(r.infortuni).filter((x) => x.startsWith('Sì'));
  if (inf.length > 0) {
    out.push({
      campo: 'infortuni',
      etichetta: 'Infortuni o patologie dichiarate',
      motivo: inf.join(' · ') + '. Verifica prima di assegnare carichi.',
    });
  }

  if (typeof r.terapie === 'string' && r.terapie.startsWith('Sì')) {
    out.push({
      campo: 'terapie',
      etichetta: 'Terapie o farmaci in corso',
      motivo: 'La persona segue indicazioni mediche: leggile prima di programmare.',
    });
  }

  const s = typeof r.stress === 'number' ? r.stress : null;
  if (s !== null && s >= 8) {
    out.push({
      campo: 'stress',
      etichetta: `Stress dichiarato ${s} su 10`,
      motivo: 'Sistema già molto attivato: il carico va introdotto con misura.',
    });
  }

  if (typeof r.sonno_qualita === 'string' && r.sonno_qualita.startsWith('Pessima')) {
    out.push({
      campo: 'sonno_qualita',
      etichetta: 'Sonno di pessima qualità',
      motivo: 'Il recupero parte già in debito: aspettative e volumi vanno calibrati.',
    });
  }

  const ob = comeArray(r.obiettivi);
  if (ob.includes('Ridurre il dolore cronico') || ob.includes('Riabilitazione / post-infortunio')) {
    out.push({
      campo: 'obiettivi',
      etichetta: 'Obiettivo di natura sanitaria',
      motivo: 'Dolore cronico e riabilitazione sono fuori dal nostro perimetro: ' +
        'si affianca il professionista sanitario, non lo si sostituisce.',
    });
  }

  return out;
};

export const valutaOnboarding = (r: Risposte): EsitoOnboarding => {
  const risposte = r || {};
  const compilati = CAMPI_TUTTI.filter((c) => !vuoto(risposte[c.id])).length;

  const sezioniIncomplete = SEZIONI
    .filter((s) => s.campi.some((c) => vuoto(risposte[c.id])))
    .map((s) => s.titolo);

  const attenzioni = trovaAttenzioni(risposte);

  return {
    version: ONBOARDING_SCORING_VERSION,
    compilati,
    totali: CAMPI_TUTTI.length,
    sezioniIncomplete,
    attenzioni,
    haControindicazioni: attenzioni.some(
      (a) => a.campo === 'infortuni' || a.campo === 'terapie'
    ),
    obiettivi: comeArray(risposte.obiettivi),
    orizzonte: typeof risposte.orizzonte === 'string' ? risposte.orizzonte : null,
    stress: typeof risposte.stress === 'number' ? risposte.stress : null,
  };
};

/** Quanti passi operativi sono stati spuntati. */
export const avanzamentoChecklist = (fatti: string[]): { fatti: number; totali: number } => ({
  fatti: CHECKLIST.filter((p) => fatti.includes(p.id)).length,
  totali: CHECKLIST.length,
});

/**
 * Ciò che va sul gemello: SOLO sintesi.
 * Nessun testo libero, nessun dettaglio clinico, nessun dato
 * anagrafico. Il gemello sa che la persona è entrata, cosa cerca
 * e se ci sono limiti — non conosce le sue cartelle.
 */
export const sintesiPerTwin = (e: EsitoOnboarding) => ({
  onboarding_version: e.version,
  obiettivi: e.obiettivi,
  orizzonte: e.orizzonte,
  stress_iniziale: e.stress,
  ha_controindicazioni: e.haControindicazioni,
  attenzioni: e.attenzioni.length,
  completezza_pct: Math.round((e.compilati / e.totali) * 100),
});
