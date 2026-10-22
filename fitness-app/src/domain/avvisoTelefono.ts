// ============================================================
// IL TELEFONO È RAGGIUNGIBILE? E SE NO, PERCHÉ?
// ------------------------------------------------------------
// 22 ottobre 2026, sera. La notifica sul telefono è stata pubblicata
// e non è arrivata. Il titolare: «la richiesta è arrivata, ma non la
// notifica».
//
// E qui la cosa importante non è la causa — sono quattro, tutte
// plausibili — ma il fatto che NON SI VEDE NESSUNA DELLE QUATTRO.
// Dal telefono non si legge niente, dai registri del server non si
// legge niente senza credenziali, e si finisce a provare rimedi a
// caso sperando di azzeccare.
//
// Un guasto invisibile si ripara una volta sola: facendolo vedere.
//
// Questo modulo non manda notifiche e non ripara niente. Dice, in
// italiano, a che punto è la catena e qual è il prossimo gesto. Da
// qui in avanti, quando una notifica non arriva, la risposta sta
// sullo schermo invece che in una supposizione.
// ============================================================

export const AVVISO_TELEFONO_VERSION = 1;

export type StatoAvvisi =
  | 'attivi'            // tutto a posto: il server sa dove bussare
  | 'da_installare'     // su iPhone, dal browser, il sistema non lo permette
  | 'permesso_mancante' // non è mai stato dato
  | 'permesso_negato'   // è stato detto di no: non si può richiedere
  | 'senza_indirizzo'   // permesso dato, ma l'iscrizione non è riuscita
  | 'non_supportato';   // questo browser non sa fare i push

export interface CondizioniAvvisi {
  /** il browser sa fare notifiche e push */
  supportato: boolean;
  /** 'granted' | 'denied' | 'default' */
  permesso: string;
  /** siamo su iPhone o iPad (dove serve l'app installata) */
  iOS: boolean;
  /** l'app è stata aperta dall'icona sulla schermata home */
  installata: boolean;
  /** c'è un indirizzo salvato sulla scheda della persona */
  indirizzo: boolean;
}

/**
 * L'ordine dei controlli è l'ordine in cui le cose si rompono.
 *
 * Prima il muro invalicabile (iPhone dal browser), poi il permesso,
 * poi l'iscrizione. Al contrario si direbbe «dai il permesso» a
 * qualcuno che, finché non installa l'app, quel permesso non lo può
 * nemmeno dare — e lo si manderebbe a sbattere.
 */
export const statoAvvisi = (c: CondizioniAvvisi): StatoAvvisi => {
  if (c.iOS && !c.installata) return 'da_installare';
  if (!c.supportato) return 'non_supportato';
  if (c.permesso === 'denied') return 'permesso_negato';
  if (c.permesso !== 'granted') return 'permesso_mancante';
  if (!c.indirizzo) return 'senza_indirizzo';
  return 'attivi';
};

export interface SpiegazioneAvvisi {
  titolo: string;
  testo: string;
  /** che cosa scrivere sul pulsante, o null se non c'è niente da premere */
  azione: string | null;
  /** verde quando funziona: si vede da lontano senza leggere */
  buono: boolean;
}

export const spiegaAvvisi = (stato: StatoAvvisi): SpiegazioneAvvisi => {
  switch (stato) {
    case 'attivi':
      return {
        titolo: 'Notifiche sul telefono: attive',
        testo: 'Questo telefono è raggiungibile: le richieste arrivano anche '
          + 'con l\'app chiusa.',
        azione: 'Mandami una prova',
        buono: true,
      };

    case 'da_installare':
      return {
        titolo: 'Serve installare l\'app',
        testo: 'Su iPhone e iPad le notifiche arrivano solo se l\'app è '
          + 'installata sulla schermata home: dal browser il sistema non le '
          + 'permette, e non è una cosa che possiamo aggirare.\n\n'
          + 'Tocca il pulsante Condividi in basso, poi «Aggiungi a Home». '
          + 'Apri l\'app da quell\'icona e torna qui.',
        azione: null,
        buono: false,
      };

    case 'non_supportato':
      return {
        titolo: 'Questo browser non le sa fare',
        testo: 'Le notifiche sul telefono qui non funzionano. Dentro l\'app '
          + 'continui a vedere la campanella e il pallino rosso, che non '
          + 'dipendono da questo.',
        azione: null,
        buono: false,
      };

    case 'permesso_negato':
      return {
        titolo: 'Le notifiche sono state bloccate',
        testo: 'A questa app è stato detto di no, e da dentro non si può '
          + 'richiedere: lo decide il telefono.\n\n'
          + 'Impostazioni del telefono → Notifiche → ESSĒRE → consenti. '
          + 'Poi torna qui e premi il pulsante.',
        azione: 'Ho dato il permesso, riprova',
        buono: false,
      };

    case 'permesso_mancante':
      return {
        titolo: 'Manca il permesso',
        testo: 'Il telefono deve darci il consenso a mandarti notifiche. '
          + 'Premi qui sotto: comparirà la richiesta del sistema, e devi '
          + 'rispondere «Consenti».',
        azione: 'Attiva le notifiche',
        buono: false,
      };

    default:
      return {
        titolo: 'Permesso dato, ma non sei raggiungibile',
        testo: 'Il permesso c\'è e l\'iscrizione non è riuscita: senza, il '
          + 'server non sa a quale telefono bussare. Succede quando l\'app è '
          + 'stata aggiornata da poco e non è ancora stata riaperta del '
          + 'tutto.\n\n'
          + 'Premi il pulsante. Se resta così, chiudi l\'app dalla schermata '
          + 'delle app aperte — non basta tornare alla home — e riaprila.',
        azione: 'Riprova a iscrivere questo telefono',
        buono: false,
      };
  }
};

/**
 * La riga corta, per chi guarda e basta.
 *
 * Serve dove non c'è spazio per il testo lungo: dice la cosa e non
 * fa finta che vada tutto bene quando non va.
 */
export const rigaAvvisi = (stato: StatoAvvisi): string =>
  (stato === 'attivi' ? 'Attive su questo telefono' : spiegaAvvisi(stato).titolo);
