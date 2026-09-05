// ============================================================
// SCALARE UNA LEZIONE DAL PERCORSO
// ------------------------------------------------------------
// Il difetto che questo modulo chiude: la lezione si segnava
// «completata», il software cercava un piano ATTIVO OGGI, non lo
// trovava — perché il piano era stato creato dopo, o partiva
// domani — e non diceva niente. Nessun errore, nessun avviso:
// la lezione semplicemente non veniva scalata.
//
// Un fallimento silenzioso su una cosa che riguarda i soldi è
// il peggiore dei difetti: chi lavora si fida, e il conto salta.
//
// REGOLE FERREE
//  · Non si scala mai in silenzio, e non si FALLISCE mai in
//    silenzio: ogni esito ha una frase che il coach legge.
//  · Se non c'è un piano valido oggi, si guarda se ce n'è uno
//    con lezioni ancora disponibili: un piano fatto dopo la
//    lezione è normale, non è un errore.
//  · Mai due volte la stessa lezione: chi ha già scalato porta
//    il segno, e il secondo tocco non fa niente.
// ============================================================

export const PIANI_VERSION = 1;

export type TipoImpegnoPiano = 'lezione' | 'consulenza';

/** Il piano ridotto a ciò che conta per scalare. */
export interface PianoScalabile {
  id: string;
  inizio: Date;
  fine: Date;
  lezioniIncluse: number;
  lezioniUsate: number;
  consulenzeIncluse: number;
  consulenzeUsate: number;
  creatoIl?: Date;
}

export type EsitoScalo =
  | 'scalata'
  | 'gia_scalata'
  | 'nessun_piano'
  | 'piano_esaurito'
  | 'piano_senza_lezioni';

export interface Scelta {
  piano: PianoScalabile | null;
  esito: EsitoScalo;
  /** true quando il piano scelto non copre oggi ma ha ancora posti */
  fuoriPeriodo: boolean;
  /** la frase che legge il coach: dice sempre che cosa è successo */
  messaggio: string;
  /** quante ne restano dopo questa */
  restanti?: number;
}

const incluse = (p: PianoScalabile, t: TipoImpegnoPiano): number =>
  t === 'lezione' ? p.lezioniIncluse || 0 : p.consulenzeIncluse || 0;

const usate = (p: PianoScalabile, t: TipoImpegnoPiano): number =>
  t === 'lezione' ? p.lezioniUsate || 0 : p.consulenzeUsate || 0;

const haPosto = (p: PianoScalabile, t: TipoImpegnoPiano): boolean =>
  incluse(p, t) > 0 && usate(p, t) < incluse(p, t);

const copreOggi = (p: PianoScalabile, oggi: Date): boolean => {
  const i = p.inizio instanceof Date ? p.inizio.getTime() : NaN;
  const f = p.fine instanceof Date ? p.fine.getTime() : NaN;
  if (isNaN(i) || isNaN(f)) return false;
  const fineGiornata = new Date(
    p.fine.getFullYear(), p.fine.getMonth(), p.fine.getDate(), 23, 59, 59, 999
  ).getTime();
  return i <= oggi.getTime() && fineGiornata >= oggi.getTime();
};

const piuRecente = (a: PianoScalabile, b: PianoScalabile): number => {
  const ca = a.creatoIl?.getTime() ?? a.inizio?.getTime() ?? 0;
  const cb = b.creatoIl?.getTime() ?? b.inizio?.getTime() ?? 0;
  return cb - ca;
};

const parola = (t: TipoImpegnoPiano): string =>
  t === 'lezione' ? 'lezione' : 'consulenza';

/**
 * Quale piano paga questa lezione.
 *  1. Un piano che copre oggi e ha ancora posti.
 *  2. Altrimenti il più recente con posti, anche se il periodo non
 *     comprende oggi: un percorso creato DOPO la lezione è normale.
 *  3. Altrimenti si dice perché non si è potuto scalare.
 */
export const scegliPiano = (
  piani: PianoScalabile[],
  tipo: TipoImpegnoPiano,
  oggi: Date = new Date()
): Scelta => {
  const lista = (piani || []).filter(Boolean);

  if (!lista.length) {
    return {
      piano: null, esito: 'nessun_piano', fuoriPeriodo: false,
      messaggio: `Nessun percorso registrato per questa persona: la ${parola(tipo)} `
        + 'non è stata scalata. Creane uno e poi rimarca la seduta.',
    };
  }

  const attivi = lista.filter((p) => copreOggi(p, oggi));
  const attivoConPosto = attivi.filter((p) => haPosto(p, tipo)).sort(piuRecente)[0];
  if (attivoConPosto) {
    const restanti = incluse(attivoConPosto, tipo) - usate(attivoConPosto, tipo) - 1;
    return {
      piano: attivoConPosto, esito: 'scalata', fuoriPeriodo: false,
      restanti,
      messaggio: `Scalata dal percorso: ${usate(attivoConPosto, tipo) + 1} `
        + `di ${incluse(attivoConPosto, tipo)} ${tipo === 'lezione' ? 'lezioni' : 'consulenze'} usate, `
        + `ne ${restanti === 1 ? 'resta 1' : `restano ${restanti}`}.`,
    };
  }

  const fuoriConPosto = lista
    .filter((p) => !copreOggi(p, oggi) && haPosto(p, tipo))
    .sort(piuRecente)[0];
  if (fuoriConPosto) {
    const restanti = incluse(fuoriConPosto, tipo) - usate(fuoriConPosto, tipo) - 1;
    return {
      piano: fuoriConPosto, esito: 'scalata', fuoriPeriodo: true,
      restanti,
      messaggio: `Scalata dal percorso (il cui periodo non comprende oggi): `
        + `${usate(fuoriConPosto, tipo) + 1} di ${incluse(fuoriConPosto, tipo)} usate, `
        + `ne ${restanti === 1 ? 'resta 1' : `restano ${restanti}`}. `
        + 'Se le date del percorso sono sbagliate, correggile.',
    };
  }

  const conCapienza = lista.some((p) => incluse(p, tipo) > 0);
  if (!conCapienza) {
    return {
      piano: null, esito: 'piano_senza_lezioni', fuoriPeriodo: false,
      messaggio: `Il percorso di questa persona non prevede ${tipo === 'lezione' ? 'lezioni' : 'consulenze'} incluse: `
        + 'non c\'è niente da scalare.',
    };
  }

  return {
    piano: null, esito: 'piano_esaurito', fuoriPeriodo: false,
    messaggio: `Le ${tipo === 'lezione' ? 'lezioni' : 'consulenze'} incluse nel percorso sono finite: `
      + 'questa seduta è fuori pacchetto. Aggiorna il percorso o segnala il costo a parte.',
  };
};

/** Già scalata: il secondo tocco non deve togliere una seconda lezione. */
export const giaScalata = (marcata: boolean, tipo: TipoImpegnoPiano): Scelta | null =>
  marcata
    ? {
      piano: null, esito: 'gia_scalata', fuoriPeriodo: false,
      messaggio: `Questa seduta era già stata scalata dal percorso: `
        + `non tolgo una seconda ${parola(tipo)}.`,
    }
    : null;
