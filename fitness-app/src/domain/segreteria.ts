// ============================================================
// LA SEGRETERIA — da un messaggio WhatsApp a una richiesta
// ------------------------------------------------------------
// Il titolare, il 16 settembre 2026:
//
//   «Ma Grok bot mi gestiva WhatsApp e metteva in richieste.»
//
// Grok faceva una traduzione: da «Ciao Francesco, giovedì pomeriggio
// verso le 3 ci sono» alle cinque righe di un pacchetto CAL. Utile —
// e appoggiata a un abbonamento con una riserva settimanale che si
// esaurisce. Quando si è esaurita, la segreteria si è fermata.
//
// Ricevere gli appuntamenti non può dipendere da un abbonamento di
// terzi. La traduzione la fa ESSĒRE, con il gateway AI che ha già
// dentro: chiave sul server, nessuno in mezzo, nessuna quota.
//
// ------------------------------------------------------------
// LA REGOLA CHE NON SI TOCCA: LA DATA NON SI INVENTA
// ------------------------------------------------------------
// Un modello che «capisce» una data che non c'è scritta è il modo
// più veloce per mettere in agenda un appuntamento che nessuno ha
// chiesto. Se la data non c'è, si dice che non c'è — e si propongono
// gli orari liberi da rimandare alla persona. È la scelta del
// titolare, 16 settembre: «l'App propone gli orari liberi».
//
// E niente entra in agenda da qui: si crea una RICHIESTA, che il
// titolare conferma. Come per il ponte CAL, e per la stessa ragione.
// ============================================================

export const SEGRETERIA_VERSION = 1;

export type EsitoSegreteria =
  /** c'è tutto: persona, giorno, ora */
  | 'richiesta'
  /** si capisce chi è e che vuole un appuntamento, ma non quando */
  | 'senza_data'
  /** non è una richiesta di appuntamento */
  | 'non_capito';

export interface LetturaSegreteria {
  esito: EsitoSegreteria;
  persona: string;
  telefono: string;
  /** YYYY-MM-DD, vuoto se non c'era */
  giorno: string;
  /** HH:MM, vuoto se non c'era */
  ora: string;
  tipo: string;
  note: string;
  /** che cosa il modello NON ha trovato, in italiano */
  problemi: string[];
  /** il pezzo di messaggio da cui ha capito la data: si controlla a occhio */
  citazione: string;
}

const VUOTA: LetturaSegreteria = {
  esito: 'non_capito', persona: '', telefono: '', giorno: '', ora: '',
  tipo: 'visita', note: '', problemi: [], citazione: '',
};

const GIORNO_RE = /^\d{4}-\d{2}-\d{2}$/;
const ORA_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TIPI = ['visita', 'allenamento', 'consulenza', 'altro'];

/**
 * Le istruzioni per il modello.
 *
 * `oggi` serve perché «giovedì» non vuol dire niente senza sapere che
 * giorno è oggi — ed è l'unico modo per non far indovinare una data.
 */
export const istruzioniSegreteria = (oggi: string): string => `
Sei la segreteria di uno studio di personal training in Italia.
Ricevi un messaggio WhatsApp e lo traduci in una richiesta di
appuntamento. Rispondi SOLO con un oggetto JSON, niente altro.

Oggi è ${oggi} (formato AAAA-MM-GG). Usalo per risolvere «domani»,
«giovedì», «la settimana prossima».

Campi:
  esito     "richiesta" | "senza_data" | "non_capito"
  persona   nome e cognome se ci sono, altrimenti il nome
  telefono  solo se scritto nel messaggio, altrimenti ""
  giorno    AAAA-MM-GG, SOLO se la data è ricavabile dal messaggio
  ora       HH:MM, SOLO se l'ora è scritta o chiaramente ricavabile
  tipo      visita | allenamento | consulenza | altro
  note      quello che serve sapere, in poche parole
  citazione le parole esatte del messaggio da cui hai ricavato la data

REGOLE FERREE
1. NON inventare MAI una data o un'ora. Se non ci sono, esito è
   "senza_data" e i campi giorno e ora restano vuoti. Meglio
   chiedere che sbagliare: un appuntamento inventato è peggio di
   un appuntamento mancato.
2. "pomeriggio" NON è un'ora. "verso le 3" di pomeriggio è 15:00.
   "in mattinata" non è un'ora.
3. Se il messaggio non parla di appuntamenti (un saluto, una
   domanda sui prezzi), esito è "non_capito".
4. Non aggiungere cortesie, non riassumere, non commentare.
`.trim();

const testo = (v: unknown): string =>
  typeof v === 'string' ? v.trim() : '';

/**
 * Legge la risposta del modello. Diffidente per costruzione: un
 * campo storto non passa, viene svuotato e segnalato.
 */
export const leggiSegreteria = (grezzo: string): LetturaSegreteria => {
  let dati: Record<string, unknown>;
  try {
    // Alcuni modelli incorniciano il JSON: si prende da { a }.
    const s = String(grezzo || '');
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('niente JSON');
    dati = JSON.parse(s.slice(a, b + 1));
  } catch {
    return {
      ...VUOTA,
      problemi: ['Non ho capito la risposta dell\'assistente. Riprova, '
        + 'oppure scrivi la richiesta a mano.'],
    };
  }

  const problemi: string[] = [];
  const persona = testo(dati.persona);
  let giorno = testo(dati.giorno);
  let ora = testo(dati.ora);
  const tipoLetto = testo(dati.tipo).toLowerCase();

  // Una data che non è una data non entra: si svuota e si dice.
  if (giorno && !GIORNO_RE.test(giorno)) {
    problemi.push(`La data «${giorno}» non è leggibile: scrivila tu.`);
    giorno = '';
  }
  if (ora && !ORA_RE.test(ora)) {
    problemi.push(`L'ora «${ora}» non è leggibile: scrivila tu.`);
    ora = '';
  }
  if (!persona) problemi.push('Non ho trovato il nome della persona.');

  const dichiarato = testo(dati.esito);
  // L'esito NON si prende per buono: si ricava dai campi. Un modello
  // che dice «richiesta» senza data avrebbe messo in coda un
  // appuntamento senza quando.
  const esito: EsitoSegreteria =
    dichiarato === 'non_capito' ? 'non_capito'
      : (giorno && ora && persona) ? 'richiesta'
        : persona ? 'senza_data'
          : 'non_capito';

  if (esito === 'senza_data' && !problemi.length) {
    problemi.push('Nel messaggio non c\'è una data e un\'ora.');
  }

  return {
    esito,
    persona,
    telefono: testo(dati.telefono),
    giorno,
    ora,
    tipo: TIPI.includes(tipoLetto) ? tipoLetto : 'visita',
    note: testo(dati.note),
    problemi,
    citazione: testo(dati.citazione),
  };
};

/**
 * La riga che il titolare legge sopra la richiesta tradotta.
 * Dice sempre che cosa dovrà controllare lui.
 */
export const spiegaLettura = (l: LetturaSegreteria): string => {
  if (l.esito === 'non_capito') {
    return 'Questo messaggio non sembra una richiesta di appuntamento. '
      + 'Se lo è, scrivila a mano qui sotto.';
  }
  if (l.esito === 'senza_data') {
    return `${l.persona || 'La persona'} chiede un appuntamento, ma nel `
      + 'messaggio non c\'è quando. Qui sotto ci sono gli orari liberi: '
      + 'scegline uno e rimandaglielo.';
  }
  return `${l.persona} — ${l.giorno} alle ${l.ora}.`
    + (l.citazione ? ` Ricavato da: «${l.citazione}».` : '')
    + ' Controlla prima di registrare: la data la propone l\'assistente, '
    + 'la decidi tu.';
};
