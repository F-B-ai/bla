// ============================================================
// LO SCONTO FEDELTÀ
// ------------------------------------------------------------
// Due sconti, uguali per tutti, che il titolare decide quando e a chi
// applicare:
//
//     15%  a chi rinnova l'anno successivo
//     20%  ai clienti storici
//
// «UGUALE PER TUTTI» E «DECIDO IO» stanno insieme solo a una
// condizione: che il CRITERIO sia scritto. Altrimenti prima o poi due
// allievi si parlano, uno scopre che l'altro ha avuto il venti per
// cento e lui no, e alla domanda «perché lui sì?» l'unica risposta
// disponibile è «perché ho deciso così» — che è la risposta che fa
// perdere le persone.
//
// Con il criterio scritto la risposta esiste, ed è una frase sola:
// «lo sconto storico è per chi è qui da almeno due anni». Chi non lo
// ha, capisce perché. E resta la libertà che serve: il criterio dice
// chi PUÒ averlo, la decisione resta del titolare.
//
// NON SI SOMMANO. Chi rientra in tutte e due le condizioni prende la
// più alta, non il trentacinque per cento. Uno sconto che si somma da
// solo diventa un regalo che nessuno aveva deciso.
// ============================================================

export const SCONTI_VERSION = 1;

export type TipoSconto = 'nessuno' | 'fedele' | 'rinnovo' | 'storico';

export const SCONTO_FEDELE = 0.10;
export const SCONTO_RINNOVO = 0.15;
export const SCONTO_STORICO = 0.20;

/**
 * Il prezzo scontato si arrotonda PER ECCESSO a multipli di cinque.
 *
 * Deciso il 28 settembre 2026: «arrotondiamo a 30 piuttosto che 28».
 * Trenta è un prezzo, ventotto è il risultato di un conto — e si
 * vede. Un listino fatto di numeri tondi si dice a voce senza
 * guardare il foglio, e non fa sembrare lo sconto una trattativa.
 */
export const PASSO_ARROTONDAMENTO = 5;

/**
 * Entro quanti giorni dalla fine del percorso precedente un rinnovo
 * è ancora un rinnovo. Dopo, è una persona che torna — benvenuta, ma
 * il percorso ricomincia da capo e il prezzo è quello pieno.
 */
export const GIORNI_PER_RINNOVO = 30;

/** Da quanti anni di frequenza si è «storici». */
export const ANNI_PER_STORICO = 2;

/** Dopo quanti anni comincia lo sconto fedeltà di base. */
export const ANNI_PER_FEDELE = 1;

/**
 * Arrotonda per eccesso al passo dato.
 *
 * `Math.ceil` sui centesimi prima della divisione: senza, un 29,999
 * nato da una moltiplicazione in virgola mobile resterebbe 30 invece
 * di salire, e il conto tornerebbe giusto per caso.
 */
export const perEccesso = (n: number, passo: number = PASSO_ARROTONDAMENTO): number => {
  const p = passo > 0 ? passo : 1;
  return Math.ceil((Math.round(n * 100) / 100) / p) * p;
};

export interface RegolaSconto {
  tipo: TipoSconto;
  percentuale: number;
  etichetta: string;
  /** chi può averlo: la frase che si dice a chi chiede perché */
  criterio: string;
}

// In ordine dal più alto al più basso: chi rientra in più condizioni
// prende la prima che trova, non la somma.
export const REGOLE_SCONTO: RegolaSconto[] = [
  {
    tipo: 'storico',
    percentuale: SCONTO_STORICO,
    etichetta: 'Sconto cliente storico',
    criterio: `Riservato a chi frequenta lo studio da almeno ${ANNI_PER_STORICO} anni.`,
  },
  {
    tipo: 'rinnovo',
    percentuale: SCONTO_RINNOVO,
    etichetta: 'Sconto rinnovo',
    criterio: `Riservato a chi rinnova entro ${GIORNI_PER_RINNOVO} giorni dalla fine `
      + 'del percorso precedente.',
  },
  {
    tipo: 'fedele',
    percentuale: SCONTO_FEDELE,
    etichetta: 'Sconto fedeltà',
    criterio: `Riservato a chi frequenta lo studio da più di ${ANNI_PER_FEDELE} anno.`,
  },
];

export const regolaDi = (tipo: TipoSconto): RegolaSconto | null =>
  REGOLE_SCONTO.find((r) => r.tipo === tipo) || null;

/**
 * Quale sconto spetta, dati i fatti.
 *
 * Non decide se applicarlo — dice soltanto a quale la persona ha
 * diritto. La decisione resta del titolare, ed è giusto così: questa
 * funzione serve a impedire che due persone nella stessa situazione
 * ricevano due risposte diverse, non a togliergli la mano.
 */
export const scontoSpettante = (f: {
  anniDiFrequenza?: number | null;
  giorniDallaFinePrecedente?: number | null;
}): TipoSconto => {
  const anni = typeof f.anniDiFrequenza === 'number' ? f.anniDiFrequenza : 0;
  if (anni >= ANNI_PER_STORICO) return 'storico';
  const g = f.giorniDallaFinePrecedente;
  if (typeof g === 'number' && g >= 0 && g <= GIORNI_PER_RINNOVO) return 'rinnovo';
  if (anni >= ANNI_PER_FEDELE) return 'fedele';
  return 'nessuno';
};

const arrotonda2 = (n: number): number => Math.round(n * 100) / 100;

export interface Conto {
  /** il prezzo di listino, prima dello sconto */
  pieno: number;
  tipo: TipoSconto;
  percentuale: number;
  /** quanto si toglie, in euro */
  sconto: number;
  /** quanto paga l'allievo */
  dovuto: number;
  /** la riga da stampare sul preventivo, o stringa vuota */
  riga: string;
}

/**
 * Il conto con lo sconto applicato.
 *
 * Lo sconto si applica al TOTALE del preventivo, non alle singole
 * voci: una riga sola che si legge, invece di sei importi strani che
 * nessuno sa ricostruire.
 */
export const applicaSconto = (pieno: number, tipo: TipoSconto = 'nessuno'): Conto => {
  const base = arrotonda2(Math.max(0, pieno || 0));
  const r = regolaDi(tipo);

  if (!r || base === 0) {
    return { pieno: base, tipo: 'nessuno', percentuale: 0, sconto: 0, dovuto: base, riga: '' };
  }

  // Il conto esatto, poi l'arrotondamento per eccesso a multipli di
  // cinque: 35 meno il 20% fa 28, e si paga 30.
  const esatto = arrotonda2(base - base * r.percentuale);
  let dovuto = perEccesso(esatto);

  // LA GUARDIA CHE SERVE DAVVERO. Su importi piccoli l'arrotondamento
  // per eccesso può riportare al prezzo pieno — 35 meno il 10% fa
  // 31,50, che arrotondato per eccesso torna 35: uno sconto che non
  // sconta niente, e un allievo che si sente preso in giro.
  //
  // Quando succede si scende al multiplo sotto (30). Non è una
  // deroga alla regola: è la regola che dice che uno sconto deve
  // restare uno sconto, altrimenti non andava promesso.
  if (dovuto >= base) {
    dovuto = Math.max(0, perEccesso(esatto) - PASSO_ARROTONDAMENTO);
  }

  const sconto = arrotonda2(base - dovuto);
  const effettiva = base > 0 ? sconto / base : 0;
  return {
    pieno: base,
    tipo,
    percentuale: r.percentuale,
    sconto,
    dovuto,
    riga: `${r.etichetta} −${Math.round(effettiva * 100)}% · −${sconto.toFixed(2)} €`,
  };
};

/**
 * Le rate dopo lo sconto.
 *
 * Si divide il dovuto, non il pieno: sembra ovvio e non lo è — è
 * l'errore che fa arrivare un allievo a fine percorso avendo pagato
 * il prezzo intero a rate, con lo sconto scritto sul foglio e mai
 * tolto da nessuna parte.
 */
export const rateScontate = (c: Conto, rate: number): number => {
  const n = Math.max(1, Math.round(rate || 1));
  return arrotonda2(c.dovuto / n);
};

/**
 * La frase da mettere sul preventivo quando uno sconto c'è.
 * Dice la percentuale, il criterio e che è una decisione — non un
 * diritto automatico che si può pretendere l'anno dopo.
 */
export const spiegaSconto = (c: Conto): string => {
  const r = regolaDi(c.tipo);
  if (!r || c.sconto === 0) return '';
  return `${r.criterio} Applicato dalla direzione tecnica su questo preventivo: `
    + 'non è automatico e non si somma ad altre riduzioni.';
};
