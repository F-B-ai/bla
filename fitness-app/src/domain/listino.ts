// ============================================================
// IL LISTINO, E CHI PRENDE CHE COSA
// ------------------------------------------------------------
// Deciso il 23 settembre 2026, dopo il colloquio con il
// collaboratore. Prima di oggi il prezzo di una seduta era un campo
// libero: chiunque poteva scriverci qualsiasi cifra, e nessuno
// sapeva quale fosse quella giusta senza chiederlo al titolare.
//
// IL LISTINO HA DUE ASSI, non uno: quanto si impegna l'allievo, e
// chi conduce la seduta. Sono due cose diverse e vanno tenute
// separate, altrimenti la casella che nasce dal loro incrocio resta
// vuota — ed è esattamente quello che era successo.
//
//                    | con un collaboratore | con il titolare
//   -----------------+----------------------+-----------------
//   annuale          |        30 €          |   non esiste
//   non annuale      |        35 €          |      40 €
//
// PERCHÉ «CON IL TITOLARE L'ANNUALE NON ESISTE». Il titolare conduce
// un numero chiuso di sedute a settimana. Con la capacità satura,
// ogni posto occupato è un posto tolto a qualcun altro: non può
// valere il prezzo più basso del listino. Chi vuole l'annuale va su
// un collaboratore — che ha capacità e a cui serve riempirla.
//
// LA SOSTITUZIONE. Se una seduta era prevista con il titolare e la
// conduce un collaboratore, si paga 35, non 40. I cinque euro in più
// sono per la persona del titolare: se quella persona non c'è, non
// si pagano. Vale verso l'allievo e vale verso il collaboratore, che
// su quella seduta prende la quota dei 35.
// ============================================================

export const LISTINO_VERSION = 1;

/** Chi conduce materialmente la seduta. */
export type Conduttore = 'titolare' | 'collaboratore';

export const PREZZO_ANNUALE = 30;
export const PREZZO_SINGOLO = 35;
export const PREZZO_TITOLARE = 40;

/**
 * La percentuale del collaboratore.
 *
 * Il sessanta per cento era previsto per tre mesi, fino a dicembre
 * 2025: è stato mantenuto per dodici. Dal 1° ottobre 2026 si torna
 * all'accordo di sempre. La data sta scritta qui e in un posto solo,
 * perché una percentuale ricordata a voce diventa due percentuali
 * diverse nella testa di due persone.
 */
export const QUOTA_PIENA = 0.6;
export const QUOTA_ACCORDO = 0.5;
export const DAL_GIORNO_ACCORDO = '2026-10-01';

/**
 * Da quanti giorni in su un percorso è «annuale».
 *
 * Non c'è un contrassegno sui piani e non lo si aggiunge: si legge
 * dalla durata, che è un dato che c'è già su ogni percorso esistente.
 * Trecento giorni e non trecentosessantacinque perché un anno vero
 * comincia col primo appuntamento utile e finisce quando finisce:
 * chiedere la precisione del calendario qui vorrebbe dire non
 * riconoscere come annuale nessun percorso reale.
 */
export const GIORNI_ANNUALE = 300;

const GIORNO_MS = 24 * 60 * 60 * 1000;

/** Un percorso è annuale? Si guarda quanto dura, non come si chiama. */
export const eAnnuale = (p?: { inizio?: Date | null; fine?: Date | null } | null): boolean => {
  if (!p || !p.inizio || !p.fine) return false;
  const giorni = (p.fine.getTime() - p.inizio.getTime()) / GIORNO_MS;
  return giorni >= GIORNI_ANNUALE;
};

export interface Seduta {
  /** chi la conduce davvero */
  conduce: Conduttore;
  /** l'allievo è su un percorso annuale */
  annuale?: boolean;
  /**
   * con chi era prevista, se diverso da chi conduce.
   * Serve solo alla sostituzione: previsto col titolare, condotta da
   * un collaboratore.
   */
  previsto?: Conduttore;
}

export interface Tariffa {
  /** quanto paga l'allievo per questa seduta */
  prezzo: number;
  /** perché, in parole da mostrare a chi sta compilando */
  perche: string;
  /** è una seduta del titolare fatta da un altro */
  sostituzione: boolean;
}

/**
 * Quanto costa questa seduta.
 *
 * Il risultato è una PROPOSTA: il campo resta modificabile, perché
 * esisteranno sempre il caso particolare e l'accordo preso a voce
 * con una persona. Ma la proposta giusta evita che il caso
 * particolare diventi la norma per distrazione.
 */
export const tariffaDi = (s: Seduta): Tariffa => {
  const sostituzione = s.previsto === 'titolare' && s.conduce === 'collaboratore';

  if (sostituzione) {
    return {
      prezzo: PREZZO_SINGOLO,
      perche: 'Seduta prevista con il titolare e condotta da un collaboratore: '
        + 'si pagano ' + PREZZO_SINGOLO + ' €, non ' + PREZZO_TITOLARE + '. '
        + 'La differenza è per la persona del titolare, e oggi non c\'è.',
      sostituzione: true,
    };
  }

  if (s.conduce === 'titolare') {
    return {
      prezzo: PREZZO_TITOLARE,
      perche: 'Seduta condotta dal titolare: un livello solo, ' + PREZZO_TITOLARE + ' €. '
        + 'I posti sono contati, e l\'annuale qui non si applica.',
      sostituzione: false,
    };
  }

  if (s.annuale) {
    return {
      prezzo: PREZZO_ANNUALE,
      perche: 'Percorso annuale: ' + PREZZO_ANNUALE + ' € a seduta.',
      sostituzione: false,
    };
  }

  return {
    prezzo: PREZZO_SINGOLO,
    perche: 'Tariffa ordinaria: ' + PREZZO_SINGOLO + ' € a seduta.',
    sostituzione: false,
  };
};

/**
 * Con il titolare l'annuale non esiste.
 *
 * Non è un divieto da far comparire come errore: è una cosa da dire
 * mentre si compila, prima che qualcuno prometta all'allievo un
 * prezzo che non c'è.
 */
export const avvisoAnnualeColTitolare = (s: Seduta): string | null =>
  s.conduce === 'titolare' && s.annuale
    ? 'Questo allievo è su un percorso annuale, ma con il titolare la tariffa '
      + 'annuale non si applica: i posti sono contati. Restano '
      + PREZZO_TITOLARE + ' €. Se l\'accordo è diverso, correggi il costo a mano.'
    : null;

/** La percentuale valida in una certa data. */
export const quotaDelGiorno = (quando: Date): number =>
  quando >= new Date(DAL_GIORNO_ACCORDO) ? QUOTA_ACCORDO : QUOTA_PIENA;

/**
 * Quanto va al collaboratore per questa seduta.
 *
 * Si calcola sul prezzo di LISTINO della seduta, non su quello che
 * l'allievo ha pagato: una sostituzione su una seduta del titolare
 * vale 35, anche se in cassa erano entrati 40 al momento dell'acquisto.
 */
export const quotaCollaboratore = (s: Seduta, quando: Date): number => {
  if (s.conduce !== 'collaboratore') return 0;
  const t = tariffaDi(s);
  return Math.round(t.prezzo * quotaDelGiorno(quando) * 100) / 100;
};

// ------------------------------------------------------------
// I POSTI DEL TITOLARE
// ------------------------------------------------------------
//
// Un numero chiuso di sedute a settimana. Si comincia da dieci e si
// sale quando si decide di salire — il numero è modificabile apposta,
// perché un tetto scolpito nel codice o si ignora o si subisce.
//
// Questo non è un tutore: è un contatore. Il carico lo decide chi si
// allena; deve solo poterlo leggere.

export const TETTO_INIZIALE = 10;
export const TETTO_ORIZZONTE = 18;

export type LivelloTetto = 'sotto' | 'vicino' | 'pieno' | 'oltre';

export interface StatoTetto {
  fatte: number;
  tetto: number;
  restano: number;
  livello: LivelloTetto;
  frase: string;
}

/** A che punto è la settimana. */
export const statoTetto = (fatte: number, tetto: number = TETTO_INIZIALE): StatoTetto => {
  const limite = tetto > 0 ? tetto : TETTO_INIZIALE;
  const restano = limite - fatte;

  let livello: LivelloTetto = 'sotto';
  if (fatte > limite) livello = 'oltre';
  else if (fatte === limite) livello = 'pieno';
  else if (restano <= 2) livello = 'vicino';

  const frase =
    livello === 'oltre'
      ? `${fatte} sedute su ${limite}: ${fatte - limite} oltre il tetto che ti sei dato.`
      : livello === 'pieno'
        ? `${fatte} su ${limite}: la settimana è piena.`
        : livello === 'vicino'
          ? `${fatte} su ${limite}: ne restano ${restano}.`
          : `${fatte} su ${limite} questa settimana.`;

  return { fatte, tetto: limite, restano, livello, frase };
};

/**
 * Il lunedì della settimana di una data.
 * La settimana comincia di lunedì: è come si guarda un'agenda, e
 * contare da domenica farebbe cadere il sabato nella settimana dopo.
 */
export const lunediDi = (d: Date): Date => {
  const g = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (g.getDay() + 6) % 7; // 0 = lunedì
  g.setDate(g.getDate() - dow);
  return g;
};

/** Sono nella stessa settimana? */
export const stessaSettimana = (a: Date, b: Date): boolean =>
  lunediDi(a).getTime() === lunediDi(b).getTime();
