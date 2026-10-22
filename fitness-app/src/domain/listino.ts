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

// ------------------------------------------------------------
// IL PERSONAL DI GRUPPO
// ------------------------------------------------------------
//
// Deciso l'8 ottobre 2026. Fino a oggi la quota del gruppo era un
// campo libero: si scriveva a mano, una persona alla volta, e due
// coppie uguali potevano pagare due cifre diverse senza che nessuno
// se ne accorgesse. Adesso il numero viene dal listino.
//
//   due persone      20 € a testa   →  40 € la seduta
//   tre persone      15 € a testa   →  45 € la seduta
//   quattro persone  11,50 € a testa →  46 € la seduta
//
// LA COSA DA GUARDARE NON È LA QUOTA, È L'ULTIMA COLONNA. La quota
// scende — a testa si paga quasi la metà in quattro che in due — e
// l'incasso dell'ora sale. È il senso del gruppo: all'allievo costa
// meno, allo studio rende più di una seduta individuale (40 €), e
// nessuno dei due ci rimette. Chi guarda solo la quota pensa di
// svendere; chi guarda l'ora vede che non è così.
//
// CINQUE PERSONE non ha un prezzo. Il selettore arriva a cinque
// perché oltre non è più personal, ma il listino si fermava a
// quattro: la quinta quota non si inventa, si chiede. Finché non
// c'è, con cinque persone il campo resta libero e lo dice.

/** La quota a persona, per numero di partecipanti. In un posto solo. */
export const QUOTE_GRUPPO: Record<number, number> = {
  2: 20,
  3: 15,
  4: 11.5,
};

/**
 * Quanto paga ciascuno in un gruppo di tante persone.
 *
 * Torna `null` quando il listino non lo dice — e `null` non è un
 * errore: è l'unica risposta onesta per un numero che il titolare non
 * ha ancora deciso. Chi la riceve lascia il campo libero, non mette
 * uno zero.
 */
export const quotaGruppoDi = (persone: number): number | null => {
  const q = QUOTE_GRUPPO[persone];
  return typeof q === 'number' ? q : null;
};

/** Quanto rende l'ora con tante persone, a prezzo di listino. */
export const incassoGruppoDi = (persone: number): number | null => {
  const q = quotaGruppoDi(persone);
  return q === null ? null : Math.round(persone * q * 100) / 100;
};

/** «11,50», non «11.5»: i prezzi si scrivono come si leggono. */
export const euroIt = (n: number): string =>
  (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '').replace('.', ',');

/**
 * Questa cifra viene dal listino, o l'ha scritta qualcuno a mano?
 *
 * Serve a una cosa sola: una quota scritta a mano non si sovrascrive
 * mai con la proposta. Chi ha digitato un numero aveva un motivo, e
 * quel motivo vale più del listino.
 */
export const eQuotaDiListino = (valore: string): boolean => {
  const n = parseFloat(String(valore || '').replace(',', '.'));
  if (!Number.isFinite(n)) return false;
  return Object.values(QUOTE_GRUPPO).some((q) => Math.abs(q - n) < 0.005);
};

/** La riga del listino per un gruppo, già pronta da mostrare. */
export const rigaGruppo = (persone: number): string => {
  const q = quotaGruppoDi(persone);
  if (q === null) {
    return `In ${persone} il listino non ha una quota: la decidi tu.`;
  }
  return `In ${persone}: ${euroIt(q)} € a persona · ${euroIt(persone * q)} € la seduta.`;
};

// ------------------------------------------------------------
// L'AFFIANCAMENTO
// ------------------------------------------------------------
//
// Deciso l'8 ottobre 2026. Quattro a sei lezioni al mese, 35 € la
// lezione, condotte da un collaboratore, da un manager o dal
// titolare.
//
// IL MINIMO È LA COSA IMPORTANTE, non il prezzo. Sotto le quattro
// lezioni al mese non è un affiancamento: è una lezione ogni tanto,
// e una lezione ogni tanto non cambia niente in chi la riceve. Il
// massimo esiste per il motivo opposto — oltre le sei si sta
// sostituendo l'allenamento della persona, non affiancandolo.

export const PREZZO_AFFIANCAMENTO = 35;
export const AFFIANCAMENTO_MIN_MESE = 4;
export const AFFIANCAMENTO_MAX_MESE = 6;

/** Chi può condurre un affiancamento. */
export type ConduttoreAffiancamento = 'collaboratore' | 'manager' | 'titolare';

export const CONDUTTORI_AFFIANCAMENTO: ConduttoreAffiancamento[] = [
  'collaboratore',
  'manager',
  'titolare',
];

export interface EsitoAffiancamento {
  ok: boolean;
  lezioni: number;
  totale: number;
  motivo: string;
}

/**
 * Controlla quante lezioni al mese, e dice il totale.
 *
 * Il prezzo non cambia con il conduttore: 35 € la lezione anche con
 * il titolare, ed è una scelta — l'affiancamento non è una seduta
 * individuale e non ne segue il listino.
 */
export const controllaAffiancamento = (lezioniMese: number): EsitoAffiancamento => {
  const n = Math.round(lezioniMese || 0);
  const totale = Math.round(n * PREZZO_AFFIANCAMENTO * 100) / 100;

  if (!Number.isFinite(lezioniMese) || n < AFFIANCAMENTO_MIN_MESE) {
    return {
      ok: false,
      lezioni: n,
      totale,
      motivo: `L'affiancamento parte da ${AFFIANCAMENTO_MIN_MESE} lezioni al mese: `
        + 'sotto quel numero non è un affiancamento, è una lezione ogni tanto.',
    };
  }
  if (n > AFFIANCAMENTO_MAX_MESE) {
    return {
      ok: false,
      lezioni: n,
      totale,
      motivo: `L'affiancamento arriva a ${AFFIANCAMENTO_MAX_MESE} lezioni al mese. `
        + 'Oltre, non si affianca l\'allenamento di quella persona: lo si sostituisce.',
    };
  }
  return {
    ok: true,
    lezioni: n,
    totale,
    motivo: `${n} lezioni × ${PREZZO_AFFIANCAMENTO} € = ${euroIt(totale)} € al mese.`,
  };
};

// ------------------------------------------------------------
// LE VOCI PRONTE PER IL PREVENTIVO
// ------------------------------------------------------------
//
// Il preventivo è tre righe libere: descrizione e importo, scritti a
// mano. Va bene per il caso particolare, ed è il modo più rapido di
// sbagliare una cifra sulle voci che invece un prezzo l'hanno.
//
// Queste sono quelle voci, già scritte. Si toccano i prezzi qui e
// cambiano nel preventivo: non c'è una seconda lista da ricordarsi.

export interface VoceListino {
  chiave: string;
  /** il testo breve del bottone */
  etichetta: string;
  /** come finisce scritto sul foglio dell'allievo */
  descrizione: string;
  importo: number;
}

export const VOCI_LISTINO: VoceListino[] = [
  ...Object.keys(QUOTE_GRUPPO)
    .map(Number)
    .sort((a, b) => a - b)
    .map((n) => ({
      chiave: `gruppo${n}`,
      etichetta: `Gruppo in ${n}`,
      descrizione: `Personal di gruppo in ${n} · ${euroIt(QUOTE_GRUPPO[n])} € a persona `
        + 'a seduta',
      importo: QUOTE_GRUPPO[n],
    })),
  ...[AFFIANCAMENTO_MIN_MESE, 5, AFFIANCAMENTO_MAX_MESE].map((n) => ({
    chiave: `affiancamento${n}`,
    etichetta: `Affiancamento ${n}/mese`,
    descrizione: `Affiancamento · ${n} lezioni al mese, ${PREZZO_AFFIANCAMENTO} € a lezione`,
    importo: Math.round(n * PREZZO_AFFIANCAMENTO * 100) / 100,
  })),
];

// ------------------------------------------------------------
// LA VALUTAZIONE A DISTANZA
// ------------------------------------------------------------
//
// Da 50 a 100 €, decisa caso per caso dal titolare (28 settembre
// 2026). In studio la prima valutazione è 150.
//
// Costa meno perché VALE MENO, e conviene dirselo invece di girarci
// intorno: a distanza manca la mezz'ora di osservazione dal vivo,
// mancano i test che si fanno con le mani, e resta quello che si vede
// in una foto e in un video. È la stessa cosa scritta nella procedura
// a distanza — «fingere che le foto sostituiscano l'osservazione
// sarebbe la bugia più grave di tutto il percorso» — e qui diventa un
// numero.
//
// Un prezzo che riflette onestamente quanto si è potuto vedere è la
// cosa che rende credibile tutto il resto del listino.

export const VALUTAZIONE_ONLINE_MIN = 50;
export const VALUTAZIONE_ONLINE_MAX = 100;

export interface EsitoValutazioneOnline {
  ok: boolean;
  importo: number;
  motivo: string;
}

/**
 * Controlla l'importo scelto per una valutazione a distanza.
 *
 * Non decide la cifra — quella la stabilisce il titolare guardando il
 * caso. Impedisce soltanto che esca dalla forchetta per distrazione:
 * sopra i cento si farebbe pagare a distanza quanto uno studio, sotto
 * i cinquanta non si copre il tempo che costa.
 */
export const controllaValutazioneOnline = (
  importo: number
): EsitoValutazioneOnline => {
  const n = Math.round((importo || 0) * 100) / 100;
  if (n < VALUTAZIONE_ONLINE_MIN) {
    return {
      ok: false,
      importo: n,
      motivo: `Una valutazione a distanza non scende sotto ${VALUTAZIONE_ONLINE_MIN} €: `
        + 'sotto quella cifra non copre il tempo che costa.',
    };
  }
  if (n > VALUTAZIONE_ONLINE_MAX) {
    return {
      ok: false,
      importo: n,
      motivo: `Una valutazione a distanza non supera ${VALUTAZIONE_ONLINE_MAX} €. `
        + 'In studio la prima valutazione costa di più perché comprende '
        + 'l\'osservazione dal vivo: a distanza quella parte non c\'è, e il '
        + 'prezzo lo dice.',
    };
  }
  return { ok: true, importo: n, motivo: '' };
};

/**
 * Quanto si paga per la valutazione a distanza.
 *
 * DECISO IL 28 SETTEMBRE 2026: chi entra nel percorso non la paga a
 * parte — è compresa. La paga solo chi vuole la valutazione e basta,
 * senza percorso, e la cifra si decide al primo colloquio in base a
 * quello che la persona racconta.
 *
 * È la struttura giusta per due ragioni. La prima: il percorso resta
 * un numero solo, e un numero solo si decide; due numeri si
 * confrontano, e mentre si confrontano non si compra. La seconda: chi
 * vuole solo sapere a che punto sta ha una porta che non lo obbliga a
 * impegnarsi per tre mesi — ed è spesso la stessa persona che dopo la
 * valutazione entra nel percorso.
 */
export const valutazioneOnlineDovuta = (
  entraNelPercorso: boolean,
  importoDeciso?: number
): number => {
  if (entraNelPercorso) return 0;
  const n = typeof importoDeciso === 'number' ? importoDeciso : VALUTAZIONE_ONLINE_MIN;
  const e = controllaValutazioneOnline(n);
  // Fuori forchetta si riporta dentro invece di far passare un numero
  // che non doveva esistere: il controllo l'ha già detto a chi scrive.
  return e.ok
    ? e.importo
    : Math.min(VALUTAZIONE_ONLINE_MAX, Math.max(VALUTAZIONE_ONLINE_MIN, n));
};

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

export interface Ripartizione {
  /** quello che l'allievo paga davvero, sconto già tolto */
  incassato: number;
  /** quanto va al collaboratore */
  collaboratore: number;
  /** quanto resta allo studio */
  studio: number;
  /** la percentuale usata, che dipende dalla data */
  quota: number;
}

/**
 * Come si divide un incasso fra studio e collaboratore.
 *
 * Si calcola SUL TOTALE GIÀ SCONTATO: è la decisione del 28 settembre
 * 2026 — lo sconto fedeltà lo pagano in due, metà per uno.
 *
 * La percentuale non si passa: viene dalla data. Così non può
 * succedere che una schermata usi il sessanta per cento e un'altra il
 * cinquanta, che è esattamente il genere di divergenza che si scopre
 * a fine mese guardando due numeri diversi per lo stesso lavoro.
 *
 * ATTENZIONE: questo conto è INTERNO. Non finisce mai sul foglio che
 * si consegna all'allievo — quanto prende il collaboratore non è
 * affar suo, e vederlo cambierebbe il modo in cui guarda chi lo
 * allena.
 */
export const ripartizioneIncasso = (
  totaleScontato: number,
  quando: Date
): Ripartizione => {
  const incassato = Math.round(Math.max(0, totaleScontato || 0) * 100) / 100;
  const quota = quotaDelGiorno(quando);
  const collaboratore = Math.round(incassato * quota * 100) / 100;
  return {
    incassato,
    collaboratore,
    studio: Math.round((incassato - collaboratore) * 100) / 100,
    quota,
  };
};

/**
 * La quota quando all'allievo è stato fatto uno sconto fedeltà.
 *
 * DECISIONE DEL 28 SETTEMBRE 2026: lo sconto lo pagano in due. La
 * percentuale si calcola su quello che l'allievo paga davvero, non
 * sul prezzo di listino.
 *
 * Il motivo, e vale la pena scriverlo perché fra un anno non sarà
 * più ovvio: un allievo che resta due anni è un allievo che il
 * collaboratore ha tenuto. Lo sconto fedeltà è il costo di quella
 * fedeltà, e la fedeltà l'hanno costruita in due — quindi la pagano
 * in due. L'alternativa (quota sul listino pieno, sconto a carico
 * del solo studio) era difendibile, ed è stata scartata.
 *
 * Su una seduta da 35 € scontata del 20%: l'allievo paga 28, il
 * collaboratore prende 14 invece di 17,50, e allo studio restano 14
 * invece di 17,50.
 */
export const quotaSuPrezzoPagato = (
  s: Seduta,
  quando: Date,
  prezzoPagato: number
): number => {
  if (s.conduce !== 'collaboratore') return 0;
  const p = Math.max(0, prezzoPagato || 0);
  return Math.round(p * quotaDelGiorno(quando) * 100) / 100;
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
