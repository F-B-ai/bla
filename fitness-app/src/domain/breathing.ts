// ============================================================
// RESPIRO — le pratiche e il motore delle fasi (dominio puro)
// ------------------------------------------------------------
// Il Metodo mette il respiro al centro. Fino a qui il sistema non
// lo registrava mai: `breathing.session_completed` era dichiarato
// nella tassonomia dal giorno di M3 e non l'ha mai scritto
// nessuno. Questo è l'atto che chiude quella contraddizione.
//
// PERIMETRO: pratica di respiro consapevole per il benessere.
// Non è una terapia, non tratta patologie, non sostituisce
// alcuna indicazione sanitaria. Chi ha problemi respiratori,
// cardiaci o è in gravidanza ne parla prima col proprio medico.
//
// Il motore è una funzione PURA del tempo trascorso: stesso
// istante → stessa fase. Testabile senza timer e senza schermo.
// ============================================================

export const BREATHING_VERSION = 1;

export type FaseKey = 'inspira' | 'trattieni' | 'espira' | 'pausa';

export interface Fase {
  key: FaseKey;
  /** durata in secondi */
  secondi: number;
}

export interface Pratica {
  id: string;
  nome: string;
  /** cosa fa, in una riga — linguaggio, non promesse cliniche */
  intento: string;
  /** il ciclo: si ripete fino alla fine della sessione */
  ciclo: Fase[];
  /** durate proposte, in minuti */
  durate: number[];
  durataDefault: number;
}

export const ETICHETTA_FASE: Record<FaseKey, string> = {
  inspira: 'Inspira',
  trattieni: 'Trattieni',
  espira: 'Espira',
  pausa: 'Pausa',
};

// ------------------------------------------------------------
// Le pratiche. Poche, ognuna con un intento diverso.
// ------------------------------------------------------------

export const PRATICHE: Pratica[] = [
  {
    id: 'coerenza',
    nome: 'Coerenza',
    intento: 'Un respiro regolare, uguale in entrata e in uscita. Il punto di partenza.',
    ciclo: [
      { key: 'inspira', secondi: 5 },
      { key: 'espira', secondi: 5 },
    ],
    durate: [1, 3, 5, 6, 10],
    durataDefault: 3,
  },
  {
    id: 'espirazione_lunga',
    nome: 'Espirazione lunga',
    intento: "L'uscita più lunga dell'entrata. Per quando il corpo è ancora acceso.",
    ciclo: [
      { key: 'inspira', secondi: 4 },
      { key: 'espira', secondi: 8 },
    ],
    durate: [1, 3, 5, 10],
    durataDefault: 3,
  },
  {
    id: 'calma',
    nome: 'Calma',
    intento: "L'uscita molto più lunga dell'entrata, con una sosta in mezzo. Per la sera.",
    ciclo: [
      { key: 'inspira', secondi: 4 },
      { key: 'trattieni', secondi: 7 },
      { key: 'espira', secondi: 8 },
    ],
    durate: [1, 3, 5],
    durataDefault: 3,
  },
  {
    id: 'quadrato',
    nome: 'Quadrato',
    intento: 'Quattro tempi uguali. Chiede attenzione: la testa smette di andare altrove.',
    ciclo: [
      { key: 'inspira', secondi: 4 },
      { key: 'trattieni', secondi: 4 },
      { key: 'espira', secondi: 4 },
      { key: 'pausa', secondi: 4 },
    ],
    durate: [1, 3, 5],
    durataDefault: 3,
  },
  {
    id: 'diaframmatico',
    nome: 'Diaframmatico',
    intento: 'Respiro basso, senza fretta. Quello che il diaframma fa quando lo lasci fare.',
    ciclo: [
      { key: 'inspira', secondi: 4 },
      { key: 'espira', secondi: 6 },
    ],
    durate: [1, 3, 5, 10],
    durataDefault: 3,
  },
];

export const PRATICA_BY_ID: Record<string, Pratica> = PRATICHE.reduce(
  (a, p) => { a[p.id] = p; return a; },
  {} as Record<string, Pratica>
);

// ------------------------------------------------------------
// Motore delle fasi: funzione pura del tempo trascorso
// ------------------------------------------------------------

export const durataCiclo = (p: Pratica): number =>
  p.ciclo.reduce((a, f) => a + f.secondi, 0);

export interface StatoRespiro {
  fase: Fase;
  etichetta: string;
  /** 0→1 dentro la fase corrente */
  avanzamentoFase: number;
  /** secondi che restano nella fase, arrotondati per eccesso (5,4,3…) */
  secondiRimanenti: number;
  /** quanti cicli completi sono stati fatti */
  cicliCompletati: number;
  /** 0→1 sull'intera sessione */
  avanzamentoSessione: number;
  finita: boolean;
}

/**
 * Dove sei, dopo `trascorsiSec` secondi di pratica.
 * Nessun timer interno: la schermata passa il tempo, il dominio
 * risponde. Così è verificabile senza far girare l'orologio.
 */
export const statoAl = (
  pratica: Pratica,
  trascorsiSec: number,
  durataMin: number
): StatoRespiro => {
  const totale = Math.max(1, durataMin * 60);
  const t = Math.max(0, trascorsiSec);
  const cicloSec = durataCiclo(pratica);
  const finita = t >= totale;

  const dentroCiclo = cicloSec > 0 ? t % cicloSec : 0;
  let acc = 0;
  let fase = pratica.ciclo[0];
  let inizioFase = 0;
  for (const f of pratica.ciclo) {
    if (dentroCiclo < acc + f.secondi) { fase = f; inizioFase = acc; break; }
    acc += f.secondi;
    fase = f;
    inizioFase = acc - f.secondi;
  }

  const dentroFase = dentroCiclo - inizioFase;
  return {
    fase,
    etichetta: ETICHETTA_FASE[fase.key],
    avanzamentoFase: fase.secondi > 0 ? Math.min(1, dentroFase / fase.secondi) : 1,
    secondiRimanenti: Math.max(1, Math.ceil(fase.secondi - dentroFase)),
    cicliCompletati: cicloSec > 0 ? Math.floor(t / cicloSec) : 0,
    avanzamentoSessione: Math.min(1, t / totale),
    finita,
  };
};

/** Respiri completi in una sessione: serve al riepilogo e all'evento. */
export const respiriTotali = (pratica: Pratica, durataMin: number): number =>
  Math.floor((durataMin * 60) / durataCiclo(pratica));
