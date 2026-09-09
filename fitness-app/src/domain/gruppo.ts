// ============================================================
// IL PERSONAL DI GRUPPO — due conti diversi, mai lo stesso numero
// ------------------------------------------------------------
// Da due a cinque persone che si allenano insieme, ognuna con la
// sua quota. Sembra una riga sola e invece sono due, e confonderle
// è il modo più rapido di perdere soldi senza accorgersene:
//
//   · QUANTO INCASSA LO STUDIO da quella seduta
//     = persone × quota.  Serve al titolare.
//
//   · QUANTO PAGA QUELL'ALLIEVO
//     = la quota, e basta.  Serve al programma economico.
//
// Se nel programma di una persona finisce l'incasso del gruppo, le
// stai chiedendo di pagare anche per gli altri. Se nel conto dello
// studio finisce la quota singola, stai contando un quinto di
// quello che hai preso. Qui le due cose non si toccano mai.
// ============================================================

export const GRUPPO_VERSION = 1;

/** Sotto due non è un gruppo: è una seduta individuale. */
export const MIN_PERSONE = 2;

/** Sopra cinque non è personal: è un corso, e si organizza diverso. */
export const MAX_PERSONE = 5;

export interface SedutaGruppo {
  /** quante persone si allenano insieme, da 2 a 5 */
  persone: number;
  /** quanto paga ciascuna, a seduta */
  quotaPersona: number;
}

export interface EsitoGruppo {
  valido: boolean;
  problemi: string[];
}

/**
 * Un gruppo è valido quando il numero sta nei limiti e la quota è un
 * importo vero. I messaggi dicono che cosa fare, non solo che c'è un
 * errore: chi compila lo legge mentre ha una persona davanti.
 */
export const controllaGruppo = (s: SedutaGruppo): EsitoGruppo => {
  const problemi: string[] = [];
  const n = s?.persone;
  const q = s?.quotaPersona;

  if (!Number.isInteger(n)) {
    problemi.push('Il numero di persone dev\'essere un numero intero.');
  } else if (n < MIN_PERSONE) {
    problemi.push(
      `Con ${n === 1 ? 'una persona sola' : 'meno di due persone'} non è un gruppo: `
      + 'è una seduta individuale, e si registra come tale.'
    );
  } else if (n > MAX_PERSONE) {
    problemi.push(
      `Oltre ${MAX_PERSONE} persone non è più personal di gruppo: è un corso, `
      + 'e va organizzato diversamente.'
    );
  }

  if (typeof q !== 'number' || !isFinite(q) || q <= 0) {
    problemi.push('Manca la quota a persona.');
  }

  return { valido: problemi.length === 0, problemi };
};

const arrotonda2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Quanto entra in cassa da questa seduta. È il numero del titolare:
 * non va mai messo nel programma di un singolo allievo.
 */
export const incassoSeduta = (s: SedutaGruppo): number =>
  controllaGruppo(s).valido ? arrotonda2(s.persone * s.quotaPersona) : 0;

/**
 * Quanto costa la seduta a UNA persona del gruppo. È il numero che
 * va nel programma economico: la quota, non il totale.
 */
export const costoPerAllievo = (s: SedutaGruppo): number =>
  controllaGruppo(s).valido ? arrotonda2(s.quotaPersona) : 0;

// ------------------------------------------------------------
// Conviene farlo?
// ------------------------------------------------------------
//
// Un'ora è un'ora: quella stessa ora poteva essere una seduta
// individuale. Il gruppo ha senso solo se l'ora rende almeno quanto
// renderebbe da sola — altrimenti stai lavorando di più per meno,
// e non te ne accorgi finché non guardi il mese.

export type Convenienza = 'conviene' | 'pari' | 'non_conviene';

export interface ConfrontoOra {
  esito: Convenienza;
  incassoGruppo: number;
  incassoIndividuale: number;
  differenza: number;
  /** frase pronta da mostrare a chi sta decidendo il prezzo */
  spiegazione: string;
}

/**
 * Confronta l'ora di gruppo con l'ora individuale dello stesso
 * conduttore. Non impedisce niente: dice il numero prima che sia
 * troppo tardi per cambiarlo.
 */
export const confrontaConIndividuale = (
  s: SedutaGruppo,
  prezzoIndividuale: number
): ConfrontoOra => {
  const g = incassoSeduta(s);
  const i = arrotonda2(prezzoIndividuale > 0 ? prezzoIndividuale : 0);
  const d = arrotonda2(g - i);

  if (!controllaGruppo(s).valido || i === 0) {
    return {
      esito: 'non_conviene',
      incassoGruppo: g,
      incassoIndividuale: i,
      differenza: d,
      spiegazione: 'Manca un dato: il confronto non si può fare.',
    };
  }

  if (d > 0) {
    return {
      esito: 'conviene', incassoGruppo: g, incassoIndividuale: i, differenza: d,
      spiegazione: `${s.persone} persone × ${s.quotaPersona} € = ${g} € l'ora, `
        + `contro ${i} € di una seduta individuale: ${d} € in più.`,
    };
  }
  if (d === 0) {
    return {
      esito: 'pari', incassoGruppo: g, incassoIndividuale: i, differenza: 0,
      spiegazione: `${g} € l'ora, esattamente come una seduta individuale. `
        + 'Stessa ora, più persone da seguire: valutala tu.',
    };
  }
  return {
    esito: 'non_conviene', incassoGruppo: g, incassoIndividuale: i, differenza: d,
    spiegazione: `${s.persone} persone × ${s.quotaPersona} € = ${g} € l'ora, `
      + `contro ${i} € di una seduta individuale: ${Math.abs(d)} € in meno. `
      + `Perché regga, la quota dovrebbe partire da ${quotaMinima(s.persone, i)} €.`,
  };
};

/** La quota sotto la quale l'ora di gruppo rende meno di una individuale. */
export const quotaMinima = (persone: number, prezzoIndividuale: number): number => {
  if (!Number.isInteger(persone) || persone < MIN_PERSONE) return 0;
  return Math.ceil(prezzoIndividuale / persone);
};

// ------------------------------------------------------------
// Come si scrive in agenda e sulla scheda
// ------------------------------------------------------------

/** «Gruppo di 3 · 25 € a persona · 75 € la seduta» */
export const etichettaGruppo = (s: SedutaGruppo): string => {
  if (!controllaGruppo(s).valido) return 'Gruppo da completare';
  return `Gruppo di ${s.persone} · ${s.quotaPersona} € a persona `
    + `· ${incassoSeduta(s)} € la seduta`;
};

/** Le opzioni del selettore: 2, 3, 4, 5. In un posto solo. */
export const PERSONE_POSSIBILI: number[] = Array.from(
  { length: MAX_PERSONE - MIN_PERSONE + 1 },
  (_, i) => MIN_PERSONE + i
);
