import { PERIMETRO, AVVISO_RESPIRO } from './perimetro';

// ============================================================
// LA SCHEDA SEMPLICE — quella che si stampa e si porta in sala
// A.S.D. Evolution Sport · Mind Movement Lab
// ------------------------------------------------------------
// Il titolare, il 18 settembre 2026:
//
//   «Ci sono allievi e allieve che per la loro età e i loro modi di
//    intendere hanno bisogno di avere la scheda stampata. Per ora
//    non servono progressioni o altro: utilizzano l'applicazione
//    solo per prenotare e per avere sotto controllo il periodo
//    dell'abbonamento. Mettimi la possibilità di stampare una
//    scheda senza dover segnare carichi e nulla, solamente gli
//    esercizi con la spiegazione.»
//
// ------------------------------------------------------------
// NON È UNA SCHEDA POVERA
// ------------------------------------------------------------
// È una scheda per un pubblico diverso. Una signora di
// settant'anni che tiene il foglio piegato nella borsa non ha
// bisogno di 4×12 al 70%: ha bisogno di sapere CHE COSA fa e COME
// si fa. La spiegazione, qui, non è un di più: è la scheda.
//
// Per questo il nome senza spiegazione si segnala. «Leg press» su
// un foglio, da solo, non aiuta nessuno.
//
// ------------------------------------------------------------
// E NON CI SONO CARICHI
// ------------------------------------------------------------
// Non «non sono obbligatori»: non ci sono proprio. Se un domani
// qualcuno rimette le serie o i chili su questo foglio, ha fatto
// un'altra cosa e deve chiamarla in un altro modo. C'è un test che
// lo impedisce.
//
// La dicitura del perimetro invece c'è sempre, e l'avviso sul
// respiro compare da sé appena la scheda contiene una pratica di
// respiro: quell'avviso non si toglie da nessuna adattamento, e
// una scheda stampata è l'adattamento che gira più lontano da noi.
// ============================================================

export const SCHEDA_SEMPLICE_VERSION = 1;

export interface EsercizioSemplice {
  nome: string;
  /** che cosa si fa, a parole. Qui è la parte importante. */
  spiegazione: string;
  note?: string;
}

export interface GiornoSemplice {
  /** 0 = lunedì */
  giorno: number;
  nome: string;
  esercizi: EsercizioSemplice[];
  note?: string;
}

export const GIORNI = [
  'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica',
];

// ------------------------------------------------------------
// Comporre la scheda
// ------------------------------------------------------------

/** Quello che arriva dal programma, senza portarsi dietro il resto. */
interface EsercizioGrezzo {
  name?: string;
  description?: string;
  notes?: string;
}

interface GiornoGrezzo {
  exercises?: EsercizioGrezzo[];
  notes?: string;
}

/**
 * Dal programma alla scheda da stampare.
 *
 * Passano SOLO nome, spiegazione e note. Serie, ripetizioni,
 * recuperi, tecniche, ROM: non si perdono, semplicemente non
 * entrano in questo foglio. Il programma resta quello che è.
 *
 * I giorni senza esercizi non compaiono: su un foglio stampato,
 * cinque righe «Giorno di riposo» sono solo carta sprecata e
 * confusione per chi legge.
 */
export const componiSchedaSemplice = (
  settimana: (GiornoGrezzo | undefined)[]
): GiornoSemplice[] => {
  const out: GiornoSemplice[] = [];
  (settimana || []).forEach((g, i) => {
    const esercizi = (g?.exercises || [])
      .filter((e) => (e?.name || '').trim())
      .map((e) => ({
        nome: (e.name || '').trim(),
        spiegazione: (e.description || '').trim(),
        ...((e.notes || '').trim() ? { note: (e.notes || '').trim() } : {}),
      }));
    if (!esercizi.length) return;
    out.push({
      giorno: i,
      nome: GIORNI[i] || `Giorno ${i + 1}`,
      esercizi,
      ...((g?.notes || '').trim() ? { note: (g!.notes || '').trim() } : {}),
    });
  });
  return out;
};

// ------------------------------------------------------------
// È pronta da stampare?
// ------------------------------------------------------------

export interface EsitoScheda {
  /** false solo se non c'è niente da stampare */
  pronta: boolean;
  /** cose da sapere prima di stampare, non divieti */
  avvisi: string[];
}

/**
 * Non blocca: avvisa.
 *
 * Chi ha in mano il foglio è lui, e sa se quell'esercizio la
 * signora lo conosce già a memoria. Ma deve saperlo prima di
 * stampare, non scoprirlo dalla faccia di chi legge.
 */
export const controllaSchedaSemplice = (giorni: GiornoSemplice[]): EsitoScheda => {
  const g = giorni || [];
  if (!g.length) {
    return {
      pronta: false,
      avvisi: ['Non c\'è nessun esercizio da stampare: aggiungine almeno uno.'],
    };
  }
  const avvisi: string[] = [];
  const senza = g.flatMap((x) => x.esercizi).filter((e) => !e.spiegazione);
  if (senza.length) {
    const nomi = senza.map((e) => e.nome).join(', ');
    avvisi.push(
      senza.length === 1
        ? `«${nomi}» non ha la spiegazione: sul foglio resterà solo il nome.`
        : `${senza.length} esercizi non hanno la spiegazione, e sul foglio resterà `
          + `solo il nome: ${nomi}.`
    );
  }
  return { pronta: true, avvisi };
};

// ------------------------------------------------------------
// La dicitura, che c'è sempre
// ------------------------------------------------------------

/** Le parole in fondo al foglio. Non si abbreviano. */
export const PIE_DI_PAGINA = PERIMETRO;

const SEGNI_RESPIRO = [
  'respir', 'diaframma', 'diaframmat', 'apnea', 'espir', 'inspir',
  'coerenza cardiaca', 'breathing',
];

/**
 * La scheda contiene una pratica di respiro?
 *
 * Generosa apposta: un avviso di troppo non ha mai fatto male a
 * nessuno, un avviso mancante sì. Guarda nome, spiegazione e note,
 * perché il respiro entra spesso dalla nota e non dal titolo.
 */
export const serveAvvisoRespiro = (giorni: GiornoSemplice[]): boolean => {
  const testo = (giorni || [])
    .flatMap((g) => [g.note || '', ...g.esercizi.flatMap((e) => [e.nome, e.spiegazione, e.note || ''])])
    .join(' ')
    .toLowerCase();
  return SEGNI_RESPIRO.some((s) => testo.includes(s));
};

/** Tutte le righe che vanno in fondo al foglio, nell'ordine. */
export const dicitureDi = (giorni: GiornoSemplice[]): string[] => {
  const righe = [PIE_DI_PAGINA];
  if (serveAvvisoRespiro(giorni)) righe.push(AVVISO_RESPIRO);
  return righe;
};

/** Quanti esercizi in tutto: serve a dirlo prima di stampare. */
export const contaEsercizi = (giorni: GiornoSemplice[]): number =>
  (giorni || []).reduce((s, g) => s + g.esercizi.length, 0);

/** Che cosa si legge prima di stampare. */
export const riepilogaScheda = (giorni: GiornoSemplice[]): string => {
  const n = contaEsercizi(giorni);
  const g = (giorni || []).length;
  if (!n) return 'Non c\'è ancora niente da stampare.';
  return `${n} ${n === 1 ? 'esercizio' : 'esercizi'} su ${g} ${g === 1 ? 'giorno' : 'giorni'}, `
    + 'con la spiegazione e senza carichi né serie.';
};

// ------------------------------------------------------------
// E se poi uno apre lo stesso la seduta dal vivo?
// ------------------------------------------------------------
// Un esercizio senza serie prescritte, nella schermata che registra
// i carichi, mostrava «Obiettivo: 0 x » e nascondeva il pulsante per
// aggiungere una serie: l'allievo restava davanti a una cosa che non
// poteva né fare né chiudere.
//
// Quelle allieve la seduta dal vivo non la aprono — usano l'app per
// prenotare e per vedere l'abbonamento. Ma «non lo fanno» non è una
// protezione: è una speranza.
// ------------------------------------------------------------

/** Nessuna serie prescritta: è una scheda da stampare, non da registrare. */
export const senzaPrescrizione = (serie?: number): boolean => !serie || serie <= 0;

/** Che cosa si legge al posto di «Obiettivo: 0 x ». */
export const obiettivoDi = (serie?: number, ripetizioni?: string): string =>
  senzaPrescrizione(serie)
    ? 'Serie e ripetizioni non prescritte: vai come ti ha detto il coach.'
    : `Obiettivo: ${serie} x ${ripetizioni || ''}`.trim();

/** Senza prescrizione non c'è un tetto: si registra quello che si fa. */
export const puoAggiungereSerie = (fatte: number, serie?: number): boolean =>
  (senzaPrescrizione(serie) ? true : (fatte || 0) < (serie as number));

/** Senza prescrizione, è fatto appena si è registrato qualcosa. */
export const esercizioCompleto = (fatte: number, serie?: number): boolean =>
  (senzaPrescrizione(serie) ? (fatte || 0) > 0 : (fatte || 0) >= (serie as number));
