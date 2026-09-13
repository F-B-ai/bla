// ============================================================
// L'INTERESSATO — chi fa la consulenza e non è (ancora) un allievo
// ------------------------------------------------------------
// Il titolare, il 12 settembre 2026:
//
//   «La scheda di onboarding la posso fare anche a un allievo non
//    registrato? Perché fa parte della consulenza, e la persona può
//    decidere di non entrare nel programma. Oppure, se decide di
//    entrare, fa parte dei dati.»
//
// Aveva ragione, e il difetto era di modello: la scheda pretendeva un
// `studentId`, cioè un account. Ma l'onboarding si fa **durante** la
// consulenza — prima che qualcuno decida. Costringere a registrare
// una persona per poterle fare le domande significa creare un allievo
// che magari non lo diventerà mai, e ritrovarsi l'anagrafica piena di
// gente che è passata una volta.
//
// Adesso la scheda può appartenere a due soggetti diversi:
//
//   · un ALLIEVO, che ha un account e un gemello;
//   · un INTERESSATO, che ha solo un nome e un telefono.
//
// E le tre strade possibili dopo la consulenza:
//
//   1. entra  → la scheda si collega all'allievo, e SOLO ALLORA
//               diventa un evento del suo gemello;
//   2. non entra → la scheda si cancella, e con lei i suoi dati;
//   3. ci pensa → la scheda resta, ma con una scadenza visibile.
//
// ------------------------------------------------------------
// PERCHÉ LA SCADENZA
// ------------------------------------------------------------
// Una scheda di onboarding contiene dati di salute di una persona che
// non è un cliente. Tenerli «per sicurezza», per sempre, non è
// prudenza: è il contrario. Se non è entrata, quei dati non servono a
// nessuno e non dovrebbero esserci.
//
// La cancellazione resta una decisione umana — cancellare da soli la
// scheda di una persona che magari sta ancora pensandoci sarebbe
// peggio. Ma la schermata lo dice, con i giorni in faccia.
// ============================================================

// ------------------------------------------------------------
// 13 SETTEMBRE 2026 — «NON VEDO NESSUN CAMBIAMENTO»
// ------------------------------------------------------------
// Il titolare ha aperto la schermata e non ha visto l'elenco delle
// consulenze in sospeso. Il pulsante c'era, il codice era in rete:
// l'elenco era VUOTO, e vuoto e rotto si vedevano uguale.
//
// La lettura chiedeva a Firestore un filtro su `tipoSoggetto` più un
// ordinamento su `date`. Una domanda così ha bisogno di un indice
// composito che nessuno aveva creato, quindi falliva sempre — e il
// `catch` che avevo scritto io restituiva una lista vuota. Il difetto
// che ho passato la settimana a togliere dagli altri, scritto di mia
// mano: un errore raccolto e buttato via, e la schermata che dice
// «non c'è niente» quando la verità è «non sono riuscito a guardare».
//
// Adesso: si chiede a Firestore solo quello che sa dare senza indici
// nuovi (le ultime schede in ordine di data), e si sceglie qui chi è
// un interessato. Se la lettura fallisce, si vede che è fallita.
// ------------------------------------------------------------

export const INTERESSATO_VERSION = 2;

export type TipoSoggetto = 'allievo' | 'interessato';

export interface Soggetto {
  tipo: TipoSoggetto;
  /** presente solo per un allievo */
  studentId?: string;
  nome: string;
  /** solo per un interessato: è l'unico modo di richiamarlo */
  telefono?: string;
}

/** Dopo quanti giorni una scheda non collegata va guardata in faccia. */
export const GIORNI_CONSERVAZIONE = 90;

const GIORNO = 24 * 60 * 60 * 1000;

// ------------------------------------------------------------
// Si può salvare?
// ------------------------------------------------------------

export interface EsitoSoggetto {
  ok: boolean;
  problemi: string[];
}

export const controllaSoggetto = (s: Partial<Soggetto>): EsitoSoggetto => {
  const problemi: string[] = [];
  const nome = (s.nome || '').trim();

  if (s.tipo === 'allievo') {
    if (!s.studentId) problemi.push('Scegli l\'allievo dall\'elenco.');
  } else if (s.tipo === 'interessato') {
    if (nome.length < 3) problemi.push('Scrivi il nome della persona.');
    // Il telefono non è burocrazia: senza, una persona che ci pensa
    // non la si richiama, e la scheda resta lì a scadere da sola.
    const tel = (s.telefono || '').replace(/[^\d+]/g, '');
    if (tel.length > 0 && tel.length < 6) {
      problemi.push('Il numero di telefono sembra incompleto.');
    }
  } else {
    problemi.push('Scegli se è un allievo o una persona in consulenza.');
  }

  return { ok: problemi.length === 0, problemi };
};

// ------------------------------------------------------------
// Il gemello
// ------------------------------------------------------------

/**
 * Una scheda diventa un evento del gemello **solo** quando appartiene
 * a un allievo vero.
 *
 * Un interessato non ha un gemello: non ha un account, non ha una
 * storia, e potrebbe non averla mai. Scriverci sopra vorrebbe dire
 * creare metà persona nel sistema — e poi doverla cancellare a mano
 * da due posti invece che da uno.
 */
export const vaSulGemello = (tipo: TipoSoggetto): boolean =>
  tipo === 'allievo';

// ------------------------------------------------------------
// Chi finisce nell'elenco delle consulenze in sospeso
// ------------------------------------------------------------

/** Quel poco che serve per decidere se una scheda è in sospeso. */
export interface SchedaDaSmistare {
  tipoSoggetto?: string;
  studentId?: string;
  date?: Date;
}

/**
 * È una consulenza in sospeso?
 *
 * Due casi, non uno:
 *  · la scheda dice di essere di un interessato;
 *  · la scheda non ha un allievo. Non può essere di nessuno: o è nata
 *    prima che esistesse il tipo, o è stata salvata mentre il
 *    telefono aveva ancora la versione vecchia. In tutti e due i casi
 *    è lavoro fatto da qualcuno, e non si perde per un campo mancante.
 */
export const eInteressato = (s: SchedaDaSmistare): boolean =>
  s.tipoSoggetto === 'interessato' || !(s.studentId || '').trim();

/** Dalla più recente: è l'ordine con cui si decide che farne. */
export const ordinaPerData = <T extends { date?: Date }>(schede: T[]): T[] =>
  [...(schede || [])].sort((a, b) => {
    const ta = a.date instanceof Date && !isNaN(a.date.getTime()) ? a.date.getTime() : 0;
    const tb = b.date instanceof Date && !isNaN(b.date.getTime()) ? b.date.getTime() : 0;
    return tb - ta;
  });

// ------------------------------------------------------------
// Quando la lettura non riesce
// ------------------------------------------------------------

export interface EsitoElenco<T> {
  schede: T[];
  /** null quando è andata bene. Altrimenti la frase da mostrare. */
  errore: string | null;
}

/**
 * Che cosa si legge al posto dell'elenco quando Firestore non risponde.
 *
 * Non «errore»: che cosa NON si sta vedendo, e che i dati ci sono
 * ancora. Un elenco vuoto per un guasto e un elenco vuoto perché non
 * c'è nessuno devono avere due frasi diverse — confonderli è
 * esattamente il difetto che ha nascosto questa schermata.
 */
export const spiegaElencoFallito = (errore: unknown): string => {
  const testo = String(
    (errore as { code?: string })?.code
    || (errore as { message?: string })?.message
    || errore || ''
  ).toLowerCase();

  if (testo.includes('permission') || testo.includes('insufficient')) {
    return 'Non ho i permessi per leggere le consulenze — che NON sono perse: '
      + 'è la lettura a essere bloccata. Esci e rientra nell\'App; se continua, '
      + 'sono le regole di sicurezza da sistemare.';
  }
  if (testo.includes('index') || testo.includes('failed-precondition')) {
    return 'Il database non riesce a ordinare questo elenco (manca un indice). '
      + 'Le consulenze NON sono perse: è la lettura che non riesce.';
  }
  if (testo.includes('offline') || testo.includes('unavailable')
    || testo.includes('network')) {
    return 'Non riesco a raggiungere il database. Controlla la connessione '
      + 'e riprova: le consulenze sono al loro posto.';
  }
  return 'Non riesco a leggere le consulenze in sospeso adesso. '
    + 'Non sono perse: riprova fra poco.';
};

// ------------------------------------------------------------
// La scadenza
// ------------------------------------------------------------

export const giorniRimasti = (
  creata: Date,
  oggi: Date = new Date()
): number => {
  if (!(creata instanceof Date) || isNaN(creata.getTime())) return GIORNI_CONSERVAZIONE;
  const passati = Math.floor((oggi.getTime() - creata.getTime()) / GIORNO);
  return GIORNI_CONSERVAZIONE - passati;
};

export const scaduta = (creata: Date, oggi: Date = new Date()): boolean =>
  giorniRimasti(creata, oggi) <= 0;

/**
 * La riga che si legge accanto a una scheda non collegata.
 * Non è un avviso legale: è un promemoria in italiano.
 */
export const descriviScadenza = (
  creata: Date,
  oggi: Date = new Date()
): string => {
  const g = giorniRimasti(creata, oggi);
  if (g <= 0) {
    return 'Questa scheda è qui da più di tre mesi e la persona non è entrata. '
      + 'Se non ci sta ancora pensando, va cancellata.';
  }
  if (g <= 14) {
    return g === 1
      ? 'Ancora un giorno, poi va decisa: si collega a un allievo o si cancella.'
      : `Ancora ${g} giorni, poi va decisa: si collega a un allievo o si cancella.`;
  }
  return 'Non è collegata a nessun allievo: se la persona non entra, va cancellata.';
};

/**
 * Che cosa si legge prima di cancellare.
 * Non «sei sicuro?»: che cosa sparisce, e che non torna.
 */
export const confermaCancellazione = (nome: string): string =>
  `Stai per cancellare la scheda di ${nome.trim() || 'questa persona'}, `
  + 'con tutte le risposte raccolte in consulenza.\n\n'
  + 'Non si recupera. Se la persona dovesse entrare più avanti, '
  + 'la consulenza andrà rifatta da capo.';

/**
 * Che cosa si legge prima di collegarla a un allievo.
 * È il passaggio che la rende definitiva: da lì in poi non si cancella più.
 */
export const confermaCollegamento = (
  nomeScheda: string,
  nomeAllievo: string
): string =>
  `La scheda di ${nomeScheda.trim()} diventa parte dei dati di `
  + `${nomeAllievo.trim()}.\n\n`
  + 'Da quel momento entra nella sua storia e non si cancella più: '
  + 'è il primo atto del suo percorso.';
