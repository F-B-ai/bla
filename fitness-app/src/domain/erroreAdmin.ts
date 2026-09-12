// ============================================================
// GLI ERRORI DELLE OPERAZIONI SU UN ALTRO ACCOUNT
// ------------------------------------------------------------
// Il titolare, il 12 settembre 2026: «Il cambio password per gli
// allievi non funziona.»
//
// Il codice diceva così:
//
//   if (code.includes('not-found') || code.includes('unavailable')
//       || code.includes('internal') || message.includes('fetch')) {
//     return new Error('Questa operazione richiede le Cloud Functions
//                       (piano Blaze) non ancora attive.')
//   }
//
// **`internal` è il codice che una Cloud Function restituisce quando
// il suo codice fallisce, per QUALUNQUE motivo.** Quindi ogni errore
// vero — un account che non esiste, una password rifiutata, un
// permesso mancante — veniva raccontato come «le Cloud Functions non
// sono attive».
//
// Le Functions sono attive: rispondono, verificato. Quel messaggio
// non era mai vero, e mandava a cercare nel posto sbagliato.
//
// È lo stesso difetto delle foto posturali, in un altro file: un
// `catch` che scarta l'errore e racconta l'unica causa che qualcuno
// aveva immaginato il giorno in cui l'ha scritta.
//
// Qui l'errore si classifica. Quello che non si sa, si dice che non
// si sa, e si mostra il testo tecnico — che è brutto ma vero, e
// permette di chiedere aiuto con qualcosa in mano.
// ============================================================

export const ERRORE_ADMIN_VERSION = 1;

export type MotivoAdmin =
  /** la Function non si raggiunge davvero: rete, oppure non pubblicata */
  | 'nonRaggiungibile'
  /** il chiamante non ha il ruolo per farlo */
  | 'senzaPermesso'
  /** la persona non ha mai creato il suo accesso: non c'è password da cambiare */
  | 'accountAssente'
  /** la password nuova non è accettabile */
  | 'passwordDebole'
  /** l'email nuova è già di qualcun altro */
  | 'emailOccupata'
  /** non lo sappiamo, e lo diciamo */
  | 'sconosciuto';

export const classificaErroreAdmin = (err: unknown): MotivoAdmin => {
  const e = err as { code?: string; message?: string } | null;
  const codice = String(e?.code || '');
  const testo = String(e?.message || '');
  const tutto = `${codice} ${testo}`.toLowerCase();

  // L'account che non esiste è il caso più frequente e il più
  // frainteso: si prova a dare una password a chi non ha mai
  // completato la registrazione.
  if (/user-not-found|no user record|accountassente|non ha mai completato/.test(tutto)) {
    return 'accountAssente';
  }
  if (codice.includes('permission-denied') || /permission|non hai i permessi/.test(tutto)) {
    return 'senzaPermesso';
  }
  if (/weak-password|password.*(debole|corta|short)|almeno 6/.test(tutto)) {
    return 'passwordDebole';
  }
  if (/email-already-exists|email-already-in-use|già.*utilizzat|already in use/.test(tutto)) {
    return 'emailOccupata';
  }
  // Solo QUI si parla di Functions non raggiungibili: quando davvero
  // non si raggiungono. `internal` NON è in questo elenco — è il
  // codice di un errore dentro la Function, che è tutt'altro.
  if (codice.includes('functions/not-found')
    || codice.includes('unavailable')
    || codice.includes('deadline-exceeded')
    || /failed to fetch|network|offline/.test(tutto)) {
    return 'nonRaggiungibile';
  }
  return 'sconosciuto';
};

const TESTI: Record<MotivoAdmin, string> = {
  nonRaggiungibile:
    'Non riesco a raggiungere il server. Controlla la connessione e riprova.',
  senzaPermesso:
    'Il tuo accesso non ha il permesso di fare questa operazione. '
    + 'Se sei il titolare: Gestione Utenti → «Allinea i ruoli», poi esci e rientra.',
  accountAssente:
    'Questa persona non ha ancora un accesso: è stata inserita in anagrafica '
    + 'ma non ha mai completato la registrazione, quindi non c\'è nessuna '
    + 'password da cambiare. Mandale l\'invito, oppure usa «Invia link '
    + 'reimpostazione password».',
  passwordDebole:
    'La password nuova non va bene: servono almeno 6 caratteri.',
  emailOccupata:
    'Questa email è già usata da un altro account.',
  sconosciuto: '',
};

/**
 * Il messaggio da mostrare. Per il caso sconosciuto si mostra il testo
 * tecnico: è brutto, ma è vero — e permette di chiedere aiuto con
 * qualcosa in mano invece che con «non funziona».
 */
export const spiegaErroreAdmin = (err: unknown): string => {
  const motivo = classificaErroreAdmin(err);
  if (motivo !== 'sconosciuto') return TESTI[motivo];

  const e = err as { code?: string; message?: string } | null;
  const dettaglio = (e?.message || '').trim();
  const codice = (e?.code || '').trim();
  const coda = [dettaglio, codice && `(${codice})`].filter(Boolean).join(' ');
  return coda
    ? `L'operazione non è riuscita e non so dirti perché. Dettaglio: ${coda}`
    : 'L\'operazione non è riuscita e non so dirti perché. Riprova; se succede ancora, segnalamelo.';
};
