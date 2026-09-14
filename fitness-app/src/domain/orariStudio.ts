// ============================================================
// GLI ORARI DELLO STUDIO — e gli spazi liberi
// ------------------------------------------------------------
// Il titolare, il 14 settembre 2026:
//
//   «Devi fare in modo che Grok Bot possa avere anche la lettura del
//    calendario, ma non scrivere: sono io a confermare la scrittura.
//    Devono aiutarmi a vedere gli spazi liberi secondo la nostra
//    regola, secondo quella che è la giornata — quindi appuntamento
//    al massimo 17:30 a partire dalle nove, in casi eccezionali fino
//    alle 19:30. Ma loro devono leggere il calendario e farmi una
//    proposta di inserimento che io posso confermare oppure no.»
//
// Due cose, e la seconda è la più importante:
//
//  1. La giornata ha una forma: si comincia alle 9, l'ultimo
//     appuntamento si FISSA alle 17:30. Oltre si va solo per
//     eccezione, e mai dopo le 19:30.
//
//  2. Chi legge NON prenota. Propone. La differenza fra «il bot
//     vede gli spazi» e «il bot riempie l'agenda» è tutta qui, e
//     questo file sta dalla parte giusta: calcola e basta, non
//     scrive niente da nessuna parte.
//
// ------------------------------------------------------------
// PERCHÉ L'ORA È L'ORA DI INIZIO
// ------------------------------------------------------------
// «Appuntamento al massimo alle 17:30» vuol dire che alle 17:30 si
// COMINCIA: una seduta di un'ora finisce alle 18:30, ed è giusto
// così. Contarlo come orario di fine vorrebbe dire che l'ultimo
// appuntamento si fissa alle 16:30, che non è quello che è stato
// detto.
// ============================================================

export const ORARI_STUDIO_VERSION = 1;

/** Prima ora in cui si può cominciare. */
export const APERTURA = '09:00';
/** Ultima ora in cui si può COMINCIARE, in una giornata normale. */
export const ULTIMO_INIZIO = '17:30';
/** Ultima ora in cui si può cominciare, per eccezione. */
export const ULTIMO_INIZIO_ECCEZIONE = '19:30';
/** La griglia: gli appuntamenti stanno sulle mezz'ore. */
export const PASSO_MINUTI = 30;
/** Quanto dura una seduta, se non si dice altro. */
export const DURATA_STANDARD = 60;

// ------------------------------------------------------------
// Ore e minuti
// ------------------------------------------------------------

/** '09:30' → 570. NaN se non è un'ora. */
export const inMinuti = (ora: string): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((ora || '').trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return NaN;
  return h * 60 + min;
};

/** 570 → '09:30'. */
export const inOra = (minuti: number): string => {
  const m = Math.max(0, Math.round(minuti));
  const h = Math.floor(m / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// ------------------------------------------------------------
// Gli spazi liberi
// ------------------------------------------------------------

export interface Impegno {
  /** 'HH:MM' */
  inizio: string;
  /** 'HH:MM' */
  fine: string;
}

export interface Slot {
  inizio: string;
  fine: string;
  /** true quando sta oltre le 17:30: è un'eccezione, e si vede */
  eccezione: boolean;
}

export interface RichiestaSlot {
  impegni: Impegno[];
  /** quanto deve durare, in minuti */
  durata?: number;
  /** true per guardare anche oltre le 17:30 */
  conEccezioni?: boolean;
  /** se il giorno è oggi, non si propongono ore già passate */
  daDopo?: string;
}

const sovrappone = (a: Impegno, ini: number, fin: number): boolean => {
  const ai = inMinuti(a.inizio);
  const af = inMinuti(a.fine);
  // Un impegno con orari illeggibili si tratta come occupato per
  // tutta la giornata: meglio proporre meno che proporre sopra
  // qualcuno di cui non si sa niente.
  if (isNaN(ai) || isNaN(af) || af <= ai) return true;
  return ini < af && ai < fin;
};

/**
 * Gli spazi in cui ci starebbe una seduta, quel giorno.
 *
 * Non guarda chi siano gli impegni né di chi: prende gli orari
 * occupati e restituisce quelli liberi. Non scrive niente.
 */
export const slotLiberi = (r: RichiestaSlot): Slot[] => {
  const durata = r.durata && r.durata > 0 ? r.durata : DURATA_STANDARD;
  const primo = inMinuti(APERTURA);
  const ultimoNormale = inMinuti(ULTIMO_INIZIO);
  const ultimo = r.conEccezioni ? inMinuti(ULTIMO_INIZIO_ECCEZIONE) : ultimoNormale;
  const dopo = r.daDopo ? inMinuti(r.daDopo) : NaN;
  const impegni = (r.impegni || []).filter(Boolean);

  const liberi: Slot[] = [];
  for (let ini = primo; ini <= ultimo; ini += PASSO_MINUTI) {
    if (!isNaN(dopo) && ini < dopo) continue;
    const fin = ini + durata;
    if (impegni.some((i) => sovrappone(i, ini, fin))) continue;
    liberi.push({
      inizio: inOra(ini),
      fine: inOra(fin),
      eccezione: ini > ultimoNormale,
    });
  }
  return liberi;
};

// ------------------------------------------------------------
// Come si racconta al bot (e al titolare)
// ------------------------------------------------------------

/** La regola in una riga, da mettere in cima a ogni risposta. */
export const regolaDellaGiornata = (): string =>
  `Si comincia alle ${APERTURA}; l'ultimo appuntamento si fissa alle `
  + `${ULTIMO_INIZIO}. Oltre è un'eccezione, e mai dopo le `
  + `${ULTIMO_INIZIO_ECCEZIONE}.`;

/**
 * Il riassunto degli spazi liberi.
 *
 * Le eccezioni si elencano a parte e si chiamano eccezioni: se
 * finissero mescolate alle altre, il bot proporrebbe le 19:00 come
 * se fosse un orario qualunque.
 */
export const descriviSlot = (slot: Slot[], giorno?: string): string => {
  const normali = slot.filter((s) => !s.eccezione);
  const eccezionali = slot.filter((s) => s.eccezione);
  const quando = giorno ? ` per ${giorno}` : '';

  if (!slot.length) {
    return `Nessuno spazio libero${quando}. ${regolaDellaGiornata()}`;
  }

  const righe = [
    normali.length
      ? `Liberi${quando}: ${normali.map((s) => s.inizio).join(', ')}.`
      : `Nessuno spazio libero${quando} nell'orario normale.`,
  ];
  if (eccezionali.length) {
    righe.push(
      'Solo per eccezione, da concordare: '
      + `${eccezionali.map((s) => s.inizio).join(', ')}.`
    );
  }
  return righe.join('\n');
};

/**
 * Che cosa il bot NON deve fare, scritto dove lo legge.
 *
 * Vive qui e non in un commento perché finisce dentro la risposta
 * della Function: chi la legge — persona o modello — deve trovarci
 * il limite insieme ai dati, non da un'altra parte.
 */
export const AVVISO_SOLA_LETTURA =
  'Questi sono spazi liberi, non prenotazioni. Nessun appuntamento è '
  + 'stato creato. Proponi l\'orario al titolare: l\'agenda cambia solo '
  + 'quando lo conferma lui nell\'App.';
