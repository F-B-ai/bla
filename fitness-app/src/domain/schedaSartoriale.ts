// ============================================================
// LA SCHEDA SARTORIALE — ROM prescritto e criteri di stop
// ------------------------------------------------------------
// Dal modulo C-23/C-24 «Ipertrofia e scheda sartoriale», §5:
// la scheda ha nove livelli, e due non esistevano nel software.
//
//   livello 6 — programma: «per ogni esercizio: serie,
//               ripetizioni, RIR, recupero, ROM PRESCRITTO, note»
//   livello 8 — CRITERI DI STOP: «quando l'allievo deve
//               fermarsi e avvisare»
//
// Non sono due caselle di testo in più. Il ROM prescritto ha
// senso perché l'app MISURA già l'angolo al fondo: prescriverlo
// vuol dire poterlo confrontare, e un confronto è una verifica.
// I criteri di stop sono la traduzione operativa del perimetro —
// la stessa cosa che nel Livello 1 è criterio ELIMINATORIO
// d'esame. Insegnarli e poi non metterli sulla scheda sarebbe
// insegnare una cosa e consegnarne un'altra.
// ============================================================

/** Sopra questo angolo al fondo il movimento è parziale.
 *  Stessa soglia di SOGLIE.profonditaParziale in progressione.ts:
 *  se un giorno cambia, cambia in tutti e due i posti. */
export const ROM_PARZIALE_GRADI = 100;

export const SCHEDA_VERSION = 1;

// ------------------------------------------------------------
// 1. IL ROM PRESCRITTO
// ------------------------------------------------------------

export type TipoRom = 'completo' | 'gradi' | 'descritto';

export interface RomPrescritto {
  tipo: TipoRom;
  /** presente solo quando il coach ha scritto un angolo */
  gradi?: number;
  /** il testo come lo mostriamo, ripulito */
  testo: string;
}

/**
 * Legge ciò che il coach ha scritto nel campo ROM.
 * Accetta tre forme, perché sono le tre che un coach usa davvero:
 *   · «completo» / «full ROM»       → tipo 'completo'
 *   · «90», «90°», «fino a 90°»     → tipo 'gradi'
 *   · qualsiasi altra descrizione   → tipo 'descritto'
 * Restituisce null se non è stato prescritto niente: un campo
 * vuoto NON diventa «completo» per comodità — non prescritto e
 * prescritto completo sono due cose diverse.
 */
export const leggiRomPrescritto = (input?: string | null): RomPrescritto | null => {
  const testo = (input || '').trim().replace(/\s+/g, ' ');
  if (!testo) return null;

  const minuscolo = testo.toLowerCase();
  if (/^(rom )?(completo|totale|pieno|full( rom)?)$/.test(minuscolo)) {
    return { tipo: 'completo', testo: 'ROM completo' };
  }

  // primo numero da 1 a 179: è un angolo articolare plausibile
  const m = minuscolo.match(/(\d{1,3})\s*(?:°|gradi)?/);
  if (m) {
    const gradi = Number(m[1]);
    if (gradi >= 1 && gradi <= 179) return { tipo: 'gradi', gradi, testo };
  }

  return { tipo: 'descritto', testo };
};

export type EsitoRom = 'rispettato' | 'non_rispettato' | 'non_confrontabile';

export interface ConfrontoRom {
  esito: EsitoRom;
  /** frase pronta da mostrare al coach, coi numeri dentro */
  spiegazione: string;
}

/**
 * Confronta il ROM prescritto con l'angolo al fondo misurato
 * dall'analisi dello squat. Angolo PIÙ BASSO = più profondo.
 *
 * Si confronta solo quando entrambi sono numeri: con una
 * prescrizione a parole non si finge una verifica.
 */
export const confrontaRom = (
  prescritto: RomPrescritto | null,
  angoloMisurato?: number | null
): ConfrontoRom => {
  if (!prescritto) {
    return { esito: 'non_confrontabile', spiegazione: 'Nessun ROM prescritto per questo esercizio.' };
  }
  if (typeof angoloMisurato !== 'number' || !isFinite(angoloMisurato)) {
    return { esito: 'non_confrontabile', spiegazione: 'Nessun angolo misurato: il confronto non si può fare.' };
  }

  const soglia = prescritto.tipo === 'gradi' && typeof prescritto.gradi === 'number'
    ? prescritto.gradi
    : prescritto.tipo === 'completo'
      ? ROM_PARZIALE_GRADI
      : null;

  if (soglia === null) {
    return {
      esito: 'non_confrontabile',
      spiegazione: `ROM prescritto a parole («${prescritto.testo}»): si giudica con l'occhio, non col numero.`,
    };
  }

  const arrotonda = (n: number) => Math.round(n * 10) / 10;
  if (angoloMisurato <= soglia) {
    return {
      esito: 'rispettato',
      spiegazione: `Angolo al fondo ${arrotonda(angoloMisurato)}°, prescritto ${soglia}°: rispettato.`,
    };
  }
  return {
    esito: 'non_rispettato',
    spiegazione: `Angolo al fondo ${arrotonda(angoloMisurato)}°, prescritto ${soglia}°: `
      + `mancano ${arrotonda(angoloMisurato - soglia)}° di profondità.`,
  };
};

// ------------------------------------------------------------
// 2. I CRITERI DI STOP
// ------------------------------------------------------------
//
// Questi non sono suggerimenti: sono il perimetro scritto sulla
// scheda che l'allievo tiene in mano. Nessuna scheda esce senza.

export const CRITERI_STOP_BASE: readonly string[] = [
  'Dolore acuto durante un esercizio: fermati, non "provare a finire la serie".',
  'Dolore che si irradia lungo un arto, o formicolio: fermati e avvisami lo stesso giorno.',
  'Capogiro, nausea, vista offuscata, dolore al petto o affanno anomalo: interrompi la seduta.',
  'Dolore che compare la notte o che peggiora di giorno in giorno: non allenare quella zona e avvisami.',
  'Un movimento che ieri facevi e oggi non riesci più a fare: fermati e sentiamoci prima della prossima seduta.',
];

/**
 * I criteri di stop di una scheda: la base più quelli aggiunti
 * dal coach per quella persona.
 *
 * La base NON si può togliere. È l'unico modo perché la
 * traduzione operativa del perimetro non dipenda dalla fretta di
 * chi compila la scheda quel giorno.
 */
export const criteriDiStop = (aggiunti?: readonly string[] | null): string[] => {
  const extra = (aggiunti || [])
    .map((c) => (c || '').trim())
    .filter((c) => c.length > 0);
  const visti = new Set(CRITERI_STOP_BASE.map((c) => c.toLowerCase()));
  const unici: string[] = [];
  extra.forEach((c) => {
    const chiave = c.toLowerCase();
    if (!visti.has(chiave)) { visti.add(chiave); unici.push(c); }
  });
  return [...CRITERI_STOP_BASE, ...unici];
};

// ------------------------------------------------------------
// 3. LA SCHEDA È CONFORME AL METODO?
// ------------------------------------------------------------

export interface EsercizioDaControllare {
  name: string;
  romPrescritto?: string | null;
}

export interface SchedaDaControllare {
  esercizi: EsercizioDaControllare[];
  criteriDiStopAggiunti?: readonly string[] | null;
}

export interface Conformita {
  conforme: boolean;
  /** che cosa manca, in parole da mostrare al coach */
  mancanti: string[];
  /** esercizi senza ROM prescritto, per nome */
  senzaRom: string[];
}

/**
 * Il livello 6 chiede il ROM per OGNI esercizio. Una scheda in
 * cui metà esercizi ce l'hanno non è mezza conforme: è una scheda
 * che sembra prescrittiva e non lo è.
 *
 * I criteri di stop non compaiono fra i mancanti perché la base
 * c'è sempre — è garantita da criteriDiStop().
 */
export const controllaScheda = (scheda: SchedaDaControllare): Conformita => {
  const senzaRom = (scheda.esercizi || [])
    .filter((e) => !leggiRomPrescritto(e.romPrescritto))
    .map((e) => e.name);

  const mancanti: string[] = [];
  if (senzaRom.length > 0) {
    mancanti.push(
      senzaRom.length === 1
        ? `Manca il ROM prescritto per «${senzaRom[0]}».`
        : `Manca il ROM prescritto per ${senzaRom.length} esercizi.`
    );
  }

  return { conforme: mancanti.length === 0, mancanti, senzaRom };
};
