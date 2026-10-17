// ============================================================
// QUANDO L'APP NON FINISCE DI APRIRSI
// ------------------------------------------------------------
// 12 ottobre 2026, dal telefono del titolare: rotella rossa e
// «Caricamento…», per sempre.
//
// Il percorso era questo. Firebase ricorda chi sei anche senza rete,
// quindi `autenticato` diventa subito vero. Poi l'app va a leggere il
// tuo profilo su Firestore. Se quella lettura non riesce — rete che
// non c'è davvero, permessi, server lento — il profilo resta vuoto, e
// la schermata diceva: «autenticato ma senza profilo? allora sto
// ancora caricando». Per sempre.
//
// LA COSA PEGGIORE È CHE L'ERRORE C'ERA GIÀ. Chi legge il profilo
// prende l'eccezione e la mette da parte in «error». Nessuno la
// mostrava: l'app sapeva che cosa non aveva funzionato e girava la
// rotella. La rete di sicurezza della pagina non interviene, perché
// controlla se lo schermo è VUOTO — e una rotella non è vuoto.
//
// Da qui: dopo un'attesa ragionevole si smette di aspettare e si dice
// che cosa sta succedendo, con qualcosa da toccare. Un'attesa infinita
// non è più prudente di un messaggio: è solo più muta.
// ============================================================

export const AVVIO_VERSION = 1;

/**
 * Quanto si aspetta prima di dire che qualcosa non va.
 *
 * Dodici secondi: abbastanza perché una rete lenta ce la faccia — su
 * 3G il profilo arriva in due o tre — e poco abbastanza da non
 * sembrare rotto. Sotto i dieci si spaventa chi ha la linea debole;
 * sopra i quindici si è già chiusa l'app.
 */
export const SECONDI_PAZIENZA = 12;

/**
 * Quanto si aspetta UNA SOLA lettura prima di dichiararla persa.
 *
 * Otto secondi, cioè meno della pazienza complessiva: serve a che
 * l'app arrivi a una conclusione — «non ci sono riuscito» — invece di
 * restare appesa a una promessa che non si risolve mai. Un conto è
 * aspettare, un altro è non sapere nemmeno di stare aspettando.
 */
export const SECONDI_PROFILO = 8;

/**
 * Una promessa che non può restare appesa per sempre.
 *
 * La lettura del profilo su Firestore, con la copia locale attiva, in
 * certe condizioni NON risponde: né riesce né fallisce. Un `catch` non
 * serve a niente contro una cosa che non finisce — serve una sveglia.
 */
export const attendiAlMassimo = <T>(
  lavoro: Promise<T>,
  millisecondi: number,
  motivo: string
): Promise<T> => new Promise<T>((risolvi, rifiuta) => {
  let finito = false;
  const sveglia = setTimeout(() => {
    if (finito) return;
    finito = true;
    rifiuta(new Error(motivo));
  }, millisecondi);
  lavoro.then(
    (v) => { if (!finito) { finito = true; clearTimeout(sveglia); risolvi(v); } },
    (e) => { if (!finito) { finito = true; clearTimeout(sveglia); rifiuta(e); } }
  );
});

export interface DatiAvvio {
  /** l'autenticazione sta ancora rispondendo */
  caricando: boolean;
  /** Firebase sa chi sei (vale anche offline, dalla memoria del telefono) */
  autenticato: boolean;
  /** il profilo letto dal server: è questo che manca quando si blocca */
  profilo: boolean;
  /** il motivo messo da parte da chi ha provato a leggere il profilo */
  errore?: string | null;
  secondiPassati: number;
}

export type StatoAvvio = 'pronto' | 'attesa' | 'bloccato';

/**
 * A che punto è l'apertura dell'app.
 *
 * `bloccato` non vuol dire «rotto»: vuol dire «è passato troppo tempo
 * perché io continui a far finta di niente».
 */
export const statoAvvio = (d: DatiAvvio): StatoAvvio => {
  const serveAspettare = d.caricando || (d.autenticato && !d.profilo);
  if (!serveAspettare) return 'pronto';
  return d.secondiPassati >= SECONDI_PAZIENZA ? 'bloccato' : 'attesa';
};

export interface SchermataBlocco {
  titolo: string;
  testo: string;
  /** il dettaglio tecnico, in coda: chi non lo capisce lo salta */
  dettaglio: string;
}

/**
 * Che cosa si legge quando l'apertura non va a buon fine.
 *
 * Tre regole, le stesse del registro guasti: dire che cosa è successo
 * in parole normali; non dare la colpa a chi guarda; e dire sempre la
 * prossima mossa, perché una schermata che spiega e non propone niente
 * lascia la persona esattamente dov'era.
 */
export const spiegaBlocco = (errore?: string | null): SchermataBlocco => {
  const dettaglio = (errore || '').trim();

  if (/copia locale|IndexedDB|persistence/i.test(dettaglio)) {
    return {
      titolo: 'La copia salvata sul telefono si è incartata',
      testo: 'I tuoi dati sul server stanno bene: è la copia locale che non '
        + 'risponde. Tocca «Ripara l\'app»: la cancella e la riscarica. '
        + 'Dovrai rifare l\'accesso, e basta.',
      dettaglio,
    };
  }

  if (/permission|permesso|denied/i.test(dettaglio)) {
    return {
      titolo: 'Non riesco ad aprire il tuo profilo',
      testo: 'Il server ha rifiutato la lettura del profilo. Succede quando '
        + 'l\'accesso è stato cambiato da poco: esci e rientra, e torna a posto.',
      dettaglio,
    };
  }

  return {
    titolo: 'Non riesco a finire di aprire l\'app',
    testo: 'Sono rimasto in attesa dei tuoi dati più del dovuto. Quasi sempre è '
      + 'la connessione: controlla la linea e riprova. Se la linea c\'è, «Ripara '
      + 'l\'app» rimette a posto la copia salvata sul telefono — non perdi niente, '
      + 'i dati stanno sul server.',
    dettaglio,
  };
};

/** I tre pulsanti, in ordine di quanto sono invasivi. */
export const AZIONI_BLOCCO = [
  { chiave: 'riprova', etichetta: 'Riprova' },
  { chiave: 'ripara', etichetta: 'Ripara l\'app' },
  { chiave: 'esci', etichetta: 'Esci e rientra' },
] as const;

export type AzioneBlocco = typeof AZIONI_BLOCCO[number]['chiave'];
