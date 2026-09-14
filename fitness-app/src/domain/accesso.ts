// ============================================================
// CREARE L'ACCESSO AL POSTO DELLA PERSONA
// ------------------------------------------------------------
// Il titolare, il 14 settembre 2026:
//
//   «Lei non ha mai fatto accesso al programma. Devo registrare
//    altre persone che non hanno mai fatto accesso. È un'opzione
//    necessaria, perché non tutti — soprattutto le persone più
//    anziane — capiscono come fare.»
//
// Fino a oggi c'era una strada sola: mandare l'invito e sperare che
// la persona lo completasse. Per una signora di settant'anni quella
// strada non esiste, e il risultato è una scheda in anagrafica che
// non diventa mai un accesso.
//
// Adesso l'accesso lo crea il titolare, con un indirizzo e una
// password che poi detta a voce. Non è una scorciatoia tecnica: è il
// modo in cui questo lavoro si fa davvero, al banco, con la persona
// davanti.
//
// ------------------------------------------------------------
// LA PASSWORD SI DETTA AL TELEFONO
// ------------------------------------------------------------
// Quindi non deve contenere niente che al telefono si sbagli: niente
// maiuscole da spiegare, niente simboli, niente lettere che suonano
// uguali. Una password che si detta male viene digitata male, e la
// persona resta fuori lo stesso — che è esattamente il problema da
// cui siamo partiti.
// ============================================================

export const ACCESSO_VERSION = 1;

/** Firebase non accetta password più corte. */
export const MIN_PASSWORD = 6;

export interface EsitoControllo {
  ok: boolean;
  problemi: string[];
}

const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const controllaEmail = (email: string): EsitoControllo => {
  const e = (email || '').trim();
  const problemi: string[] = [];
  if (!e) problemi.push('Serve un indirizzo email.');
  else if (!EMAIL_VALIDA.test(e)) problemi.push('Questo indirizzo non sembra valido.');
  else if (/\s/.test(e)) problemi.push('L\'indirizzo non può contenere spazi.');
  return { ok: problemi.length === 0, problemi };
};

export const controllaPassword = (password: string): EsitoControllo => {
  const p = password || '';
  const problemi: string[] = [];
  if (p.length < MIN_PASSWORD) {
    problemi.push(`La password deve avere almeno ${MIN_PASSWORD} caratteri.`);
  }
  if (/\s/.test(p)) problemi.push('La password non può contenere spazi.');
  return { ok: problemi.length === 0, problemi };
};

export const controllaNuovoAccesso = (
  email: string,
  password: string
): EsitoControllo => {
  const e = controllaEmail(email);
  const p = controllaPassword(password);
  return {
    ok: e.ok && p.ok,
    problemi: [...e.problemi, ...p.problemi],
  };
};

// ------------------------------------------------------------
// Una password che si detta al telefono
// ------------------------------------------------------------

// Niente 0/O, 1/l/I, 5/S: al telefono si confondono, e una persona
// che sbaglia a digitare resta fuori.
const CONSONANTI = 'bcdfgmnprtvz';
const VOCALI = 'aeiou';
const CIFRE = '234679';

const a = (alfabeto: string, caso: () => number): string =>
  alfabeto[Math.floor(caso() * alfabeto.length)];

/**
 * Due sillabe e tre cifre: «befu274». Si legge al telefono senza
 * spiegare niente, e si scrive come suona.
 *
 * `caso` si passa nei test per avere un risultato prevedibile.
 */
export const passwordDettabile = (caso: () => number = Math.random): string => {
  const sillaba = () => a(CONSONANTI, caso) + a(VOCALI, caso);
  return sillaba() + sillaba() + a(CIFRE, caso) + a(CIFRE, caso) + a(CIFRE, caso);
};

// ------------------------------------------------------------
// Che cosa si legge sullo schermo
// ------------------------------------------------------------

/**
 * Le credenziali da consegnare, pronte da leggere ad alta voce o da
 * incollare in un messaggio. È l'unico momento in cui la password si
 * vede: dopo, nel database, c'è solo la versione cifrata di Firebase.
 */
export const daConsegnare = (
  nome: string,
  email: string,
  password: string
): string =>
  `Accesso creato per ${nome.trim() || 'questa persona'}.\n\n`
  + `Email: ${email.trim()}\n`
  + `Password: ${password}\n\n`
  + 'Scrivila o falle una foto adesso: da qui in poi non è più '
  + 'visibile, nemmeno a te. Se la perde, le mandi il link per '
  + 'reimpostarla.';

/** La riga che dice se una persona può entrare oppure no. */
export const descriviAccesso = (stato: {
  haAccesso: boolean;
  email?: string;
  maiEntrata?: boolean;
}): string => {
  if (!stato.haAccesso) {
    return 'Questa persona non ha ancora un accesso: è in anagrafica, '
      + 'ma non può entrare nell\'App. Creaglielo tu e consegnale email '
      + 'e password.';
  }
  if (stato.maiEntrata) {
    return `Ha un accesso (${stato.email || 'email non nota'}) ma non è `
      + 'mai entrata. Se non ricorda la password, mandale il link per '
      + 'reimpostarla.';
  }
  return `Entra con ${stato.email || 'la sua email'}.`;
};
