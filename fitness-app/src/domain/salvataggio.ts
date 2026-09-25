// ============================================================
// QUANDO UN SALVATAGGIO NON RIESCE
// ------------------------------------------------------------
// Il 23 settembre 2026 il titolare apre «Modifica appuntamento»
// su una prima lezione di un piano da 200 €, tocca Aggiorna e
// l'app risponde:
//
//     Errore
//     Impossibile salvare
//
// Due parole che non dicono niente: non se è la rete, non se è un
// permesso, non se è un campo. E infatti non era nessuna di queste.
//
// IL DIFETTO. Il costo della sessione era vuoto — giustamente: la
// lezione è dentro un pacchetto, non si paga a parte. La schermata
// traduceva «vuoto» in `undefined` e lo passava a Firestore, che
// rifiuta:
//
//   Function updateDoc() called with invalid data.
//   Unsupported field value: undefined (found in field sessionCost)
//
// Il motivo vero arrivava fino al `catch`, e lì veniva buttato via.
//
// DUE RIMEDI, PERCHÉ I DIFETTI ERANO DUE.
//
// 1. `senzaIndefiniti` — un campo senza valore NON si scrive. Prima
//    di questa funzione ogni schermata poteva far cadere l'intero
//    salvataggio dimenticando un `|| 0`. Adesso il colpo lo para il
//    servizio, una volta per tutti.
//
// 2. `motivoSalvataggio` — l'errore si racconta. In italiano dove
//    si sa che cosa è successo, e con il testo tecnico in coda
//    sempre, perché è quello che permette di capire la prossima
//    volta senza dover riprodurre il guasto.
//
// La regola, che in questa app vale dappertutto: un errore che
// arriva e non viene detto è peggio di un errore che si vede.
// ============================================================

export const SALVATAGGIO_VERSION = 1;

/**
 * I campi pronti per Firestore: via quelli senza valore.
 *
 * `undefined` non è un valore che Firestore accetta, e un `NaN` lo
 * accetta eccome — il che è peggio: entra nel documento e da lì in
 * poi ogni conto che lo tocca diventa NaN, in silenzio. Qui cadono
 * tutti e due.
 *
 * Attenzione a che cosa NON tocca: `null`, `0`, `''` e `false` sono
 * valori veri e restano. Un costo di zero euro è un'informazione —
 * «questa seduta non si paga a parte» — e va scritta.
 */
export const senzaIndefiniti = <T extends Record<string, unknown>>(
  dati: T
): Record<string, unknown> => {
  const puliti: Record<string, unknown> = {};
  Object.keys(dati).forEach((k) => {
    const v = dati[k];
    if (v === undefined) return;
    if (typeof v === 'number' && Number.isNaN(v)) return;
    puliti[k] = v;
  });
  return puliti;
};

/** I campi che sono stati lasciati cadere, per poterlo dire. */
export const campiCaduti = <T extends Record<string, unknown>>(
  dati: T
): string[] =>
  Object.keys(dati).filter((k) => {
    const v = dati[k];
    return v === undefined || (typeof v === 'number' && Number.isNaN(v));
  });

const CODICI: Record<string, string> = {
  'permission-denied':
    'Il server ha rifiutato la modifica: con il tuo ruolo questo cambiamento '
    + 'non è permesso. Se serve davvero, chiedilo al titolare.',
  unauthenticated:
    'La sessione è scaduta. Esci e rientra, poi riprova.',
  unavailable:
    'Nessuna connessione al server. Quello che hai scritto non è perso: '
    + 'riprova quando la linea torna.',
  'deadline-exceeded':
    'Il server ci ha messo troppo a rispondere. Riprova fra poco.',
  'not-found':
    'Questo appuntamento non c\'è più: forse è stato cancellato da un\'altra '
    + 'postazione mentre lo modificavi. Chiudi e riapri l\'agenda.',
  'already-exists':
    'Esiste già: non è stato creato due volte.',
  'resource-exhausted':
    'Il server ha raggiunto il limite di richieste. Riprova fra qualche minuto.',
  'failed-precondition':
    'Il server ha rifiutato la scrittura: una condizione non era soddisfatta.',
  aborted:
    'La scrittura si è incrociata con un\'altra. Riprova.',
  cancelled:
    'Il salvataggio è stato interrotto prima di finire.',
};

const codiceDi = (err: unknown): string => {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: unknown }).code;
    if (typeof c === 'string') return c.replace(/^firestore\//, '');
  }
  return '';
};

const testoDi = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return '';
};

/**
 * Che cosa è andato storto, detto a chi sta davanti allo schermo.
 *
 * Il testo tecnico non si nasconde mai: sta in coda, dopo la riga in
 * italiano. Chi non lo capisce lo salta; chi deve aggiustare lo legge
 * — e nessuno deve riprodurre il guasto per sapere che cos'era.
 */
export const motivoSalvataggio = (err: unknown): string => {
  const codice = codiceDi(err);
  const testo = testoDi(err).trim();

  if (codice && CODICI[codice]) {
    return `${CODICI[codice]}\n\n(${codice})`;
  }

  // Il campo vuoto passato al server. Non dovrebbe più succedere —
  // `senzaIndefiniti` lo para — ma se ricompare dev'essere leggibile
  // al primo colpo, non un rebus.
  const campo = testo.match(/found in field ([^\s)]+)/);
  if (/Unsupported field value: undefined/i.test(testo)) {
    return campo
      ? `Un campo è rimasto senza valore e il server non lo accetta: ${campo[1]}. `
        + 'Riempilo, oppure segnalalo: è un difetto dell\'app, non tuo.'
      : 'Un campo è rimasto senza valore e il server non lo accetta. '
        + 'Segnalalo: è un difetto dell\'app, non tuo.';
  }

  if (!testo) {
    return codice
      ? `Il salvataggio non è riuscito.\n\n(${codice})`
      : 'Il salvataggio non è riuscito, e il server non ha detto perché. '
        + 'Riprova; se succede ancora, segnalalo.';
  }

  return `Il salvataggio non è riuscito.\n\n${testo}`;
};
