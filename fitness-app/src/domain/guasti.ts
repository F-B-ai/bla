// ============================================================
// IL REGISTRO DEI GUASTI
// ------------------------------------------------------------
// 23 e 24 settembre 2026: l'App non parte, due volte, e tutte e due
// le volte torna a funzionare senza che nessuno sappia perché.
//
// Il problema non era il guasto: era che il guasto è MUTO. Quando
// qualcosa si rompe, oggi non resta traccia da nessuna parte —
// nessun messaggio, nessuna data, nessuna versione. L'unica
// informazione che esiste al mondo è una frase del titolare che
// dice «non carica», e da lì si indovina mentre lui è fermo.
//
// È lo stesso difetto che questa App ha passato due giorni a
// togliersi di dosso: un fallimento che non si racconta. Qui si
// chiude anche l'ultimo.
//
// CHE COSA SI SCRIVE, E CHE COSA NO. Il messaggio dell'errore, la
// schermata, la versione, l'ora, il ruolo di chi c'era. NIENTE che
// riguardi un allievo: né nomi, né email, né telefoni, né misure.
// Un registro dei guasti che raccoglie dati delle persone è un
// problema più grande di quello che risolve.
//
// E DAVANTI A UN ALLIEVO. «Ho dovuto fingere che era andata bene»:
// questo non deve succedere. Un errore tecnico sullo schermo mentre
// c'è un allievo seduto accanto costa più del guasto stesso. Le
// frasi di questo file sono scritte per essere lette da chiunque
// passi di lì senza che nessuno debba fingere niente.
// ============================================================

export const GUASTI_VERSION = 1;

/** Quanto si tiene di un messaggio o di una traccia. */
export const MAX_MESSAGGIO = 600;
export const MAX_TRACCIA = 2000;

export interface Guasto {
  /** il messaggio dell'errore, ripulito */
  messaggio: string;
  /** dove è successo, per quanto si sa */
  schermata: string;
  /** la traccia tecnica, ripulita e accorciata */
  traccia: string;
  /** l'impronta del pacchetto in esecuzione: dice QUALE versione */
  versione: string;
  /** owner | manager | collaborator | student — mai il nome */
  ruolo: string;
  quando: Date;
}

// Le forme che non devono finire nel registro. Non è un filtro
// perfetto — non esiste — ma toglie quello che davvero capita: un
// indirizzo dentro un messaggio di autenticazione, un numero di
// telefono in un dato incollato, una chiave in una URL.
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const TELEFONO = /(?:\+?\d[\s.-]?){8,15}\d/g;
const CHIAVE = /\b(?:key|token|secret|password|apikey|api_key|bearer)\b[=:\s"']+[^\s"'&,;]+/gi;
// Una chiave nuda, senza l'etichetta davanti. Serve la lunghezza E il
// miscuglio — maiuscole, minuscole e cifre insieme — perché è così che
// sono fatte le chiavi vere.
//
// La prima versione chiedeva solo «32 caratteri o più»: mangiava
// qualsiasi parola lunga, e nel pacchetto offuscato i nomi delle
// funzioni sono esattamente quello. Avrebbe cancellato le tracce
// tecniche proprio nel punto che serve a capire. Trovato da un test,
// non a ragionamento.
const CHIAVE_NUDA = /\b(?=[A-Za-z0-9_-]{32,}\b)(?=[A-Za-z0-9_-]*[a-z])(?=[A-Za-z0-9_-]*[A-Z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]+/g;

/**
 * Toglie quello che non deve essere registrato.
 *
 * Sostituisce invece di cancellare: sapere che «c'era un indirizzo»
 * aiuta a capire, e non dice di chi era.
 */
export const ripulisci = (testo?: string | null): string => {
  if (!testo) return '';
  return String(testo)
    .replace(CHIAVE, '[chiave]')
    .replace(EMAIL, '[indirizzo]')
    .replace(TELEFONO, '[numero]')
    .replace(CHIAVE_NUDA, '[codice]')
    .trim();
};

const taglia = (t: string, max: number): string =>
  t.length <= max ? t : t.slice(0, max) + `… [altri ${t.length - max} caratteri]`;

export interface DatiGuasto {
  errore: unknown;
  schermata?: string | null;
  versione?: string | null;
  ruolo?: string | null;
  quando?: Date;
}

const messaggioDi = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return '';
};

const tracciaDi = (e: unknown): string =>
  e instanceof Error && e.stack ? e.stack : '';

/**
 * Il rapporto pronto da registrare.
 *
 * Non lancia mai: un registro dei guasti che si guasta sarebbe una
 * beffa. Qualunque cosa arrivi, ne esce un rapporto valido.
 */
export const componiGuasto = (d: DatiGuasto): Guasto => {
  const messaggio = taglia(ripulisci(messaggioDi(d.errore)), MAX_MESSAGGIO)
    || 'Errore senza messaggio';
  return {
    messaggio,
    schermata: ripulisci(d.schermata) || 'sconosciuta',
    traccia: taglia(ripulisci(tracciaDi(d.errore)), MAX_TRACCIA),
    versione: ripulisci(d.versione) || 'sconosciuta',
    ruolo: ripulisci(d.ruolo) || 'sconosciuto',
    quando: d.quando || new Date(),
  };
};

// ------------------------------------------------------------
// CHE COSA LEGGE CHI È DAVANTI ALLO SCHERMO
// ------------------------------------------------------------

export interface Schermata {
  titolo: string;
  testo: string;
  /** il dettaglio tecnico: c'è, ma non è la prima cosa che si legge */
  dettaglio: string;
  /** l'etichetta del pulsante che rimette in piedi la schermata */
  azione: string;
}

/**
 * La schermata al posto del bianco.
 *
 * Prima qui c'era il messaggio grezzo dell'errore, in rosso, e
 * nient'altro: nessun modo di riprovare, nessuna via d'uscita che
 * non fosse chiudere l'App. Con un allievo seduto accanto, era una
 * figuraccia senza rimedio.
 *
 * Adesso: una frase che si può leggere davanti a chiunque, il
 * dettaglio tecnico sotto per chi deve aggiustare, e un pulsante.
 */
export const schermataGuasto = (g: Guasto): Schermata => ({
  titolo: 'Questa pagina si è fermata',
  testo: 'Il resto dell\'App funziona. Riprova: quasi sempre riparte. '
    + 'Il guasto è stato registrato, non serve che tu lo scriva da qualche parte.',
  dettaglio: `${g.messaggio}${g.schermata !== 'sconosciuta' ? ` · ${g.schermata}` : ''}`,
  azione: 'Riprova',
});

// ------------------------------------------------------------
// I GUASTI PASSEGGERI
// ------------------------------------------------------------
//
// «Nell'analisi della composizione corporea mi ha dato un errore,
// poi l'ho riavviata ed è andata bene.» Se al secondo tentativo
// funziona, il primo tentativo non doveva arrivare agli occhi di
// nessuno — e men che meno a quelli dell'allievo.

/** Quanti tentativi in tutto. Due: uno in più, non una raffica. */
export const TENTATIVI = 2;

const PASSEGGERI = [
  'network', 'timeout', 'timed out', 'failed to fetch', 'load failed',
  'unavailable', 'aborted', 'connection', 'econnreset', 'socket',
  'temporarily', 'try again', 'rate limit', 'too many requests',
  '429', '500', '502', '503', '504',
];

/**
 * Vale la pena riprovare da soli?
 *
 * Solo per i guasti che passano: rete, attese, server occupato. Una
 * chiave sbagliata o un dato non valido non migliorano riprovando —
 * lì si dice subito com'è, invece di far aspettare due volte.
 */
export const passeggero = (e: unknown): boolean => {
  const t = (messaggioDi(e) || '').toLowerCase();
  if (!t) return false;
  if (/permission|denied|unauthor|forbidden|non valid|invalid|malformed/.test(t)) {
    return false;
  }
  return PASSEGGERI.some((p) => t.includes(p));
};
